import type { FastifyInstance } from "fastify";
import type { ServiceEnv } from "../../foundation/env.js";
import { createFoundationController } from "./foundation.controller.js";

export async function registerFoundationRoutes(app: FastifyInstance, env: ServiceEnv): Promise<void> {
  const controller = createFoundationController(env);

  app.get("/health", {
    schema: {
      tags: ["Health"],
      summary: "Get auth-service health",
      response: { 200: healthResponseSchema }
    }
  }, controller.health);
  app.get("/ready", {
    schema: {
      tags: ["Health"],
      summary: "Get auth-service readiness",
      response: { 200: readinessResponseSchema }
    }
  }, controller.ready);
  app.get("/metadata", {
    schema: {
      tags: ["Health"],
      summary: "Get auth-service metadata",
      response: { 200: metadataResponseSchema }
    }
  }, controller.metadata);
}

const healthResponseSchema = {
  type: "object",
  properties: {
    service: { type: "string", example: "auth-service" },
    status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
    uptime: { type: "number" },
    timestamp: { type: "string", format: "date-time" },
    checks: { type: "array", items: { type: "object" } }
  }
} as const;

const readinessResponseSchema = {
  type: "object",
  properties: {
    ready: { type: "boolean" },
    service: { type: "string", example: "auth-service" },
    status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
    uptime: { type: "number" },
    timestamp: { type: "string", format: "date-time" },
    checks: { type: "array", items: { type: "object" } }
  }
} as const;

const metadataResponseSchema = {
  type: "object",
  properties: {
    service: { type: "string", example: "auth-service" },
    version: { type: "string", example: "0.1.0" },
    environment: { type: "string", example: "development" }
  }
} as const;
