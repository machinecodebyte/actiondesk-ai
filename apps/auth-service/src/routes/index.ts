import type { FastifyInstance } from "fastify";
import { registerFoundationRoutes } from "../modules/foundation/foundation.routes.js";
import { registerAuthRoutes } from "../modules/sessions/auth.routes.js";
import type { AuthDependencies } from "../modules/sessions/auth.service.js";
import { registerWorkspaceRoutes } from "../modules/workspaces/workspace.routes.js";

export async function registerRoutes(app: FastifyInstance, deps: AuthDependencies): Promise<void> {
  await registerFoundationRoutes(app, deps.env);
  await registerAuthRoutes(app, deps);
  await registerWorkspaceRoutes(app, deps);
}
