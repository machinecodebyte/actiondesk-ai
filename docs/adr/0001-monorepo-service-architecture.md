# ADR 0001: Monorepo Service Architecture

## Status

Accepted

## Context

ActionDesk AI needs a frontend, public API boundary, shared contracts, and several backend services that can evolve independently. The foundation should be easy to inspect, start locally, and extend without hiding behavior behind heavy abstractions.

## Decision

Use a `pnpm` monorepo orchestrated by Turborepo. Build the frontend with Next.js App Router. Build the API gateway and backend services with Fastify and TypeScript. Use tRPC only between the web app and API gateway. Use HTTP clients and event contracts for internal service communication.

Shared package responsibilities are intentionally narrow:

- `@actiondesk/config` validates environment variables with Zod.
- `@actiondesk/logger` creates structured Pino loggers.
- `@actiondesk/errors` standardizes application errors.
- `@actiondesk/contracts` owns shared Zod schemas and types.
- `@actiondesk/db` contains the Drizzle/Postgres foundation.
- `@actiondesk/redis` contains Redis and BullMQ factories.
- `@actiondesk/events` defines event contracts.
- `@actiondesk/observability` owns health, request IDs, and timing helpers.

## Consequences

The gateway stays free of business logic. Services can be started and tested independently. The monorepo keeps shared types close without forcing internal services into the public tRPC API.
