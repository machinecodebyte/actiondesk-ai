import { createInternalServiceClient } from "./internal-http-client.js";

export function createAuthServiceClient(baseUrl: string, timeoutMs: number) {
  return createInternalServiceClient("auth-service", baseUrl, timeoutMs);
}
