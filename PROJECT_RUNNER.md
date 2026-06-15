# ActionDesk AI Project Runner

## Project Overview

ActionDesk AI is a Gmail and Google Calendar AI command center. The current project includes the monorepo foundation, auth and workspace onboarding, protected frontend pages, API Gateway routing, integration status tracking, and Swagger docs for manual backend testing.

This is one monorepo, not separate frontend and backend folders:

- Frontend: `apps/web`
- API Gateway: `apps/api-gateway`
- Backend services: `apps/*-service`
- Shared packages: `packages/*`
- Docker infra: `infra/docker/docker-compose.yml`

The web app talks to API Gateway through tRPC. Swagger REST routes exist only for manual Phase 1 API testing.

## System Requirements

- Node.js 22 or compatible current LTS
- pnpm 9.x
- Docker Desktop
- Postgres and Redis through Docker Compose

## Port Map

These ports were selected to avoid conflicts with other local projects.

| Service | URL / Port |
| --- | --- |
| Frontend Web | `http://localhost:3050` |
| API Gateway | `http://localhost:4050` |
| API Gateway Swagger | `http://localhost:4050/docs` |
| Auth Service | `http://localhost:4151` |
| Auth Swagger | `http://localhost:4151/docs` |
| Integration Service | `http://localhost:4152` |
| Integration Swagger | `http://localhost:4152/docs` |
| Postgres | `localhost:55450` |
| Redis | `localhost:6390` |

Additional service defaults:

| Service | URL / Port |
| --- | --- |
| Mail Service | `http://localhost:4153` |
| Calendar Service | `http://localhost:4154` |
| Command Service | `http://localhost:4155` |
| AI Service | `http://localhost:4156` |
| Agent Service | `http://localhost:4157` |
| Search Service | `http://localhost:4158` |
| Webhook Service | `http://localhost:4159` |
| Worker Service | `http://localhost:4160` |
| Realtime Service | `http://localhost:4161` |

## First-Time Setup

1. Open the project root:

```bash
cd actiondesk-ai
```

2. Install dependencies:

```bash
pnpm install
```

3. Create local env:

```bash
cp .env.example .env
```

4. Keep the example dev database password or choose your own local-only value. Never commit real secrets.

5. Start Docker infra:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

6. Check containers:

```bash
docker ps
```

7. Run migrations:

```bash
pnpm db:migrate
```

8. Verify the project:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Run The Frontend

```bash
pnpm dev:web
```

Open:

```txt
http://localhost:3050
```

## Run Backend Core Services

Run each service in a separate terminal:

```bash
pnpm dev:auth
pnpm dev:integration
pnpm dev:gateway
```

Or run the core backend services together:

```bash
pnpm dev:core
```

## Open Swagger UI

- API Gateway docs: `http://localhost:4050/docs`
- Auth Service docs: `http://localhost:4151/docs`
- Integration Service docs: `http://localhost:4152/docs`

OpenAPI JSON:

- API Gateway: `http://localhost:4050/openapi.json`
- Auth Service: `http://localhost:4151/openapi.json`
- Integration Service: `http://localhost:4152/openapi.json`

## Test Auth APIs In Swagger

Use API Gateway Swagger first because it represents the public backend boundary.

1. Open `http://localhost:4050/docs`.
2. Run `POST /api/auth/register` with an email, password, and optional workspace name.
3. Copy the returned `accessToken` if you want to test protected endpoints with bearer auth.
4. Run `POST /api/auth/login` to create a new session.
5. Run `GET /api/auth/me` with bearer auth or with the HTTP-only cookie set by the browser.
6. Run `POST /api/auth/refresh` to rotate a refresh token.
7. Run `POST /api/auth/logout` to revoke the current session.

Do not put real secrets in Swagger examples.

## Test Integration APIs In Swagger

1. Register or log in first.
2. Use the returned access token with protected integration endpoints.
3. Run `GET /api/integrations/status`.
4. Run `POST /api/integrations/gmail/connect/start`.
5. Run `POST /api/integrations/google_calendar/connect/start`.

Until the real Corsair SDK is wired, connect and callback operations return `501 Not Implemented` with a clear message. The app must not fake Gmail or Google Calendar as connected.

## Check Health Endpoints

```bash
curl http://localhost:4050/health
curl http://localhost:4050/ready
curl http://localhost:4151/health
curl http://localhost:4152/health
```

API Gateway health degrades gracefully if an internal service is not running.

## Stop Docker Infra

```bash
docker compose -f infra/docker/docker-compose.yml down
```

## Reset Docker Infra

This deletes local Postgres and Redis data.

```bash
docker compose -f infra/docker/docker-compose.yml down -v
docker compose -f infra/docker/docker-compose.yml up -d
```

## Already Implemented

- Foundation monorepo
- Next.js frontend shell
- Fastify API Gateway with tRPC
- Auth Service
- Integration Service
- Shared contracts, config, logging, errors, DB, UI packages
- Protected onboarding and dashboard screens
- Swagger docs and OpenAPI JSON for the core Phase 1 APIs
- REST facade under `/api/*` for manual API testing

## Not Implemented Yet

- Live Gmail inbox listing
- Live Calendar event listing
- Command item creation
- AI email classification
- Real Corsair SDK setup
- Corsair webhooks
- Agent chat
- Search
- Realtime updates
- Production deployment

## Common Issues

**Port already in use**

Check whether another app is using one of the ActionDesk ports. The project defaults avoid `4000`, `4001`, `8000`, `8001`, `5433`, `5438`, `55432`, `6379`, `6380`, `6381`, `9000`, and `1025`.

**Docker is not running**

Start Docker Desktop, then rerun:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

**Database connection failed**

Check that `DATABASE_URL` points to `localhost:55450` and that the Docker Postgres container is healthy.

**Missing env variables**

Copy `.env.example` to `.env` and fill local-only values. Auth secrets must be at least 32 characters.

**CORS issue**

Confirm `CORS_ORIGINS=http://localhost:3050` and `NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:4050`.

**API Gateway shows degraded**

Start `auth-service` and `integration-service`. Degraded health is expected when a dependency is down.

## Suggested Development Run Order

1. Start Docker.
2. Start `auth-service`.
3. Start `integration-service`.
4. Start `api-gateway`.
5. Start `web`.
6. Open the frontend.
7. Open Swagger.

## Current Limitations And Next Phase

The next phase should add real Corsair SDK setup, Gmail read/search modules, Calendar availability/events modules, and the command item workflow. Keep those features separate from the current Swagger/testing surface.
