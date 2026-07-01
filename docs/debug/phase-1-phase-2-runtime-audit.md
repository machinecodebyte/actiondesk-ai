# Phase 1 And Phase 2 Runtime Audit

Date: 2026-06-17

## Scope

This audit covered the current Phase 1 and Phase 2 foundation:

- dependency installation and module resolution
- Drizzle migration configuration and metadata
- Docker Postgres and Redis startup
- backend service startup
- Swagger/OpenAPI routes
- health and readiness routes
- auth and workspace flows
- integration status
- cached mail/calendar routes
- command item and approval routes
- frontend dashboard routes
- root run scripts and developer runbook docs

## Fixes Applied

### ESLint AJV Resolution

Root cause: the workspace had a hoisted dependency layout where ESLint's transitive AJV 6 expectation could resolve to AJV 8. That caused:

```txt
Cannot find module 'ajv/lib/refs/json-schema-draft-04.json'
```

Fix:

- Added `.npmrc` with `hoist=false`.
- Removed the unnecessary direct root `ajv` dependency.
- Reinstalled dependencies.

Why it works: pnpm now keeps each package's dependency graph isolated enough that ESLint resolves AJV 6, while packages such as `ajv-formats` still resolve AJV 8.

### Drizzle CLI Dependencies And Migration Metadata

Root cause: Drizzle commands are executed from `packages/db`, but the root command path also needs Drizzle runtime packages to be resolvable under the isolated pnpm layout.

Fix:

- Added root dev dependencies for `drizzle-orm` and `postgres`.
- Verified `packages/db/drizzle` contains SQL migrations, `meta/_journal.json`, and snapshot metadata.
- Verified `pnpm db:migrate` reads `DATABASE_URL` and applies migrations.

Why it works: Drizzle Kit can load its config and Postgres driver without falling through to an empty URL or missing migration journal.

### Docker Compose Env Default

Root cause: running Compose with `-f infra/docker/docker-compose.yml` does not automatically load the repo root `.env` in the same way app commands do. The Postgres service required `POSTGRES_PASSWORD`.

Fix:

- Gave `POSTGRES_PASSWORD` a local development default in `infra/docker/docker-compose.yml`.

Why it works: Docker Compose can start the local Postgres container even when the root `.env` has not been loaded by Compose.

### Fastify Schema Startup

Root cause: Fastify's AJV strict mode rejected Swagger schema metadata that used `example`.

Fix:

- Set Fastify AJV `strict: false` in the API Gateway and Phase 2 service HTTP server factories.

Why it works: Fastify accepts OpenAPI-friendly schema annotations while still validating request and response shapes.

### OpenAPI Route Typing

Root cause: the Swagger decorator and `schema.hide` option were not represented cleanly in the local Fastify typings.

Fix:

- Removed the hidden schema wrapper from `/openapi.json`.
- Added a small local `SwaggerApp` type where `app.swagger()` is called.

Why it works: the runtime route stays the same for users, while `pnpm typecheck` no longer depends on an untyped plugin decorator shape.

### Error Handler Status Mapping

Root cause: generic Fastify HTTP errors, such as unsupported content type, were being mapped to `500`.

Fix:

- Updated gateway and service error handlers to preserve Fastify 4xx status codes and map them to stable app error codes.

Why it works: client/request errors now return client statuses instead of looking like internal failures.

### Root Dev Scripts

Root cause: Turbo persistent tasks spawned `tsx watch` child processes, but in this local Windows runner the child processes did not reach Fastify startup. Direct package scripts worked.

Fix:

- Changed root single-service shortcuts to call `pnpm --filter <package> dev` directly.
- Added `scripts/dev-core.mjs`, a small dependency-free Node runner that starts the six core backend service package scripts in parallel.
- Kept the package-level `tsx watch src/main.ts` scripts unchanged.

Why it works: the proven package dev scripts are launched directly, while `pnpm dev:core` remains one command for the backend core.

## Files Changed By This Audit

