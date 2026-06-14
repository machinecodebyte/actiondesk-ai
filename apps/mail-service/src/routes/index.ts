import type { FastifyInstance } from "fastify";
import type { ServiceEnv } from "../foundation/env.js";
import { registerFoundationRoutes } from "../modules/foundation/foundation.routes.js";

export async function registerRoutes(app: FastifyInstance, env: ServiceEnv): Promise<void> {
  await registerFoundationRoutes(app, env);
}
