import {
  CompleteConnectionInputSchema,
  IntegrationProviderSchema,
  StartConnectionInputSchema,
  type CurrentUser
} from "@actiondesk/contracts";
import { TRPCError } from "@trpc/server";
import { createAuthServiceClient } from "../clients/auth-service.client.js";
import { createIntegrationServiceClient } from "../clients/integration-service.client.js";
import type { GatewayContext } from "../trpc/context.js";
import { publicProcedure, router } from "../trpc/procedures.js";
import { mapServiceError, requireAuthorizationHeader } from "./router-errors.js";

export const integrationsRouter = router({
  status: publicProcedure.query(async ({ ctx }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await integrationClient(ctx).status(internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  startConnection: publicProcedure.input(StartConnectionInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await integrationClient(ctx).startConnection(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  completeConnection: publicProcedure
    .input(CompleteConnectionInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await requireCurrentUser(ctx);
        return await integrationClient(ctx).completeConnection(input, internalHeaders(ctx, user));
      } catch (error) {
        return mapServiceError(error);
      }
    }),

  disconnect: publicProcedure.input(IntegrationProviderSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await integrationClient(ctx).disconnect(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  })
});

async function requireCurrentUser(ctx: GatewayContext) {
  try {
    return await authClient(ctx).me({
      authorization: requireAuthorizationHeader(ctx.auth.authorizationHeader),
      "x-actiondesk-request-id": ctx.requestId
    });
  } catch (error) {
    return mapServiceError(error);
  }
}

function authClient(ctx: GatewayContext) {
  const service = ctx.services.byName.get("auth-service");
  if (!service) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "auth-service is not registered" });
  }

  return createAuthServiceClient(service.url, ctx.env.REQUEST_TIMEOUT_MS);
}

function integrationClient(ctx: GatewayContext) {
  const service = ctx.services.byName.get("integration-service");
  if (!service) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "integration-service is not registered"
    });
  }

  return createIntegrationServiceClient(service.url, ctx.env.REQUEST_TIMEOUT_MS);
}

function internalHeaders(ctx: GatewayContext, user: CurrentUser) {
  if (!user.activeWorkspace) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active workspace is selected" });
  }

  return {
    "x-actiondesk-user-id": user.id,
    "x-actiondesk-workspace-id": user.activeWorkspace.id,
    "x-actiondesk-request-id": ctx.requestId
  };
}
