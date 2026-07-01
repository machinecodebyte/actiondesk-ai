import type { FastifyInstance } from "fastify";
import type { Database } from "@actiondesk/db";
import type { ServiceEnv } from "../foundation/env.js";
import { registerCalendarRoutes } from "../modules/events/events.routes.js";
import { registerFoundationRoutes } from "../modules/foundation/foundation.routes.js";

export type CalendarRoutesDeps = {
  db: Database;
  env: ServiceEnv;
};

export async function registerRoutes(app: FastifyInstance, deps: CalendarRoutesDeps): Promise<void> {
  await registerFoundationRoutes(app, deps.env);
  await registerCalendarRoutes(app, { db: deps.db });
}
