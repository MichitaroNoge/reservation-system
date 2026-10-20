import assert from "node:assert/strict";
import { test } from "node:test";
import type { TokenPayload } from "google-auth-library";
import type { UserRecord, UpdateRequest } from "firebase-admin/auth";
import { assertGoogleClaims, assertSameOrigin, isGoogleCustomerSessionCurrent, newGoogleChallenge, signGoogleChallenge, readGoogleChallenge } from "../lib/google-auth";
import { authenticateGoogleCustomer, unlinkGoogleCustomer, type GoogleAuthStore } from "../lib/services/google-login-service";
import { InMemoryReservationRepository } from "../lib/repositories/in-memory-reservation-repository";
import { isAccountProfileComplete } from "../lib/account-profile";
import { assertRecentAuthentication, isAdminToken } from "../lib/auth";
import type { DecodedIdToken } from "firebase-admin/auth";
const missing = () => Object.assign(new Error("missing"), { code: "auth/user-not-found" });
function fixture() {
  const users = new Map<string, UserRecord>(); let count = 0; const issued: { uid: string; claims: Record<string, unknown> }[] = [], revoked: string[] = [];
  const auth: GoogleAuthStore = {
    async getUser(uid) { const user = users.get(uid); if (!user) throw missing(); return user; },
    async getUserByEmail(email) { const user = [...users.values()].find(u => u.email?.toLowerCase() === email.toLowerCase()); if (!user) throw missing(); return user; },
    async getUserByProviderUid(providerId, sub) { const user = [...users.values()].find(u => u.providerData.some(p => p.providerId === providerId && p.uid === sub)); if (!user) throw missing(); return user; },
    async createUser(input) { const user = { ...input, uid: `google-test-${++count}`, disabled: false, providerData: [], customClaims: {} } as unknown as UserRecord; users.set(user.uid, user); return user; },
    async updateUser(uid, input: UpdateRequest) {
      const old = await auth.getUser(uid);
      const providerData = old.providerData.filter(p => !input.providersToUnlink?.includes(p.providerId));
      if (input.providerToLink) {
        if ([...users.values()].some(u => u.uid !== uid && u.providerData.some(p => p.providerId === input.providerToLink?.providerId && p.uid === input.providerToLink?.uid))) throw new Error("provider collision");
        providerData.push(input.providerToLink as UserRecord["providerData"][number]);
      }
      const user = { ...old, ...input, providerData } as UserRecord; users.set(uid, user); return user;
    },
    async deleteUser(uid) { users.delete(uid); },
    async createCustomToken(uid, claims) { issued.push({ uid, claims: (claims ?? {}) as Record<string, unknown> }); return "test-custom-token"; },
    async setCustomUserClaims(uid, claims) { const user = await auth.getUser(uid); users.set(uid, { ...user, customClaims: claims ?? {} } as UserRecord); },
    async revokeRefreshTokens(uid) { revoked.push(uid); },
  };
  const add = (uid: string, email: string, password = true) => { const u = { uid, email, emailVerified: true, disabled: false, customClaims: { retainedClaim: "value" }, providerData: password ? [{ providerId: "password", uid: email }] : [] } as unknown as UserRecord; users.set(uid, u); return u; };
  return { auth, users, issued, revoked, add, repository: new InMemoryReservationRepository() };
}
test("Google challenges reject forgery, expiry, replay-context changes and cross-site requests", () => {
  const secret = "a".repeat(40), challenge = newGoogleChallenge("link", "owner");
  const signed = signGoogleChallenge(challenge, secret);
  assert.equal(readGoogleChallenge(signed, secret).uid, "owner");
  assert.throws(() => readGoogleChallenge(`${signed}x`, secret));
  assert.throws(() => readGoogleChallenge(signed, "b".repeat(40)));
  assert.throws(() => readGoogleChallenge(signed, secret, challenge.expires));
  assert.throws(() => assertSameOrigin(new Request("http://localhost:3000/api/auth/google", { headers: { origin: "https://evil.test" } })));
  assert.throws(() => assertSameOrigin(new Request("http://localhost:3000/api/auth/google")));
});
test("Google claims validate issuer, audience, nonce, expiration and verified email independently of Firebase tokens", () => {
  const now = Math.floor(Date.now() / 1000), aud = "client.apps.googleusercontent.com", nonce = "nonce";
  const payload = { iss: "https://accounts.google.com", aud, sub: "google-sub-123", iat: now, exp: now + 60, nonce, email: "google@example.test", email_verified: true, name: "Google氏名" } as TokenPayload;
  assert.equal(assertGoogleClaims(payload, aud, nonce).sub, "google-sub-123");
  for (const patch of [{ iss: "https://evil.test" }, { aud: "other" }, { nonce: "other" }, { exp: now - 1 }, { email_verified: false }, { sub: "" }, { iat: now + 300 }]) assert.throws(() => assertGoogleClaims({ ...payload, ...patch }, aud, nonce));
});
test("Google-only signup has no password or application profile and reuses sub across email changes", async () => {
  const f = fixture(), identity = { sub: "unique-google-sub", email: "google-new@example.test", name: "Google 太郎" };
  const first = await authenticateGoogleCustomer(f.repository, f.auth, identity, "login");
  assert.equal(f.users.size, 1);
  assert.equal((await f.auth.getUser(first.uid)).providerData.some(p => p.providerId === "password"), false);
  assert.equal(await f.repository.findAccountByFirebaseUid(first.uid), null);
  const second = await authenticateGoogleCustomer(f.repository, f.auth, { ...identity, email: "changed@example.test" }, "login");
  assert.equal(second.uid, first.uid); assert.equal(f.users.size, 1);
  assert.equal(f.issued[0].claims.customerGoogleSub, identity.sub);
  await assert.rejects(authenticateGoogleCustomer(f.repository, f.auth, { ...identity, sub: "other-sub" }, "login"), /登録済み/);
});
test("email matching never links; explicit linking preserves account ID, claims and old reservation snapshots", async () => {
  const f = fixture(); f.add("password-owner", "existing-google-test@example.test");
  const account = await f.repository.createAccount({ firebaseUid: "password-owner", name: "変更前", phone: "09012345678", contact: "existing-google-test@example.test", accountType: "individual" });
  const reservation = await f.repository.createReservation({ name: "変更前", email: account.contact, phone: "09012345678", date: "2030-10-30", people: 2, customerAccountMode: "account", accountFirebaseUid: "password-owner" });
  const identity = { sub: "explicit-link-sub", email: account.contact, name: "Google 表示名" };
  await assert.rejects(authenticateGoogleCustomer(f.repository, f.auth, identity, "login"), /登録済み/);
  assert.equal((await f.auth.getUser("password-owner")).providerData.length, 1);
  const linked = await authenticateGoogleCustomer(f.repository, f.auth, identity, "link", "password-owner");
  assert.equal(linked.uid, "password-owner");
  assert.equal((await f.auth.getUser("password-owner")).customClaims?.retainedClaim, "value");
  assert.equal((await f.auth.getUser("password-owner")).providerData.length, 2);
  assert.equal((await f.repository.findAccountByFirebaseUid(linked.uid))?.id, account.id);
  assert.equal((await f.repository.listReservationsForReservationAccount(linked.uid))[0].id, reservation.id);
  assert.equal((await f.repository.listReservationsForReservationAccount(linked.uid))[0].customer, "変更前");
  f.add("other-owner", "other@example.test");
  await assert.rejects(authenticateGoogleCustomer(f.repository, f.auth, identity, "link", "other-owner"), /別のアカウント/);
  await assert.rejects(authenticateGoogleCustomer(f.repository, f.auth, { ...identity, sub: "wrong-sub" }, "reauth", linked.uid), /連携済み/);
  const previousVersion = (await f.auth.getUser(linked.uid)).customClaims?.customerGoogleVersion;
  await unlinkGoogleCustomer(f.repository, f.auth, linked.uid);
  const user = await f.auth.getUser(linked.uid);
  assert.equal(user.providerData.some(p => p.providerId === "google.com"), false);
  assert.equal(user.providerData.some(p => p.providerId === "password"), true);
  assert.notEqual(user.customClaims?.customerGoogleVersion, previousVersion);
  assert.deepEqual(f.revoked, [linked.uid]);
  assert.equal((await f.repository.findAccountByFirebaseUid(linked.uid))?.id, account.id);
});
test("Google-only unlink, disabled/deleting users and privileged users fail closed", async () => {
  const f = fixture(); const identity = { sub: "protected-sub", email: "protected@example.test", name: "氏名" };
  const login = await authenticateGoogleCustomer(f.repository, f.auth, identity, "login");
  await assert.rejects(unlinkGoogleCustomer(f.repository, f.auth, login.uid), /パスワード/);
  f.users.set(login.uid, { ...await f.auth.getUser(login.uid), disabled: true } as UserRecord);
  await assert.rejects(authenticateGoogleCustomer(f.repository, f.auth, identity, "login"), /利用できません/);
  f.users.set(login.uid, { ...await f.auth.getUser(login.uid), disabled: false, customClaims: { admin: true } } as unknown as UserRecord);
  await assert.rejects(authenticateGoogleCustomer(f.repository, f.auth, identity, "login"), /従来/);
});
test("profile completion requires real contact information but preserves legacy individual types", () => {
  assert.equal(isAccountProfileComplete(null), false);
  assert.equal(isAccountProfileComplete({ name: "Google 太郎" }), false);
  assert.equal(isAccountProfileComplete({ name: "太郎", phone: "09012345678" }), true);
  assert.equal(isAccountProfileComplete({ name: "会社", phone: "09012345678", accountType: "travel_agency" }), false);
  assert.equal(isAccountProfileComplete({ name: "会社", phone: "09012345678", accountType: "travel_agency", companyBranchName: "旅行会社", contactPersonName: "太郎" }), true);
});
test("unlink, relink, password changes and disabled accounts invalidate old Google custom sessions", () => {
  const token = { uid: "owner", customerGoogleSub: "google-sub", customerGoogleSessionVersion: "version-1", customerGoogleAuthenticatedAt: Math.floor(Date.now() / 1000) };
  const user = { uid: "owner", disabled: false, providerData: [{ providerId: "google.com", uid: "google-sub" }], customClaims: { customerGoogleVersion: "version-1" } };
  assert.equal(isGoogleCustomerSessionCurrent(token, user), true);
  assert.equal(isGoogleCustomerSessionCurrent(token, { ...user, providerData: [] }), false);
  assert.equal(isGoogleCustomerSessionCurrent(token, { ...user, customClaims: { customerGoogleVersion: "version-2" } }), false);
  assert.equal(isGoogleCustomerSessionCurrent(token, { ...user, disabled: true }), false);
  assert.equal(isGoogleCustomerSessionCurrent(token, { ...user, uid: "another-owner" }), false);
  assert.equal(isGoogleCustomerSessionCurrent(token, { ...user, tokensValidAfterTime: new Date(Date.now() + 60_000).toISOString() }), false);
});
test("custom token replay cannot refresh Google proof age or grant admin access", () => {
  const token = { uid: "owner", auth_time: 10_000, customerGoogleSub: "google-sub", customerGoogleAuthenticatedAt: 9_000, admin: true, email_verified: true } as unknown as DecodedIdToken;
  assert.throws(() => assertRecentAuthentication(token, 10_000), /本人確認/);
  assert.doesNotThrow(() => assertRecentAuthentication({ ...token, customerGoogleAuthenticatedAt: 10_000 }, 10_000));
  assert.equal(isAdminToken(token), false);
});
test("a failed new-provider link rolls back only the identity created by that signup", async () => {
  const f = fixture(); f.add("existing-owner", "existing-owner@example.test");
  f.auth.updateUser = async () => { throw new Error("provider service unavailable"); };
  await assert.rejects(authenticateGoogleCustomer(f.repository, f.auth, { sub: "failed-new-sub", email: "failed-new@example.test", name: "氏名" }, "login"), /unavailable/);
  assert.deepEqual([...f.users.keys()], ["existing-owner"]);
});
