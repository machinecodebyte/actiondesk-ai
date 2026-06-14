# ActionDesk AI

ActionDesk AI is a Gmail and Google Calendar AI command center foundation. This repository currently contains the production-grade monorepo structure, shared packages, frontend shell, API gateway, service skeletons, infra, and docs. Product workflows are intentionally not implemented yet.

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

Set local values in `.env`. Keep secrets empty until real credentials exist. For Docker Postgres, set `POSTGRES_PASSWORD` locally before starting the compose stack.

## Environment Variables

The example file includes groups for app runtime, frontend, API gateway, internal service URLs, database, Redis, auth placeholders, Corsair placeholders, AI placeholders, observability, and security.

## Development Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
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

The web app runs on `http://localhost:3000`.

## Run API Gateway

```bash
pnpm dev:gateway
```

The gateway runs on `http://localhost:4000`.

## Run All Services

```bash
pnpm dev
```

## Run One Backend Service

```bash
pnpm --filter @actiondesk/auth-service dev
```

Use any service package name from the app list.

## Health Endpoints

- API gateway: `GET http://localhost:4000/health`
- API gateway readiness: `GET http://localhost:4000/ready`
- Service health: `GET http://localhost:<service-port>/health`
- Service readiness: `GET http://localhost:<service-port>/ready`
- Service metadata: `GET http://localhost:<service-port>/metadata`

If an internal service is down, the API gateway health response reports a degraded dependency instead of crashing.

## Not Implemented Yet

- Authentication
- Gmail or Google Calendar integrations
- Corsair API logic
- AI classification, summarization, or prompt execution
- Agent chat or tool orchestration
- Search indexing
- Webhook processing
- Worker jobs
- Realtime delivery
