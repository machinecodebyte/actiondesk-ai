import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { GatewayEnv } from "./env.js";

export async function registerRateLimit(app: FastifyInstance, env: GatewayEnv): Promise<void> {
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS
  });
}
