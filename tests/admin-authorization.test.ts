import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { ApiAuthError, isAdminToken, requireAdmin } from "../lib/auth";

const originalAllowList = process.env.FIREBASE_AUTH_ADMIN_EMAILS;
before(() => { process.env.FIREBASE_AUTH_ADMIN_EMAILS = " Admin@Example.test , second@example.test "; });
after(() => {
  if (originalAllowList === undefined) delete process.env.FIREBASE_AUTH_ADMIN_EMAILS;
  else process.env.FIREBASE_AUTH_ADMIN_EMAILS = originalAllowList;
});

function token(overrides: Record<string, unknown> = {}): DecodedIdToken {
  return {
    uid: "authorization-test-user", sub: "authorization-test-user",
    aud: "authorization-test-project", iss: "https://securetoken.google.com/authorization-test-project",
    iat: 1, exp: 2, auth_time: 1, firebase: { identities: {}, sign_in_provider: "password" },
    email: "admin@example.test", ...overrides,
  } as DecodedIdToken;
}

test("email allow-list denies unverified, absent and non-boolean verification claims", () => {
  for (const email_verified of [undefined, false, "true", 1, null]) {
    assert.equal(isAdminToken(token({ email_verified })), false);
  }
});

test("email allow-list requires an exact verified email and preserves configuration normalization", () => {
  assert.equal(isAdminToken(token({ email: "ADMIN@EXAMPLE.TEST", email_verified: true })), true);
  assert.equal(isAdminToken(token({ email: "second@example.test", email_verified: true })), true);
  for (const email of [undefined, "other@example.test", "admin@example.test.attacker.test"]) {
    assert.equal(isAdminToken(token({ email, email_verified: true })), false);
  }
});

test("explicit trusted admin claims retain their existing authorization behavior", () => {
  assert.equal(isAdminToken(token({ email: undefined, admin: true })), true);
  assert.equal(isAdminToken(token({ email_verified: false, role: "admin" })), true);
  assert.equal(isAdminToken(token({ admin: "true", role: "user", email_verified: false })), false);
});

test("requireAdmin rejects an unverified allow-listed Firebase user with 403", async () => {
  const app = getApps()[0] ?? initializeApp({ projectId: "authorization-test-project" });
  let decoded = token({ email_verified: false });
  const verifier = mock.method(getAuth(app), "verifyIdToken", async () => decoded);
  const request = new Request("http://localhost/api/auth/session", { headers: { authorization: "Bearer test-token" } });
  try {
    await assert.rejects(requireAdmin(request), (error: unknown) => error instanceof ApiAuthError && error.statusCode === 403);
    decoded = token({ email_verified: true });
    assert.equal((await requireAdmin(request)).uid, decoded.uid);
    decoded = token({ email: "other@example.test", email_verified: true });
    await assert.rejects(requireAdmin(request), (error: unknown) => error instanceof ApiAuthError && error.statusCode === 403);
    decoded = token({ email_verified: false, admin: true });
    assert.equal((await requireAdmin(request)).uid, decoded.uid);
  } finally { verifier.mock.restore(); }
});

test("requireAdmin still rejects missing and invalid tokens with 401", async () => {
  await assert.rejects(requireAdmin(new Request("http://localhost/api/auth/session")), (error: unknown) => error instanceof ApiAuthError && error.statusCode === 401);
  const app = getApps()[0] ?? initializeApp({ projectId: "authorization-test-project" });
  const verifier = mock.method(getAuth(app), "verifyIdToken", async () => { throw new Error("invalid test token"); });
  try {
    await assert.rejects(requireAdmin(new Request("http://localhost/api/auth/session", { headers: { authorization: "Bearer invalid-test-token" } })), (error: unknown) => error instanceof ApiAuthError && error.statusCode === 401);
  } finally { verifier.mock.restore(); }
});
