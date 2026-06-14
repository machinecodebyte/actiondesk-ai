import type { GatewayEnv } from "./env.js";

export type ServiceName =
  | "auth-service"
  | "integration-service"
  | "mail-service"
  | "calendar-service"
  | "command-service"
  | "ai-service"
  | "agent-service"
  | "search-service"
  | "webhook-service"
  | "worker-service"
  | "realtime-service";

export type RegisteredService = {
  name: ServiceName;
  url: string;
};

export type ServiceRegistry = {
  services: RegisteredService[];
  byName: Map<ServiceName, RegisteredService>;
};

export function createServiceRegistry(env: GatewayEnv): ServiceRegistry {
  const services: RegisteredService[] = [
    { name: "auth-service", url: env.AUTH_SERVICE_URL },
    { name: "integration-service", url: env.INTEGRATION_SERVICE_URL },
    { name: "mail-service", url: env.MAIL_SERVICE_URL },
    { name: "calendar-service", url: env.CALENDAR_SERVICE_URL },
    { name: "command-service", url: env.COMMAND_SERVICE_URL },
    { name: "ai-service", url: env.AI_SERVICE_URL },
    { name: "agent-service", url: env.AGENT_SERVICE_URL },
    { name: "search-service", url: env.SEARCH_SERVICE_URL },
    { name: "webhook-service", url: env.WEBHOOK_SERVICE_URL },
    { name: "worker-service", url: env.WORKER_SERVICE_URL },
    { name: "realtime-service", url: env.REALTIME_SERVICE_URL }
  ];

  return {
    services,
    byName: new Map(services.map((service) => [service.name, service]))
  };
}
