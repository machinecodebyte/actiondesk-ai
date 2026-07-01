# ActionDesk AI Project Runner

## Project Overview

ActionDesk AI is a Gmail and Google Calendar command center. The current project includes:

- Phase 1: auth, workspace onboarding, protected frontend pages, integration status, and Swagger docs.
- Phase 2: cached mail, cached calendar, command items, approvals, and dashboard workflow pages.

This is one monorepo:

- Frontend: `apps/web`
- API Gateway: `apps/api-gateway`
- Backend services: `apps/*-service`
- Shared packages: `packages/*`
- Docker infra: `infra/docker/docker-compose.yml`

The frontend talks to the API Gateway. Manual API testing should start from API Gateway Swagger because it is the public backend boundary.

Latest progress audit: [docs/PROJECT_PROGRESS_AUDIT.md](docs/PROJECT_PROGRESS_AUDIT.md).

## System Requirements

- Node.js 22 or compatible current LTS
- pnpm 9.x
- Docker Desktop
- Postgres and Redis through Docker Compose

## Port Map

| Service | URL / Port |
| --- | --- |
| Frontend Web | `http://localhost:3050` |
| Frontend Web Alt | `http://localhost:3051` |
| API Gateway | `http://localhost:4050` |
| Auth Service | `http://localhost:4151` |
| Integration Service | `http://localhost:4152` |
| Mail Service | `http://localhost:4153` |
| Calendar Service | `http://localhost:4154` |
| Command Service | `http://localhost:4155` |
| Postgres | `localhost:55450` |
| Redis | `localhost:6390` |

Additional service defaults:

| Service | URL / Port |
| --- | --- |
| AI Service | `http://localhost:4156` |
| Agent Service | `http://localhost:4157` |
| Search Service | `http://localhost:4158` |
| Webhook Service | `http://localhost:4159` |
| Worker Service | `http://localhost:4160` |
| Realtime Service | `http://localhost:4161` |

## First-Time Setup

```bash
cd actiondesk-ai
pnpm install
cp .env.example .env
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:migrate
```

Check Docker:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

Expected local infra:

- `actiondesk-postgres` healthy on `55450`
- `actiondesk-redis` healthy on `6390`

## Run Order

Start backend core services:

```bash
pnpm dev:core
```

Start the frontend in another terminal:

```bash
pnpm dev:web
```

Open:

```txt
http://localhost:3050
```

If `3050` is busy:

```bash
pnpm dev:web:alt
```

Open:

```txt
http://localhost:3051
```

## Run One Backend Service

```bash
pnpm dev:auth
pnpm dev:integration
pnpm dev:mail
pnpm dev:calendar
pnpm dev:command
pnpm dev:gateway
```

The root service shortcuts call the package scripts directly. This avoids the local Turbo persistent-task issue where `tsx watch` child processes were spawned but did not reach the Fastify startup code.

## Swagger UI

- API Gateway: `http://localhost:4050/docs`
- Auth Service: `http://localhost:4151/docs`
- Integration Service: `http://localhost:4152/docs`
- Mail Service: `http://localhost:4153/docs`
- Calendar Service: `http://localhost:4154/docs`
- Command Service: `http://localhost:4155/docs`

OpenAPI JSON:

- API Gateway: `http://localhost:4050/openapi.json`
- Auth Service: `http://localhost:4151/openapi.json`
- Integration Service: `http://localhost:4152/openapi.json`
- Mail Service: `http://localhost:4153/openapi.json`
- Calendar Service: `http://localhost:4154/openapi.json`
- Command Service: `http://localhost:4155/openapi.json`

## Health Checks

```bash
curl http://localhost:4050/health
curl http://localhost:4050/ready
curl http://localhost:4151/health
curl http://localhost:4152/health
curl http://localhost:4153/health
curl http://localhost:4154/health
curl http://localhost:4155/health
```

The API Gateway reports degraded dependency health instead of crashing when an internal service is down.

## Verify The Repo

```bash
pnpm db:migrate
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

`pnpm build` currently passes with one non-fatal Next.js warning about the Next ESLint plugin not being detected in the shared ESLint config.

## Test Auth APIs In Swagger

1. Open `http://localhost:4050/docs`.
2. Run `POST /api/auth/register` with `email`, `password`, optional `name`, and optional `workspaceName`.
3. Copy `session.accessToken`.
4. Authorize protected endpoints with `Bearer <token>`.
5. Run `GET /api/auth/me`.
6. Run `GET /api/workspaces`.
7. Run `POST /api/auth/login` to create a new session.
8. Run `POST /api/auth/logout` when finished.

