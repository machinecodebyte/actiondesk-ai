import { getGatewayHealth } from "../foundation/health.js";
import { publicProcedure, router } from "../trpc/procedures.js";

export const healthRouter = router({
  status: publicProcedure.query(({ ctx }) =>
    getGatewayHealth(ctx.services, ctx.env.REQUEST_TIMEOUT_MS)
  )
});
