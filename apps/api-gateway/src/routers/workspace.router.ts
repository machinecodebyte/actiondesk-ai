import { CreateWorkspaceInputSchema, SwitchWorkspaceInputSchema } from "@actiondesk/contracts";
import { TRPCError } from "@trpc/server";
import { createAuthServiceClient } from "../clients/auth-service.client.js";
import type { GatewayContext } from "../trpc/context.js";
import { publicProcedure, router } from "../trpc/procedures.js";
import { mapServiceError, requireAuthorizationHeader } from "./router-errors.js";

export const workspaceRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    try {
      return await authClient(ctx).listWorkspaces(authHeaders(ctx));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  create: publicProcedure.input(CreateWorkspaceInputSchema).mutation(async ({ ctx, input }) => {
    try {
      return await authClient(ctx).createWorkspace(input, authHeaders(ctx));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  switch: publicProcedure.input(SwitchWorkspaceInputSchema).mutation(async ({ ctx, input }) => {
    try {
      return await authClient(ctx).switchWorkspace(input, authHeaders(ctx));
    } catch (error) {
      return mapServiceError(error);
    }
  })
});

function authClient(ctx: GatewayContext) {
  const service = ctx.services.byName.get("auth-service");
  if (!service) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "auth-service is not registered" });
  }

  return createAuthServiceClient(service.url, ctx.env.REQUEST_TIMEOUT_MS);
}

function authHeaders(ctx: GatewayContext) {
  return {
    authorization: requireAuthorizationHeader(ctx.auth.authorizationHeader),
    "x-actiondesk-request-id": ctx.requestId
  };
}
