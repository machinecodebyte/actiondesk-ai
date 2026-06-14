import { createHealthResponse } from "@actiondesk/observability";
import type { ServiceEnv } from "./env.js";

export function getHealth(env: ServiceEnv) {
  return createHealthResponse(env.SERVICE_NAME, [
    {
      name: "http",
      status: "healthy"
    }
  ]);
}

export function getReadiness(env: ServiceEnv) {
  return {
    ready: true,
    ...getHealth(env)
  };
}

export function getMetadata(env: ServiceEnv) {
  return {
    service: env.SERVICE_NAME,
    version: env.SERVICE_VERSION,
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}
