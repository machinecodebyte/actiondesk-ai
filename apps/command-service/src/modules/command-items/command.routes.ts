import { and, count, desc, eq, type SQL } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  CreateApprovalInputSchema,
  CreateCommandItemInputSchema,
  SnoozeCommandInputSchema,
  UpdateCommandStatusInputSchema,
  type ApprovalRequest,
  type CommandIntent,
  type CommandItem,
  type CommandPriority,
  type CommandSourceType,
  type CommandStatus,
  type ListApprovalsResponse,
  type ListCommandItemsResponse
} from "@actiondesk/contracts";
import {
  approvalRequests,
  calendarEvents,
  commandItems,
  mailMessages,
  mailThreads,
  type Database
} from "@actiondesk/db";
import { AppError, ErrorCode } from "@actiondesk/errors";
import { z } from "zod";

export type CommandRouteDeps = {
  db: Database;
};

const IdParamsSchema = z.object({
  id: z.string().uuid()
});

const ListCommandsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(["open", "snoozed", "waiting", "done", "dismissed", "failed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  intent: z.enum(["manual", "draft_reply", "schedule_meeting", "follow_up"]).optional()
});

const ListApprovalsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(["pending", "approved", "rejected", "executed", "failed"]).optional(),
  actionType: z.string().trim().min(1).max(120).optional()
});

