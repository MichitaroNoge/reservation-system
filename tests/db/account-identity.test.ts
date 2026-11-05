import assert from "node:assert/strict";
import { before, after, mock, test } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { getAuth } from "firebase-admin/auth";
import { eq, sql } from "drizzle-orm";
import { createCalendarFixture } from "./calendar-fixture";
import { getDatabase } from "../../lib/db/client";
import { getFirebaseAdminApp } from "../../lib/auth";
import { apiErrorResponse } from "../../lib/api-validation";
import { DrizzleReservationRepository } from "../../lib/repositories/drizzle-reservation-repository";
import { FirebaseSqlConnectReservationRepository } from "../../lib/repositories/firebase-sql-connect-repository";
import { saveAuthenticatedAccountProfile } from "../../lib/services/account-profile-service";
import { normalizeLoginEmail } from "../../lib/login-email";
import * as s from "../../lib/db/schema";

let fixture: Awaited<ReturnType<typeof createCalendarFixture>>;
let repo: DrizzleReservationRepository;
before(async () => { fixture = await createCalendarFixture(); repo = fixture.repo; });
after(async () => { await fixture?.close(); });
const profile = { name: "顧客", phone: "09000000000", accountType: "individual" as const };
const booking = { name: "予約時の氏名", email: "snapshot@example.test", phone: "08000000000", date: "2026-12-20", startTime: "13:00", people: 5, menuItems: ["検証メニュー"], status: "cancelled" as const };
const status = (code: number) => (error: unknown) => !!error && typeof error === "object" && "statusCode" in error && error.statusCode === code;
async function legacyInactive(uid: string, email: string) {
  const db = await getDatabase();
  const [raw] = await db.insert(s.account).values({ firebaseUid: uid, email, name: "旧アカウント", active: false }).returning();
  return raw;
}

test("admin disable/reactivate preserves identity and reservation ownership; another UID cannot bypass suspension", async () => {
  const account = await repo.createAccount({ ...profile, firebaseUid: "suspended", contact: " Suspended@Example.test " });
  const reservation = await repo.createReservation({ ...booking, accountFirebaseUid: "suspended" });
  await repo.deactivateAccount(account.id!);
  assert.equal((await repo.listInactiveAccounts()).find(a => a.id === account.id)?.lifecycleStatus, "disabled");
  await assert.rejects(repo.createAccount({ ...profile, firebaseUid: "bypass", contact: "\tSUSPENDED@example.test\n" }), status(409));
  assert.deepEqual(await repo.listReservationsForReservationAccount("suspended"), []);
  const restored = await repo.reactivateAccount(account.id!);
  assert.equal(restored.id, account.id);
  assert.equal(restored.firebaseUid, account.firebaseUid);
  assert.equal((await repo.listReservationsForReservationAccount("suspended"))[0].id, reservation.id);
  assert.equal((await repo.listReservations()).find(r => r.id === reservation.id)?.email, booking.email);
});

