import { randomBytes } from "node:crypto";
import type {
  ConnectedAccount,
  ConnectionStatus,
  IntegrationProvider,
  IntegrationStatusResponse,
  StartConnectionInput,
  StartConnectionResponse,
  CompleteConnectionInput
} from "@actiondesk/contracts";
import { AppError, ErrorCode } from "@actiondesk/errors";
import {
  auditLogs,
  connectedAccounts,
  integrationOauthStates,
  type Database
} from "@actiondesk/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { ServiceEnv } from "../../foundation/env.js";
import type { CorsairClient } from "../corsair/corsair.client.js";

export type IntegrationDependencies = {
  db: Database;
  env: ServiceEnv;
  corsair: CorsairClient;
};

export type IntegrationRequestContext = {
  userId: string;
  workspaceId: string;
  requestId?: string;
};

const providers: IntegrationProvider[] = ["gmail", "google_calendar"];
const stateTtlMs = 10 * 60 * 1000;

export async function getIntegrationStatus(
  deps: IntegrationDependencies,
  context: IntegrationRequestContext
): Promise<IntegrationStatusResponse> {
  const rows = await deps.db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.workspaceId, context.workspaceId));

  return {
    accounts: providers.map((provider) => {
      const row = rows.find((account) => account.provider === provider);
      return row ? mapConnectedAccount(row) : disconnectedAccount(provider, context);
    })
  };
}

export async function startConnection(
  deps: IntegrationDependencies,
  context: IntegrationRequestContext,
  input: StartConnectionInput
): Promise<StartConnectionResponse> {
  const state = randomBytes(32).toString("hex");
  const redirectUrl = input.redirectUrl ?? deps.env.CORSAIR_REDIRECT_BASE_URL;
  const now = new Date();

  await deps.db.insert(integrationOauthStates).values({
    workspaceId: context.workspaceId,
    userId: context.userId,
    provider: input.provider,
    state,
    redirectUrl,
    expiresAt: new Date(now.getTime() + stateTtlMs)
  });

  await setAccountStatus(deps.db, context, input.provider, "connecting", null);

  try {
    const result = await deps.corsair.startConnection({
      provider: input.provider,
      workspaceId: context.workspaceId,
      userId: context.userId,
      state,
      redirectUrl
    });

    return {
      provider: input.provider,
      status: "connecting",
      connectUrl: result.connectUrl
    };
  } catch (error) {
    await setAccountStatus(deps.db, context, input.provider, "error", appErrorMessage(error));
    throw error;
  }
}

