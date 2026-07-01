import type { FastifyInstance } from "fastify";
import type { Database } from "@actiondesk/db";
import type { ServiceEnv } from "../foundation/env.js";
import { registerFoundationRoutes } from "../modules/foundation/foundation.routes.js";
import { registerMailRoutes } from "../modules/threads/threads.routes.js";

export type MailRoutesDeps = {
  db: Database;
  env: ServiceEnv;
};

export async function registerRoutes(app: FastifyInstance, deps: MailRoutesDeps): Promise<void> {
  await registerFoundationRoutes(app, deps.env);
  await registerMailRoutes(app, { db: deps.db });
}
