import { buildApp } from "./app.js";
import { loadGatewayEnv } from "./foundation/env.js";
import { createGatewayLogger } from "./foundation/logger.js";
import { registerGracefulShutdown } from "./foundation/shutdown.js";

const env = loadGatewayEnv();
const logger = createGatewayLogger(env);
const app = await buildApp({ env, logger });

registerGracefulShutdown({ app, logger });

try {
  await app.listen({ host: env.HOST, port: env.PORT });
  logger.info({ port: env.PORT }, "api gateway started");
} catch (error) {
  logger.fatal({ err: error }, "api gateway failed to start");
  process.exit(1);
}
