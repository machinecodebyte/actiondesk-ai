import {
  LoginInputSchema,
  LogoutInputSchema,
  RefreshSessionInputSchema,
  RegisterInputSchema
} from "@actiondesk/contracts";
import { TRPCError } from "@trpc/server";
import { createAuthServiceClient } from "../clients/auth-service.client.js";
import { clearSessionCookieHeaders, sessionCookieHeaders } from "../foundation/auth-context.js";
import type { GatewayContext } from "../trpc/context.js";
import { publicProcedure, router } from "../trpc/procedures.js";
import { mapServiceError, requireAuthorizationHeader } from "./router-errors.js";

export const authRouter = router({
  register: publicProcedure.input(RegisterInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const response = await authClient(ctx).register(input);
      setCookies(ctx, sessionCookieHeaders(response.session));
      return response;
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  login: publicProcedure.input(LoginInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const response = await authClient(ctx).login(input);
      setCookies(ctx, sessionCookieHeaders(response.session));
      return response;
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  refresh: publicProcedure.input(RefreshSessionInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const refreshToken = input.refreshToken ?? ctx.auth.refreshToken;
      if (!refreshToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing refresh token" });
      }

      const response = await authClient(ctx).refresh({ refreshToken });
      setCookies(ctx, sessionCookieHeaders(response.session));
      return response;
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  logout: publicProcedure.input(LogoutInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const refreshToken = input.refreshToken ?? ctx.auth.refreshToken;
      const response = await authClient(ctx).logout(
        refreshToken ? { refreshToken } : {},
        optionalAuthHeaders(ctx)
      );
      setCookies(ctx, clearSessionCookieHeaders());
      return response;
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    try {
      return await authClient(ctx).me(authHeaders(ctx));
    } catch (error) {
      return mapServiceError(error);
    }
  })
});

function authClient(ctx: GatewayContext) {
  const service = ctx.services.byName.get("auth-service");
  if (!service) {
    throw new Error("auth-service is not registered");
  }

  return createAuthServiceClient(service.url, ctx.env.REQUEST_TIMEOUT_MS);
}

function authHeaders(ctx: GatewayContext) {
  return {
    authorization: requireAuthorizationHeader(ctx.auth.authorizationHeader),
    "x-actiondesk-request-id": ctx.requestId
  };
}

function optionalAuthHeaders(ctx: GatewayContext) {
  return {
    "x-actiondesk-request-id": ctx.requestId,
    ...(ctx.auth.authorizationHeader ? { authorization: ctx.auth.authorizationHeader } : {})
  };
}

function setCookies(ctx: GatewayContext, cookies: string[]) {
  ctx.reply.header("set-cookie", cookies);
}
