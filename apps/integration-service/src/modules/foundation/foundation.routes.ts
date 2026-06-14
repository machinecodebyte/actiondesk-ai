import type { FastifyInstance } from "fastify";
import type { ServiceEnv } from "../../foundation/env.js";
import { createFoundationController } from "./foundation.controller.js";

export async function registerFoundationRoutes(app: FastifyInstance, env: ServiceEnv): Promise<void> {
  const controller = createFoundationController(env);

  app.get("/health", controller.health);
  app.get("/ready", controller.ready);
  app.get("/metadata", controller.metadata);
}
