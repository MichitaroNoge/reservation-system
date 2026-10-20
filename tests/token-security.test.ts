import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth, type DecodedIdToken, type UserRecord } from "firebase-admin/auth";
import { ApiAuthError, assertRecentAuthentication, requireAdmin, requireFirebaseUser, requireRecentlyAuthenticatedFirebaseUser } from "../lib/auth";
import { removeAdminAccessAndRevokeSessions, revokeUserSessions } from "../lib/auth-session-management";

function token(overrides: Record<string, unknown> = {}): DecodedIdToken {
  const now = Math.floor(Date.now() / 1000);
  return { uid: "security-test-user", sub: "security-test-user", aud: "security-tests", iss: "https://securetoken.google.com/security-tests", iat: now, exp: now + 3600, auth_time: now, firebase: { identities: {}, sign_in_provider: "password" }, admin: true, email_verified: true, ...overrides } as DecodedIdToken;
}
const request = () => new Request("http://localhost/api/auth/session", { headers: { authorization: "Bearer security-test-token" } });
const isAuthError = (status: number) => (error: unknown) => error instanceof ApiAuthError && error.statusCode === status;

test("admin and customer APIs enable revocation checks and reject revoked/disabled sessions", async () => {
  const app = getApps()[0] ?? initializeApp({ projectId: "security-tests" });
  let failure = "";
  const flags: unknown[] = [];
  const verifier = mock.method(getAuth(app), "verifyIdToken", async (_value: string, checkRevoked?: boolean) => {
    flags.push(checkRevoked);
    if (failure && checkRevoked) throw Object.assign(new Error("session rejected"), { code: failure });
    return token();
  });
  try {
    await requireAdmin(request()); await requireFirebaseUser(request());
    for (failure of ["auth/id-token-revoked", "auth/user-disabled"]) {
      await assert.rejects(requireAdmin(request()), isAuthError(401));
      await assert.rejects(requireFirebaseUser(request()), isAuthError(401));
    }
    assert.deepEqual(flags, Array(6).fill(true));
  } finally { verifier.mock.restore(); }
});

test("recent authentication checks auth_time, including its boundary, rather than token refresh time", () => {
  const now = 1_800_000_000;
  assert.doesNotThrow(() => assertRecentAuthentication(token({ auth_time: now - 300 }), now));
  for (const auth_time of [now - 301, now - 3600, now + 31, undefined, null, String(now), NaN, Infinity, 0, now - 0.5]) {
    assert.throws(() => assertRecentAuthentication(token({ auth_time, iat: now }), now), isAuthError(403));
  }
});

test("sensitive-operation guard rejects stale authentication, unverified email and revoked tokens", async () => {
  const app = getApps()[0] ?? initializeApp({ projectId: "security-tests" });
  let decoded = token({ auth_time: Math.floor(Date.now() / 1000) - 600 });
  let revoked = false;
  const verifier = mock.method(getAuth(app), "verifyIdToken", async (_value: string, checkRevoked?: boolean) => {
    assert.equal(checkRevoked, true);
    if (revoked) throw new Error("revoked");
    return decoded;
  });
  try {
    await assert.rejects(requireRecentlyAuthenticatedFirebaseUser(request()), isAuthError(403));
    decoded = token({ email_verified: false });
    await assert.rejects(requireRecentlyAuthenticatedFirebaseUser(request()), isAuthError(403));
    decoded = token();
    assert.equal((await requireRecentlyAuthenticatedFirebaseUser(request())).uid, decoded.uid);
    revoked = true;
    await assert.rejects(requireRecentlyAuthenticatedFirebaseUser(request()), isAuthError(401));
  } finally { verifier.mock.restore(); }
});

function sessionAdmin(email = "operator@example.test") {
  const calls: string[] = [];
  let savedClaims: object | null = null;
  const auth: Pick<Auth, "getUser" | "setCustomUserClaims" | "revokeRefreshTokens"> = {
    getUser: async uid => ({ uid, email, customClaims: { admin: true, role: "admin", billingRole: "viewer" } }) as unknown as UserRecord,
    setCustomUserClaims: async (_uid, claims) => { savedClaims = claims; calls.push("claims"); },
    revokeRefreshTokens: async () => { calls.push("revoke"); },
  };
  return { auth, calls, getClaims: () => savedClaims };
}

test("removing admin claims preserves unrelated claims and also revokes issued sessions", async () => {
  const fixture = sessionAdmin();
  await removeAdminAccessAndRevokeSessions("test-uid", fixture.auth);
  assert.deepEqual(fixture.getClaims(), { billingRole: "viewer" });
  assert.deepEqual(fixture.calls, ["claims", "revoke"]);
});

test("email fallback must be removed before removing admin claims", async () => {
  const previous = process.env.FIREBASE_AUTH_ADMIN_EMAILS;
  process.env.FIREBASE_AUTH_ADMIN_EMAILS = " OPERATOR@EXAMPLE.TEST ";
  const fixture = sessionAdmin();
  try {
    await assert.rejects(removeAdminAccessAndRevokeSessions("test-uid", fixture.auth), /許可リスト/);
    assert.deepEqual(fixture.calls, []);
  } finally {
    if (previous === undefined) delete process.env.FIREBASE_AUTH_ADMIN_EMAILS;
    else process.env.FIREBASE_AUTH_ADMIN_EMAILS = previous;
  }
});

test("revoking compromised sessions does not modify admin claims; revocation failures propagate", async () => {
  const fixture = sessionAdmin();
  await revokeUserSessions("test-uid", fixture.auth);
  assert.deepEqual(fixture.calls, ["revoke"]);
  const failing = { ...fixture.auth, revokeRefreshTokens: async () => { throw new Error("revocation unavailable"); } };
  await assert.rejects(removeAdminAccessAndRevokeSessions("test-uid", failing), /revocation unavailable/);
});
