import { createInternalServiceClient } from "./internal-http-client.js";

export function createSearchServiceClient(baseUrl: string, timeoutMs: number) {
  return createInternalServiceClient("search-service", baseUrl, timeoutMs);
}
