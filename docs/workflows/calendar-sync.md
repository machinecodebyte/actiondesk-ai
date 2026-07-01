# Calendar Sync Workflow

## Manual Flow

1. User clicks `Sync Calendar`.
2. Frontend calls `calendar.sync` through tRPC.
3. API Gateway forwards the request to `calendar-service`.
4. `calendar-service` checks Google Calendar connection state.
5. If a real Corsair Calendar adapter is not configured, the service records a failed `sync_runs` row and returns `501`.

## Cached Reads

`GET /calendar/events` and `GET /calendar/events/:id` read `calendar_events` only.

## Availability

`POST /calendar/availability` calculates free slots from cached events. If no cached events exist for the requested range, it returns an empty slot list with a clear message.

## Live Provider Gap

To enable real Calendar sync and mutations, add a real Corsair Calendar adapter that can fetch, create, update, and delete provider events.
