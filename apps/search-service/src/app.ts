import type { FastifyInstance } from "fastify";
import type { Logger } from "@actiondesk/logger";
import { createErrorHandler } from "./foundation/error-handler.js";
import type { ServiceEnv } from "./foundation/env.js";
import { createHttpServer } from "./foundation/http-server.js";
import { registerSecurity } from "./foundation/security.js";
import { registerRoutes } from "./routes/index.js";

export type BuildAppOptions = {
  env: ServiceEnv;
  logger: Logger;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = createHttpServer(options.env);

  app.setErrorHandler(createErrorHandler(options.logger));

  await registerSecurity(app);
  await registerRoutes(app, options.env);

  return app;
}