- `.npmrc`
- `.env.example`
- `package.json`
- `pnpm-lock.yaml`
- `scripts/dev-core.mjs`
- `apps/web/package.json`
- `infra/docker/docker-compose.yml`
- `apps/api-gateway/src/app.ts`
- `apps/api-gateway/src/foundation/error-handler.ts`
- `apps/api-gateway/src/foundation/openapi.ts`
- `apps/auth-service/src/foundation/error-handler.ts`
- `apps/auth-service/src/foundation/http-server.ts`
- `apps/auth-service/src/foundation/openapi.ts`
- `apps/integration-service/src/foundation/error-handler.ts`
- `apps/integration-service/src/foundation/http-server.ts`
- `apps/integration-service/src/foundation/openapi.ts`
- `apps/mail-service/src/foundation/error-handler.ts`
- `apps/mail-service/src/foundation/http-server.ts`
- `apps/mail-service/src/foundation/openapi.ts`
- `apps/calendar-service/src/foundation/error-handler.ts`
- `apps/calendar-service/src/foundation/http-server.ts`
- `apps/calendar-service/src/foundation/openapi.ts`
- `apps/command-service/src/foundation/error-handler.ts`
- `apps/command-service/src/foundation/http-server.ts`
- `apps/command-service/src/foundation/openapi.ts`
- `README.md`
- `PROJECT_RUNNER.md`
- `docs/debug/phase-1-phase-2-runtime-audit.md`
- `roadmap.md`

The local `.env` was also aligned for this machine, but it is intentionally not committed.

## Verification Commands

```bash
pnpm install
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:migrate
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm dev:core
pnpm dev:web
```

Results:

- `pnpm db:migrate`: passed, migrations applied successfully.
- `pnpm lint`: passed, 32 tasks successful.
- `pnpm typecheck`: passed, 32 tasks successful.
- `pnpm build`: passed, 23 tasks successful.
- `pnpm test`: passed, 14 tests.
- Docker Compose: Postgres and Redis healthy.
- `pnpm dev:core`: Gateway, Auth, Integration, Mail, Calendar, and Command services started.
- `pnpm dev:web`: Next.js served the app on `http://localhost:3050`.

Non-fatal build note:

- Next.js reports that the Next ESLint plugin is not detected in the shared ESLint configuration.
- If `pnpm build` runs while `pnpm dev:web` is active, restart the dev server before probing pages again because Next dev can read stale `.next` manifest artifacts.

## Runtime Probes

All returned `200`:

- `GET http://localhost:4050/health`
- `GET http://localhost:4050/ready`
- `GET http://localhost:4050/docs`
- `GET http://localhost:4050/openapi.json`
- `GET http://localhost:4151/health`, `/ready`, `/docs`, `/openapi.json`
- `GET http://localhost:4152/health`, `/ready`, `/docs`, `/openapi.json`
- `GET http://localhost:4153/health`, `/ready`, `/docs`, `/openapi.json`
- `GET http://localhost:4154/health`, `/ready`, `/docs`, `/openapi.json`
- `GET http://localhost:4155/health`, `/ready`, `/docs`, `/openapi.json`

Frontend routes returned `200`:

- `/`
- `/auth/login`
- `/dashboard`
- `/dashboard/inbox`
- `/dashboard/calendar`
- `/dashboard/commands`
- `/dashboard/approvals`

Gateway smoke result:

```txt
registered=audit+a51e244e@example.com
workspaces=1
accounts=gmail:disconnected,google_calendar:disconnected
threads=0 events=0 slots=0
command_status=done approval_status=executed
gmail_connect_start=501 mail_sync=400 calendar_sync=400
```

The `501` for Gmail connect is expected without real Corsair configuration. The `400` sync responses are expected for a newly registered user with disconnected providers.

## Remaining Work

- Configure the real Corsair SDK and credentials.
- Implement live Gmail sync.
- Implement live Google Calendar sync.
- Execute approved provider actions against real provider adapters.
- Add webhook ingestion and verification.
- Add AI classification, summarization, and agent workflows.
- Add search and realtime delivery.
- Add automated browser end-to-end tests for the dashboard workflows.
