import { and, count, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  CreateCalendarEventInputSchema,
  GetAvailabilityInputSchema,
  SyncCalendarInputSchema,
  UpdateCalendarEventInputSchema,
  type AvailabilityResponse,
  type CalendarEvent,
  type ListCalendarEventsResponse
} from "@actiondesk/contracts";
import {
  calendarEvents,
  connectedAccounts,
  syncRuns,
  type Database
} from "@actiondesk/db";
import { AppError, ErrorCode } from "@actiondesk/errors";
import { z } from "zod";

export type CalendarRouteDeps = {
  db: Database;
};

const EventIdParamsSchema = z.object({
  id: z.string().uuid()
});

const ListEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional()
});

export async function registerCalendarRoutes(app: FastifyInstance, deps: CalendarRouteDeps): Promise<void> {
  app.get("/calendar/events", {
    schema: {
      tags: ["Calendar"],
      summary: "List cached Google Calendar events",
      headers: internalHeadersSchema,
      querystring: listEventsQuerySchema,
      response: { 200: listEventsResponseSchema, 401: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const query = parseQuery(ListEventsQuerySchema, request.query);
    const conditions: SQL[] = [eq(calendarEvents.workspaceId, context.workspaceId)];

    if (query.startAt) {
      conditions.push(gte(calendarEvents.startAt, new Date(query.startAt)));
    }

    if (query.endAt) {
      conditions.push(lte(calendarEvents.endAt, new Date(query.endAt)));
    }

    const where = and(...conditions);
    const offset = (query.page - 1) * query.pageSize;
    const rows = await deps.db
      .select()
      .from(calendarEvents)
      .where(where)
      .orderBy(desc(calendarEvents.startAt), desc(calendarEvents.createdAt))
      .limit(query.pageSize)
      .offset(offset);
    const totalRows = await deps.db
      .select({ total: count() })
      .from(calendarEvents)
      .where(where);
    const total = totalRows[0]?.total ?? 0;

    const response: ListCalendarEventsResponse = {
      events: rows.map(mapEvent),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / query.pageSize)
      }
    };

    return response;
  });

  app.get("/calendar/events/:id", {
    schema: {
      tags: ["Calendar"],
      summary: "Get a cached Google Calendar event",
      headers: internalHeadersSchema,
      params: idParamsSchema,
      response: { 200: eventResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    const event = await findEvent(deps.db, context.workspaceId, id);

    if (!event) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Calendar event not found" });
    }

    return { event: mapEvent(event) };
  });

  app.post("/calendar/sync", {
    schema: {
      tags: ["Calendar"],
      summary: "Sync Google Calendar into the local cache",
      headers: internalHeadersSchema,
      body: syncCalendarBodySchema,
      response: { 501: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    parseBody(SyncCalendarInputSchema, request.body ?? {});
    await requireConnectedAccount(deps.db, context.workspaceId);
    await recordFailedSync(
      deps.db,
      context.workspaceId,
      "Live Google Calendar sync is not configured yet. Add the real Corsair Calendar adapter to enable sync."
    );
    throw notConfigured("Live Calendar sync is not configured yet. Add Corsair SDK credentials to enable Calendar sync.");
  });

  app.post("/calendar/availability", {
    schema: {
      tags: ["Calendar"],
      summary: "Calculate availability from cached events",
      headers: internalHeadersSchema,
      body: availabilityBodySchema,
      response: { 200: availabilityResponseSchema, 401: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const input = parseBody(GetAvailabilityInputSchema, request.body);
    return getAvailability(deps.db, context.workspaceId, input);
  });

  app.post("/calendar/events", {
    schema: {
      tags: ["Calendar"],
      summary: "Create a Google Calendar event after approval",
      headers: internalHeadersSchema,
      body: createEventBodySchema,
      response: { 501: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    parseBody(CreateCalendarEventInputSchema, request.body);
    await requireConnectedAccount(deps.db, context.workspaceId);
    throw notConfigured("Live Calendar event creation is not configured yet. Add Corsair SDK credentials to enable event creation.");
  });

  app.patch("/calendar/events/:id", {
    schema: {
      tags: ["Calendar"],
      summary: "Update a Google Calendar event after approval",
      headers: internalHeadersSchema,
      params: idParamsSchema,
      body: updateEventBodySchema,
      response: { 501: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    parseBody(UpdateCalendarEventInputSchema, { ...bodyObject(request.body), id });
    await requireExistingEvent(deps.db, context.workspaceId, id);
    await requireConnectedAccount(deps.db, context.workspaceId);
    throw notConfigured("Live Calendar event update is not configured yet. Add Corsair SDK credentials to enable event updates.");
  });

  app.delete("/calendar/events/:id", {
    schema: {
      tags: ["Calendar"],
      summary: "Delete a Google Calendar event after approval",
      headers: internalHeadersSchema,
      params: idParamsSchema,
      response: { 501: errorResponseSchema }
    }
  }, async (request) => {
    const context = readContext(request);
    const { id } = parseParams(request.params);
    await requireExistingEvent(deps.db, context.workspaceId, id);
    await requireConnectedAccount(deps.db, context.workspaceId);
    throw notConfigured("Live Calendar event deletion is not configured yet. Add Corsair SDK credentials to enable event deletion.");
  });
}

async function getAvailability(
  db: Database,
  workspaceId: string,
  input: z.infer<typeof GetAvailabilityInputSchema>
): Promise<AvailabilityResponse> {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);

  if (end <= start) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "endAt must be after startAt" });
  }

  const rows = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.workspaceId, workspaceId),
        lte(calendarEvents.startAt, end),
        gte(calendarEvents.endAt, start)
      )
    )
    .orderBy(desc(calendarEvents.startAt));

  const busy = rows
    .filter((event) => event.startAt && event.endAt)
    .map((event) => ({
      startAt: event.startAt as Date,
      endAt: event.endAt as Date
    }))
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime());

  if (busy.length === 0) {
    return {
      slots: [],
      message: "No cached calendar events are available for this range. Run Calendar sync after connecting Google Calendar."
    };
  }

  const durationMs = input.durationMinutes * 60 * 1000;
  const slots: AvailabilityResponse["slots"] = [];
  let cursor = start;

  for (const event of busy) {
    if (event.startAt.getTime() - cursor.getTime() >= durationMs) {
      slots.push({ startAt: cursor.toISOString(), endAt: event.startAt.toISOString() });
    }

    if (event.endAt > cursor) {
      cursor = event.endAt;
    }
  }

  if (end.getTime() - cursor.getTime() >= durationMs) {
    slots.push({ startAt: cursor.toISOString(), endAt: end.toISOString() });
  }

  return { slots };
}

async function requireExistingEvent(db: Database, workspaceId: string, id: string): Promise<void> {
  const event = await findEvent(db, workspaceId, id);
  if (!event) {
    throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Calendar event not found" });
  }
}

async function findEvent(db: Database, workspaceId: string, id: string) {
  const [event] = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.workspaceId, workspaceId), eq(calendarEvents.id, id)))
    .limit(1);

  return event;
}

