import type { FastifyInstance } from "fastify";
import {
  LoginInputSchema,
  LogoutInputSchema,
  RefreshSessionInputSchema,
  RegisterInputSchema
} from "@actiondesk/contracts";
import { AppError, ErrorCode } from "@actiondesk/errors";
import type { AuthDependencies } from "./auth.service.js";
import {
  authenticateRequest,
  loginUser,
  logout,
  readBearerToken,
  refreshSession,
  registerUser
} from "./auth.service.js";

export async function registerAuthRoutes(
  app: FastifyInstance,
  deps: AuthDependencies
): Promise<void> {
  app.post("/auth/register", {
    schema: {
      tags: ["Auth"],
      summary: "Register a user and default workspace",
      body: registerBodySchema,
      response: { 201: authResponseSchema, 400: errorResponseSchema, 409: errorResponseSchema }
    }
  }, async (request, reply) => {
    const input = parseBody(RegisterInputSchema, request.body);
    const response = await registerUser(deps, input, request);
    reply.code(201).send(response);
  });

  app.post("/auth/login", {
    schema: {
      tags: ["Auth"],
      summary: "Log in with email and password",
      body: loginBodySchema,
      response: { 200: authResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema }
    }
  }, async (request) => {
    const input = parseBody(LoginInputSchema, request.body);
    return loginUser(deps, input.email, input.password, request);
  });

  app.post("/auth/refresh", {
    schema: {
      tags: ["Auth"],
      summary: "Rotate a refresh token and create a new session",
      body: refreshBodySchema,
      response: { 200: authResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema }
    }
  }, async (request) => {
    const input = parseBody(RefreshSessionInputSchema, request.body);
    if (!input.refreshToken) {
      throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Missing refresh token" });
    }

    return refreshSession(deps, input.refreshToken, request);
  });

  app.post("/auth/logout", {
    schema: {
      tags: ["Auth"],
      summary: "Revoke the current session",
      security: [{ bearerAuth: [] }],
      body: logoutBodySchema,
      response: { 200: successResponseSchema, 401: errorResponseSchema }
    }
  }, async (request) => {
    const input = parseBody(LogoutInputSchema, request.body ?? {});
    const accessToken = readOptionalBearerToken(request);
    await logout(deps, accessToken, input.refreshToken);
    return { ok: true };
  });

  app.get("/auth/me", {
    schema: {
      tags: ["Auth"],
      summary: "Get the current authenticated user",
      security: [{ bearerAuth: [] }],
      response: { 200: currentUserSchema, 401: errorResponseSchema, 403: errorResponseSchema }
    }
  }, async (request) => {
    const auth = await authenticateRequest(deps, request);
    return auth.user;
  });
}

function parseBody<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid request body" });
  }

  return result.data;
}

function readOptionalBearerToken(request: Parameters<typeof readBearerToken>[0]): string | undefined {
  try {
    return readBearerToken(request);
  } catch {
    return undefined;
  }
}

const workspaceSchema = {
  type: "object",
  required: ["id", "name", "slug", "ownerId", "createdAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", example: "Acme Operations" },
    slug: { type: "string", example: "acme-operations-a1b2c3" },
    ownerId: { type: "string", format: "uuid" },
    corsairTenantId: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" }
  }
} as const;

const currentUserSchema = {
  type: "object",
  required: ["id", "email", "name", "timezone", "status", "activeWorkspace", "createdAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email", example: "user@example.com" },
    name: { type: "string", nullable: true, example: "Alex Morgan" },
    avatarUrl: { type: "string", nullable: true },
    timezone: { type: "string", example: "UTC" },
    status: { type: "string", enum: ["active", "disabled"] },
    activeWorkspace: { ...workspaceSchema, nullable: true },
    createdAt: { type: "string", format: "date-time" }
  }
} as const;

const authResponseSchema = {
  type: "object",
  required: ["user", "workspace", "session"],
  properties: {
    user: currentUserSchema,
    workspace: { ...workspaceSchema, nullable: true },
    session: {
      type: "object",
      required: ["accessToken", "refreshToken", "expiresAt"],
      properties: {
        accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
        refreshToken: { type: "string", example: "refresh-token-value" },
        expiresAt: { type: "string", format: "date-time" }
      }
    }
  }
} as const;

const registerBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email", example: "user@example.com" },
    password: { type: "string", minLength: 8, example: "correct-horse-battery" },
    name: { type: "string", example: "Alex Morgan" },
    workspaceName: { type: "string", example: "Acme Operations" }
  }
} as const;

const loginBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email", example: "user@example.com" },
    password: { type: "string", example: "correct-horse-battery" }
  }
} as const;

const refreshBodySchema = {
  type: "object",
  required: ["refreshToken"],
  properties: {
    refreshToken: { type: "string", example: "refresh-token-value" }
  }
} as const;

const logoutBodySchema = {
  type: "object",
  properties: {
    refreshToken: { type: "string", example: "refresh-token-value" }
  }
} as const;

const successResponseSchema = {
  type: "object",
  required: ["ok"],
  properties: {
    ok: { type: "boolean", example: true }
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
        code: { type: "string", example: "UNAUTHORIZED" },
        message: { type: "string", example: "Missing access token" },
        requestId: { type: "string" }
      }
    }
  }
} as const;
