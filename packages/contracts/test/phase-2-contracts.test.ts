import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CommandStatusSchema,
  CreateApprovalInputSchema,
  CreateCommandItemInputSchema,
  SyncStatusSchema
} from "../src/index.js";

test("command status transitions use the Phase 2 status set", () => {
  for (const status of ["open", "snoozed", "waiting", "done", "dismissed", "failed"]) {
    assert.equal(CommandStatusSchema.safeParse(status).success, true);
  }

  assert.equal(CommandStatusSchema.safeParse("archived").success, false);
});

test("create command item input accepts manual and source-backed items", () => {
  assert.equal(CreateCommandItemInputSchema.safeParse({
    sourceType: "manual",
    title: "Prepare weekly follow-up"
  }).success, true);

  assert.equal(CreateCommandItemInputSchema.safeParse({
    sourceType: "email",
    sourceId: "11111111-1111-4111-8111-111111111111",
    title: "Reply to customer",
    priority: "high"
  }).success, true);

  assert.equal(CreateCommandItemInputSchema.safeParse({
    sourceType: "email",
    title: ""
  }).success, false);
});

test("approval input stores a payload but does not imply execution", () => {
  assert.equal(CreateApprovalInputSchema.safeParse({
    actionType: "create_email_draft",
    payload: {
      threadId: "11111111-1111-4111-8111-111111111111",
      body: "Thanks, I will follow up."
    }
  }).success, true);
});

test("sync status can represent unavailable provider execution cleanly", () => {
  assert.equal(SyncStatusSchema.safeParse("failed").success, true);
  assert.equal(SyncStatusSchema.safeParse("pretend_success").success, false);
});
