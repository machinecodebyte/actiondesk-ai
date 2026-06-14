# ActionDesk AI Architecture Overview

ActionDesk AI is structured as a TypeScript monorepo with a Next.js web app, a Fastify API gateway, and independently runnable backend service skeletons.

The API gateway is the public backend boundary. The web app talks to the gateway through tRPC. Internal services expose HTTP foundations and are reached through small timeout-safe HTTP clients, not direct tRPC coupling.

## Runtime Shape

- `apps/web` provides the App Router frontend shell.
- `apps/api-gateway` exposes `/trpc`, `/health`, and `/ready`.
- Backend services expose `/health`, `/ready`, and `/metadata`.
- Shared packages own environment validation, logging, errors, contracts, database setup, Redis setup, events, observability, UI, lint config, and TypeScript config.

## Current Scope

This foundation intentionally stops before product behavior. Gmail, Calendar, Corsair, AI classification, agent chat, approvals, search indexing, webhooks, and workers are represented only by folders and contracts-ready boundaries.
