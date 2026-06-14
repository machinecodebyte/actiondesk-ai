import { createHealthResponse, timeAsync, type HealthCheckResult } from "@actiondesk/observability";
import { getJson } from "../clients/internal-http-client.js";
import type { ServiceRegistry } from "./service-registry.js";

type ServiceHealthPayload = {
  status?: "healthy" | "degraded" | "unhealthy";
};

export async function getGatewayHealth(registry: ServiceRegistry, timeoutMs: number) {
  const checks = await Promise.all(
    registry.services.map(async (service): Promise<HealthCheckResult> => {
      try {
        const { result, durationMs } = await timeAsync(() =>
          getJson<ServiceHealthPayload>(`${service.url}/health`, { timeoutMs })
        );

        return {
          name: service.name,
          status: result.status === "healthy" ? "healthy" : "degraded",
          durationMs
        };
      } catch (error) {
        return {
          name: service.name,
          status: "degraded",
          message: error instanceof Error ? error.message : "Service health check failed"
        };
      }
    })
  );

  return createHealthResponse("api-gateway", checks);
}

export async function getGatewayReadiness(registry: ServiceRegistry, timeoutMs: number) {
  const health = await getGatewayHealth(registry, timeoutMs);

  return {
    ready: health.status !== "unhealthy",
    ...health
  };
}
