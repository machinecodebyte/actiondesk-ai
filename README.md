# ActionDesk AI

ActionDesk AI is a Gmail and Google Calendar AI command center. Phase 1 includes auth, workspace creation, protected onboarding/dashboard screens, the Corsair integration connection boundary, and Swagger docs for backend API testing.

## Architecture

- Monorepo: `pnpm` workspaces with Turborepo.
- Frontend: Next.js App Router in `apps/web`.
- Public API boundary: Fastify and tRPC in `apps/api-gateway`.
- Internal services: Fastify HTTP services with shared health, logging, env, and shutdown patterns.
- Shared packages: Zod contracts, Pino logging, Drizzle/Postgres foundation, Redis/BullMQ foundation, event contracts, observability helpers, UI components, ESLint config, and TypeScript config.

## Apps

- `web`
- `api-gateway`
- `auth-service`
- `integration-service`
- `mail-service`
- `calendar-service`
- `command-service`
- `ai-service`
- `agent-service`
- `search-service`
- `webhook-service`
- `worker-service`
- `realtime-service`

## Packages

- `@actiondesk/config`
- `@actiondesk/logger`
- `@actiondesk/errors`
- `@actiondesk/contracts`
- `@actiondesk/db`
- `@actiondesk/redis`
- `@actiondesk/trpc`
- `@actiondesk/events`
- `@actiondesk/observability`
- `@actiondesk/ui`
- `@actiondesk/eslint-config`
- `@actiondesk/tsconfig`

## Local Setup

```bash
pnpm install
cp .env.example .env
```

Set local values in `.env`. `AUTH_JWT_ACCESS_SECRET` and `AUTH_JWT_REFRESH_SECRET` must be at least 32 characters. For Docker Postgres, set `POSTGRES_PASSWORD` locally before starting the compose stack.

The default ports are selected to avoid common local conflicts:

- web: `http://localhost:3050`
- api-gateway: `http://localhost:4050`
- auth-service: `http://localhost:4151`
- integration-service: `http://localhost:4152`
- Postgres: `localhost:55450`
- Redis: `localhost:6390`

## Environment Variables

The example file includes app runtime, frontend, API gateway, internal service URLs, database, Redis, auth, password hashing, Corsair, AI placeholders, observability, and security.

## Development Commands

```bash
pnpm dev
pnpm dev:all
pnpm dev:core
pnpm dev:web
pnpm dev:gateway
pnpm dev:auth
pnpm dev:integration
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format
pnpm clean
pnpm db:generate
pnpm db:migrate
```

## Docker Infra

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

## Run Web

```bash
pnpm dev:web
```

The web app runs on `http://localhost:3050`.

## Run API Gateway

```bash
pnpm dev:gateway
```

The gateway runs on `http://localhost:4050`.

## Run Phase 1 Services

```bash
pnpm dev:auth
pnpm dev:integration
pnpm dev:gateway
pnpm dev:web
```

Defaults:

- web: `http://localhost:3050`
- api-gateway: `http://localhost:4050`
- auth-service: `http://localhost:4151`
- integration-service: `http://localhost:4152`

## Run All Services

```bash
pnpm dev
```

## Run One Backend Service

```bash
pnpm --filter @actiondesk/auth-service dev
```

Use any service package name from the app list.

## Register And Login

1. Run migrations with `pnpm db:migrate`.
2. Start `auth-service`, `api-gateway`, and `web`.
3. Open `http://localhost:3050/auth/login`.
4. Use the Register tab to create a user and workspace.
5. Log in with the same email/password to create a new session.

Registration creates a user, default workspace, owner membership, and revocable session.

## Integration Status

1. Start `integration-service` with `pnpm dev:integration`.
2. Log in through the web app.
3. Open `http://localhost:3050/onboarding`.

The page shows Gmail and Google Calendar status from `connected_accounts`. If no row exists, the provider is shown as `disconnected`.

## Corsair SDK Behavior

The Corsair adapter boundary exists, but real SDK calls are not guessed. Until the official SDK/config is added, connect and callback operations return `501 Not Implemented` with a clear message:

```txt
Corsair SDK is not configured yet. Add Corsair credentials to enable live connection.
```

The app never shows Gmail or Google Calendar as connected unless `connected_accounts.status` is persisted as `connected`.

## Swagger Docs

- API Gateway: `http://localhost:4050/docs`
- Auth Service: `http://localhost:4151/docs`
- Integration Service: `http://localhost:4152/docs`

OpenAPI JSON:

- API Gateway: `http://localhost:4050/openapi.json`
- Auth Service: `http://localhost:4151/openapi.json`
- Integration Service: `http://localhost:4152/openapi.json`

## Health Endpoints

- API gateway: `GET http://localhost:4050/health`
- API gateway readiness: `GET http://localhost:4050/ready`
- Service health: `GET http://localhost:<service-port>/health`
- Service readiness: `GET http://localhost:<service-port>/ready`
- Service metadata: `GET http://localhost:<service-port>/metadata`

If an internal service is down, the API gateway health response reports a degraded dependency instead of crashing.

## Not Implemented Yet

- Gmail email listing
- Google Calendar event listing
- Live Corsair SDK calls
- AI classification, summarization, or prompt execution
- Agent chat or tool orchestration
- Search indexing
- Webhook processing
- Worker jobs
- Realtime delivery