export async function registerCommandRoutes(app: FastifyInstance, deps: CommandRouteDeps): Promise<void> {
  app.get("/commands", {
    schema: {
      tags: ["Commands"],
      summary: "List command items",
      headers: internalHeadersSchema,
      querystring: listCommandsQuerySchema,
      response: { 200: listCommandsResponseSchema, 401: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const query = parseQuery(ListCommandsQuerySchema, request.query);
    const conditions: SQL[] = [
      eq(commandItems.workspaceId, context.workspaceId),
      eq(commandItems.userId, context.userId)
    ];

    if (query.status) {
      conditions.push(eq(commandItems.status, query.status));
    }
    if (query.priority) {
      conditions.push(eq(commandItems.priority, query.priority));
    }
    if (query.intent) {
      conditions.push(eq(commandItems.intent, query.intent));
    }

    const where = and(...conditions);
    const offset = (query.page - 1) * query.pageSize;
    const rows = await deps.db
      .select()
      .from(commandItems)
      .where(where)
      .orderBy(desc(commandItems.createdAt))
      .limit(query.pageSize)
      .offset(offset);
    const totalRows = await deps.db
      .select({ total: count() })
      .from(commandItems)
      .where(where);
    const total = totalRows[0]?.total ?? 0;

    const response: ListCommandItemsResponse = {
      items: rows.map(mapCommand),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / query.pageSize)
      }
    };

    return response;
  });

  app.get("/commands/:id", {
    schema: {
      tags: ["Commands"],
      summary: "Get a command item",
      headers: internalHeadersSchema,
      params: idParamsSchema,
      response: { 200: commandResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    const item = await findCommand(deps.db, context.workspaceId, context.userId, id);
    if (!item) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Command item not found" });
    }
    return { item: mapCommand(item) };
  });

  app.post("/commands", {
    schema: {
      tags: ["Commands"],
      summary: "Create a command item",
      headers: internalHeadersSchema,
      body: createCommandBodySchema,
      response: { 201: commandResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    const context = readContext(request);
    const input = parseBody(CreateCommandItemInputSchema, request.body);
    const source = await resolveSource(deps.db, context.workspaceId, input.sourceType, input.sourceId);
    const [created] = await deps.db
      .insert(commandItems)
      .values({
        workspaceId: context.workspaceId,
        userId: context.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        sourceProviderId: input.sourceProviderId ?? source.providerId,
        title: input.title,
        summary: input.summary ?? source.summary,
        intent: input.intent,
        priority: input.priority,
        status: "open",
        suggestedAction: suggestAction(input.sourceType, input.title, input.summary ?? source.summary),
        dueAt: input.dueAt ? new Date(input.dueAt) : null
      })
      .returning();

    if (!created) {
      throw new AppError({ code: ErrorCode.INTERNAL_ERROR, message: "Unable to create command item" });
    }

    reply.code(201).send({ item: mapCommand(created) });
  });

  app.patch("/commands/:id/status", {
    schema: {
      tags: ["Commands"],
      summary: "Update command status",
      headers: internalHeadersSchema,
      params: idParamsSchema,
      body: updateStatusBodySchema,
      response: { 200: commandResponseSchema, 404: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    const input = parseBody(UpdateCommandStatusInputSchema, { ...bodyObject(request.body), id });
    const updated = await updateCommand(deps.db, context, id, {
      status: input.status,
      snoozedUntil: input.status === "snoozed" ? new Date() : null
    });
    return { item: mapCommand(updated) };
  });

  app.post("/commands/:id/snooze", {
    schema: {
      tags: ["Commands"],
      summary: "Snooze a command item",
      headers: internalHeadersSchema,
      params: idParamsSchema,
      body: snoozeBodySchema,
      response: { 200: commandResponseSchema, 404: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    const input = parseBody(SnoozeCommandInputSchema, { ...bodyObject(request.body), id });
    const updated = await updateCommand(deps.db, context, id, {
      status: "snoozed",
      snoozedUntil: new Date(input.snoozedUntil)
    });
    return { item: mapCommand(updated) };
  });

  app.post("/commands/:id/dismiss", {
    schema: commandActionSchema("Dismiss a command item")
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    const updated = await updateCommand(deps.db, context, id, { status: "dismissed" });
    return { item: mapCommand(updated) };
  });

  app.post("/commands/:id/mark-done", {
    schema: commandActionSchema("Mark a command item done")
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    const updated = await updateCommand(deps.db, context, id, { status: "done" });
    return { item: mapCommand(updated) };
  });

  app.get("/approvals", {
    schema: {
      tags: ["Approvals"],
      summary: "List approval requests",
      headers: internalHeadersSchema,
      querystring: listApprovalsQuerySchema,
      response: { 200: listApprovalsResponseSchema, 401: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const query = parseQuery(ListApprovalsQuerySchema, request.query);
    const conditions: SQL[] = [
      eq(approvalRequests.workspaceId, context.workspaceId),
      eq(approvalRequests.userId, context.userId)
    ];

    if (query.status) {
      conditions.push(eq(approvalRequests.status, query.status));
    }
    if (query.actionType) {
      conditions.push(eq(approvalRequests.actionType, query.actionType));
    }

    const where = and(...conditions);
    const offset = (query.page - 1) * query.pageSize;
    const rows = await deps.db
      .select()
      .from(approvalRequests)
      .where(where)
      .orderBy(desc(approvalRequests.createdAt))
      .limit(query.pageSize)
      .offset(offset);
    const totalRows = await deps.db
      .select({ total: count() })
      .from(approvalRequests)
      .where(where);
    const total = totalRows[0]?.total ?? 0;

    const response: ListApprovalsResponse = {
      approvals: rows.map(mapApproval),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / query.pageSize)
      }
    };

    return response;
  });

  app.post("/approvals", {
    schema: {
      tags: ["Approvals"],
      summary: "Create an approval request",
      headers: internalHeadersSchema,
      body: createApprovalBodySchema,
      response: { 201: approvalResponseSchema, 400: errorResponseSchema }
    }
  }, async (request, reply) => {
    const context = readContext(request);
    const input = parseBody(CreateApprovalInputSchema, request.body);

    if (input.commandItemId) {
      await requireCommand(deps.db, context.workspaceId, context.userId, input.commandItemId);
    }

    const [created] = await deps.db
      .insert(approvalRequests)
      .values({
        workspaceId: context.workspaceId,
        userId: context.userId,
        commandItemId: input.commandItemId ?? null,
        actionType: input.actionType,
        payload: input.payload,
        status: "pending"
      })
      .returning();

    if (!created) {
      throw new AppError({ code: ErrorCode.INTERNAL_ERROR, message: "Unable to create approval request" });
    }

    reply.code(201).send({ approval: mapApproval(created) });
  });

  app.post("/approvals/:id/approve", {
    schema: approvalActionSchema("Approve an action")
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    const approval = await requirePendingApproval(deps.db, context.workspaceId, context.userId, id);
    const now = new Date();
    const execution = executionOutcome(approval.actionType);
    const [updated] = await deps.db
      .update(approvalRequests)
      .set({
        status: execution.status,
        approvedAt: now,
        executedAt: now,
        errorMessage: execution.errorMessage,
        updatedAt: now
      })
      .where(eq(approvalRequests.id, approval.id))
      .returning();

    return { approval: mapApproval(updated ?? approval) };
  });

  app.post("/approvals/:id/reject", {
    schema: approvalActionSchema("Reject an action")
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    const approval = await requirePendingApproval(deps.db, context.workspaceId, context.userId, id);
    const now = new Date();
    const [updated] = await deps.db
      .update(approvalRequests)
      .set({
        status: "rejected",
        rejectedAt: now,
        updatedAt: now
      })
      .where(eq(approvalRequests.id, approval.id))
      .returning();

    return { approval: mapApproval(updated ?? approval) };
  });
}

async function resolveSource(
  db: Database,
  workspaceId: string,
  sourceType: CommandSourceType,
  sourceId: string | undefined
): Promise<{ providerId: string | null; summary: string | null }> {
  if (sourceType === "manual") {
    return { providerId: null, summary: null };
  }

  if (!sourceId) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "sourceId is required for email and calendar command items"
    });
  }

  if (sourceType === "email") {
    const [thread] = await db
      .select()
      .from(mailThreads)
      .where(and(eq(mailThreads.workspaceId, workspaceId), eq(mailThreads.id, sourceId)))
      .limit(1);

    if (thread) {
      return {
        providerId: thread.providerThreadId,
        summary: thread.snippet
      };
    }

    const [message] = await db
      .select()
      .from(mailMessages)
      .where(and(eq(mailMessages.workspaceId, workspaceId), eq(mailMessages.id, sourceId)))
      .limit(1);

    if (message) {
      return {
        providerId: message.providerMessageId,
        summary: message.snippet ?? message.bodyText
      };
    }
  }

  if (sourceType === "calendar") {
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.workspaceId, workspaceId), eq(calendarEvents.id, sourceId)))
      .limit(1);

    if (event) {
      return {
        providerId: event.providerEventId,
        summary: event.description
      };
    }
  }

  throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Command source was not found in the local cache" });
}

function suggestAction(sourceType: CommandSourceType, title: string, summary: string | null | undefined): string | null {
  const text = `${title} ${summary ?? ""}`.toLowerCase();
  const meetingWords = ["meet", "meeting", "call", "schedule", "availability"];

  if (meetingWords.some((word) => text.includes(word))) {
    return "schedule_meeting";
  }

  if (sourceType === "email" && (text.includes("?") || text.includes("please") || text.includes("can you"))) {
    return "draft_reply";
  }

  return null;
}

async function updateCommand(
  db: Database,
  context: { workspaceId: string; userId: string },
  id: string,
  changes: Partial<{
    status: CommandStatus;
    snoozedUntil: Date | null;
  }>
) {
  await requireCommand(db, context.workspaceId, context.userId, id);
  const [updated] = await db
    .update(commandItems)
    .set({
      ...changes,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(commandItems.workspaceId, context.workspaceId),
        eq(commandItems.userId, context.userId),
        eq(commandItems.id, id)
      )
    )
    .returning();

  if (!updated) {
    throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Command item not found" });
  }

  return updated;
}

async function requireCommand(db: Database, workspaceId: string, userId: string, id: string): Promise<void> {
  const item = await findCommand(db, workspaceId, userId, id);
  if (!item) {
    throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Command item not found" });
  }
}

async function findCommand(db: Database, workspaceId: string, userId: string, id: string) {
  const [item] = await db
    .select()
    .from(commandItems)
    .where(
      and(
        eq(commandItems.workspaceId, workspaceId),
        eq(commandItems.userId, userId),
        eq(commandItems.id, id)
      )
    )
    .limit(1);

  return item;
}

async function requirePendingApproval(db: Database, workspaceId: string, userId: string, id: string) {
  const [approval] = await db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.workspaceId, workspaceId),
        eq(approvalRequests.userId, userId),
        eq(approvalRequests.id, id)
      )
    )
    .limit(1);

  if (!approval) {
    throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Approval request not found" });
  }

  if (approval.status !== "pending") {
    throw new AppError({ code: ErrorCode.CONFLICT, message: "Approval request is already resolved" });
  }

  return approval;
}

