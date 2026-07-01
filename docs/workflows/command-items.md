# Command Items Workflow

Command items are stored in `command_items` and owned by `command-service`.

## Supported Sources

- `manual`
- `email`
- `calendar`

Email and Calendar command items validate that the source exists in the local cache.

## Statuses

- `open`
- `snoozed`
- `waiting`
- `done`
- `dismissed`
- `failed`

## Rule-Based Suggestions

Phase 2 uses small readable rules only:

- Meeting-like words suggest `schedule_meeting`.
- Response-like email text suggests `draft_reply`.

AI classification is intentionally not implemented in Phase 2.