Do not put real secrets in Swagger examples.

## Test Integration APIs In Swagger

1. Register or log in.
2. Use the returned access token.
3. Run `GET /api/integrations/status`.
4. Run `POST /api/integrations/gmail/connect/start`.
5. Run `POST /api/integrations/google_calendar/connect/start`.

Until the real Corsair SDK is wired, connect and callback operations return `501 Not Implemented`. The app must not fake Gmail or Google Calendar as connected.

## Test Phase 2 APIs In Swagger

1. Register or log in.
2. Use the returned access token.
3. Run `GET /api/mail/threads`.
4. Run `POST /api/mail/sync`.
5. Run `GET /api/calendar/events`.
6. Run `POST /api/calendar/sync`.
7. Run `POST /api/calendar/availability` with `startAt`, `endAt`, and optional `durationMinutes`.
8. Run `POST /api/commands` with at least `title`.
9. Run `GET /api/commands`.
10. Run command status, snooze, or mark-done endpoints.
11. Run `POST /api/approvals` with `actionType` and `payload`.
12. Run `POST /api/approvals/:id/approve` or `POST /api/approvals/:id/reject`.

For disconnected providers, sync routes return a clear client error. For connected providers without live Corsair execution, service tests cover the expected `501 Not Implemented` path.

## Stop Local Services

Use `Ctrl+C` in the terminals running `pnpm dev:core` and `pnpm dev:web`.

On Windows, if a stale process owns a development port and you are sure it is safe to stop it:

```powershell
Get-NetTCPConnection -LocalPort 3050 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Replace `3050` with the port you need to free.

## Stop Docker Infra

```bash
docker compose -f infra/docker/docker-compose.yml down
```

Reset Docker data:

```bash
docker compose -f infra/docker/docker-compose.yml down -v
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:migrate
```

## Common Issues

**Docker is not running**

Start Docker Desktop, then rerun:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

**Database connection failed**

Check that `DATABASE_URL` points to `localhost:55450`, then confirm the Docker Postgres container is healthy.

**Drizzle cannot find migration metadata**

Run:

```bash
pnpm db:generate
pnpm db:migrate
```

The migration directory must contain SQL files plus `meta/_journal.json` and snapshot files.

**ESLint AJV draft-04 error**

Run `pnpm install` after pulling the latest changes. The repo uses `.npmrc` with `hoist=false` so ESLint resolves its AJV 6 dependency and `ajv-formats` resolves AJV 8 cleanly.

**Port already in use**

Use `pnpm dev:web:alt` for the web app, or stop the process that owns the port.

**Next dev manifest error after build**

If `pnpm build` runs while `pnpm dev:web` is still active, the dev server can read stale `.next` artifacts. Stop and restart `pnpm dev:web`.

**CORS issue**

Confirm:

```txt
CORS_ORIGINS=http://localhost:3050,http://localhost:3051
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:4050
```

**API Gateway shows degraded**

Start `auth-service`, `integration-service`, `mail-service`, `calendar-service`, and `command-service`. Degraded health is expected when a dependency is down.

**501 Not Implemented**

This is expected for live Gmail and Calendar provider operations until the real Corsair SDK adapter is configured. Cached local data, command items, and approvals still run.

## Already Implemented

- Foundation monorepo and shared packages.
- Next.js frontend shell and protected Phase 1/2 pages.
- Fastify API Gateway with REST facade and tRPC.
- Auth, Integration, Mail, Calendar, and Command services.
- Swagger docs and OpenAPI JSON for Gateway and Phase 1/2 services.
- Drizzle migrations and metadata.
- Local Docker Postgres and Redis.
- Cached mail/calendar reads, local availability, command items, and approvals.

## Not Implemented Yet

- Real Corsair Gmail sync.
- Real Corsair Calendar sync.
- Live provider action execution after approval.
- Corsair webhooks.
- AI classification and summarization.
- Agent chat.
- Search indexing.
- Realtime updates.
- Production deployment.

## Recommended Daily Loop

```bash
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:migrate
pnpm dev:core
pnpm dev:web
```

Before handing off work:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```
