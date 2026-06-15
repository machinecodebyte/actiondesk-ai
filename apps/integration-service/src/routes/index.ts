import type { FastifyInstance } from "fastify";
import type { IntegrationDependencies } from "../modules/connected-accounts/connected-accounts.service.js";
import { registerConnectedAccountRoutes } from "../modules/connected-accounts/connected-accounts.routes.js";
import { registerFoundationRoutes } from "../modules/foundation/foundation.routes.js";

export async function registerRoutes(app: FastifyInstance, deps: IntegrationDependencies): Promise<void> {
  await registerFoundationRoutes(app, deps.env);
  await registerConnectedAccountRoutes(app, deps);
}
