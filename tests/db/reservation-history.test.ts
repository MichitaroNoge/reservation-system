import assert from "node:assert/strict";
import { before, after, test, mock } from "node:test";
import { readFile } from "node:fs/promises";
import { sql, eq } from "drizzle-orm";
import { createCalendarFixture } from "./calendar-fixture";
import { getDatabase } from "../../lib/db/client";
import * as schema from "../../lib/db/schema";
import { DrizzleReservationRepository } from "../../lib/repositories/drizzle-reservation-repository";
import { cancellationPolicyVersion } from "../../lib/cancellation-policy-consent";
import { POST as submit } from "../../app/api/reservations/route";
import { POST as convert } from "../../app/api/reservations/confirmed-request/route";
import { POST as cancel } from "../../app/api/reservations/cancellation-request/route";
import { POST as change } from "../../app/api/reservations/change-requests/route";
import { PATCH as decide } from "../../app/api/reservations/[id]/status/route";
import { PATCH as edit } from "../../app/api/reservations/[id]/route";
import { POST as approveChange } from "../../app/api/reservations/change-requests/[id]/approve/route";
import { POST as rejectChange } from "../../app/api/reservations/change-requests/[id]/reject/route";
import { GET as history } from "../../app/api/admin/reservation-history/route";

let fixture: Awaited<ReturnType<typeof createCalendarFixture>>;
const base = { name: "履歴のお客様", email: "history@example.test", phone: "09012345678", date: "2099-11-15", startTime: "12:00", people: 10, menuItems: ["検証メニュー"] };
const agreement = { accepted: true, version: cancellationPolicyVersion };
const context = (id: string) => ({ params: Promise.resolve({ id }) });
function request(body: object, admin = false, key?: string) { return new Request("http://localhost/api/reservations", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer calendar-test-${admin ? "admin" : "member"}`, ...(key ? { "Idempotency-Key": key } : {}) }, body: JSON.stringify(body) }); }
async function payload(response: Response, status = 200) { const result = await response.json(); assert.equal(response.status, status, JSON.stringify(result)); return result; }
function query(params: string, token = "calendar-test-admin") { return new Request(`http://localhost/api/admin/reservation-history?${params}`, { headers: token ? { authorization: `Bearer ${token}` } : {} }); }
before(async () => { fixture = await createCalendarFixture(); await fixture.repo.createAccount({ firebaseUid: "calendar-test-user", name: base.name, contact: base.email, phone: base.phone }); });
after(async () => { await fixture?.close(); });

test("all four application types remain readable after review with immutable before/after snapshots", async () => {
  const created = (await payload(await submit(request({ ...base, status: "temporary_requested" }, false, "history-initial-request-0001")), 201)).reservation;
  await payload(await submit(request({ ...base, status: "temporary_requested" }, false, "history-initial-request-0001")), 201);
  assert.equal((await fixture.repo.listReservationHistory(created.id)).length, 1);
  await payload(await decide(request({ status: "temporary_confirmed" }, true), context(created.id)));
  await payload(await convert(request({ reservationId: created.id, cancellationPolicyAgreement: agreement })));
  await payload(await convert(request({ reservationId: created.id, cancellationPolicyAgreement: agreement })));
  await payload(await decide(request({ status: "confirmed" }, true), context(created.id)));
  const changeBody = { reservationId: created.id, requestedDate: base.date, requestedStartTime: "13:00", requestedPeople: 11, requestedMenuItems: base.menuItems };
  const pending = (await payload(await change(request(changeBody)), 201)).request;
  await payload(await change(request(changeBody)));
  const changed = (await payload(await approveChange(request({}, true), context(pending.id)))).reservation;
  await payload(await edit(request({ name: "現在のお客様", customer: "現在のお客様", people: 12, expectedRevision: changed.revision }, true), context(created.id)));
  await payload(await cancel(request({ reservationId: created.id, cancellationFeeAcknowledged: true })));
  await payload(await decide(request({ status: "cancelled" }, true), context(created.id)));
  const rows = (await payload(await history(query(`reservationId=${created.id}`)))).items;
  assert.equal(rows.length, 5);
  for (const kind of ["reservation", "confirmed_conversion", "change", "cancellation"]) {
    const row = rows.find((entry: { kind: string }) => entry.kind === kind);
    assert.equal(row.status, "approved"); assert.equal(row.processedBy.uid, "calendar-test-user"); assert.equal(row.processedBy.role, "admin"); assert.ok(row.requestedAt); assert.ok(row.processedAt);
  }
  const conversion = rows.find((row: { kind: string }) => row.kind === "confirmed_conversion");
  assert.equal(conversion.before.status, "temporary_confirmed"); assert.equal(conversion.requested.customer, base.name); assert.equal(conversion.after.status, "confirmed"); assert.equal(conversion.requested.policyConsents[0].source, "confirmed_change_request");
  assert.equal(conversion.notification.state, "pending");
  const notification = (await fixture.repo.listApprovalEmailDeliveries()).find(row => row.deliveryKey === conversion.after.notificationReference.deliveryKey)!;
  await fixture.repo.updateApprovalEmailDelivery(notification.deliveryKey, { sentAt: new Date().toISOString(), lastAttemptAt: new Date().toISOString(), retryCount: 1 });
  const refreshed = (await payload(await history(query(`reservationId=${created.id}`)))).items.find((row: { id: string }) => row.id === conversion.id);
  assert.equal(refreshed.notification.state, "sent"); assert.deepEqual(refreshed.requested, conversion.requested); assert.deepEqual(refreshed.after, conversion.after);
  const modification = rows.find((row: { kind: string }) => row.kind === "change");
  assert.equal(modification.before.people, 10); assert.equal(modification.requested.people, 11); assert.equal(modification.appliedBefore.people, 10); assert.equal(modification.after.people, 11);
  await fixture.repo.updateMenu("検証メニュー", { name: "名称変更後", description: "", price: 2000, duration: "60分", displayOrder: 1 });
  assert.deepEqual((await fixture.repo.listReservationHistory(created.id)).find(row => row.kind === "change")!.requested!.menuItems, ["検証メニュー"]);
  await fixture.repo.updateMenu("名称変更後", { name: "検証メニュー", description: "", price: 1000, duration: "60分", displayOrder: 1 });
});

test("rejected conversions, rejected changes and repeated manual state changes retain separate histories", async () => {
  const booking = await fixture.repo.createReservation({ ...base, status: "temporary_confirmed", accountFirebaseUid: "calendar-test-user" });
  await payload(await convert(request({ reservationId: booking.id, cancellationPolicyAgreement: agreement })));
  await payload(await decide(request({ status: "temporary_confirmed" }, true), context(booking.id)));
  await payload(await convert(request({ reservationId: booking.id, cancellationPolicyAgreement: agreement })));
  await payload(await decide(request({ status: "confirmed" }, true), context(booking.id)));
  const pending = (await payload(await change(request({ reservationId: booking.id, requestedDate: base.date, requestedStartTime: "13:00", requestedPeople: 11, requestedMenuItems: base.menuItems })), 201)).request;
  await payload(await rejectChange(request({}, true), context(pending.id)));
  await payload(await decide(request({ status: "visited", manualReason: "電話で確認" }, true), context(booking.id)));
  await payload(await decide(request({ status: "confirmed", manualReason: "誤記録を訂正" }, true), context(booking.id)));
  const rows = await fixture.repo.listReservationHistory(booking.id);
  assert.equal(rows.filter(row => row.kind === "confirmed_conversion").length, 2);
  assert.equal(rows.filter(row => row.kind === "confirmed_conversion" && row.status === "rejected").length, 1);
  assert.equal(rows.filter(row => row.kind === "manual_status").length, 2);
  assert.equal(rows.find(row => row.kind === "change")!.status, "rejected");
  const manual = await fixture.repo.createReservation({ ...base, status: "confirmed" });
  await payload(await decide(request({ status: "temporary_requested", manualReason: "管理者が申請状態に変更" }, true), context(manual.id)));
  await payload(await decide(request({ status: "temporary_confirmed" }, true), context(manual.id)));
  const manualApplication = (await fixture.repo.listReservationHistory(manual.id)).find(row => row.kind === "reservation")!;
  assert.equal(manualApplication.status, "approved"); assert.equal(manualApplication.legacy, false); assert.equal(manualApplication.requestedBy?.role, "admin");
});

test("a history write failure rolls back the approval and notification outbox, and processed snapshots reject rewrites", async () => {
  const countBefore = (await fixture.repo.listReservations()).length;
  const initialFailure = mock.method(DrizzleReservationRepository.prototype, "createReservationHistory", async () => { throw new Error("forced initial history failure"); });
  try { assert.ok((await submit(request({ ...base, status: "temporary_requested" }, false, "history-create-rollback-0001"))).status >= 400); } finally { initialFailure.mock.restore(); }
  assert.equal((await fixture.repo.listReservations()).length, countBefore);
  const booking = (await payload(await submit(request({ ...base, status: "temporary_requested" }, false, "history-rollback-request-0001")), 201)).reservation;
  const failure = mock.method(DrizzleReservationRepository.prototype, "completeReservationHistory", async () => { throw new Error("forced history persistence failure"); });
  try { assert.ok((await decide(request({ status: "temporary_confirmed" }, true), context(booking.id))).status >= 400); } finally { failure.mock.restore(); }
  assert.equal((await fixture.repo.getReservation(booking.id))!.status, "temporary_requested");
  assert.equal((await fixture.repo.listReservationHistory(booking.id))[0].status, "requested");
  assert.equal((await fixture.repo.listApprovalEmailDeliveries()).filter(row => row.reservationId === booking.id).length, 0);
  await payload(await decide(request({ status: "temporary_confirmed" }, true), context(booking.id)));
  const row = (await fixture.repo.listReservationHistory(booking.id))[0];
  const db = await getDatabase();
  await assert.rejects(db.update(schema.reservationApplicationHistory).set({ requested: { people: 999 } }).where(eq(schema.reservationApplicationHistory.id, row.id)));
  assert.equal((await fixture.repo.listReservationHistory(booking.id))[0].requested?.people, 10);
});

test("history is admin-only, paginated and filtered without losing result/date distinctions", async () => {
  assert.equal((await history(query("", ""))).status, 401);
  assert.equal((await history(query("", "calendar-test-member"))).status, 403);
  for (const params of ["page=0", "pageSize=100", "status=invalid", "from=2026-02-30", "kind=change&kind=reservation", "from=2026-11-12&to=2026-11-11", "unknown=1"]) assert.equal((await history(query(params))).status, 400, params);
  const page = await payload(await history(query("kind=change&status=approved&keyword=RSV-&pageSize=1")));
  assert.equal(page.items.length, 1); assert.ok(page.total >= 1); assert.equal(page.items[0].kind, "change"); assert.equal(page.items[0].status, "approved");
  const empty = await payload(await history(query("from=2000-01-01&to=2000-01-02")));
  assert.equal(empty.total, 0);
  assert.match((await history(query(""))).headers.get("cache-control") ?? "", /no-store/);
});

test("upgrade imports only persisted legacy facts and never invents old snapshots or reviewers", async () => {
  const db = await getDatabase();
  await db.execute(sql`DROP TABLE reservation_application_history`);
  await db.execute(sql`DROP FUNCTION protect_reservation_application_history()`);
  const booking = await fixture.repo.createReservation({ ...base, status: "confirmed" });
  const pending = await fixture.repo.createReservationChangeRequest({ email: base.email, phone: base.phone, reservationId: booking.id, requestedDate: base.date, requestedStartTime: "13:00", requestedPeople: 11, requestedMenuItems: base.menuItems });
  await fixture.repo.approveReservationChangeRequest(pending.id);
  await fixture.repo.recordCancellationPolicyConsent(booking.id, { firebaseUid: "calendar-test-user", source: "confirmed_change_request", version: cancellationPolicyVersion, policyText: "当時のポリシー", acceptedAt: "2026-11-10T15:00:00.000Z" });
  const migration = await readFile("drizzle/0022_reservation_application_history.sql", "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await db.execute(sql.raw(statement));
  const rows = await fixture.repo.listReservationHistory(booking.id);
  await db.execute(sql.raw(migration));
  assert.deepEqual(await fixture.repo.listReservationHistory(booking.id), rows, "reapplying the independent additive upgrade must not import newer records or alter history");
  const change = rows.find(row => row.kind === "change")!;
  assert.equal(change.status, "approved"); assert.equal(change.requested?.people, 11); assert.equal(change.before, null); assert.equal(change.after, null); assert.equal(change.processedBy, null); assert.ok(change.processedAt); assert.equal(change.legacy, true);
  const consent = rows.find(row => row.kind === "confirmed_conversion")!;
  assert.equal(consent.status, "unknown"); assert.equal(consent.processedAt, null); assert.equal(consent.processedBy, null); assert.equal(consent.requestedBy?.uid, "calendar-test-user"); assert.equal(consent.requested?.policyConsents?.[0].policyText, "当時のポリシー");
});
