import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AuthResponseSchema,
  LoginInputSchema,
  RegisterInputSchema
} from "../src/auth/index.js";

test("register input requires a valid email and strong password", () => {
  assert.equal(RegisterInputSchema.safeParse({
    email: "USER@example.com",
    password: "correct-horse"
  }).success, true);

  assert.equal(RegisterInputSchema.safeParse({
    email: "not-an-email",
    password: "short"
  }).success, false);
});

test("login input accepts email and password only", () => {
  const result = LoginInputSchema.safeParse({
    email: "user@example.com",
    password: "secret"
  });

  assert.equal(result.success, true);
});

test("auth response never requires password material", () => {
  const result = AuthResponseSchema.safeParse({
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "user@example.com",
      name: null,
      avatarUrl: null,
      timezone: "UTC",
      status: "active",
      activeWorkspace: null,
      createdAt: "2026-06-14T00:00:00.000Z"
    },
    workspace: null,
    session: {
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: "2026-06-15T00:00:00.000Z"
    }
  });

  assert.equal(result.success, true);
});
