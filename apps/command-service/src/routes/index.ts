import type { FastifyInstance } from "fastify";
import type { Database } from "@actiondesk/db";
import type { ServiceEnv } from "../foundation/env.js";
import { registerCommandRoutes } from "../modules/command-items/command.routes.js";
import { registerFoundationRoutes } from "../modules/foundation/foundation.routes.js";

export type CommandRoutesDeps = {
  db: Database;
  env: ServiceEnv;
};

export async function registerRoutes(app: FastifyInstance, deps: CommandRoutesDeps): Promise<void> {
  await registerFoundationRoutes(app, deps.env);
  await registerCommandRoutes(app, { db: deps.db });
}