async function requireConnectedAccount(db: Database, workspaceId: string): Promise<void> {
  const [account] = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.workspaceId, workspaceId),
        eq(connectedAccounts.provider, "google_calendar")
      )
    )
    .limit(1);

  if (!account || account.status !== "connected") {
    throw new AppError({
      code: ErrorCode.BAD_REQUEST,
      message: "Google Calendar is not connected for this workspace."
    });
  }
}

async function recordFailedSync(db: Database, workspaceId: string, errorMessage: string): Promise<void> {
  const now = new Date();
  await db.insert(syncRuns).values({
    workspaceId,
    provider: "google_calendar",
    syncType: "manual",
    status: "failed",
    startedAt: now,
    finishedAt: now,
    errorMessage,
    metadata: null
  });
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

function mapEvent(row: typeof calendarEvents.$inferSelect): CalendarEvent {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    provider: "google_calendar",
    providerEventId: row.providerEventId,
    title: row.title,
    description: row.description,
    location: row.location,
    startAt: iso(row.startAt),
    endAt: iso(row.endAt),
    timezone: row.timezone,
    attendees: row.attendees,
    status: row.status,
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
  const result = EventIdParamsSchema.safeParse(params);
  if (!result.success) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid event id" });
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

const listEventsQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100, default: 25 },
    startAt: { type: "string", format: "date-time" },
    endAt: { type: "string", format: "date-time" }
  }
} as const;

const syncCalendarBodySchema = {
  type: "object",
  properties: {
    startAt: { type: "string", format: "date-time" },
    endAt: { type: "string", format: "date-time" },
    limit: { type: "integer", minimum: 1, maximum: 250, default: 100 }
  }
} as const;

const availabilityBodySchema = {
  type: "object",
  required: ["startAt", "endAt"],
  properties: {
    startAt: { type: "string", format: "date-time" },
    endAt: { type: "string", format: "date-time" },
    durationMinutes: { type: "integer", minimum: 15, maximum: 480, default: 30 }
  }
} as const;

const createEventBodySchema = {
  type: "object",
  required: ["title", "startAt", "endAt"],
  properties: {
    title: { type: "string", minLength: 1 },
    description: { type: "string" },
    location: { type: "string" },
    startAt: { type: "string", format: "date-time" },
    endAt: { type: "string", format: "date-time" },
    timezone: { type: "string" },
    attendees: { type: "array", items: { type: "string", format: "email" } }
  }
} as const;

const updateEventBodySchema = {
  type: "object",
  properties: createEventBodySchema.properties
} as const;

const calendarEventSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string", nullable: true },
    description: { type: "string", nullable: true },
    location: { type: "string", nullable: true },
    startAt: { type: "string", nullable: true, format: "date-time" },
    endAt: { type: "string", nullable: true, format: "date-time" },
    attendees: { type: "array", nullable: true, items: { type: "string" } }
  }
} as const;

const listEventsResponseSchema = {
  type: "object",
  properties: {
    events: { type: "array", items: calendarEventSchema },
    pagination: { type: "object" }
  }
} as const;

const eventResponseSchema = {
  type: "object",
  properties: {
    event: calendarEventSchema
  }
} as const;

const availabilityResponseSchema = {
  type: "object",
  properties: {
    slots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          startAt: { type: "string", format: "date-time" },
          endAt: { type: "string", format: "date-time" }
        }
      }
    },
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
        code: { type: "string" },
        message: { type: "string" },
        requestId: { type: "string" }
      }
    }
  }
} as const;
