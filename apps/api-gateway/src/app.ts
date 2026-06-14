import Fastify, { type FastifyInstance } from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import type { Logger } from "@actiondesk/logger";
import { createRequestId } from "@actiondesk/observability";
import { registerCors } from "./foundation/cors.js";
import { createErrorHandler } from "./foundation/error-handler.js";
import type { GatewayEnv } from "./foundation/env.js";
import { getGatewayHealth, getGatewayReadiness } from "./foundation/health.js";
import { registerRateLimit } from "./foundation/rate-limit.js";
import { createServiceRegistry } from "./foundation/service-registry.js";
import { registerSecurity } from "./foundation/security.js";
import { createTrpcContextFactory } from "./trpc/context.js";
import { appRouter } from "./trpc/root-router.js";

export type BuildAppOptions = {
  env: GatewayEnv;
  logger: Logger;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    genReqId(request) {
      const header = request.headers["x-request-id"];
      return createRequestId(Array.isArray(header) ? header[0] : header);
    },
    trustProxy: options.env.TRUST_PROXY
  });

  const services = createServiceRegistry(options.env);

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  app.setErrorHandler(createErrorHandler(options.logger));

  await registerSecurity(app);
  await registerCors(app, options.env);
  await registerRateLimit(app, options.env);

  app.get("/health", async () => getGatewayHealth(services, options.env.REQUEST_TIMEOUT_MS));
  app.get("/ready", async (request, reply) => {
    const readiness = await getGatewayReadiness(services, options.env.REQUEST_TIMEOUT_MS);
    if (!readiness.ready) {
      reply.code(503);
    }
    return readiness;
  });

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: createTrpcContextFactory({
        env: options.env,
        logger: options.logger,
        services
      })
    }
  });

  return app;
}
