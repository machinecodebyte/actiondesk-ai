# ActionDesk AI Project Progress Audit

Date: 2026-07-01

## 1. Project Overview

Project name: ActionDesk AI.

Product direction: a Gmail and Google Calendar command center with auth, workspace onboarding, integration state, cached mail/calendar workflows, command items, and approval-first actions.

Tech stack:

- Monorepo: pnpm workspaces, Turborepo.
- Frontend: Next.js App Router, React 19, Tailwind CSS, tRPC React Query.
- Backend: Fastify services, tRPC, REST facade through API Gateway.
- Contracts: Zod schemas in `packages/contracts`.
- Database: PostgreSQL with Drizzle ORM and Drizzle Kit migrations.
- Infra: Docker Compose for Postgres and Redis.
- Shared foundation: config, logger, errors, observability, DB, Redis, UI, ESLint, and TypeScript packages.

Main frontend app:

- `apps/web`

Main backend services:

- `apps/api-gateway`
- `apps/auth-service`
- `apps/integration-service`
- `apps/mail-service`
- `apps/calendar-service`
- `apps/command-service`

Scaffolded backend services:

- `apps/ai-service`
- `apps/agent-service`
- `apps/search-service`
- `apps/webhook-service`
- `apps/worker-service`
- `apps/realtime-service`

Shared packages:

- `packages/config`
- `packages/contracts`
- `packages/db`
- `packages/errors`
- `packages/eslint-config`
- `packages/events`
- `packages/logger`
- `packages/observability`
- `packages/redis`
- `packages/trpc`
- `packages/tsconfig`
- `packages/ui`

Current git/worktree note:

- The worktree is not clean. It contains many modified and untracked files from the Phase 1/Phase 2 implementation and runtime-fix work.
- This audit did not modify application source code.

## 2. Current Completion Status

### Implemented

- Monorepo foundation with apps, packages, shared TypeScript config, shared ESLint config, and Turborepo tasks.
- Docker Compose definition for local Postgres and Redis.
- Auth Service with register, login, refresh, logout, current-user, workspace list/create/switch.
- Integration Service with persisted Gmail and Google Calendar connection status.
- Corsair boundary that intentionally returns setup/not-implemented responses when live provider credentials/SDK are absent.
- API Gateway with REST facade under `/api/*` and tRPC routers.
- Swagger/OpenAPI for API Gateway, Auth, Integration, Mail, Calendar, and Command services.
- Drizzle schema for Phase 1 and Phase 2 tables.
- Drizzle migration output under `packages/db/drizzle` with SQL, snapshots, and `meta/_journal.json`.
- Mail Service cached Gmail thread/message read routes and honest unavailable live-action responses.
- Calendar Service cached event routes and local availability calculation.
- Command Service command item and approval request routes.
- Web app routes for home, auth, onboarding, dashboard, inbox, calendar, commands, and approvals.
- Basic loading, error, and empty states on Phase 2 frontend pages.

### Partially Complete

- Phase 2 cached workflows are implemented, but real Gmail/Calendar sync is not wired.
- Approval workflows exist locally, but approved live provider action execution is not implemented.
- Frontend workflow pages exist and use tRPC, but browser automation/e2e coverage is missing.
- Health/readiness routes are implemented, but they do not currently prove database connectivity.
- Local runtime can start services, but DB-backed actions are blocked in the current environment because Postgres is not exposed on `localhost:55450`.

### Not Started Or Mostly Scaffolded

- AI classification, summarization, date parsing, and prioritization.
- Agent chat, tool planning, MCP orchestration, and tool execution.
- Search indexing, keyword search, semantic search, and saved searches.
- Webhook ingestion, routing, deduplication, and security.
- Worker jobs for sync, classification, embeddings, followups, and webhooks.
- Realtime notification streams, presence, SSE, and WebSockets.
- Production deployment hardening.

### Intentionally Not Implemented Yet

- Real Corsair Gmail sync.
- Real Corsair Google Calendar sync.
- Live draft reply creation through Gmail.
- Live Google Calendar event create/update/delete.
- Provider webhooks.
- External AI provider behavior.

## 3. Backend Status

