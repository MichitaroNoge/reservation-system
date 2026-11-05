import assert from "node:assert/strict";
import { test } from "node:test";
import type { DecodedIdToken } from "firebase-admin/auth";
import { assertRecentPasswordAuthentication, assertRecentGoogleAuthentication } from "../lib/auth";
import { loginMethodPasswordSchema, currentPasswordSchema } from "../lib/login-method-settings";

test("password changes require the current password independently of Google linking; first setup does not", () => {
  const values = { currentPassword: "", password: "next-password-123", confirmPassword: "next-password-123" };
  assert.equal(loginMethodPasswordSchema(true).safeParse(values).success, false);
  assert.equal(loginMethodPasswordSchema(false).safeParse(values).success, true);
  assert.equal(loginMethodPasswordSchema(true).safeParse({ ...values, currentPassword: "current-password" }).success, true);
  assert.equal(loginMethodPasswordSchema(false).safeParse({ ...values, password: "short", confirmPassword: "short" }).success, false);
  const mismatch = loginMethodPasswordSchema(true).safeParse({ ...values, currentPassword: "current", confirmPassword: "different" });
  assert.equal(mismatch.success, false);
  if (!mismatch.success) assert.ok(mismatch.error.issues.some(issue => issue.path[0] === "confirmPassword"));
  assert.equal(currentPasswordSchema.safeParse({ currentPassword: "" }).success, false);
});

test("login-method operations distinguish recent password proof from Google proof and reject token refresh as reauthentication", () => {
  const now = 10000;
  const password = { auth_time: now, firebase: { sign_in_provider: "password" } } as DecodedIdToken;
  const google = { auth_time: now, firebase: { sign_in_provider: "google.com" } } as DecodedIdToken;
  const custom = { auth_time: now, firebase: { sign_in_provider: "custom" }, customerGoogleSub: "linked-sub", customerGoogleAuthenticatedAt: now } as unknown as DecodedIdToken;
  assert.doesNotThrow(() => assertRecentPasswordAuthentication(password, now));
  assert.doesNotThrow(() => assertRecentPasswordAuthentication({ ...password, auth_time: now - 300 }, now));
  for (const token of [google, custom, { ...password, auth_time: now - 301, iat: now }, { ...password, customerGoogleSub: "linked-sub" }, { ...password, auth_time: now + 31 }]) {
    assert.throws(() => assertRecentPasswordAuthentication(token as DecodedIdToken, now));
  }
  assert.doesNotThrow(() => assertRecentGoogleAuthentication(google, now));
  assert.doesNotThrow(() => assertRecentGoogleAuthentication(custom, now));
  for (const token of [password, { ...custom, customerGoogleAuthenticatedAt: now - 301 }, { ...custom, customerGoogleSub: undefined }]) {
    assert.throws(() => assertRecentGoogleAuthentication(token as DecodedIdToken, now));
  }
});
