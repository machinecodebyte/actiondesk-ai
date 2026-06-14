# Foundation Workflow

## Local Setup

1. Install dependencies with `pnpm install`.
2. Create a local `.env` from `.env.example`.
3. Set local-only database credentials before starting Docker.
4. Start Postgres and Redis with `docker compose -f infra/docker/docker-compose.yml up -d`.
5. Run the API gateway with `pnpm dev:gateway`.
6. Run the web app with `pnpm dev:web`.

## Service Development

Each backend service has the same foundation:

- `GET /health`
- `GET /ready`
- `GET /metadata`
- request IDs
- structured logging
- security headers
- graceful shutdown

Add business modules inside the existing service-specific `src/modules/*` folders when their product slice is ready.

## Boundaries

The web app may consume the API gateway tRPC router. Internal services should communicate through HTTP clients and event contracts. Do not import another service's internal modules directly.
