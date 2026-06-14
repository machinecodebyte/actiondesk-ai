import { middleware } from "./procedures.js";

export const requestLogMiddleware = middleware(async ({ ctx, path, next }) => {
  ctx.logger.debug({ path }, "trpc request started");
  const result = await next();
  ctx.logger.debug({ path, ok: result.ok }, "trpc request finished");
  return result;
});
