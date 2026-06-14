import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import type { GatewayEnv } from "./env.js";

export async function registerCors(app: FastifyInstance, env: GatewayEnv): Promise<void> {
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"]
  });
}