| App | Port | Responsibility | Status |
| --- | ---: | --- | --- |
| `api-gateway` | 4050 | Public REST facade, tRPC, service routing, Swagger | Implemented |
| `auth-service` | 4151 | Users, sessions, workspaces, workspace membership | Implemented |
| `integration-service` | 4152 | Connected account status, provider connect/disconnect boundary | Implemented, live Corsair not configured |
| `mail-service` | 4153 | Cached Gmail threads/messages, unavailable live mail actions | Phase 2 implemented for cache |
| `calendar-service` | 4154 | Cached calendar events, availability, unavailable live calendar actions | Phase 2 implemented for cache |
| `command-service` | 4155 | Command items, snooze/dismiss/done, approval requests | Phase 2 implemented |
| `ai-service` | 4156 | Future AI features | Scaffolded health-only |
| `agent-service` | 4157 | Future agent/tool orchestration | Scaffolded health-only |
| `search-service` | 4158 | Future search | Scaffolded health-only |
| `webhook-service` | 4159 | Future webhooks | Scaffolded health-only |
| `worker-service` | 4160 | Future background jobs | Scaffolded health-only |
| `realtime-service` | 4161 | Future realtime delivery | Scaffolded health-only |

Common service endpoints:

- `GET /health`
- `GET /ready`
- `GET /metadata` on internal services
- `GET /docs` and `GET /openapi.json` on API Gateway, Auth, Integration, Mail, Calendar, and Command services

API Gateway REST routes:

