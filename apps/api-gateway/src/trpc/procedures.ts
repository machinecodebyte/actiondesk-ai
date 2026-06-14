import { createTrpcHelpers } from "@actiondesk/trpc";
import type { GatewayContext } from "./context.js";

const trpc = createTrpcHelpers<GatewayContext>();

export const router = trpc.router;
export const publicProcedure = trpc.procedure;
export const middleware = trpc.middleware;
export const mergeRouters = trpc.mergeRouters;
