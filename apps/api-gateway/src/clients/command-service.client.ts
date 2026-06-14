import { createInternalServiceClient } from "./internal-http-client.js";

export function createCommandServiceClient(baseUrl: string, timeoutMs: number) {
  return createInternalServiceClient("command-service", baseUrl, timeoutMs);
}