test("normalized active login uniqueness covers creates, updates, legacy reactivation and raw SQL; contact addresses stay separate", async () => {
  const owner = await repo.createAccount({ ...profile, firebaseUid: "unique-owner", contact: "\u3000Login@Example.test\u00a0" });
  assert.equal(owner.contact, "login@example.test");
  const other = await repo.createAccount({ ...profile, firebaseUid: "unique-other", contact: "other-login@example.test" });
  const inactive = await legacyInactive("legacy-duplicate", "\tLOGIN@example.test\r\n");
  await assert.rejects(repo.createAccount({ ...profile, firebaseUid: "unique-duplicate", contact: " LOGIN@example.test " }), status(409));
  await assert.rejects(repo.updateAccount(other.id!, { ...profile, name: "変更されない氏名", contact: "Login@example.test" }), status(409));
  assert.equal((await repo.findAccountByFirebaseUid("unique-other"))?.contact, other.contact);
  assert.equal((await repo.findAccountByFirebaseUid("unique-other"))?.name, profile.name);
  await assert.rejects(repo.reactivateAccount(inactive.id), status(409));
  assert.equal((await repo.listInactiveAccounts()).find(a => a.id === inactive.id)?.active, false);
  await repo.updateAccount(owner.id!, { ...profile, name: "重複履歴があってもプロフィール編集可", contact: owner.contact });
  assert.match((await repo.listInactiveAccounts()).find(a => a.id === inactive.id)?.reactivationBlockedReason ?? "", /別の有効/);
  const db = await getDatabase();
  let violation: unknown;
  try { await db.insert(s.account).values({ firebaseUid: "raw-duplicate", email: "\u3000LOGIN@example.test\t", name: "raw" }); } catch (error) { violation = error; }
  assert.ok(violation);
  const response = apiErrorResponse(violation);
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /ログイン用メール/);
  assert.equal(await repo.findAccountByFirebaseUid("raw-duplicate"), null);
  // Dots and plus suffixes are not collapsed. Additional contacts do not reserve login identity.
  for (const [uid, email] of [["dot", "lo.gin@example.test"], ["plus", "login+tag@example.test"]]) await repo.createAccount({ ...profile, firebaseUid: uid, contact: email });
  await repo.createAccountContactEmail({ accountId: other.id!, email: owner.contact, verificationTokenHash: "separate-contact-token", verificationExpiresAt: "2027-01-01T00:00:00Z" });
});

