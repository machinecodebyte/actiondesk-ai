# ActionDesk AI Roadmap

Status date: 2026-06-17

## Completed

### Foundation

- Monorepo structure with `apps/*` and `packages/*`.
- Shared config, logger, errors, observability, UI, contracts, DB, Redis, and tRPC packages.
- Docker Compose for Postgres on `55450` and Redis on `6390`.
- Non-conflicting local service port map.
- Runtime runbook in `PROJECT_RUNNER.md`.
- Phase 1/2 runtime audit in `docs/debug/phase-1-phase-2-runtime-audit.md`.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` pass.

### Phase 1 Backend

- Auth Service with register, login, refresh, logout, and current-user routes.
- Workspace routes for listing, creation, and switching.
- Integration Service with persisted provider connection status.
- Gmail and Google Calendar connection start/complete/disconnect endpoints.
- Corsair client adapter returns explicit `501 Not Implemented` when no real SDK is configured.
- API Gateway REST facade and tRPC routers for auth, workspace, and integrations.
- Swagger/OpenAPI for API Gateway, Auth Service, and Integration Service.
- Drizzle migration configuration reads `.env`.
- Drizzle migration metadata exists under `packages/db/drizzle`.
- `pnpm db:migrate` is verified against local Docker Postgres.

### Phase 1 Frontend

- Login/register flow.
- Protected dashboard route.
- Onboarding page for Gmail and Google Calendar.
- Dashboard integration status cards.
- Frontend uses tRPC through API Gateway.

### Phase 2 Backend

- Added DB tables: `mail_threads`, `mail_messages`, `calendar_events`, `command_items`, `approval_requests`, `sync_runs`.
- Generated Drizzle migration `0001_bright_xavin.sql` with snapshot and journal metadata.
- Added shared Zod contracts for mail, calendar, commands, approvals, and sync.
- Added Mail Service cached thread/detail routes.
- Added Calendar Service cached event/detail routes and local availability calculation.
- Added Command Service command item routes and approval routes.
- Added API Gateway clients and tRPC routers for mail, calendar, commands, and approvals.
- Added API Gateway `/api/*` REST facade routes for Phase 2 Swagger testing.
- Added Swagger/OpenAPI setup for Mail, Calendar, and Command services.
- Added tests for command contracts and unavailable provider sync behavior.
- Gateway and service Swagger docs, health, and readiness routes are verified at runtime.

### Phase 2 Frontend

- Added `/dashboard/inbox`.
- Added `/dashboard/calendar`.
- Added `/dashboard/commands`.
- Added `/dashboard/approvals`.
- Dashboard overview now shows cached workflow counts and pending approval count.
- Inbox, Calendar, Commands, and Approvals pages use tRPC through API Gateway.
- Empty and error states avoid fake Gmail/Calendar data.

### Integrations

- Persisted integration status is implemented.
- Disconnected providers stay disconnected.
- Live Corsair Gmail/Calendar operations return clear setup errors instead of fake success.
- Approval-first workflow exists for sensitive actions.

## Remaining

### Frontend

- Add richer thread detail UX once real Gmail message bodies are synced.
- Add command creation directly from selected calendar events.
- Add polished loading skeletons and pagination controls.
- Add stronger form validation feedback for Calendar event creation/update approval payloads.
- Add automated end-to-end browser tests for all dashboard pages.

### Backend

- Implement real Corsair Gmail adapter.
- Implement real Corsair Google Calendar adapter.
- Upsert real provider records during sync.
- Execute approved draft reply and Calendar event actions through provider adapters.
- Add background workers for scheduled or repeated sync.
- Add webhook ingestion and event deduplication.
- Add more service-level tests around command source validation, approval state conflicts, and gateway health degradation.
- Add automated regression coverage for the local run scripts.

### Integrations

- Add official Corsair SDK/package once exact usage is known.
- Add provider credential validation.
- Add OAuth completion with real provider account metadata.
- Add provider action result persistence.
- Add webhook security verification.

### Later Product Phases

- AI email classification.
- Thread summarization.
- Agent chat.
- Semantic search.
- Realtime updates.
- Production deployment hardening.
