"use client";

import { useEffect, useState } from "react";
import { foundationConfig } from "@/modules/foundation/foundation.config";

export type ServiceHealthStatus = "healthy" | "degraded" | "unhealthy";

export function useServiceHealth() {
  const [status, setStatus] = useState<ServiceHealthStatus>("degraded");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth() {
      try {
        const response = await fetch(`${foundationConfig.apiGatewayUrl}/health`, {
          signal: controller.signal
        });
        const body = (await response.json()) as { status?: ServiceHealthStatus };
        setStatus(body.status ?? (response.ok ? "healthy" : "degraded"));
      } catch {
        if (!controller.signal.aborted) {
          setStatus("unhealthy");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadHealth();
    return () => controller.abort();
  }, []);

  return { status, isLoading };
}
