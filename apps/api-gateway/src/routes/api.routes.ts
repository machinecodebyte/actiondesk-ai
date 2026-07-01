import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  ApproveActionInputSchema,
  CreateApprovalInputSchema,
  CreateCalendarEventInputSchema,
  CreateCommandItemInputSchema,
  CreateDraftReplyInputSchema,
  CompleteConnectionInputSchema,
  CreateWorkspaceInputSchema,
  GetAvailabilityInputSchema,
  GetCalendarEventInputSchema,
  GetCommandItemInputSchema,
  GetMailThreadInputSchema,
  IntegrationProviderSchema,
  ListApprovalsInputSchema,
  ListCalendarEventsInputSchema,
  ListCommandItemsInputSchema,
  ListMailThreadsInputSchema,
  LoginInputSchema,
  LogoutInputSchema,
  RefreshSessionInputSchema,
  RegisterInputSchema,
  RejectActionInputSchema,
  SnoozeCommandInputSchema,
  StartConnectionInputSchema,
  SyncCalendarInputSchema,
  SyncMailInputSchema,
  SwitchWorkspaceInputSchema,
  UpdateCalendarEventInputSchema,
  UpdateCommandStatusInputSchema,
  type CurrentUser,
  type IntegrationProvider
} from "@actiondesk/contracts";
import { AppError, ErrorCode } from "@actiondesk/errors";
import { createAuthServiceClient } from "../clients/auth-service.client.js";
import { createCalendarServiceClient } from "../clients/calendar-service.client.js";
import { createCommandServiceClient } from "../clients/command-service.client.js";
import { createIntegrationServiceClient } from "../clients/integration-service.client.js";
import { createMailServiceClient } from "../clients/mail-service.client.js";
import { ServiceClientError } from "../clients/internal-http-client.js";
import {
  clearSessionCookieHeaders,
  createAuthContext,
  sessionCookieHeaders
} from "../foundation/auth-context.js";
import type { GatewayEnv } from "../foundation/env.js";
import { getGatewayHealth, getGatewayReadiness } from "../foundation/health.js";
import type { ServiceRegistry } from "../foundation/service-registry.js";

export type ApiRoutesOptions = {
  env: GatewayEnv;
  services: ServiceRegistry;
};

