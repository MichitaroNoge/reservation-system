import assert from "node:assert/strict";
import { test } from "node:test";
import { customerEmailChangeSchema } from "../lib/customer-email-change";

test("email change validates the destination and identifies the mismatched confirmation field", () => {
  assert.deepEqual(customerEmailChangeSchema.parse({ email: " next@example.test ", confirmation: "next@example.test" }), { email: "next@example.test", confirmation: "next@example.test" });
  const mismatch = customerEmailChangeSchema.safeParse({ email: "next@example.test", confirmation: "other@example.test" });
  assert.equal(mismatch.success, false);
  if (!mismatch.success) assert.ok(mismatch.error.issues.some(issue => issue.path[0] === "confirmation"));
  for (const value of ["", "next", "next@", `${"a".repeat(250)}@example.test`]) {
    assert.equal(customerEmailChangeSchema.safeParse({ email: value, confirmation: value }).success, false);
  }
});
