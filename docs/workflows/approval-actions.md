# Approval Actions Workflow

Approvals are stored in `approval_requests` and owned by `command-service`.

## Flow

1. A sensitive action creates an approval request.
2. User reviews the payload in the approvals page.
3. User approves or rejects.
4. Rejection marks the approval `rejected`.
5. Approval records execution state.

## Sensitive Actions

- `create_email_draft`
- `send_email`
- `create_calendar_event`
- `update_calendar_event`
- `delete_calendar_event`

## Current Execution Behavior

Live provider execution is not configured yet. For live provider actions, approval is recorded and then marked `failed` with a clear error message.

This preserves the safety rule: ActionDesk AI must not send emails or create calendar events without approval, and it must not fake provider success.