- Health: `GET /api/health`, `GET /api/ready`
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`
- Workspaces: `GET /api/workspaces`, `POST /api/workspaces`, `POST /api/workspaces/switch`
- Integrations: `GET /api/integrations/status`, `POST /api/integrations/:provider/connect/start`, `POST /api/integrations/:provider/connect/complete`, `POST /api/integrations/:provider/disconnect`
- Mail: `GET /api/mail/threads`, `GET /api/mail/threads/:id`, `POST /api/mail/sync`, `POST /api/mail/threads/:id/draft-reply`, `archive`, `mark-read`, `mark-unread`
- Calendar: `GET /api/calendar/events`, `GET /api/calendar/events/:id`, `POST /api/calendar/sync`, `POST /api/calendar/availability`, `POST /api/calendar/events`, `PATCH /api/calendar/events/:id`, `DELETE /api/calendar/events/:id`
- Commands: `GET /api/commands`, `GET /api/commands/:id`, `POST /api/commands`, `PATCH /api/commands/:id/status`, `POST /api/commands/:id/snooze`, `dismiss`, `mark-done`
- Approvals: `GET /api/approvals`, `POST /api/approvals`, `POST /api/approvals/:id/approve`, `POST /api/approvals/:id/reject`

tRPC routers:

- Implemented: `health`, `auth`, `workspace`, `integrations`, `mail`, `calendar`, `commands`, `approvals`
- Placeholder: `inbox`, `agent`, `search`

Database access status:

- Drizzle clients exist in DB-backed services.
- Current local DB-backed runtime is blocked because the existing Postgres container is not mapped to `localhost:55450`.
- Health/readiness routes returned `200`, but auth registration failed with `500` and auth-service logged `ECONNREFUSED`.

Known backend gaps or risks:

- Current local Postgres container needs environment repair/recreation to expose `55450`.
- Health/readiness can pass while DB-backed product routes fail.
- Live provider behavior is intentionally absent.
- AI/agent/search/webhook/worker/realtime services are scaffolds, not product features.
- `packages/db/migrations` exists alongside active Drizzle output in `packages/db/drizzle`; the active config writes to `./drizzle`, so the older folder can confuse future developers.

## 4. Frontend Status

Implemented pages/routes:

- `/`
- `/auth/login`
- `/auth/callback`
- `/onboarding`
- `/dashboard`
- `/dashboard/inbox`
- `/dashboard/calendar`
- `/dashboard/commands`
- `/dashboard/approvals`

Auth flow status:

- Login/register UI exists at `/auth/login`.
- Auth mutations call `trpc.auth.login` and `trpc.auth.register`.
- Session cookies and bearer token behavior are handled through gateway/auth service APIs.
- Protected pages use a route guard and `trpc.auth.me`.
- DB-backed auth runtime is blocked in the current local environment until Postgres host port mapping is restored.

Dashboard status:

- Dashboard overview shows integration status and counts for cached threads, cached events, open commands, and pending approvals.
- Shared dashboard frame/navigation exists.

Feature pages:

- Inbox: cached thread list, selected thread detail, sync action, create command, create draft approval.
- Calendar: cached events, sync action, availability calculation.
- Commands: list/filter commands, create manual command, snooze, dismiss, mark done.
- Approvals: list/filter approvals, approve/reject.
- Onboarding: integration status and provider connect start flow.

API/tRPC wiring:

- Frontend uses `createTRPCReact<AppRouter>()` from the API Gateway app router type.
- tRPC client points to `${NEXT_PUBLIC_API_GATEWAY_URL}/trpc`.

Loading/error/empty states:

- Present on inbox, calendar, command, approval, dashboard, onboarding, route guard, and health banner paths.
- States are practical but not highly polished; skeletons and richer validation UX are still missing.

Known frontend gaps or risks:

- No automated browser/e2e tests.
- Some routes render successfully without DB, but interactive product actions fail when the API cannot reach Postgres.
- Live provider UX is only a setup/error boundary until Corsair is configured.

## 5. Database Status

ORM/migration system:

- Drizzle ORM.
- Drizzle Kit.
- Config: `packages/db/drizzle.config.ts`.
- Active migration output: `packages/db/drizzle`.

Existing tables/models:

- `users`
- `workspaces`
- `workspace_members`
- `user_sessions`
- `connected_accounts`
- `integration_oauth_states`
- `audit_logs`
- `mail_threads`
- `mail_messages`
- `calendar_events`
- `command_items`
- `approval_requests`
- `sync_runs`

Migration files:

- `packages/db/drizzle/0000_cheerful_preak.sql`
- `packages/db/drizzle/0001_bright_xavin.sql`
- `packages/db/drizzle/meta/0000_snapshot.json`
- `packages/db/drizzle/meta/0001_snapshot.json`
- `packages/db/drizzle/meta/_journal.json`

Latest migration status:

- Migration metadata exists and is structurally valid.
- `pnpm db:migrate` currently fails in this local environment because `DATABASE_URL` points to `localhost:55450`, but Docker Postgres is not exposed on that host port.

Current migration verification result:

```txt
AggregateError [ECONNREFUSED]
connect ECONNREFUSED ::1:55450
connect ECONNREFUSED 127.0.0.1:55450
```

Schema risks:

- Several status/provider fields are text columns rather than database-level enums.
- Approval payloads and provider metadata are intentionally flexible JSON.
- No production migration history beyond the current generated local migrations was verified.
- The legacy `packages/db/migrations` folder may be stale relative to the active Drizzle config.

## 6. Environment & Setup Status

Required local env categories:

- App/runtime: `NODE_ENV`, `LOG_LEVEL`, `REQUEST_TIMEOUT_MS`
- Frontend: `WEB_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_API_GATEWAY_URL`
- Gateway: `API_GATEWAY_URL`, `API_GATEWAY_PORT`, `CORS_ORIGINS`
- Internal URLs: `AUTH_SERVICE_URL`, `INTEGRATION_SERVICE_URL`, `MAIL_SERVICE_URL`, `CALENDAR_SERVICE_URL`, `COMMAND_SERVICE_URL`, plus future service URLs
- Database: `DATABASE_URL`, `DATABASE_SSL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
- Redis: `REDIS_URL`, `REDIS_PREFIX`, `REDIS_PORT`
- Auth: `AUTH_JWT_ACCESS_SECRET`, `AUTH_JWT_REFRESH_SECRET`, token TTLs, cookie settings
- Corsair placeholders: `CORSAIR_API_KEY`, `CORSAIR_APP_ID`, `CORSAIR_WEBHOOK_SECRET`, `CORSAIR_REDIRECT_BASE_URL`
- AI placeholders: `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`
- Observability/security: `OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `SERVICE_NAMESPACE`, `TRUST_PROXY`, `SECURE_COOKIES`, `ENCRYPTION_KEY`

Missing/external variables:

- Corsair credentials are intentionally empty.
- AI provider credentials are intentionally empty.
- Real production secrets are not present and should not be committed.

Current port map:

| Component | Port |
| --- | ---: |
| Web | 3050 |
| Web alt | 3051 |
| API Gateway | 4050 |
| Auth Service | 4151 |
| Integration Service | 4152 |
| Mail Service | 4153 |
| Calendar Service | 4154 |
| Command Service | 4155 |
| AI Service | 4156 |
| Agent Service | 4157 |
| Search Service | 4158 |
| Webhook Service | 4159 |
| Worker Service | 4160 |
| Realtime Service | 4161 |
| Postgres expected | 55450 |
| Redis | 6390 |

Current setup risk:

- `docker compose ps` shows Redis mapped to `6390`, but Postgres only shows `5432/tcp`, not `0.0.0.0:55450->5432/tcp`.
- `docker compose up -d` did not recreate the existing Postgres container, so the stale port mapping remained.
- Recommended environment fix: recreate the Postgres container with the current Compose file, preserving the named volume unless a full reset is intentionally desired.

Correct local run order:

```bash
pnpm install
cp .env.example .env
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:migrate
pnpm dev:core
pnpm dev:web
```

If Postgres still is not exposed on `55450`, recreate the Postgres container before continuing.

## 7. Verification Results

### Tool Versions

| Command | Result | Summary |
| --- | --- | --- |
| `node --version` | Passed | `v24.14.0` |
| `pnpm --version` | Passed | `9.15.4` |

### Docker

| Command | Result | Summary |
| --- | --- | --- |
| `docker compose -f infra/docker/docker-compose.yml ps` | Blocked in sandbox, passed elevated | Docker pipe requires elevated access in this environment. |
| `docker compose -f infra/docker/docker-compose.yml up -d` | Passed elevated | Containers were already running. |
| `docker compose -f infra/docker/docker-compose.yml ps` after startup | Partially failed environment check | Redis mapped to `6390`; Postgres healthy but not exposed on `55450`. |

### Database

| Command | Result | Summary |
| --- | --- | --- |
| `pnpm db:migrate` | Failed in sandbox | `spawn EPERM`; sandbox process-spawn limitation. |
| `pnpm db:migrate` elevated | Failed | Real failure: `ECONNREFUSED` to `localhost:55450` because Postgres host port is not mapped. |

Classification: environment issue, not an application source-code issue.

### Static Checks

| Command | Result | Summary |
| --- | --- | --- |
| `pnpm lint` | Passed | 32 Turbo tasks successful. |
| `pnpm typecheck` | Passed | 32 Turbo tasks successful. |
| `pnpm build` | Passed | 23 Turbo tasks successful. Next build completed. |
| `pnpm test` | Failed in sandbox | `spawn EPERM`; sandbox process-spawn limitation. |
| `pnpm test` elevated | Passed | 14 tests passed. |

Build note:

- Next.js prints a non-fatal warning that the Next ESLint plugin is not detected in the shared ESLint config.

### Runtime Health

Command:

```bash
pnpm dev:core
```

Result:

- Passed. API Gateway, Auth, Integration, Mail, Calendar, and Command services started.

Health/docs probes:

- `4050 /health /ready /docs /openapi.json`: 200
- `4151 /health /ready /docs /openapi.json`: 200
- `4152 /health /ready /docs /openapi.json`: 200
- `4153 /health /ready /docs /openapi.json`: 200
- `4154 /health /ready /docs /openapi.json`: 200
- `4155 /health /ready /docs /openapi.json`: 200

DB-backed runtime probe:

- `POST /api/auth/register`: failed with HTTP 500.
- Auth Service log root cause: `AggregateError [ECONNREFUSED]`.
- Classification: local DB environment issue caused by Postgres not exposed on `localhost:55450`.

### Frontend Runtime

Command:

```bash
pnpm dev:web
```

Result:

- Passed. Next dev server started on `http://localhost:3050`.

