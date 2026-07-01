import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  CreateDraftReplyInputSchema,
  SyncMailInputSchema,
  type ListMailThreadsResponse,
  type MailMessage,
  type MailThread
} from "@actiondesk/contracts";
import {
  connectedAccounts,
  mailMessages,
  mailThreads,
  syncRuns,
  type Database
} from "@actiondesk/db";
import { AppError, ErrorCode } from "@actiondesk/errors";
import { z } from "zod";

export type MailRouteDeps = {
  db: Database;
};

type InternalContext = {
  userId: string;
  workspaceId: string;
  requestId?: string;
};

const ThreadIdParamsSchema = z.object({
  id: z.string().uuid()
});

const ListThreadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  unread: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  search: z.string().trim().min(1).max(200).optional(),
  fromEmail: z.string().trim().email().optional()
});

export async function registerMailRoutes(app: FastifyInstance, deps: MailRouteDeps): Promise<void> {
  app.get("/mail/threads", {
    schema: {
      tags: ["Mail"],
      summary: "List cached Gmail threads",
      headers: internalHeadersSchema,
      querystring: listThreadsQuerySchema,
      response: { 200: listThreadsResponseSchema, 401: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const query = parseQuery(ListThreadsQuerySchema, request.query);
    const conditions: SQL[] = [eq(mailThreads.workspaceId, context.workspaceId)];

    if (query.unread !== undefined) {
      conditions.push(eq(mailThreads.unread, query.unread));
    }

    if (query.fromEmail) {
      conditions.push(eq(mailThreads.fromEmail, query.fromEmail));
    }

    if (query.search) {
      const search = `%${query.search}%`;
      conditions.push(or(ilike(mailThreads.subject, search), ilike(mailThreads.snippet, search))!);
    }

    const where = and(...conditions);
    const offset = (query.page - 1) * query.pageSize;
    const rows = await deps.db
      .select()
      .from(mailThreads)
      .where(where)
      .orderBy(desc(mailThreads.lastMessageAt), desc(mailThreads.createdAt))
      .limit(query.pageSize)
      .offset(offset);
    const totalRows = await deps.db
      .select({ total: count() })
      .from(mailThreads)
      .where(where);
    const total = totalRows[0]?.total ?? 0;

    const response: ListMailThreadsResponse = {
      threads: rows.map(mapThread),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / query.pageSize)
      }
    };

    return response;
  });

  app.get("/mail/threads/:id", {
    schema: {
      tags: ["Mail"],
      summary: "Get a cached Gmail thread with messages",
      headers: internalHeadersSchema,
      params: idParamsSchema,
      response: { 200: threadDetailResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    const thread = await findThread(deps.db, context.workspaceId, id);

    if (!thread) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Mail thread not found" });
    }

    const messages = await deps.db
      .select()
      .from(mailMessages)
      .where(and(eq(mailMessages.workspaceId, context.workspaceId), eq(mailMessages.threadId, id)))
      .orderBy(desc(mailMessages.receivedAt), desc(mailMessages.createdAt));

    return {
      thread: mapThread(thread),
      messages: messages.map(mapMessage)
    };
  });

  app.post("/mail/sync", {
    schema: {
      tags: ["Mail"],
      summary: "Sync Gmail into the local cache",
      headers: internalHeadersSchema,
      body: syncMailBodySchema,
      response: { 501: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    parseBody(SyncMailInputSchema, request.body ?? {});
    await requireConnectedAccount(deps.db, context.workspaceId);
    await recordFailedSync(
      deps.db,
      context.workspaceId,
      "Live Gmail sync is not configured yet. Add the real Corsair Gmail adapter to enable sync."
    );
    throw notConfigured("Live Gmail sync is not configured yet. Add Corsair SDK credentials to enable Gmail sync.");
  });

  app.post("/mail/threads/:id/draft-reply", {
    schema: {
      tags: ["Mail"],
      summary: "Create a draft Gmail reply after approval",
      headers: internalHeadersSchema,
      params: idParamsSchema,
      body: draftReplyBodySchema,
      response: { 501: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    parseBody(CreateDraftReplyInputSchema, { ...bodyObject(request.body), threadId: id });
    await requireExistingThread(deps.db, context.workspaceId, id);
    await requireConnectedAccount(deps.db, context.workspaceId);
    throw notConfigured("Live Gmail draft creation is not configured yet. Add Corsair SDK credentials to enable draft replies.");
  });

  app.post("/mail/threads/:id/archive", {
    schema: actionSchema("Archive a Gmail thread")
  }, async (request) => unavailableMailAction(request, deps, "Live Gmail archive is not configured yet."));

  app.post("/mail/threads/:id/mark-read", {
    schema: actionSchema("Mark a Gmail thread as read")
  }, async (request) => unavailableMailAction(request, deps, "Live Gmail mark-read is not configured yet."));

  app.post("/mail/threads/:id/mark-unread", {
    schema: actionSchema("Mark a Gmail thread as unread")
  }, async (request) => unavailableMailAction(request, deps, "Live Gmail mark-unread is not configured yet."));
}

async function unavailableMailAction(request: FastifyRequest, deps: MailRouteDeps, message: string) {
  const context = readContext(request);
  const { id } = parseParams(request.params);
  await requireExistingThread(deps.db, context.workspaceId, id);
  await requireConnectedAccount(deps.db, context.workspaceId);
  throw notConfigured(`${message} Add Corsair SDK credentials to enable provider actions.`);
}

async function requireExistingThread(db: Database, workspaceId: string, id: string): Promise<void> {
  const thread = await findThread(db, workspaceId, id);
  if (!thread) {
    throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Mail thread not found" });
  }
}

async function findThread(db: Database, workspaceId: string, id: string) {
  const [thread] = await db
    .select()
    .from(mailThreads)
    .where(and(eq(mailThreads.workspaceId, workspaceId), eq(mailThreads.id, id)))
    .limit(1);

  return thread;
}

async function requireConnectedAccount(db: Database, workspaceId: string): Promise<void> {
  const [account] = await db
    .select()
    .from(connectedAccounts)
    .where(and(eq(connectedAccounts.workspaceId, workspaceId), eq(connectedAccounts.provider, "gmail")))
    .limit(1);

  if (!account || account.status !== "connected") {
    throw new AppError({
      code: ErrorCode.BAD_REQUEST,
      message: "Gmail is not connected for this workspace."
    });
  }
}

async function recordFailedSync(db: Database, workspaceId: string, errorMessage: string): Promise<void> {
  const now = new Date();
  await db.insert(syncRuns).values({
    workspaceId,
    provider: "gmail",
    syncType: "manual",
    status: "failed",
    startedAt: now,
    finishedAt: now,
    errorMessage,
    metadata: null
  });
}

function readContext(request: FastifyRequest): InternalContext {
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

function mapThread(row: typeof mailThreads.$inferSelect): MailThread {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    provider: "gmail",
    providerThreadId: row.providerThreadId,
    subject: row.subject,
    snippet: row.snippet,
    fromEmail: row.fromEmail,
    fromName: row.fromName,
    lastMessageAt: iso(row.lastMessageAt),
    unread: row.unread,
    rawMetadata: row.rawMetadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapMessage(row: typeof mailMessages.$inferSelect): MailMessage {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    threadId: row.threadId,
    provider: "gmail",
    providerMessageId: row.providerMessageId,
    subject: row.subject,
    snippet: row.snippet,
    bodyText: row.bodyText,
    fromEmail: row.fromEmail,
    fromName: row.fromName,
    toEmails: row.toEmails,
    ccEmails: row.ccEmails,
    receivedAt: iso(row.receivedAt),
    unread: row.unread,
    hasAttachments: row.hasAttachments,
    rawMetadata: row.rawMetadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function parseQuery<T extends z.ZodTypeAny>(schema: T, query: unknown): z.infer<T> {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid query parameters" });
  }
  return result.data;
}

function parseParams(params: unknown) {
  const result = ThreadIdParamsSchema.safeParse(params);
  if (!result.success) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid thread id" });
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

function notConfigured(message: string): AppError {
  return new AppError({ code: ErrorCode.NOT_IMPLEMENTED, message });
}

function actionSchema(summary: string) {
  return {
    tags: ["Mail"],
    summary,
    headers: internalHeadersSchema,
    params: idParamsSchema,
    response: { 501: errorResponseSchema }
  } as const;
}

const internalHeadersSchema = {
  type: "object",
  required: ["x-actiondesk-user-id", "x-actiondesk-workspace-id"],
  properties: {
    "x-actiondesk-user-id": { type: "string", format: "uuid" },
    "x-actiondesk-workspace-id": { type: "string", format: "uuid" },
    "x-actiondesk-request-id": { type: "string" }
  }
} as const;

const idParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", format: "uuid" }
  }
} as const;

const listThreadsQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100, default: 25 },
    unread: { type: "string", enum: ["true", "false"] },
    search: { type: "string" },
    fromEmail: { type: "string", format: "email" }
  }
} as const;

const syncMailBodySchema = {
  type: "object",
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100, default: 25 }
  }
} as const;

const draftReplyBodySchema = {
  type: "object",
  required: ["body"],
  properties: {
    body: { type: "string", minLength: 1 }
  }
} as const;

const mailThreadSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    subject: { type: "string", nullable: true },
    snippet: { type: "string", nullable: true },
    fromEmail: { type: "string", nullable: true },
    fromName: { type: "string", nullable: true },
    lastMessageAt: { type: "string", nullable: true, format: "date-time" },
    unread: { type: "boolean" }
  }
} as const;

const mailMessageSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    threadId: { type: "string", nullable: true, format: "uuid" },
    subject: { type: "string", nullable: true },
    snippet: { type: "string", nullable: true },
    bodyText: { type: "string", nullable: true },
    receivedAt: { type: "string", nullable: true, format: "date-time" }
  }
} as const;

const listThreadsResponseSchema = {
  type: "object",
  properties: {
    threads: { type: "array", items: mailThreadSchema },
    pagination: { type: "object" }
  }
} as const;

const threadDetailResponseSchema = {
  type: "object",
  properties: {
    thread: mailThreadSchema,
    messages: { type: "array", items: mailMessageSchema }
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
        code: { type: "string" },
        message: { type: "string" },
        requestId: { type: "string" }
      }
    }
  }
} as const;