export async function registerApiRoutes(
  app: FastifyInstance,
  options: ApiRoutesOptions
): Promise<void> {
  app.get("/api/health", {
    schema: {
      tags: ["Health"],
      summary: "Get API Gateway health",
      response: { 200: healthResponseSchema }
    }
  }, async () => getGatewayHealth(options.services, options.env.REQUEST_TIMEOUT_MS));

  app.get("/api/ready", {
    schema: {
      tags: ["Health"],
      summary: "Get API Gateway readiness",
      response: { 200: readinessResponseSchema, 503: readinessResponseSchema }
    }
  }, async (_request, reply) => {
    const readiness = await getGatewayReadiness(options.services, options.env.REQUEST_TIMEOUT_MS);
    if (!readiness.ready) {
      reply.code(503);
    }
    return readiness;
  });

  app.post("/api/auth/register", {
    schema: {
      tags: ["Auth"],
      summary: "Register a user and default workspace",
      body: registerBodySchema,
      response: { 201: authResponseSchema, 400: errorResponseSchema, 409: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const response = await authClient(options).register(
        parseBody(RegisterInputSchema, request.body)
      );
      setSessionCookies(reply, response.session);
      reply.code(201).send(response);
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/auth/login", {
    schema: {
      tags: ["Auth"],
      summary: "Log in with email and password",
      body: loginBodySchema,
      response: { 200: authResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const response = await authClient(options).login(parseBody(LoginInputSchema, request.body));
      setSessionCookies(reply, response.session);
      return response;
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/auth/refresh", {
    schema: {
      tags: ["Auth"],
      summary: "Refresh the current session",
      body: refreshBodySchema,
      response: { 200: authResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const auth = createAuthContext(request);
      const input = parseBody(RefreshSessionInputSchema, bodyObject(request.body));
      const refreshToken = input.refreshToken ?? auth.refreshToken;
      if (!refreshToken) {
        throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Missing refresh token" });
      }

      const response = await authClient(options).refresh({ refreshToken });
      setSessionCookies(reply, response.session);
      return response;
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/auth/logout", {
    schema: {
      tags: ["Auth"],
      summary: "Log out and clear session cookies",
      security: [{ bearerAuth: [] }],
      body: logoutBodySchema,
      response: { 200: successResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const auth = createAuthContext(request);
      const input = parseBody(LogoutInputSchema, bodyObject(request.body));
      const refreshToken = input.refreshToken ?? auth.refreshToken;
      const response = await authClient(options).logout(
        refreshToken ? { refreshToken } : {},
        optionalAuthHeaders(request)
      );
      clearSessionCookies(reply);
      return response;
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.get("/api/auth/me", {
    schema: {
      tags: ["Auth"],
      summary: "Get the current authenticated user",
      security: [{ bearerAuth: [] }],
      response: { 200: currentUserSchema, 401: errorResponseSchema, 403: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      return await authClient(options).me(authHeaders(request));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.get("/api/workspaces", {
    schema: {
      tags: ["Workspaces"],
      summary: "List current user workspaces",
      security: [{ bearerAuth: [] }],
      response: { 200: workspaceListResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      return await authClient(options).listWorkspaces(authHeaders(request));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/workspaces", {
    schema: {
      tags: ["Workspaces"],
      summary: "Create a workspace",
      security: [{ bearerAuth: [] }],
      body: createWorkspaceBodySchema,
      response: { 201: workspaceResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const response = await authClient(options).createWorkspace(
        parseBody(CreateWorkspaceInputSchema, request.body),
        authHeaders(request)
      );
      reply.code(201).send(response);
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/workspaces/switch", {
    schema: {
      tags: ["Workspaces"],
      summary: "Switch the active workspace",
      security: [{ bearerAuth: [] }],
      body: switchWorkspaceBodySchema,
      response: { 200: switchWorkspaceResponseSchema, 400: errorResponseSchema, 403: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const response = await authClient(options).switchWorkspace(
        parseBody(SwitchWorkspaceInputSchema, request.body),
        authHeaders(request)
      );
      reply.header("set-cookie", sessionCookieHeaders({
        accessToken: response.accessToken,
        refreshToken: createAuthContext(request).refreshToken ?? ""
      }).slice(0, 1));
      return response;
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.get("/api/integrations/status", {
    schema: {
      tags: ["Integrations"],
      summary: "Get Gmail and Google Calendar connection status",
      security: [{ bearerAuth: [] }],
      response: { 200: integrationStatusResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      return await integrationClient(options).status(internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/integrations/:provider/connect/start", {
    schema: {
      tags: ["Integrations"],
      summary: "Start a provider connection",
      security: [{ bearerAuth: [] }],
      params: providerParamsSchema,
      body: startConnectionBodySchema,
      response: { 200: startConnectionResponseSchema, 400: errorResponseSchema, 501: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const provider = providerParam(request.params);
      const user = await currentUser(options, request);
      const input = parseBody(StartConnectionInputSchema, {
        ...bodyObject(request.body),
        provider
      });
      return await integrationClient(options).startConnection(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/integrations/:provider/connect/complete", {
    schema: {
      tags: ["Integrations"],
      summary: "Complete a provider OAuth callback",
      security: [{ bearerAuth: [] }],
      params: providerParamsSchema,
      body: completeConnectionBodySchema,
      response: { 200: connectedAccountResponseSchema, 400: errorResponseSchema, 501: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const provider = providerParam(request.params);
      const user = await currentUser(options, request);
      const input = parseBody(CompleteConnectionInputSchema, {
        ...bodyObject(request.body),
        provider
      });
      return await integrationClient(options).completeConnection(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/integrations/:provider/disconnect", {
    schema: {
      tags: ["Integrations"],
      summary: "Disconnect a provider locally",
      security: [{ bearerAuth: [] }],
      params: providerParamsSchema,
      response: { 200: disconnectResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const provider = providerParam(request.params);
      const user = await currentUser(options, request);
      return await integrationClient(options).disconnect(provider, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.get("/api/mail/threads", {
    schema: {
      tags: ["Mail"],
      summary: "List cached Gmail threads",
      security: [{ bearerAuth: [] }],
      querystring: mailThreadsQuerySchema,
      response: { 200: listMailThreadsResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = ListMailThreadsInputSchema.parse(normalizeQuery(request.query));
      return await mailClient(options).listThreads(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.get("/api/mail/threads/:id", {
    schema: phase2IdRouteSchema("Mail", "Get cached Gmail thread")
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = GetMailThreadInputSchema.parse(idInput(request.params));
      return await mailClient(options).getThread(input.id, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/mail/sync", {
    schema: {
      tags: ["Mail"],
      summary: "Sync Gmail into the local cache",
      security: [{ bearerAuth: [] }],
      body: syncMailBodySchema,
      response: { 200: genericObjectSchema, 400: errorResponseSchema, 501: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = SyncMailInputSchema.parse(bodyObject(request.body));
      return await mailClient(options).sync(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/mail/threads/:id/draft-reply", {
    schema: {
      tags: ["Mail"],
      summary: "Create a Gmail draft reply after approval",
      security: [{ bearerAuth: [] }],
      params: idParamsSchema,
      body: draftReplyBodySchema,
      response: { 200: genericObjectSchema, 404: errorResponseSchema, 501: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = CreateDraftReplyInputSchema.parse({
        ...bodyObject(request.body),
        threadId: idInput(request.params).id
      });
      return await mailClient(options).createDraftReply(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  for (const route of [
    { path: "/api/mail/threads/:id/archive", action: "archive", summary: "Archive Gmail thread" },
    { path: "/api/mail/threads/:id/mark-read", action: "markRead", summary: "Mark Gmail thread read" },
    { path: "/api/mail/threads/:id/mark-unread", action: "markUnread", summary: "Mark Gmail thread unread" }
  ] as const) {
    app.post(route.path, {
      schema: phase2IdRouteSchema("Mail", route.summary)
    }, async (request, reply) => {
      try {
        const user = await currentUser(options, request);
        const input = GetMailThreadInputSchema.parse(idInput(request.params));
        return await mailClient(options)[route.action](input.id, internalHeaders(request, user));
      } catch (error) {
        return sendServiceError(reply, request, error);
      }
    });
  }

  app.get("/api/calendar/events", {
    schema: {
      tags: ["Calendar"],
      summary: "List cached Google Calendar events",
      security: [{ bearerAuth: [] }],
      querystring: calendarEventsQuerySchema,
      response: { 200: listCalendarEventsResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = ListCalendarEventsInputSchema.parse(normalizeQuery(request.query));
      return await calendarClient(options).listEvents(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.get("/api/calendar/events/:id", {
    schema: phase2IdRouteSchema("Calendar", "Get cached Google Calendar event")
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = GetCalendarEventInputSchema.parse(idInput(request.params));
      return await calendarClient(options).getEvent(input.id, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/calendar/sync", {
    schema: {
      tags: ["Calendar"],
      summary: "Sync Google Calendar into the local cache",
      security: [{ bearerAuth: [] }],
      body: syncCalendarBodySchema,
      response: { 200: genericObjectSchema, 400: errorResponseSchema, 501: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = SyncCalendarInputSchema.parse(bodyObject(request.body));
      return await calendarClient(options).sync(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/calendar/availability", {
    schema: {
      tags: ["Calendar"],
      summary: "Calculate availability from cached events",
      security: [{ bearerAuth: [] }],
      body: availabilityBodySchema,
      response: { 200: genericObjectSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = GetAvailabilityInputSchema.parse(bodyObject(request.body));
      return await calendarClient(options).availability(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/calendar/events", {
    schema: {
      tags: ["Calendar"],
      summary: "Create Google Calendar event after approval",
      security: [{ bearerAuth: [] }],
      body: createCalendarEventBodySchema,
      response: { 200: genericObjectSchema, 501: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = CreateCalendarEventInputSchema.parse(bodyObject(request.body));
      return await calendarClient(options).createEvent(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.patch("/api/calendar/events/:id", {
    schema: {
      tags: ["Calendar"],
      summary: "Update Google Calendar event after approval",
      security: [{ bearerAuth: [] }],
      params: idParamsSchema,
      body: createCalendarEventBodySchema,
      response: { 200: genericObjectSchema, 404: errorResponseSchema, 501: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = UpdateCalendarEventInputSchema.parse({
        ...bodyObject(request.body),
        id: idInput(request.params).id
      });
      return await calendarClient(options).updateEvent(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.delete("/api/calendar/events/:id", {
    schema: phase2IdRouteSchema("Calendar", "Delete Google Calendar event after approval")
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = GetCalendarEventInputSchema.parse(idInput(request.params));
      return await calendarClient(options).deleteEvent(input.id, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.get("/api/commands", {
    schema: {
      tags: ["Commands"],
      summary: "List command items",
      security: [{ bearerAuth: [] }],
      querystring: commandsQuerySchema,
      response: { 200: listCommandsResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = ListCommandItemsInputSchema.parse(normalizeQuery(request.query));
      return await commandClient(options).list(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.get("/api/commands/:id", {
    schema: phase2IdRouteSchema("Commands", "Get command item")
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = GetCommandItemInputSchema.parse(idInput(request.params));
      return await commandClient(options).getById(input.id, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/commands", {
    schema: {
      tags: ["Commands"],
      summary: "Create command item",
      security: [{ bearerAuth: [] }],
      body: createCommandBodySchema,
      response: { 201: genericObjectSchema, 400: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = CreateCommandItemInputSchema.parse(bodyObject(request.body));
      const response = await commandClient(options).create(input, internalHeaders(request, user));
      reply.code(201).send(response);
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.patch("/api/commands/:id/status", {
    schema: {
      tags: ["Commands"],
      summary: "Update command status",
      security: [{ bearerAuth: [] }],
      params: idParamsSchema,
      body: updateCommandStatusBodySchema,
      response: { 200: genericObjectSchema, 404: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = UpdateCommandStatusInputSchema.parse({
        ...bodyObject(request.body),
        id: idInput(request.params).id
      });
      return await commandClient(options).updateStatus(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/commands/:id/snooze", {
    schema: {
      tags: ["Commands"],
      summary: "Snooze command item",
      security: [{ bearerAuth: [] }],
      params: idParamsSchema,
      body: snoozeCommandBodySchema,
      response: { 200: genericObjectSchema, 404: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = SnoozeCommandInputSchema.parse({
        ...bodyObject(request.body),
        id: idInput(request.params).id
      });
      return await commandClient(options).snooze(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  for (const route of [
    { path: "/api/commands/:id/dismiss", action: "dismiss", summary: "Dismiss command item" },
    { path: "/api/commands/:id/mark-done", action: "markDone", summary: "Mark command item done" }
  ] as const) {
    app.post(route.path, {
      schema: phase2IdRouteSchema("Commands", route.summary)
    }, async (request, reply) => {
      try {
        const user = await currentUser(options, request);
        const input = GetCommandItemInputSchema.parse(idInput(request.params));
        return await commandClient(options)[route.action](input.id, internalHeaders(request, user));
      } catch (error) {
        return sendServiceError(reply, request, error);
      }
    });
  }

  app.get("/api/approvals", {
    schema: {
      tags: ["Approvals"],
      summary: "List approval requests",
      security: [{ bearerAuth: [] }],
      querystring: approvalsQuerySchema,
      response: { 200: listApprovalsResponseSchema, 401: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = ListApprovalsInputSchema.parse(normalizeQuery(request.query));
      return await commandClient(options).listApprovals(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/approvals", {
    schema: {
      tags: ["Approvals"],
      summary: "Create approval request",
      security: [{ bearerAuth: [] }],
      body: createApprovalBodySchema,
      response: { 201: genericObjectSchema, 400: errorResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = CreateApprovalInputSchema.parse(bodyObject(request.body));
      const response = await commandClient(options).createApproval(input, internalHeaders(request, user));
      reply.code(201).send(response);
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/approvals/:id/approve", {
    schema: phase2IdRouteSchema("Approvals", "Approve action")
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = ApproveActionInputSchema.parse(idInput(request.params));
      return await commandClient(options).approve(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });

  app.post("/api/approvals/:id/reject", {
    schema: phase2IdRouteSchema("Approvals", "Reject action")
  }, async (request, reply) => {
    try {
      const user = await currentUser(options, request);
      const input = RejectActionInputSchema.parse(idInput(request.params));
      return await commandClient(options).reject(input, internalHeaders(request, user));
    } catch (error) {
      return sendServiceError(reply, request, error);
    }
  });
}

function authClient(options: ApiRoutesOptions) {
  const service = options.services.byName.get("auth-service");
  if (!service) {
    throw new AppError({ code: ErrorCode.SERVICE_UNAVAILABLE, message: "auth-service is not registered" });
  }

  return createAuthServiceClient(service.url, options.env.REQUEST_TIMEOUT_MS);
}

function integrationClient(options: ApiRoutesOptions) {
  const service = options.services.byName.get("integration-service");
  if (!service) {
    throw new AppError({
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: "integration-service is not registered"
    });
  }

  return createIntegrationServiceClient(service.url, options.env.REQUEST_TIMEOUT_MS);
}

function mailClient(options: ApiRoutesOptions) {
  const service = options.services.byName.get("mail-service");
  if (!service) {
    throw new AppError({ code: ErrorCode.SERVICE_UNAVAILABLE, message: "mail-service is not registered" });
  }

  return createMailServiceClient(service.url, options.env.REQUEST_TIMEOUT_MS);
}

function calendarClient(options: ApiRoutesOptions) {
  const service = options.services.byName.get("calendar-service");
  if (!service) {
    throw new AppError({
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: "calendar-service is not registered"
    });
  }

  return createCalendarServiceClient(service.url, options.env.REQUEST_TIMEOUT_MS);
}

function commandClient(options: ApiRoutesOptions) {
  const service = options.services.byName.get("command-service");
  if (!service) {
    throw new AppError({
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: "command-service is not registered"
    });
  }

  return createCommandServiceClient(service.url, options.env.REQUEST_TIMEOUT_MS);
}

async function currentUser(options: ApiRoutesOptions, request: FastifyRequest): Promise<CurrentUser> {
  return authClient(options).me(authHeaders(request));
}

function authHeaders(request: FastifyRequest): Record<string, string> {
  const auth = createAuthContext(request);
  if (!auth.authorizationHeader) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Missing access token" });
  }

  return {
    authorization: auth.authorizationHeader,
    "x-actiondesk-request-id": request.id
  };
}

function optionalAuthHeaders(request: FastifyRequest): Record<string, string> {
  const auth = createAuthContext(request);
  return {
    "x-actiondesk-request-id": request.id,
    ...(auth.authorizationHeader ? { authorization: auth.authorizationHeader } : {})
  };
}

function internalHeaders(request: FastifyRequest, user: CurrentUser): Record<string, string> {
  if (!user.activeWorkspace) {
    throw new AppError({ code: ErrorCode.FORBIDDEN, message: "No active workspace is selected" });
  }

  return {
    "x-actiondesk-user-id": user.id,
    "x-actiondesk-workspace-id": user.activeWorkspace.id,
    "x-actiondesk-request-id": request.id
  };
}

function setSessionCookies(reply: FastifyReply, session: { accessToken: string; refreshToken: string }) {
  reply.header("set-cookie", sessionCookieHeaders(session));
}

function clearSessionCookies(reply: FastifyReply) {
  reply.header("set-cookie", clearSessionCookieHeaders());
}

function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid request body" });
  }

  return result.data;
}

function providerParam(params: unknown): IntegrationProvider {
  const value = typeof params === "object" && params !== null ? Reflect.get(params, "provider") : undefined;
  const result = IntegrationProviderSchema.safeParse(value);
  if (!result.success) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid integration provider" });
  }

  return result.data;
}

function bodyObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

function idInput(params: unknown): { id: string } {
  const value = typeof params === "object" && params !== null ? Reflect.get(params, "id") : undefined;
  return { id: String(value ?? "") };
}

function normalizeQuery(query: unknown): Record<string, unknown> {
  const input = typeof query === "object" && query !== null ? (query as Record<string, unknown>) : {};
  const normalized: Record<string, unknown> = { ...input };

  for (const key of ["page", "pageSize", "limit", "durationMinutes"]) {
    const value = normalized[key];
    if (typeof value === "string" && value.length > 0) {
      normalized[key] = Number(value);
    }
  }

  if (normalized.unread === "true") {
    normalized.unread = true;
  } else if (normalized.unread === "false") {
    normalized.unread = false;
  }

  return normalized;
}

function phase2IdRouteSchema(tag: string, summary: string) {
  return {
    tags: [tag],
    summary,
    security: [{ bearerAuth: [] }],
    params: idParamsSchema,
    response: { 200: genericObjectSchema, 404: errorResponseSchema, 501: errorResponseSchema }
  } as const;
}

function sendServiceError(reply: FastifyReply, request: FastifyRequest, error: unknown) {
  if (error instanceof ServiceClientError) {
    const response: {
      error: { code: string; message: string; requestId: string; details?: unknown };
    } = {
      error: {
        code: error.code,
        message: error.message,
        requestId: request.id
      }
    };

    if (error.details !== undefined) {
      response.error.details = error.details;
    }

    return reply.code(error.statusCode).send(response);
  }

  throw error;
}

const healthResponseSchema = {
  type: "object",
  properties: {
    service: { type: "string", example: "api-gateway" },
    status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
    uptime: { type: "number" },
    timestamp: { type: "string", format: "date-time" },
    checks: { type: "array", items: { type: "object" } }
  }
} as const;

const readinessResponseSchema = {
  type: "object",
  properties: {
    ready: { type: "boolean" },
    service: { type: "string", example: "api-gateway" },
    status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
    uptime: { type: "number" },
    timestamp: { type: "string", format: "date-time" },
    checks: { type: "array", items: { type: "object" } }
  }
} as const;

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
        accessToken: { type: "string", example: "short-lived-access-token" },
        refreshToken: { type: "string", example: "long-lived-refresh-token" },
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
  properties: {
    refreshToken: { type: "string", example: "long-lived-refresh-token" }
  }
} as const;

const logoutBodySchema = {
  type: "object",
  properties: {
    refreshToken: { type: "string", example: "long-lived-refresh-token" }
  }
} as const;

const successResponseSchema = {
  type: "object",
  required: ["ok"],
  properties: {
    ok: { type: "boolean", example: true }
  }
} as const;

const workspaceListResponseSchema = {
  type: "object",
  required: ["workspaces"],
  properties: {
    workspaces: { type: "array", items: workspaceSchema }
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
    accessToken: { type: "string", example: "short-lived-access-token" }
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

const providerParamsSchema = {
  type: "object",
  required: ["provider"],
  properties: {
    provider: { type: "string", enum: ["gmail", "google_calendar"] }
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

const idParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", format: "uuid" }
  }
} as const;

const pageQueryProperties = {
  page: { type: "integer", minimum: 1, default: 1 },
  pageSize: { type: "integer", minimum: 1, maximum: 100, default: 25 }
} as const;

const mailThreadsQuerySchema = {
  type: "object",
  properties: {
    ...pageQueryProperties,
    unread: { type: "boolean" },
    search: { type: "string" },
    fromEmail: { type: "string", format: "email" }
  }
} as const;

const calendarEventsQuerySchema = {
  type: "object",
  properties: {
    ...pageQueryProperties,
    startAt: { type: "string", format: "date-time" },
    endAt: { type: "string", format: "date-time" }
  }
} as const;

const commandsQuerySchema = {
  type: "object",
  properties: {
    ...pageQueryProperties,
    status: { type: "string", enum: ["open", "snoozed", "waiting", "done", "dismissed", "failed"] },
    priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
    intent: { type: "string", enum: ["manual", "draft_reply", "schedule_meeting", "follow_up"] }
  }
} as const;

const approvalsQuerySchema = {
  type: "object",
  properties: {
    ...pageQueryProperties,
    status: { type: "string", enum: ["pending", "approved", "rejected", "executed", "failed"] },
    actionType: { type: "string" }
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

const createCalendarEventBodySchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    location: { type: "string" },
    startAt: { type: "string", format: "date-time" },
    endAt: { type: "string", format: "date-time" },
    timezone: { type: "string" },
    attendees: { type: "array", items: { type: "string", format: "email" } }
  }
} as const;

const createCommandBodySchema = {
  type: "object",
  required: ["title"],
  properties: {
    sourceType: { type: "string", enum: ["email", "calendar", "manual"] },
    sourceId: { type: "string", format: "uuid" },
    sourceProviderId: { type: "string" },
    title: { type: "string", minLength: 1 },
    summary: { type: "string" },
    intent: { type: "string", enum: ["manual", "draft_reply", "schedule_meeting", "follow_up"] },
    priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
    dueAt: { type: "string", format: "date-time" }
  }
} as const;

const updateCommandStatusBodySchema = {
  type: "object",
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["open", "snoozed", "waiting", "done", "dismissed", "failed"] }
  }
} as const;

const snoozeCommandBodySchema = {
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
    actionType: { type: "string" },
    payload: { type: "object" }
  }
} as const;

const genericObjectSchema = {
  type: "object",
  additionalProperties: true
} as const;

const listMailThreadsResponseSchema = genericObjectSchema;
const listCalendarEventsResponseSchema = genericObjectSchema;
const listCommandsResponseSchema = genericObjectSchema;
const listApprovalsResponseSchema = genericObjectSchema;

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
        requestId: { type: "string" },
        details: {}
      }
    }
  }
} as const;
