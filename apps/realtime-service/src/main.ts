import { buildApp } from "./app.js";
import { loadServiceEnv } from "./foundation/env.js";
import { createServiceLogger } from "./foundation/logger.js";
import { registerGracefulShutdown } from "./foundation/shutdown.js";

const env = loadServiceEnv();
const logger = createServiceLogger(env);
const app = await buildApp({ env, logger });

registerGracefulShutdown({ app, logger, serviceName: env.SERVICE_NAME });

try {
  await app.listen({ host: env.HOST, port: env.PORT });
  logger.info({ port: env.PORT }, "realtime-service started");
} catch (error) {
  logger.fatal({ err: error }, "realtime-service failed to start");
  process.exit(1);
}
