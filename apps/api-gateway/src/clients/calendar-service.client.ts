import { createInternalServiceClient } from "./internal-http-client.js";
import type {
  AvailabilityResponse,
  CreateCalendarEventInput,
  CreateCalendarEventResponse,
  GetAvailabilityInput,
  ListCalendarEventsInput,
  ListCalendarEventsResponse,
  SyncCalendarInput,
  UpdateCalendarEventInput
} from "@actiondesk/contracts";
import { deleteJson, getJson, patchJson, postJson } from "./internal-http-client.js";

export function createCalendarServiceClient(baseUrl: string, timeoutMs: number) {
  const base = createInternalServiceClient("calendar-service", baseUrl, timeoutMs);

  return {
    ...base,
    listEvents: (input: ListCalendarEventsInput, headers: Record<string, string>) =>
      getJson<ListCalendarEventsResponse>(`${baseUrl}/calendar/events?${queryString(input)}`, {
        timeoutMs,
        headers
      }),
    getEvent: (id: string, headers: Record<string, string>) =>
      getJson<CreateCalendarEventResponse>(`${baseUrl}/calendar/events/${id}`, { timeoutMs, headers }),
    sync: (input: SyncCalendarInput, headers: Record<string, string>) =>
      postJson<{ ok: true }>(`${baseUrl}/calendar/sync`, { timeoutMs, headers, body: input }),
    availability: (input: GetAvailabilityInput, headers: Record<string, string>) =>
      postJson<AvailabilityResponse>(`${baseUrl}/calendar/availability`, {
        timeoutMs,
        headers,
        body: input
      }),
    createEvent: (input: CreateCalendarEventInput, headers: Record<string, string>) =>
      postJson<CreateCalendarEventResponse>(`${baseUrl}/calendar/events`, {
        timeoutMs,
        headers,
        body: input
      }),
    updateEvent: (input: UpdateCalendarEventInput, headers: Record<string, string>) =>
      patchJson<CreateCalendarEventResponse>(`${baseUrl}/calendar/events/${input.id}`, {
        timeoutMs,
        headers,
        body: input
      }),
    deleteEvent: (id: string, headers: Record<string, string>) =>
      deleteJson<{ ok: true }>(`${baseUrl}/calendar/events/${id}`, { timeoutMs, headers })
  };
}

function queryString(input: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export type CalendarServiceClient = ReturnType<typeof createCalendarServiceClient>;
