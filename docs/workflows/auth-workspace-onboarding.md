# Auth And Workspace Onboarding

Phase 1 adds real user auth and workspace creation through `auth-service`.

## Flow

1. The web app calls API Gateway tRPC procedures under `auth.*`.
2. API Gateway forwards requests to `auth-service` over HTTP.
3. `auth-service` validates input, hashes passwords, writes users/workspaces/memberships, and creates sessions.
4. The frontend stores the returned session token and sends it to the gateway on future tRPC calls.

## Main Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /workspaces`
- `POST /workspaces`
- `POST /workspaces/switch`

## Local Run

```bash
pnpm db:migrate
pnpm dev:auth
pnpm dev:gateway
pnpm dev:web
```

Use `/auth/login` in the web app to register or log in. Registration creates a user, default workspace, owner membership, and session.

## Security Notes

- Passwords are stored as salted `scrypt` hashes.
- Refresh tokens are hashed in the database and can be revoked.
- Access tokens are short-lived and include user, workspace, and session ids.
- Failed login returns a generic error.
