import Fastify, { type FastifyInstance } from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import type { Logger } from "@actiondesk/logger";
import { createRequestId } from "@actiondesk/observability";
import { registerCors } from "./foundation/cors.js";
import { createErrorHandler } from "./foundation/error-handler.js";
import type { GatewayEnv } from "./foundation/env.js";
import { getGatewayHealth, getGatewayReadiness } from "./foundation/health.js";
import { registerOpenApi } from "./foundation/openapi.js";
import { registerRateLimit } from "./foundation/rate-limit.js";
import { createServiceRegistry } from "./foundation/service-registry.js";
import { registerSecurity } from "./foundation/security.js";
import { registerApiRoutes } from "./routes/api.routes.js";
import { createTrpcContextFactory } from "./trpc/context.js";
import { appRouter } from "./trpc/root-router.js";

export type BuildAppOptions = {
  env: GatewayEnv;
  logger: Logger;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    ajv: {
      customOptions: {
        strict: false
      }
    },
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
  await registerOpenApi(app, options.env);

  app.get("/health", {
    schema: {
      tags: ["Health"],
      summary: "Get API Gateway health",
      response: { 200: gatewayHealthResponseSchema }
    }
  }, async () => getGatewayHealth(services, options.env.REQUEST_TIMEOUT_MS));
  app.get("/ready", {
    schema: {
      tags: ["Health"],
      summary: "Get API Gateway readiness",
      response: { 200: gatewayReadinessResponseSchema, 503: gatewayReadinessResponseSchema }
    }
  }, async (request, reply) => {
    const readiness = await getGatewayReadiness(services, options.env.REQUEST_TIMEOUT_MS);
    if (!readiness.ready) {
      reply.code(503);
    }
    return readiness;
  });

  await registerApiRoutes(app, {
    env: options.env,
    services
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

const gatewayHealthResponseSchema = {
  type: "object",
  properties: {
    service: { type: "string", example: "api-gateway" },
    status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
    uptime: { type: "number" },
    timestamp: { type: "string", format: "date-time" },
    checks: { type: "array", items: { type: "object" } }
  }
} as const;

const gatewayReadinessResponseSchema = {
  type: "object",
  properties: {
    ready: { type: "boolean" },
    service: { type: "string", example: "api-gateway" },
    status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
    uptime: { type: "number" },
    timestamp: { type: "string", format: "date-time" },
    checks: { type: "array", items: { type: "object" } }
  }
} as const;