export async function completeConnection(
  deps: IntegrationDependencies,
  context: IntegrationRequestContext,
  input: CompleteConnectionInput
): Promise<{ account: ConnectedAccount }> {
  const [oauthState] = await deps.db
    .select()
    .from(integrationOauthStates)
    .where(
      and(
        eq(integrationOauthStates.state, input.state),
        eq(integrationOauthStates.provider, input.provider),
        eq(integrationOauthStates.workspaceId, context.workspaceId),
        isNull(integrationOauthStates.consumedAt),
        gt(integrationOauthStates.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!oauthState) {
    throw new AppError({
      code: ErrorCode.BAD_REQUEST,
      message: "Integration callback state is invalid or expired"
    });
  }

  try {
    const completeRequest = {
      provider: input.provider,
      workspaceId: context.workspaceId,
      userId: context.userId,
      state: input.state,
      ...(input.code ? { code: input.code } : {})
    };
    const result = await deps.corsair.completeConnection(completeRequest);

    const account = await setConnectedAccount(deps.db, context, input.provider, result);
    await deps.db
      .update(integrationOauthStates)
      .set({ consumedAt: new Date() })
      .where(eq(integrationOauthStates.id, oauthState.id));
    await writeAuditLog(deps.db, context, "integration.connected", input.provider, {
      providerAccountEmail: result.providerAccountEmail ?? null
    });

    return { account };
  } catch (error) {
    await setAccountStatus(deps.db, context, input.provider, "error", appErrorMessage(error));
    throw error;
  }
}

export async function disconnectProvider(
  deps: IntegrationDependencies,
  context: IntegrationRequestContext,
  provider: IntegrationProvider
): Promise<{ account: ConnectedAccount; message?: string }> {
  const existing = await findAccount(deps.db, context.workspaceId, provider);
  const revoke = await deps.corsair.disconnect({
    provider,
    workspaceId: context.workspaceId,
    corsairAccountId: existing?.corsairAccountId ?? null,
    corsairIntegrationId: existing?.corsairIntegrationId ?? null
  });

  const account = await setAccountStatus(deps.db, context, provider, "disconnected", null);
  await writeAuditLog(deps.db, context, "integration.disconnected", provider, {
    corsairRevokeSkipped: revoke.skipped,
    message: revoke.message ?? null
  });

  return {
    account,
    ...(revoke.message ? { message: revoke.message } : {})
  };
}

async function findAccount(db: Database, workspaceId: string, provider: IntegrationProvider) {
  const [account] = await db
    .select()
    .from(connectedAccounts)
    .where(and(eq(connectedAccounts.workspaceId, workspaceId), eq(connectedAccounts.provider, provider)))
    .limit(1);

  return account ?? null;
}

async function setAccountStatus(
  db: Database,
  context: IntegrationRequestContext,
  provider: IntegrationProvider,
  status: ConnectionStatus,
  errorMessage: string | null
): Promise<ConnectedAccount> {
  const existing = await findAccount(db, context.workspaceId, provider);
  const values = {
    workspaceId: context.workspaceId,
    userId: context.userId,
    provider,
    status,
    errorMessage,
    connectedAt: status === "connected" ? new Date() : null,
    updatedAt: new Date()
  };

  if (!existing) {
    const [created] = await db
      .insert(connectedAccounts)
      .values({
        ...values,
        providerAccountEmail: null,
        corsairAccountId: null,
        corsairIntegrationId: null,
        scopes: null
      })
      .returning();

    if (!created) {
      throw new AppError({ code: ErrorCode.INTERNAL_ERROR, message: "Unable to save integration status" });
    }

    return mapConnectedAccount(created);
  }

  const [updated] = await db
    .update(connectedAccounts)
    .set(values)
    .where(eq(connectedAccounts.id, existing.id))
    .returning();

  if (!updated) {
    throw new AppError({ code: ErrorCode.INTERNAL_ERROR, message: "Unable to update integration status" });
  }

  return mapConnectedAccount(updated);
}

async function setConnectedAccount(
  db: Database,
  context: IntegrationRequestContext,
  provider: IntegrationProvider,
  result: {
    providerAccountEmail?: string;
    corsairAccountId?: string;
    corsairIntegrationId?: string;
    scopes?: string[];
  }
): Promise<ConnectedAccount> {
  const existing = await findAccount(db, context.workspaceId, provider);
  const values = {
    workspaceId: context.workspaceId,
    userId: context.userId,
    provider,
    providerAccountEmail: result.providerAccountEmail ?? null,
    corsairAccountId: result.corsairAccountId ?? null,
    corsairIntegrationId: result.corsairIntegrationId ?? null,
    status: "connected" as const,
    scopes: result.scopes ?? null,
    connectedAt: new Date(),
    errorMessage: null,
    updatedAt: new Date()
  };

  if (!existing) {
    const [created] = await db.insert(connectedAccounts).values(values).returning();
    if (!created) {
      throw new AppError({ code: ErrorCode.INTERNAL_ERROR, message: "Unable to save connected account" });
    }

    return mapConnectedAccount(created);
  }

  const [updated] = await db
    .update(connectedAccounts)
    .set(values)
    .where(eq(connectedAccounts.id, existing.id))
    .returning();

  if (!updated) {
    throw new AppError({ code: ErrorCode.INTERNAL_ERROR, message: "Unable to update connected account" });
  }

  return mapConnectedAccount(updated);
}

async function writeAuditLog(
  db: Database,
  context: IntegrationRequestContext,
  action: string,
  provider: IntegrationProvider,
  metadata: Record<string, unknown>
): Promise<void> {
  await db.insert(auditLogs).values({
    workspaceId: context.workspaceId,
    userId: context.userId,
    action,
    resourceType: "integration",
    resourceId: provider,
    metadata
  });
}

function disconnectedAccount(
  provider: IntegrationProvider,
  context: IntegrationRequestContext
): ConnectedAccount {
  return {
    id: null,
    workspaceId: context.workspaceId,
    userId: null,
    provider,
    providerAccountEmail: null,
    corsairAccountId: null,
    corsairIntegrationId: null,
    status: "disconnected",
    scopes: null,
    lastSyncAt: null,
    connectedAt: null,
    errorMessage: null,
    createdAt: null,
    updatedAt: null
  };
}

function mapConnectedAccount(row: typeof connectedAccounts.$inferSelect): ConnectedAccount {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    provider: parseProvider(row.provider),
    providerAccountEmail: row.providerAccountEmail,
    corsairAccountId: row.corsairAccountId,
    corsairIntegrationId: row.corsairIntegrationId,
    status: parseStatus(row.status),
    scopes: row.scopes,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function parseProvider(value: string): IntegrationProvider {
  if (value === "gmail" || value === "google_calendar") {
    return value;
  }

  throw new AppError({ code: ErrorCode.INTERNAL_ERROR, message: "Unknown integration provider" });
}

function parseStatus(value: string): ConnectionStatus {
  if (value === "disconnected" || value === "connecting" || value === "connected" || value === "error") {
    return value;
  }

  return "error";
}

function appErrorMessage(error: unknown): string {
  return error instanceof AppError ? error.message : "Integration operation failed";
}
