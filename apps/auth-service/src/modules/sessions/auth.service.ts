import type { FastifyRequest } from "fastify";
import { AppError, ErrorCode } from "@actiondesk/errors";
import type { AuthResponse, CurrentUser, RegisterInput } from "@actiondesk/contracts";
import {
  userSessions,
  users,
  workspaceMembers,
  workspaces,
  type Database
} from "@actiondesk/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { ServiceEnv } from "../../foundation/env.js";
import { mapWorkspace, workspaceSlug } from "../workspaces/workspaces.service.js";
import { findUserByEmail, findUserById } from "../users/users.service.js";
import { createAccessToken, createRefreshToken, hashRefreshToken, verifyAccessToken } from "./tokens.js";
import { hashPassword, verifyPassword } from "./password.js";

export type AuthDependencies = {
  db: Database;
  env: ServiceEnv;
};

export async function registerUser(
  deps: AuthDependencies,
  input: RegisterInput,
  request: FastifyRequest
): Promise<AuthResponse> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password, passwordOptions(deps.env));
  const workspaceName = input.workspaceName ?? `${input.name ?? email.split("@")[0]}'s Workspace`;

  try {
    return await deps.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email,
          name: input.name ?? null,
          passwordHash
        })
        .returning();

      if (!user) {
        throw new AppError({ code: ErrorCode.INTERNAL_ERROR, message: "Unable to create user" });
      }

      const [workspace] = await tx
        .insert(workspaces)
        .values({
          name: workspaceName,
          slug: workspaceSlug(workspaceName),
          ownerId: user.id
        })
        .returning();

      if (!workspace) {
        throw new AppError({ code: ErrorCode.INTERNAL_ERROR, message: "Unable to create workspace" });
      }

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner"
      });

      const session = await createSession(tx, deps.env, user.id, workspace.id, request);

      return {
        user: mapCurrentUser(user, mapWorkspace(workspace)),
        workspace: mapWorkspace(workspace),
        session
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError({ code: ErrorCode.CONFLICT, message: "An account already exists for this email" });
    }

    throw error;
  }
}

export async function loginUser(
  deps: AuthDependencies,
  emailInput: string,
  password: string,
  request: FastifyRequest
): Promise<AuthResponse> {
  const email = normalizeEmail(emailInput);
  const user = await findUserByEmail(deps.db, email);

  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid email or password" });
  }

  const workspace = await findFirstWorkspace(deps.db, user.id);

  if (!workspace) {
    throw new AppError({ code: ErrorCode.CONFLICT, message: "User does not belong to a workspace" });
  }

  const session = await createSession(deps.db, deps.env, user.id, workspace.id, request);

  return {
    user: mapCurrentUser(user, mapWorkspace(workspace)),
    workspace: mapWorkspace(workspace),
    session
  };
}

export async function refreshSession(
  deps: AuthDependencies,
  refreshToken: string,
  request: FastifyRequest
): Promise<AuthResponse> {
  const refreshTokenHash = hashRefreshToken(refreshToken, deps.env.AUTH_JWT_REFRESH_SECRET);
  const [session] = await deps.db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.refreshTokenHash, refreshTokenHash),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid refresh token" });
  }

  await deps.db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.id, session.id));

  const user = await findUserById(deps.db, session.userId);
  if (!user) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Session user no longer exists" });
  }

  const workspace = await findFirstWorkspace(deps.db, user.id);
  if (!workspace) {
    throw new AppError({ code: ErrorCode.CONFLICT, message: "User does not belong to a workspace" });
  }

  const nextSession = await createSession(deps.db, deps.env, user.id, workspace.id, request);

  return {
    user: mapCurrentUser(user, mapWorkspace(workspace)),
    workspace: mapWorkspace(workspace),
    session: nextSession
  };
}

export async function logout(deps: AuthDependencies, accessToken?: string, refreshToken?: string): Promise<void> {
  if (accessToken) {
    const claims = verifyAccessToken(accessToken, deps.env);
    await deps.db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.id, claims.sessionId));
    return;
  }

  if (refreshToken) {
    await deps.db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.refreshTokenHash, hashRefreshToken(refreshToken, deps.env.AUTH_JWT_REFRESH_SECRET)));
  }
}

export async function authenticateRequest(
  deps: AuthDependencies,
  request: FastifyRequest
): Promise<{ user: CurrentUser; userId: string; workspaceId: string; sessionId: string }> {
  const token = readBearerToken(request);
  const claims = verifyAccessToken(token, deps.env);
  const user = await findUserById(deps.db, claims.userId);

  if (!user || user.status !== "active") {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid user session" });
  }

  const workspace = await findWorkspaceById(deps.db, claims.workspaceId, user.id);
  if (!workspace) {
    throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Workspace access denied" });
  }

  const [session] = await deps.db
    .select()
    .from(userSessions)
    .where(and(eq(userSessions.id, claims.sessionId), isNull(userSessions.revokedAt)))
    .limit(1);

  if (!session) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Session has been revoked" });
  }

  return {
    user: mapCurrentUser(user, mapWorkspace(workspace)),
    userId: user.id,
    workspaceId: workspace.id,
    sessionId: claims.sessionId
  };
}

export function readBearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Missing access token" });
  }

  return header.slice("Bearer ".length);
}

async function createSession(
  db: Pick<Database, "insert">,
  env: ServiceEnv,
  userId: string,
  workspaceId: string,
  request: FastifyRequest
) {
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + env.AUTH_REFRESH_TOKEN_TTL_SECONDS * 1000);
  const [session] = await db
    .insert(userSessions)
    .values({
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken, env.AUTH_JWT_REFRESH_SECRET),
      userAgent: request.headers["user-agent"] ?? null,
      ipAddress: request.ip,
      expiresAt
    })
    .returning();

  if (!session) {
    throw new AppError({ code: ErrorCode.INTERNAL_ERROR, message: "Unable to create session" });
  }

  return {
    accessToken: createAccessToken({ userId, workspaceId, sessionId: session.id }, env),
    refreshToken,
    expiresAt: expiresAt.toISOString()
  };
}

async function findFirstWorkspace(db: Database, userId: string) {
  const [row] = await db
    .select({ workspace: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  return row?.workspace ?? null;
}

async function findWorkspaceById(db: Database, workspaceId: string, userId: string) {
  const [row] = await db
    .select({ workspace: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))
    .limit(1);

  return row?.workspace ?? null;
}

function mapCurrentUser(
  user: typeof users.$inferSelect,
  activeWorkspace: CurrentUser["activeWorkspace"]
): CurrentUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    status: user.status === "disabled" ? "disabled" : "active",
    activeWorkspace,
    createdAt: user.createdAt.toISOString()
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function passwordOptions(env: ServiceEnv) {
  return {
    memoryCost: env.PASSWORD_HASH_MEMORY_COST,
    timeCost: env.PASSWORD_HASH_TIME_COST,
    parallelism: env.PASSWORD_HASH_PARALLELISM
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && Reflect.get(error, "code") === "23505";
}
