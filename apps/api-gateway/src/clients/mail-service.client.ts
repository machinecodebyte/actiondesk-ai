import { createInternalServiceClient } from "./internal-http-client.js";

export function createMailServiceClient(baseUrl: string, timeoutMs: number) {
  return createInternalServiceClient("mail-service", baseUrl, timeoutMs);
}
