import type { FastifyInstance } from "fastify";
import type { Logger } from "@actiondesk/logger";
import { createServiceDatabase } from "./foundation/db.js";
import { createErrorHandler } from "./foundation/error-handler.js";
import type { ServiceEnv } from "./foundation/env.js";
import { createHttpServer } from "./foundation/http-server.js";
import { registerOpenApi } from "./foundation/openapi.js";
import { registerSecurity } from "./foundation/security.js";
import { registerRoutes } from "./routes/index.js";

export type BuildAppOptions = {
  env: ServiceEnv;
  logger: Logger;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = createHttpServer(options.env);
  const database = createServiceDatabase(options.env);

  app.setErrorHandler(createErrorHandler(options.logger));
  app.addHook("onClose", async () => {
    await database.close();
  });

  await registerSecurity(app);
  await registerOpenApi(app, options.env);
  await registerRoutes(app, {
    db: database.db,
    env: options.env
  });

  return app;
}
