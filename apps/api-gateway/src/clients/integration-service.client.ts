import { createInternalServiceClient } from "./internal-http-client.js";

export function createIntegrationServiceClient(baseUrl: string, timeoutMs: number) {
  return createInternalServiceClient("integration-service", baseUrl, timeoutMs);
}
