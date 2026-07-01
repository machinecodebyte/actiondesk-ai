# Phase 2 Core Workflows

Phase 2 adds the first non-AI workflow layer for Gmail, Google Calendar, command items, and approvals.

## Boundaries

- `apps/web` renders workflow pages and calls API Gateway through tRPC only.
- `apps/api-gateway` owns tRPC and REST facade routing, auth context forwarding, service health checks, and Swagger.
- `apps/mail-service` owns cached Gmail reads and mail provider action endpoints.
- `apps/calendar-service` owns cached Calendar reads, availability, and calendar provider action endpoints.
- `apps/command-service` owns command items and approvals.
- `packages/contracts` owns shared Zod schemas and TypeScript types.
- `packages/db` owns Drizzle schema and migration output.

## Data Model

Phase 2 adds:

- `mail_threads`
- `mail_messages`
- `calendar_events`
- `command_items`
- `approval_requests`
- `sync_runs`

The tables are app-owned caches and workflow records. They do not replace Corsair/provider data.

## Provider Safety

Live provider operations are intentionally honest:

- Cached list/detail endpoints return local database rows.
- Manual sync checks provider connection state.
- If the real Corsair Gmail/Calendar adapter is not configured, sync/action endpoints return `501 Not Implemented`.
- No fake Gmail emails, Calendar events, or connected statuses are inserted.

## Current Phase 2 Capability

- Frontend pages exist for inbox, calendar, commands, and approvals.
- API Gateway forwards tRPC and `/api/*` REST calls to internal services.
- Mail and Calendar cached reads are implemented.
- Calendar availability is calculated from cached events.
- Manual command creation and command status actions are implemented.
- Approval requests can be created, approved, and rejected.
- Approval execution records a clean failure for live provider actions until a real provider adapter is available.

## Intentionally Deferred

- AI classification
- Agent chat
- Semantic search
- Realtime webhooks
- Background sync workers
- Real Corsair Gmail/Calendar SDK execution
