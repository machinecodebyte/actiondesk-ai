import { createInternalServiceClient } from "./internal-http-client.js";

export function createRealtimeServiceClient(baseUrl: string, timeoutMs: number) {
  return createInternalServiceClient("realtime-service", baseUrl, timeoutMs);
}
