import { createInternalServiceClient } from "./internal-http-client.js";

export function createAgentServiceClient(baseUrl: string, timeoutMs: number) {
  return createInternalServiceClient("agent-service", baseUrl, timeoutMs);
}
