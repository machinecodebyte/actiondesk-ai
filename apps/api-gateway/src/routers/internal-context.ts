import type { CurrentUser } from "@actiondesk/contracts";
import { TRPCError } from "@trpc/server";
import { createAuthServiceClient } from "../clients/auth-service.client.js";
import type { GatewayContext } from "../trpc/context.js";
import type { ServiceName } from "../foundation/service-registry.js";
import { mapServiceError, requireAuthorizationHeader } from "./router-errors.js";

export async function requireCurrentUser(ctx: GatewayContext): Promise<CurrentUser> {
  const service = requireService(ctx, "auth-service");

  try {
    return await createAuthServiceClient(service.url, ctx.env.REQUEST_TIMEOUT_MS).me({
      authorization: requireAuthorizationHeader(ctx.auth.authorizationHeader),
      "x-actiondesk-request-id": ctx.requestId
    });
  } catch (error) {
    return mapServiceError(error);
  }
}

export function internalHeaders(ctx: GatewayContext, user: CurrentUser): Record<string, string> {
  if (!user.activeWorkspace) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active workspace is selected" });
  }

  return {
    "x-actiondesk-user-id": user.id,
    "x-actiondesk-workspace-id": user.activeWorkspace.id,
    "x-actiondesk-request-id": ctx.requestId
  };
}

export function requireService(ctx: GatewayContext, name: ServiceName) {
  const service = ctx.services.byName.get(name);

  if (!service) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${name} is not registered` });
  }

  return service;
}
