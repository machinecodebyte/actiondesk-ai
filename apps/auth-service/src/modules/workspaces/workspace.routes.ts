import type { FastifyInstance } from "fastify";
import { CreateWorkspaceInputSchema, SwitchWorkspaceInputSchema } from "@actiondesk/contracts";
import { AppError, ErrorCode } from "@actiondesk/errors";
import { workspaceMembers, workspaces } from "@actiondesk/db";
import type { AuthDependencies } from "../sessions/auth.service.js";
import { authenticateRequest } from "../sessions/auth.service.js";
import { findWorkspaceForUser, listUserWorkspaces, mapWorkspace, workspaceSlug } from "./workspaces.service.js";
import { createAccessToken } from "../sessions/tokens.js";

export async function registerWorkspaceRoutes(
  app: FastifyInstance,
  deps: AuthDependencies
): Promise<void> {
  app.get("/workspaces", {
    schema: {
      tags: ["Workspaces"],
      summary: "List workspaces for the current user",
      security: [{ bearerAuth: [] }],
      response: { 200: workspaceListResponseSchema, 401: errorResponseSchema }
    }
  }, async (request) => {
    const auth = await authenticateRequest(deps, request);
    return { workspaces: await listUserWorkspaces(deps.db, auth.userId) };
  });

  app.post("/workspaces", {
    schema: {
      tags: ["Workspaces"],
      summary: "Create a new workspace for the current user",
      security: [{ bearerAuth: [] }],
      body: createWorkspaceBodySchema,
      response: { 201: workspaceResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    const auth = await authenticateRequest(deps, request);
    const input = parseBody(CreateWorkspaceInputSchema, request.body);
    const workspace = await deps.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(workspaces)
        .values({
          name: input.name,
          slug: workspaceSlug(input.name),
          ownerId: auth.userId
        })
        .returning();

      if (!created) {
        throw new AppError({ code: ErrorCode.INTERNAL_ERROR, message: "Unable to create workspace" });
      }

      await tx.insert(workspaceMembers).values({
        workspaceId: created.id,
        userId: auth.userId,
        role: "owner"
      });

      return mapWorkspace(created);
    });

    reply.code(201).send({ workspace });
  });

  app.post("/workspaces/switch", {
    schema: {
      tags: ["Workspaces"],
      summary: "Switch the active workspace for the current session",
      security: [{ bearerAuth: [] }],
      body: switchWorkspaceBodySchema,
      response: { 200: switchWorkspaceResponseSchema, 400: errorResponseSchema, 403: errorResponseSchema }
    }
  }, async (request) => {
    const auth = await authenticateRequest(deps, request);
    const input = parseBody(SwitchWorkspaceInputSchema, request.body);
    const workspace = await findWorkspaceForUser(deps.db, auth.userId, input.workspaceId);

    if (!workspace) {
      throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Workspace access denied" });
    }

    return {
      workspace,
      accessToken: createAccessToken(
        { userId: auth.userId, workspaceId: workspace.id, sessionId: auth.sessionId },
        deps.env
      )
    };
  });
}

function parseBody<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid request body" });
  }

  return result.data;
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

const workspaceListResponseSchema = {
  type: "object",
  required: ["workspaces"],
  properties: {
    workspaces: {
      type: "array",
      items: workspaceSchema
    }
  }
} as const;

const workspaceResponseSchema = {
  type: "object",
  required: ["workspace"],
  properties: {
    workspace: workspaceSchema
  }
} as const;

const switchWorkspaceResponseSchema = {
  type: "object",
  required: ["workspace", "accessToken"],
  properties: {
    workspace: workspaceSchema,
    accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
  }
} as const;

const createWorkspaceBodySchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", minLength: 2, example: "Acme Operations" }
  }
} as const;

const switchWorkspaceBodySchema = {
  type: "object",
  required: ["workspaceId"],
  properties: {
    workspaceId: { type: "string", format: "uuid" }
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
