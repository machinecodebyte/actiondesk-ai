import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../src/modules/sessions/password.js";

const testOptions = {
  memoryCost: 8192,
  timeCost: 1,
  parallelism: 1
};

test("password hashes verify the original password only", async () => {
  const hash = await hashPassword("correct-horse-battery", testOptions);

  assert.notEqual(hash, "correct-horse-battery");
  assert.equal(await verifyPassword("correct-horse-battery", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});
