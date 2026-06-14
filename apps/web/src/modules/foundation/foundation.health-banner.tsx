"use client";

import { Badge } from "@actiondesk/ui";
import { useServiceHealth } from "@/hooks/use-service-health";

export function FoundationHealthBanner() {
  const { status, isLoading } = useServiceHealth();

  const tone = status === "healthy" ? "green" : status === "degraded" ? "amber" : "red";
  const label = isLoading ? "Checking services" : `Gateway ${status}`;

  return <Badge tone={tone}>{label}</Badge>;
}
