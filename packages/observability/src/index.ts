import { randomUUID } from "node:crypto";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export type HealthCheckResult = {
  name: string;
  status: HealthStatus;
  message?: string;
  durationMs?: number;
};

export type HealthResponse = {
  service: string;
  status: HealthStatus;
  uptime: number;
  timestamp: string;
  checks: HealthCheckResult[];
};

export function createRequestId(existing?: string | null): string {
  return existing && existing.trim().length > 0 ? existing : randomUUID();
}

export function createHealthResponse(
  service: string,
  checks: HealthCheckResult[] = []
): HealthResponse {
  return {
    service,
    status: combineHealthStatus(checks),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks
  };
}

export function combineHealthStatus(checks: HealthCheckResult[]): HealthStatus {
  if (checks.some((check) => check.status === "unhealthy")) {
    return "unhealthy";
  }

  if (checks.some((check) => check.status === "degraded")) {
    return "degraded";
  }

  return "healthy";
}

export async function timeAsync<T>(
  work: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await work();
  return {
    result,
    durationMs: Math.round(performance.now() - start)
  };
}

export type TracingHandle = {
  enabled: boolean;
  shutdown: () => Promise<void>;
};

export function setupTracing(): TracingHandle {
  return {
    enabled: false,
    shutdown: async () => undefined
  };
}