Route probes:

- `/`: 200
- `/auth/login`: 200
- `/auth/callback`: 200
- `/onboarding`: 200
- `/dashboard`: 200
- `/dashboard/inbox`: 200
- `/dashboard/calendar`: 200
- `/dashboard/commands`: 200
- `/dashboard/approvals`: 200

Cleanup:

- Dev server Node processes started for this audit were stopped.
- No ActionDesk Node dev processes remained after cleanup.

## 8. Error-Free Assessment

Current assessment: Partially error-free.

What passes:

- Lint.
- Typecheck.
- Build.
- Unit/contract tests when run outside sandbox.
- Core service startup.
- Health/readiness/docs/OpenAPI probes for the core services.
- Frontend route rendering.

What fails:

- `pnpm db:migrate` fails against the current local Docker environment.
- DB-backed runtime flows such as auth registration fail because services cannot connect to Postgres at `localhost:55450`.

What is blocked by local environment:

- Database migrations.
- Auth registration/login runtime smoke.
- Workspace creation runtime smoke.
- Integration/mail/calendar/command/approval runtime flows that require DB writes/reads.

What requires credentials or external services:

- Real Gmail connection and sync.
- Real Google Calendar connection and sync.
- Corsair callback and webhook flows.
- AI provider behavior.

What must be fixed before development continues:

