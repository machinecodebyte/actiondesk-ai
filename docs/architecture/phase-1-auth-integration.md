# Phase 1 Auth And Integration Architecture

Phase 1 adds the secure product foundation before Gmail, Calendar, AI, agent, search, webhook, or realtime workflows.

## Service Ownership

- `apps/web`: login, onboarding, callback, protected dashboard.
- `apps/api-gateway`: tRPC boundary, request validation, service error mapping, request id forwarding.
- `apps/auth-service`: users, sessions, workspaces, memberships.
- `apps/integration-service`: connected account status, OAuth state storage, Corsair adapter boundary.
- `packages/contracts`: Zod schemas and inferred types.
- `packages/db`: Drizzle schema and migration for app-owned tables.

## Request Boundaries

The frontend only calls API Gateway tRPC. API Gateway does not implement auth or integration business rules; it forwards to the owning service with timeout-safe HTTP clients.

Protected integration calls are authorized by asking `auth-service` for the current user. The gateway then forwards internal context headers to `integration-service`:

```txt
x-actiondesk-user-id
x-actiondesk-workspace-id
x-actiondesk-request-id
```

`integration-service` rejects protected routes if those headers are missing.

## Database Tables

Phase 1 adds:

- `users`
- `workspaces`
- `workspace_members`
- `user_sessions`
- `connected_accounts`
- `integration_oauth_states`
- `audit_logs`

The migration is additive and does not drop existing tables.