function executionOutcome(actionType: string): { status: "executed" | "failed"; errorMessage: string | null } {
  const liveActions = new Set([
    "create_email_draft",
    "send_email",
    "create_calendar_event",
    "update_calendar_event",
    "delete_calendar_event"
  ]);

  if (liveActions.has(actionType)) {
    return {
      status: "failed",
      errorMessage: "Live action execution is not configured yet. The approval was recorded but no provider action was performed."
    };
  }

  return { status: "executed", errorMessage: null };
}

function readContext(request: FastifyRequest) {
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

function mapCommand(row: typeof commandItems.$inferSelect): CommandItem {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    sourceType: row.sourceType as CommandSourceType,
    sourceId: row.sourceId,
    sourceProviderId: row.sourceProviderId,
    title: row.title,
    summary: row.summary,
    intent: row.intent as CommandIntent,
    priority: row.priority as CommandPriority,
    status: row.status as CommandStatus,
    suggestedAction: row.suggestedAction,
    dueAt: iso(row.dueAt),
    snoozedUntil: iso(row.snoozedUntil),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapApproval(row: typeof approvalRequests.$inferSelect): ApprovalRequest {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    commandItemId: row.commandItemId,
    actionType: row.actionType,
    payload: row.payload,
    status: row.status as ApprovalRequest["status"],
    approvedAt: iso(row.approvedAt),
    rejectedAt: iso(row.rejectedAt),
    executedAt: iso(row.executedAt),
    errorMessage: row.errorMessage,
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
  const result = IdParamsSchema.safeParse(params);
  if (!result.success) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid id" });
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

function commandActionSchema(summary: string) {
  return {
    tags: ["Commands"],
    summary,
    headers: internalHeadersSchema,
    params: idParamsSchema,
    response: { 200: commandResponseSchema, 404: errorResponseSchema }
  } as const;
}

function approvalActionSchema(summary: string) {
  return {
    tags: ["Approvals"],
    summary,
    headers: internalHeadersSchema,
    params: idParamsSchema,
    response: { 200: approvalResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema }
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

const paginationQueryProperties = {
  page: { type: "integer", minimum: 1, default: 1 },
  pageSize: { type: "integer", minimum: 1, maximum: 100, default: 25 }
} as const;

const listCommandsQuerySchema = {
  type: "object",
  properties: {
    ...paginationQueryProperties,
    status: { type: "string", enum: ["open", "snoozed", "waiting", "done", "dismissed", "failed"] },
    priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
    intent: { type: "string", enum: ["manual", "draft_reply", "schedule_meeting", "follow_up"] }
  }
} as const;

const listApprovalsQuerySchema = {
  type: "object",
  properties: {
    ...paginationQueryProperties,
    status: { type: "string", enum: ["pending", "approved", "rejected", "executed", "failed"] },
    actionType: { type: "string" }
  }
} as const;

const createCommandBodySchema = {
  type: "object",
  required: ["title"],
  properties: {
    sourceType: { type: "string", enum: ["email", "calendar", "manual"], default: "manual" },
    sourceId: { type: "string", format: "uuid" },
    sourceProviderId: { type: "string" },
    title: { type: "string", minLength: 1 },
    summary: { type: "string" },
    intent: { type: "string", enum: ["manual", "draft_reply", "schedule_meeting", "follow_up"] },
    priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
    dueAt: { type: "string", format: "date-time" }
  }
} as const;

const updateStatusBodySchema = {
  type: "object",
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["open", "snoozed", "waiting", "done", "dismissed", "failed"] }
  }
} as const;

const snoozeBodySchema = {
  type: "object",
  required: ["snoozedUntil"],
  properties: {
    snoozedUntil: { type: "string", format: "date-time" }
  }
} as const;

const createApprovalBodySchema = {
  type: "object",
  required: ["actionType", "payload"],
  properties: {
    commandItemId: { type: "string", format: "uuid" },
    actionType: { type: "string", minLength: 1 },
    payload: { type: "object" }
  }
} as const;

const commandItemSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    sourceType: { type: "string", enum: ["email", "calendar", "manual"] },
    title: { type: "string" },
    summary: { type: "string", nullable: true },
    intent: { type: "string" },
    priority: { type: "string" },
    status: { type: "string" },
    suggestedAction: { type: "string", nullable: true },
    dueAt: { type: "string", nullable: true, format: "date-time" },
    snoozedUntil: { type: "string", nullable: true, format: "date-time" }
  }
} as const;

const approvalSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    commandItemId: { type: "string", nullable: true, format: "uuid" },
    actionType: { type: "string" },
    payload: { type: "object" },
    status: { type: "string" },
    approvedAt: { type: "string", nullable: true, format: "date-time" },
    rejectedAt: { type: "string", nullable: true, format: "date-time" },
    executedAt: { type: "string", nullable: true, format: "date-time" },
    errorMessage: { type: "string", nullable: true }
  }
} as const;

const commandResponseSchema = {
  type: "object",
  properties: {
    item: commandItemSchema
  }
} as const;

const approvalResponseSchema = {
  type: "object",
  properties: {
    approval: approvalSchema
  }
} as const;

const listCommandsResponseSchema = {
  type: "object",
  properties: {
    items: { type: "array", items: commandItemSchema },
    pagination: { type: "object" }
  }
} as const;

const listApprovalsResponseSchema = {
  type: "object",
  properties: {
    approvals: { type: "array", items: approvalSchema },
    pagination: { type: "object" }
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