test("real deletion APIs reject resurrection while pending, permit a fresh UID after completion, and isolate old history and contacts", async () => {
  const auth = getAuth(getFirebaseAdminApp());
  let uid = "deleted-owner", admin = false;
  const email = "deleted@example.test";
  const token = mock.method(auth, "verifyIdToken", async () => ({ uid, email, email_verified: true, admin, auth_time: Math.floor(Date.now() / 1000) }));
  let finish!: () => void, started!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  const entered = new Promise<void>(resolve => { started = resolve; });
  const deleted = mock.method(auth, "deleteUser", async () => { started(); await gate; });
  const created = mock.method(auth, "createUser", async () => { throw new Error("reactivation must never create Firebase users"); });
  const req = (method: string, body?: unknown) => new Request("http://localhost/api/accounts/me", { method, headers: { authorization: "Bearer identity", "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    const me = await import("../../app/api/accounts/me/route");
    const reactivate = await import("../../app/api/accounts/[id]/reactivate/route");
    const legacy = await import("../../app/api/customers/[name]/reactivate/route");
    const old = await repo.createAccount({ ...profile, firebaseUid: uid, contact: email, name: "旧プロフィール", address: "旧住所", accountType: "travel_agency", companyBranchName: "旧会社", contactPersonName: "旧担当者" });
    await repo.createAccountContactEmail({ accountId: old.id!, email: "old-contact@example.test", verificationTokenHash: "old-contact-token", verificationExpiresAt: "2027-01-01T00:00:00Z" });
    const oldReservation = await repo.createReservation({ ...booking, accountFirebaseUid: uid });
    const deleting = me.DELETE(req("DELETE"));
    await entered;
    try {
      const pending = (await repo.listInactiveAccounts()).find(a => a.id === old.id)!;
      assert.equal(pending.lifecycleStatus, "deleting");
      assert.match(pending.reactivationBlockedReason!, /削除処理中/);
      admin = true;
      assert.equal((await reactivate.POST(req("POST"), { params: Promise.resolve({ id: old.id! }) })).status, 403);
      assert.equal((await legacy.PATCH(req("PATCH", { id: old.id }))).status, 403);
      admin = false;
      assert.equal((await me.POST(req("POST", profile))).status, 403);
      assert.equal((await me.PATCH(req("PATCH", profile))).status, 403);
      assert.equal((await me.GET(req("GET"))).status, 403);
      uid = "pending-replacement";
      assert.equal((await me.POST(req("POST", profile))).status, 409);
    } finally { finish(); }
    assert.equal((await deleting).status, 200);
    uid = "new-registration";
    const registered = await me.POST(req("POST", { ...profile, name: "新しい顧客", contact: "ignored@example.test" }));
    assert.equal(registered.status, 201);
    const fresh = (await registered.json()).account;
    assert.notEqual(fresh.id, old.id);
    assert.equal(fresh.contact, email);
    assert.equal(fresh.name, "新しい顧客");
    assert.equal(fresh.companyBranchName, undefined);
    assert.equal(fresh.address, undefined);
    assert.deepEqual(await repo.listAccountContactEmails(fresh.id), []);
    assert.deepEqual(await repo.listReservationsForReservationAccount(uid), []);
    const history = await import("../../app/api/accounts/me/reservations/route");
    assert.deepEqual((await (await history.GET(req("GET"))).json()).reservations, []);
    const { findOwnedReservationByAuthenticatedCustomer } = await import("../../lib/customer-reservation-access");
    await assert.rejects(findOwnedReservationByAuthenticatedCustomer(req("GET"), repo, oldReservation.id), status(403));
    admin = true;
    assert.equal((await reactivate.POST(req("POST"), { params: Promise.resolve({ id: old.id! }) })).status, 403);
    assert.equal((await legacy.PATCH(req("PATCH", { id: old.id }))).status, 403);
    const oldState = (await repo.listInactiveAccounts()).find(a => a.id === old.id)!;
    assert.equal(oldState.lifecycleStatus, "deleted");
    assert.equal(oldState.active, false);
    assert.equal(deleted.mock.callCount(), 1);
    assert.equal(created.mock.callCount(), 0);
    assert.equal((await repo.listReservations()).find(r => r.id === oldReservation.id)?.accountId, old.id);
  } finally { finish?.(); token.mock.restore(); deleted.mock.restore(); created.mock.restore(); }
});

test("reactivation APIs return Japanese 409 and leave all state unchanged on email collision", async () => {
  const active = await repo.createAccount({ ...profile, firebaseUid: "api-collision", contact: "api-collision@example.test" });
  const inactive = await legacyInactive("api-collision-inactive", " API-COLLISION@example.test ");
  const request = (method: string, body?: unknown) => new Request("http://localhost/api/accounts/reactivate", { method, headers: { authorization: "Bearer calendar-test-admin", "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const current = await import("../../app/api/accounts/[id]/reactivate/route");
  const legacy = await import("../../app/api/customers/[name]/reactivate/route");
  for (const response of [await current.POST(request("POST"), { params: Promise.resolve({ id: inactive.id }) }), await legacy.PATCH(request("PATCH", { id: inactive.id }))]) {
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /ログイン用メール/);
  }
  assert.equal((await repo.listInactiveAccounts()).find(a => a.id === inactive.id)?.active, false);
  assert.equal((await repo.findAccountByFirebaseUid("api-collision"))?.id, active.id);
  const inactiveApi = await import("../../app/api/customers/inactive/route");
  const listed = await inactiveApi.GET(request("GET"));
  assert.equal((await listed.json()).customers.find((a: { id: string }) => a.id === inactive.id).lifecycleStatus, "disabled");
});

test("email synchronization uses current Firebase email, rejects collisions/stale tokens, and profile POST cannot undo a sync", async () => {
  const owner = await repo.createAccount({ ...profile, firebaseUid: "email-sync-owner", contact: "sync-old@example.test" });
  await repo.createAccount({ ...profile, firebaseUid: "email-sync-taken", contact: "sync-taken@example.test" });
  const auth = getAuth(getFirebaseAdminApp());
  let email = "sync-taken@example.test", currentEmail = email;
  const token = mock.method(auth, "verifyIdToken", async () => ({ uid: "email-sync-owner", email, email_verified: true }));
  const currentUser = mock.method(auth, "getUser", async () => ({ uid: "email-sync-owner", email: currentEmail, emailVerified: true, disabled: false }));
  const request = () => new Request("http://localhost/api/accounts/me/email", { method: "PATCH", headers: { authorization: "Bearer identity" } });
  try {
    const { PATCH } = await import("../../app/api/accounts/me/email/route");
    assert.equal((await PATCH(request())).status, 409);
    assert.equal((await repo.findAccountByFirebaseUid("email-sync-owner"))?.contact, owner.contact);
    currentEmail = "sync-new@example.test";
    assert.equal((await PATCH(request())).status, 409);
    email = currentEmail;
    const success = await PATCH(request());
    assert.equal(success.status, 200);
    assert.equal((await success.json()).changed, true);
    assert.equal((await repo.findAccountByFirebaseUid("email-sync-owner"))?.contact, currentEmail);
    assert.equal((await (await PATCH(request())).json()).changed, false);
    await saveAuthenticatedAccountProfile(repo, { uid: "email-sync-owner", email: "sync-old@example.test" }, { ...profile, name: "更新氏名" });
    assert.equal((await repo.findAccountByFirebaseUid("email-sync-owner"))?.contact, currentEmail);
    const disabled = await repo.createAccount({ ...profile, firebaseUid: "sync-suspended", contact: "sync-suspended@example.test" });
    await repo.deactivateAccount(disabled.id!);
    email = currentEmail = disabled.contact;
    assert.equal((await PATCH(request())).status, 409);
    assert.equal((await repo.findAccountByFirebaseUid("email-sync-owner"))?.contact, "sync-new@example.test");
  } finally { token.mock.restore(); currentUser.mock.restore(); }
});

test("concurrent create/update/reactivate paths keep a single active login identity across connections", async () => {
  const db = await getDatabase();
  const make = (uid: string, email: string) => new DrizzleReservationRepository(db).createAccount({ ...profile, firebaseUid: uid, contact: email });
  const creates = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => make(`racing-create-${i}`, i % 2 ? " RACING@example.test " : "racing@EXAMPLE.test")));
  assert.equal(creates.filter(r => r.status === "fulfilled").length, 1);
  const first = await legacyInactive("racing-reactivate-1", "racing-reactivate@example.test");
  const second = await legacyInactive("racing-reactivate-2", " RACING-REACTIVATE@example.test ");
  const revivals = await Promise.allSettled([first, second].map(a => new DrizzleReservationRepository(db).reactivateAccount(a.id)));
  assert.equal(revivals.filter(r => r.status === "fulfilled").length, 1);
  const updating = await make("racing-update", "before-racing-update@example.test");
  const competing = await Promise.allSettled([make("racing-update-create", "racing-update@example.test"), new DrizzleReservationRepository(db).updateAccount(updating.id!, { ...profile, contact: " RACING-UPDATE@example.test " })]);
  assert.equal(competing.filter(r => r.status === "fulfilled").length, 1);
  const active = await repo.listAccounts();
  assert.equal(new Set(active.map(a => normalizeLoginEmail(a.contact))).size, active.length);
});

test("DB failure after reactivation rolls back active state and timestamps", async () => {
  const account = await repo.createAccount({ ...profile, firebaseUid: "forced-reactivation-failure", contact: "reactivation-failure@example.test" });
  await repo.deactivateAccount(account.id!);
  const db = await getDatabase();
  const before = await db.query.account.findFirst({ where: eq(s.account.id, account.id!) });
  await db.execute(sql.raw(`CREATE FUNCTION fail_identity_reactivation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.firebase_uid = 'forced-reactivation-failure' AND NEW.active THEN RAISE EXCEPTION 'forced test failure'; END IF; RETURN NEW; END $$;`));
  await db.execute(sql.raw("CREATE TRIGGER fail_identity_reactivation AFTER UPDATE ON account FOR EACH ROW EXECUTE FUNCTION fail_identity_reactivation();"));
  try { await assert.rejects(repo.reactivateAccount(account.id!), /forced test failure|Failed query/); }
  finally { await db.execute(sql.raw("DROP TRIGGER fail_identity_reactivation ON account;")); await db.execute(sql.raw("DROP FUNCTION fail_identity_reactivation();")); }
  assert.deepEqual(await db.query.account.findFirst({ where: eq(s.account.id, account.id!) }), before);
});

test("migration preflight identifies duplicate IDs and safely stops without changing existing rows", async () => {
  const local = new PGlite();
  const migration = readFileSync("drizzle/0021_account_login_email.sql", "utf8");
  try {
    await local.exec("CREATE TABLE account (id text, firebase_uid text, email text, active boolean); INSERT INTO account VALUES ('a', 'uid-a', ' Test@example.test ', true), ('b', 'uid-b', 'test@example.test', true);");
    const duplicates = await local.query<{ login_email: string; accounts: { id: string }[] }>(readFileSync("scripts/sql/check-login-email-duplicates.sql", "utf8"));
    assert.deepEqual(duplicates.rows[0].accounts.map(a => a.id), ["a", "b"]);
    await assert.rejects(local.exec("BEGIN;" + migration + "COMMIT;"), /duplicates exist/);
    await local.exec("ROLLBACK");
    assert.equal((await local.query("SELECT * FROM account")).rows.length, 2);
    assert.equal((await local.query("SELECT indexname FROM pg_indexes WHERE indexname = 'account_active_login_email_unique'")).rows.length, 0);
    // Explicit test fixture correction only, never part of the migration.
    await local.exec("UPDATE account SET active=false WHERE id='b'");
    await local.exec("BEGIN;" + migration + "COMMIT;");
    assert.equal((await local.query<{ email: string }>("SELECT email FROM account WHERE id='a'")).rows[0].email, " Test@example.test ");
  } finally { await local.close(); }
});

test("legacy Data Connect account writes fail before issuing unguarded mutations", async () => {
  const legacy = new FirebaseSqlConnectReservationRepository();
  await assert.rejects(legacy.createAccount({ ...profile, firebaseUid: "unused", contact: "unused@example.test" }), status(503));
  await assert.rejects(legacy.updateAccount("unused", { ...profile, contact: "unused@example.test" }), status(503));
  await assert.rejects(legacy.reactivateAccount("unused"), status(503));
});

test("admin creation APIs validate existing Firebase UID/email and share normalized uniqueness", async () => {
  const auth = getAuth(getFirebaseAdminApp());
  const current = mock.method(auth, "getUser", async (uid: string) => {
    if (uid === "missing-admin-identity") throw Object.assign(new Error("missing"), { code: "auth/user-not-found" });
    return { uid, email: "admin-create@example.test", disabled: false };
  });
  try {
    const currentApi = await import("../../app/api/accounts/route");
    const legacyApi = await import("../../app/api/customers/route");
    const req = (body: unknown) => new Request("http://localhost/api/accounts", { method: "POST", headers: { authorization: "Bearer calendar-test-admin", "content-type": "application/json" }, body: JSON.stringify(body) });
    for (const route of [currentApi, legacyApi]) {
      assert.equal((await route.POST(req({ ...profile, firebaseUid: "missing-admin-identity", contact: "admin-create@example.test" }))).status, 404);
      assert.equal((await route.POST(req({ ...profile, firebaseUid: "mismatched-admin-identity", contact: "wrong@example.test" }))).status, 409);
    }
    assert.equal(await repo.findAccountByFirebaseUid("mismatched-admin-identity"), null);
    const created = await currentApi.POST(req({ ...profile, firebaseUid: "admin-create-owner", contact: " ADMIN-CREATE@example.test " }));
    assert.equal(created.status, 201);
    assert.equal((await created.json()).account.contact, "admin-create@example.test");
    for (const route of [currentApi, legacyApi]) assert.equal((await route.POST(req({ ...profile, firebaseUid: "admin-create-duplicate", contact: "admin-create@example.test" }))).status, 409);
    assert.equal(await repo.findAccountByFirebaseUid("admin-create-duplicate"), null);
  } finally { current.mock.restore(); }
});
