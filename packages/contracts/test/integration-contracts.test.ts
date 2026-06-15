import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CompleteConnectionInputSchema,
  IntegrationProviderSchema,
  IntegrationStatusResponseSchema,
  StartConnectionInputSchema
} from "../src/integrations/index.js";

test("integration provider list is limited to Gmail and Google Calendar", () => {
  assert.equal(IntegrationProviderSchema.safeParse("gmail").success, true);
  assert.equal(IntegrationProviderSchema.safeParse("google_calendar").success, true);
  assert.equal(IntegrationProviderSchema.safeParse("drive").success, false);
});

test("start connection input requires a supported provider", () => {
  assert.equal(StartConnectionInputSchema.safeParse({
    provider: "gmail",
    redirectUrl: "http://localhost:3050/auth/callback"
  }).success, true);
});

test("complete connection input requires state and provider", () => {
  assert.equal(CompleteConnectionInputSchema.safeParse({
    provider: "google_calendar",
    state: "0123456789abcdef",
    code: "oauth-code"
  }).success, true);
});

test("integration status can represent disconnected providers", () => {
  const result = IntegrationStatusResponseSchema.safeParse({
    accounts: [
      {
        id: null,
        workspaceId: "11111111-1111-4111-8111-111111111111",
        userId: null,
        provider: "gmail",
        providerAccountEmail: null,
        corsairAccountId: null,
        corsairIntegrationId: null,
        status: "disconnected",
        scopes: null,
        lastSyncAt: null,
        connectedAt: null,
        errorMessage: null,
        createdAt: null,
        updatedAt: null
      }
    ]
  });

  assert.equal(result.success, true);
});
