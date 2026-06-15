# Integration Onboarding

Phase 1 builds the Gmail and Google Calendar connection flow without faking provider success.

## Flow

1. The protected onboarding page calls `integrations.status` through tRPC.
2. API Gateway verifies the user through `auth-service`.
3. API Gateway sends `x-actiondesk-user-id`, `x-actiondesk-workspace-id`, and `x-actiondesk-request-id` to `integration-service`.
4. `integration-service` reads or creates `connected_accounts` rows and returns real persisted status.

## Provider Statuses

- `disconnected`
- `connecting`
- `connected`
- `error`

Missing rows are returned as `disconnected`. The app never shows a provider as `connected` unless that status is persisted.

## Corsair Behavior

The Corsair adapter interface exists, but the live SDK call is intentionally not invented. Until the real SDK is configured, connect and callback operations return `501 Not Implemented` with:

```txt
Corsair SDK is not configured yet. Add Corsair credentials to enable live connection.
```

Disconnect marks the local account as disconnected and records an audit log. It also reports that live Corsair revoke was skipped.
