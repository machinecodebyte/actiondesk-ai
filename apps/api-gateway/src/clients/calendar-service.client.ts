import { createInternalServiceClient } from "./internal-http-client.js";

export function createCalendarServiceClient(baseUrl: string, timeoutMs: number) {
  return createInternalServiceClient("calendar-service", baseUrl, timeoutMs);
}
