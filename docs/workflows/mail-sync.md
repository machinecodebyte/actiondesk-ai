# Mail Sync Workflow

## Manual Flow

1. User clicks `Sync Gmail` in the inbox page.
2. Frontend calls `mail.sync` through tRPC.
3. API Gateway forwards the request to `mail-service` with user, workspace, and request headers.
4. `mail-service` checks that Gmail is connected in `connected_accounts`.
5. If a real Corsair Gmail adapter is not configured, the service records a failed `sync_runs` row and returns `501`.

## Cached Reads

`GET /mail/threads` and `GET /mail/threads/:id` read only local `mail_threads` and `mail_messages`.

The UI never calls Corsair directly and never renders fake emails.

## Live Provider Gap

To enable real Gmail sync, add a real Corsair Gmail adapter that can:

- Fetch recent threads and messages.
- Normalize provider data.
- Upsert `mail_threads` and `mail_messages`.
- Return provider action results for draft, archive, read, and unread operations.
