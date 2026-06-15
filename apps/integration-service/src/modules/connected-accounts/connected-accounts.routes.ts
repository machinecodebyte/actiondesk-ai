import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  CompleteConnectionInputSchema,
  IntegrationProviderSchema,
  StartConnectionInputSchema
} from "@actiondesk/contracts";
import { AppError, ErrorCode } from "@actiondesk/errors";
import type { z } from "zod";
import type {
  IntegrationDependencies,
  IntegrationRequestContext
} from "./connected-accounts.service.js";
import {
  completeConnection,
  disconnectProvider,
  getIntegrationStatus,
  startConnection
} from "./connected-accounts.service.js";

const ProviderParamsSchema = IntegrationProviderSchema;

export async function registerConnectedAccountRoutes(
  app: FastifyInstance,
  deps: IntegrationDependencies
): Promise<void> {
  app.get("/integrations/status", {
    schema: {
      tags: ["Integrations"],
      summary: "Get Gmail and Google Calendar connection status",
      headers: internalHeadersSchema,
      response: { 200: integrationStatusResponseSchema, 401: errorResponseSchema }
    }
  }, async (request) => {
    return getIntegrationStatus(deps, readIntegrationContext(request));
  });

  app.post("/integrations/:provider/connect/start", {
    schema: {
      tags: ["Integrations"],
      summary: "Start a provider connection through Corsair",
      headers: internalHeadersSchema,
      params: providerParamsSchema,
      body: startConnectionBodySchema,
      response: {
        200: startConnectionResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        501: errorResponseSchema
      }
    }
  }, async (request) => {
    const provider = parseProviderParam(request.params);
    const input = parseBody(StartConnectionInputSchema, {
      ...bodyObject(request.body),
      provider
    });

    return startConnection(deps, readIntegrationContext(request), input);
  });

  app.post("/integrations/:provider/connect/complete", {
    schema: {
      tags: ["Integrations"],
      summary: "Complete a provider OAuth callback",
      headers: internalHeadersSchema,
      params: providerParamsSchema,
      body: completeConnectionBodySchema,
      response: {
        200: connectedAccountResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        501: errorResponseSchema
      }
    }
  }, async (request) => {
    const provider = parseProviderParam(request.params);
    const input = parseBody(CompleteConnectionInputSchema, {
      ...bodyObject(request.body),
      provider
    });

    return completeConnection(deps, readIntegrationContext(request), input);
  });

  app.post("/integrations/:provider/disconnect", {
    schema: {
      tags: ["Integrations"],
      summary: "Mark a provider as disconnected",
      headers: internalHeadersSchema,
      params: providerParamsSchema,
      response: { 200: disconnectResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema }
    }
  }, async (request) => {
    const provider = parseProviderParam(request.params);
    return disconnectProvider(deps, readIntegrationContext(request), provider);
  });
}

function readIntegrationContext(request: FastifyRequest): IntegrationRequestContext {
  const userId = singleHeader(request.headers["x-actiondesk-user-id"]);
  const workspaceId = singleHeader(request.headers["x-actiondesk-workspace-id"]);
  const requestId = singleHeader(request.headers["x-actiondesk-request-id"]);

  if (!userId || !workspaceId) {
    throw new AppError({
      code: ErrorCode.UNAUTHORIZED,
      message: "Missing authenticated user or workspace context"
    });
  }

  return {
    userId,
    workspaceId,
    ...(requestId ? { requestId } : {})
  };
}

function parseProviderParam(params: unknown) {
  const value = typeof params === "object" && params !== null ? Reflect.get(params, "provider") : undefined;
  const result = ProviderParamsSchema.safeParse(value);

  if (!result.success) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid integration provider" });
  }

  return result.data;
}

function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid request body" });
  }

  return result.data;
}

function bodyObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

function singleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const providerParamsSchema = {
  type: "object",
  required: ["provider"],
  properties: {
    provider: { type: "string", enum: ["gmail", "google_calendar"] }
  }
} as const;

const internalHeadersSchema = {
  type: "object",
  required: ["x-actiondesk-user-id", "x-actiondesk-workspace-id"],
  properties: {
    "x-actiondesk-user-id": { type: "string", format: "uuid" },
    "x-actiondesk-workspace-id": { type: "string", format: "uuid" },
    "x-actiondesk-request-id": { type: "string" }
  }
} as const;

const connectedAccountSchema = {
  type: "object",
  required: ["workspaceId", "provider", "status"],
  properties: {
    id: { type: "string", nullable: true, format: "uuid" },
    workspaceId: { type: "string", format: "uuid" },
    userId: { type: "string", nullable: true, format: "uuid" },
    provider: { type: "string", enum: ["gmail", "google_calendar"] },
    providerAccountEmail: { type: "string", nullable: true, format: "email" },
    corsairAccountId: { type: "string", nullable: true },
    corsairIntegrationId: { type: "string", nullable: true },
    status: { type: "string", enum: ["disconnected", "connecting", "connected", "error"] },
    scopes: { type: "array", nullable: true, items: { type: "string" } },
    lastSyncAt: { type: "string", nullable: true, format: "date-time" },
    connectedAt: { type: "string", nullable: true, format: "date-time" },
    errorMessage: { type: "string", nullable: true },
    createdAt: { type: "string", nullable: true, format: "date-time" },
    updatedAt: { type: "string", nullable: true, format: "date-time" }
  }
} as const;

const integrationStatusResponseSchema = {
  type: "object",
  required: ["accounts"],
  properties: {
    accounts: { type: "array", items: connectedAccountSchema }
  }
} as const;

const startConnectionBodySchema = {
  type: "object",
  properties: {
    redirectUrl: { type: "string", format: "uri", example: "http://localhost:3050/auth/callback" }
  }
} as const;

const startConnectionResponseSchema = {
  type: "object",
  required: ["provider", "status", "connectUrl"],
  properties: {
    provider: { type: "string", enum: ["gmail", "google_calendar"] },
    status: { type: "string", enum: ["connecting", "error"] },
    connectUrl: { type: "string", nullable: true, format: "uri" },
    message: { type: "string" }
  }
} as const;

const completeConnectionBodySchema = {
  type: "object",
  required: ["state"],
  properties: {
    state: { type: "string", minLength: 16 },
    code: { type: "string" }
  }
} as const;

const connectedAccountResponseSchema = {
  type: "object",
  required: ["account"],
  properties: {
    account: connectedAccountSchema
  }
} as const;

const disconnectResponseSchema = {
  type: "object",
  required: ["account"],
  properties: {
    account: connectedAccountSchema,
    message: { type: "string" }
  }
} as const;

const errorResponseSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string", example: "NOT_IMPLEMENTED" },
        message: {
          type: "string",
          example: "Corsair SDK is not configured yet. Add Corsair credentials to enable live connection."
        },
        requestId: { type: "string" }
      }
    }
  }
} as const;
