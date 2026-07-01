# ActionDesk AI

ActionDesk AI is a Gmail and Google Calendar command center. The current repo includes the Phase 1 auth, workspace, onboarding, integration boundary, and protected app foundation, plus the Phase 2 cached mail, cached calendar, command item, and approval workflows.

## Architecture

- Monorepo: `pnpm` workspaces with Turborepo for build, lint, and typecheck.
- Frontend: Next.js App Router in `apps/web`.
- Public API boundary: Fastify API Gateway and tRPC in `apps/api-gateway`.
- Backend services: Fastify services in `apps/*-service`.
- Shared packages: contracts, config, logger, errors, DB, Redis, tRPC, events, observability, UI, ESLint config, and TypeScript config.
- Local infra: Postgres and Redis through `infra/docker/docker-compose.yml`.

## Local Setup

```bash
pnpm install
cp .env.example .env
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:migrate
```

`AUTH_JWT_ACCESS_SECRET` and `AUTH_JWT_REFRESH_SECRET` must be at least 32 characters. The example `.env` uses local-only Postgres and Redis ports selected to avoid common conflicts.

## Port Map

| Service | URL |
| --- | --- |
| Web | `http://localhost:3050` |
| API Gateway | `http://localhost:4050` |
| Auth Service | `http://localhost:4151` |
| Integration Service | `http://localhost:4152` |
| Mail Service | `http://localhost:4153` |
| Calendar Service | `http://localhost:4154` |
| Command Service | `http://localhost:4155` |
| Postgres | `localhost:55450` |
| Redis | `localhost:6390` |

If web port `3050` is busy, run:

```bash
pnpm dev:web:alt
```

Then open `http://localhost:3051`.

## Run The App

Start the core backend services:

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

You can also run services individually:

```bash
pnpm dev:auth
pnpm dev:integration
pnpm dev:mail
pnpm dev:calendar
pnpm dev:command
pnpm dev:gateway
```

## Verification

```bash
pnpm db:migrate
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

The current build passes with one non-fatal Next.js warning that the Next ESLint plugin is not detected in the shared ESLint setup.

## Swagger And Health

Swagger UI:

- API Gateway: `http://localhost:4050/docs`
- Auth Service: `http://localhost:4151/docs`
- Integration Service: `http://localhost:4152/docs`
- Mail Service: `http://localhost:4153/docs`
- Calendar Service: `http://localhost:4154/docs`
- Command Service: `http://localhost:4155/docs`

OpenAPI JSON uses the same ports at `/openapi.json`.

Health endpoints:

```bash
curl http://localhost:4050/health
curl http://localhost:4050/ready
curl http://localhost:4151/health
curl http://localhost:4152/health
curl http://localhost:4153/health
curl http://localhost:4154/health
curl http://localhost:4155/health
```

## Implemented

- Auth register, login, refresh, logout, current user, and workspace flows.
- Protected onboarding and dashboard frontend routes.
- Persisted integration status for Gmail and Google Calendar.
- Honest Corsair boundary: live provider calls return clear setup errors until the real SDK is configured.
- Cached mail thread/message tables and read routes.
- Cached calendar event routes and local availability calculation.
- Command item and approval request workflows.
- API Gateway REST facade and tRPC routers for Phase 1 and Phase 2.
- Swagger/OpenAPI docs for Gateway, Auth, Integration, Mail, Calendar, and Command services.
- Drizzle migrations with generated SQL, snapshot metadata, and `meta/_journal.json`.

## Not Implemented Yet

- Real Corsair Gmail sync.
- Real Corsair Google Calendar sync.
- Live provider action execution after approval.
- Corsair webhooks.
- AI classification, summarization, and agent chat.
- Search indexing.
- Realtime delivery.
- Production deployment hardening.

See [PROJECT_RUNNER.md](PROJECT_RUNNER.md) for the fuller local runbook, [roadmap.md](roadmap.md) for completed and remaining work, and [docs/PROJECT_PROGRESS_AUDIT.md](docs/PROJECT_PROGRESS_AUDIT.md) for the latest progress audit.
