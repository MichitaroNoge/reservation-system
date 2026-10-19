import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { ApiRequestError, requestJson } from "../app/reservations/api-client";
import { isVisitReadyReservation } from "../lib/domain";
import { planReservationDetails } from "../lib/reservation-details";
import { InMemoryReservationRepository, type InMemoryReservationDatabase } from "../lib/repositories/in-memory-reservation-repository";
import { resolveLegacyAccountId, saveAuthenticatedAccountProfile, updateAdminAccountProfile } from "../lib/services/account-profile-service";
import { saveConfirmationContact, saveReservationAssignments, saveReservationDetails } from "../lib/services/reservation-update-service";

function repository() {
  const database: InMemoryReservationDatabase = { reservations: [], accounts: [], reservationChangeRequests: [], menus: [{ name: "料理", description: "", duration: "45分", price: 1200, displayOrder: 1 }], stores: [{ name: "店舗", displayOrder: 1 }] };
  return new InMemoryReservationRepository(database);
}
const booking = { name: "予約者", email: "customer@example.test", phone: "09000000000", date: "2026-11-15", startTime: "13:00", people: 5, menuItems: ["料理"], status: "confirmed" as const };

test("204 deletion succeeds without attempting to parse JSON", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  try { assert.equal(await requestJson<void>("/api/accounts/id", { method: "DELETE" }), undefined); }
  finally { fetch.mock.restore(); }
});
test("API errors preserve HTTP status and the server explanation", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => Response.json({ error: "アクセスできません" }, { status: 403 }));
  try { await assert.rejects(requestJson("/api/accounts/me"), (error: unknown) => error instanceof ApiRequestError && error.status === 403 && error.message === "アクセスできません"); }
  finally { fetch.mock.restore(); }
});
test("registration uses the authenticated email even when form email is empty", async () => {
  const repo = repository();
  const result = await saveAuthenticatedAccountProfile(repo, { uid: "uid", email: "login@example.test" }, { name: "会員", contact: "", phone: "09000000000" });
  assert.equal(result.created, true);
  assert.equal(result.account.contact, "login@example.test");
  assert.equal((await repo.listAccounts()).length, 1);
});
test("a disabled account cannot recreate itself through profile registration", async () => {
  const repo = repository();
  const account = await repo.createAccount({ firebaseUid: "uid", name: "会員", contact: "login@example.test", phone: "09000000000" });
  await repo.deactivateAccount(account.id!);
  await assert.rejects(saveAuthenticatedAccountProfile(repo, { uid: "uid", email: account.contact }, account), /無効化/);
  assert.equal((await repo.listAccounts()).length, 0);
});
test("same-name accounts require an ID and updating one preserves both reservation snapshots", async () => {
  const repo = repository();
  const first = await repo.createAccount({ firebaseUid: "uid-1", name: "同名", contact: "one@example.test", phone: "09000000000" });
  const second = await repo.createAccount({ firebaseUid: "uid-2", name: "同名", contact: "two@example.test", phone: "09000000000" });
  await repo.createReservation({ ...booking, accountFirebaseUid: "uid-1" });
  await assert.rejects(resolveLegacyAccountId(repo, "同名"), /複数/);
  assert.equal(await resolveLegacyAccountId(repo, "同名", second.id), second.id);
  await updateAdminAccountProfile(repo, second.id!, { ...second, name: "更新" });
  assert.equal((await repo.findAccountByFirebaseUid("uid-1"))?.name, first.name);
  assert.equal((await repo.listReservations())[0].customer, booking.name);
  await assert.rejects(updateAdminAccountProfile(repo, first.id!, { ...first, contact: "different@example.test" }), /本人/);
});
test("booked menu prices and retired selections survive edits", () => {
  const catalog = [{ id: "menu", name: "料理", price: 1500, active: false }];
  assert.deepEqual(planReservationDetails([{ menuId: "menu", quantity: 1, unitPrice: 1200 }], catalog, ["料理"]), [{ menuId: "menu", quantity: 1, unitPrice: 1200 }]);
  assert.throws(() => planReservationDetails([], catalog, ["料理"]), /選択できません/);
  assert.throws(() => planReservationDetails([], catalog, ["不明"]), /見つかりません/);
});
test("readiness requires the assignment total to equal booked people", () => {
  assert.equal(isVisitReadyReservation({ ...booking, store: null, storeAssignments: [{ store: "店舗", people: 4 }], confirmationContactedAt: "2026-11-01T00:00:00Z" }), false);
});
test("server saves keep readiness and assignments consistent after people changes", async () => {
  const repo = repository();
  const current = await repo.createReservation(booking);
  await saveReservationAssignments(repo, current.id, { assignments: [{ store: "店舗", people: 5 }] });
  const ready = await saveConfirmationContact(repo, current.id, "2026-11-01T00:00:00Z");
  assert.equal(ready.status, "waiting_for_visit");
  const changed = await saveReservationDetails(repo, current.id, { people: 7 });
  assert.deepEqual(changed.storeAssignments, []);
  assert.equal(changed.confirmationContactedAt, null);
  assert.equal(changed.status, "confirmed");
});
test("clearing confirmation persists confirmed status rather than changing only the browser", async () => {
  const repo = repository();
  const current = await repo.createReservation(booking);
  await saveReservationAssignments(repo, current.id, { assignments: [{ store: "店舗", people: 5 }] });
  await saveConfirmationContact(repo, current.id, "2026-11-01T00:00:00Z");
  assert.equal((await saveConfirmationContact(repo, current.id, null)).status, "confirmed");
  assert.equal((await repo.listReservations())[0].status, "confirmed");
});
test("a pending change cannot modify a reservation cancelled after the request", async () => {
  const repo = repository();
  const current = await repo.createReservation(booking);
  const request = await repo.createReservationChangeRequest({ reservationId: current.id, email: booking.email, requestedDate: "2026-11-16", requestedStartTime: "14:00", requestedPeople: 7, requestedMenuItems: ["料理"] });
  await repo.updateReservationStatus(current.id, "cancelled");
  await assert.rejects(repo.approveReservationChangeRequest(request.id), /変更を承認できません/);
  assert.equal((await repo.listReservations())[0].date, booking.date);
  assert.equal((await repo.listReservationChangeRequests())[0].status, "requested");
});
