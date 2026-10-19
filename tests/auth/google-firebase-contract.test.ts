import assert from "node:assert/strict";
import { test } from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { isGoogleCustomerSessionCurrent } from "../../lib/google-auth";

test("Firebase Auth emulator supports explicit Google provider linking, custom sessions, password addition and unlinking with one UID", async () => {
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099", "This contract test requires the isolated local Auth emulator.");
  const app = initializeApp({ projectId: "demo-reservation-google" }, "google-contract");
  const auth = getAuth(app), nonce = String(Date.now()), email = `google-contract-${nonce}@example.test`;
  const rest = async (operation: string, body: object) => {
    const response = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:${operation}?key=demo-key`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  try {
    const created = await auth.createUser({ email, emailVerified: true, displayName: "Google契約検証" });
    const sub = `google-contract-sub-${nonce}`;
    await auth.updateUser(created.uid, { providerToLink: { providerId: "google.com", uid: sub, email, displayName: "Google契約検証" } });
    assert.equal((await auth.getUserByProviderUid("google.com", sub)).uid, created.uid);
    assert.equal((await auth.getUser(created.uid)).providerData.some(p => p.providerId === "password"), false);
    const claims = { customerGoogleSub: sub, customerGoogleSessionVersion: "version-1", customerGoogleAuthenticatedAt: Math.floor(Date.now() / 1000) };
    await auth.setCustomUserClaims(created.uid, { customerGoogleVersion: "version-1" });
    const customToken = await auth.createCustomToken(created.uid, claims);
    const google = await rest("signInWithCustomToken", { token: customToken, returnSecureToken: true });
    assert.equal(google.status, 200);
    const decoded = await auth.verifyIdToken(google.data.idToken);
    assert.equal(decoded.uid, created.uid); assert.equal(decoded.customerGoogleSub, sub);
    assert.equal(isGoogleCustomerSessionCurrent(decoded, await auth.getUser(created.uid)), true);
    const refreshed = await fetch("http://127.0.0.1:9099/securetoken.googleapis.com/v1/token?key=demo-key", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: google.data.refreshToken }) });
    assert.equal(refreshed.status, 200);
    const renewed = await auth.verifyIdToken((await refreshed.json()).id_token);
    assert.equal(renewed.customerGoogleAuthenticatedAt, claims.customerGoogleAuthenticatedAt);
    assert.equal(renewed.customerGoogleSub, sub);
    assert.equal((await rest("signInWithPassword", { email, password: "not-configured", returnSecureToken: true })).status, 400);
    await auth.updateUser(created.uid, { password: "contract-password-123" });
    const password = await rest("signInWithPassword", { email, password: "contract-password-123", returnSecureToken: true });
    assert.equal(password.status, 200); assert.equal(password.data.localId, created.uid);
    // Admin provider linking is privileged and is not our uniqueness boundary.
    // The application's precheck plus PostgreSQL lock is covered by the SQL concurrency test.
    await auth.updateUser(created.uid, { providersToUnlink: ["google.com"] });
    assert.equal(isGoogleCustomerSessionCurrent(decoded, await auth.getUser(created.uid)), false);
    assert.equal((await rest("signInWithPassword", { email, password: "contract-password-123", returnSecureToken: true })).status, 200);
    await assert.rejects(auth.getUserByProviderUid("google.com", sub));
    const replay = await rest("signInWithCustomToken", { token: customToken, returnSecureToken: true });
    assert.equal(replay.status, 200); // Firebase custom tokens alone are not a revocation boundary.
    assert.equal(isGoogleCustomerSessionCurrent(await auth.verifyIdToken(replay.data.idToken), await auth.getUser(created.uid)), false);
  } finally { await deleteApp(app); }
});