- Restore local Postgres host port exposure on `localhost:55450`, then rerun `pnpm db:migrate` and a DB-backed smoke test.

## 9. Next Steps

### P0: Must Fix Before Continuing

1. Recreate or repair the local Postgres container so Compose exposes `localhost:55450`.
   - Likely files/commands involved: `infra/docker/docker-compose.yml`, `.env`, Docker Compose state.
   - Recommended command to consider after confirming no important local container-only state will be lost:
     ```bash
     docker compose -f infra/docker/docker-compose.yml up -d --force-recreate postgres
     ```
2. Rerun:
   ```bash
   pnpm db:migrate
   ```
3. Rerun one DB-backed smoke:
   - Register user.
   - Fetch current user.
   - Fetch workspaces.
   - Create/list command.
   - Create/approve approval.

### P1: Should Fix Soon

1. Add DB connectivity into readiness checks so `/ready` fails when Postgres is unreachable.
2. Add automated runtime smoke tests for auth/workspace/commands/approvals.
3. Add browser/e2e tests for `/auth/login`, `/onboarding`, and dashboard workflow pages.
4. Decide whether to remove or document the legacy `packages/db/migrations` folder.
5. Add Next ESLint plugin wiring or document why the warning is acceptable.

### P2: Can Do Later

1. Implement real Corsair Gmail adapter.
2. Implement real Corsair Calendar adapter.
3. Execute approved provider actions through real adapters.
4. Add webhook ingestion and deduplication.
5. Add AI classification/summarization.
6. Add agent chat/tool orchestration.
7. Add search indexing and realtime updates.

Suggested next task:

- Fix the local Postgres port mapping and rerun DB-backed verification before starting any new feature work.

## 10. Developer Runbook

Install dependencies:

```bash
pnpm install
```

Create env:

```bash
cp .env.example .env
```

Start Docker/infra:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
docker compose -f infra/docker/docker-compose.yml ps
```

Expected:

- Postgres should show `0.0.0.0:55450->5432/tcp`.
- Redis should show `0.0.0.0:6390->6379/tcp`.

Run migrations:

```bash
pnpm db:migrate
```

Start backend services:

```bash
pnpm dev:core
```

Or individually:

```bash
pnpm dev:auth
pnpm dev:integration
pnpm dev:mail
pnpm dev:calendar
pnpm dev:command
pnpm dev:gateway
```

Start frontend:

```bash
pnpm dev:web
```

If `3050` is busy:

```bash
pnpm dev:web:alt
```

Run verification:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Open Swagger/docs:

- API Gateway: `http://localhost:4050/docs`
- Auth Service: `http://localhost:4151/docs`
- Integration Service: `http://localhost:4152/docs`
- Mail Service: `http://localhost:4153/docs`
- Calendar Service: `http://localhost:4154/docs`
- Command Service: `http://localhost:4155/docs`

Open frontend:

- `http://localhost:3050`

Stop app dev processes:

- Press `Ctrl+C` in the terminals running `pnpm dev:core` and `pnpm dev:web`.

Stop Docker infra:

```bash
docker compose -f infra/docker/docker-compose.yml down
```
