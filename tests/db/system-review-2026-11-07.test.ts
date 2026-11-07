import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createCalendarFixture } from "./calendar-fixture";
import { getDatabase } from "../../lib/db/client";
import { requestAndSendApprovalEmail, sendPendingApprovalEmails } from "../../lib/services/approval-email-service";
import { PATCH as assignStores } from "../../app/api/reservations/[id]/store/route";

const booking = { name: "検証者", email: "review@example.test", phone: "09000000000", date: "2099-11-15", startTime: "12:00", people: 5, menuItems: ["検証メニュー"], status: "confirmed" as const };
function assignmentRequest(store: string) {
  return new Request("http://localhost/api", { method: "PATCH", headers: { authorization: "Bearer calendar-test-admin", "content-type": "application/json" }, body: JSON.stringify({ assignments: [{ store, people: 5 }] }) });
}

test("expired approval payloads are not sent again after a transaction commit is lost", async () => {
  const fixture = await createCalendarFixture(), repo = fixture.repo, db = await getDatabase();
  try {
    const reservation = await repo.createReservation(booking), now = new Date();
    let calls = 0;
    const client = { send: async () => { calls++; return { id: "fake-delivery" }; } };
    const transaction = db.transaction.bind(db);
    const failCommit = mock.method(db, "transaction", async (work: Parameters<typeof db.transaction>[0]) => transaction(async tx => {
      const result = await work(tx);
      if (calls) throw new Error("forced_commit_loss");
      return result;
    }));
    try { await assert.rejects(requestAndSendApprovalEmail(repo, reservation.id, "reservation_approved", "confirmed", { now, emailClient: client }), /forced_commit_loss/); }
    finally { failCommit.mock.restore(); }
    assert.equal(calls, 1);
    assert.equal((await repo.listApprovalEmailDeliveries())[0].retryCount, 0);
    const result = await sendPendingApprovalEmails(repo, { now: new Date(now.getTime() + 23 * 3600000 + 1), emailClient: client });
    assert.equal(calls, 1, "a provider key outside its safe retry window must not be replayed");
    assert.equal(result.skipped, 1);
    assert.ok((await repo.listApprovalEmailDeliveries())[0].stoppedAt);
  } finally { await fixture.close(); }
});

test("assignment API rejects newly selected inactive stores and preserves existing assignments", async () => {
  const fixture = await createCalendarFixture(), repo = fixture.repo;
  try {
    const retired = await repo.createStore({ name: "停止店舗", displayOrder: 2 });
    const reservation = await repo.createReservation(booking);
    await repo.assignStores(reservation.id, [{ store: "検証店舗", people: 5 }]);
    await repo.updateConfirmationContact(reservation.id, new Date().toISOString());
    await repo.deleteStore(retired.name);
    const context = { params: Promise.resolve({ id: reservation.id }) };
    const rejected = await assignStores(assignmentRequest(retired.name), context);
    assert.equal(rejected.status, 400);
    const current = await repo.getReservation(reservation.id);
    assert.deepEqual(current?.storeAssignments, [{ store: "検証店舗", people: 5 }]);
    assert.ok(current?.confirmationContactedAt);
    await repo.reactivateStore(retired.id!);
    assert.equal((await assignStores(assignmentRequest(retired.name), context)).status, 200);
    // Disabling a catalog entry must not erase an already saved assignment.
    await repo.deleteStore(retired.name);
    assert.equal((await assignStores(assignmentRequest(retired.name), context)).status, 200);
    assert.deepEqual((await repo.getReservation(reservation.id))?.storeAssignments, [{ store: retired.name, people: 5 }]);
  } finally { await fixture.close(); }
});

test("delayed unsent approvals start a fresh preparation window and sent audits recover without replay", async () => {
  const fixture = await createCalendarFixture(), repo = fixture.repo;
  try {
    const reservation = await repo.createReservation(booking), now = new Date();
    const deliveryKey = `${reservation.id}/reservation_approved/delayed`;
    const requestedAt = new Date(now.getTime() - 48 * 3600000).toISOString();
    await repo.createApprovalEmailDelivery({ deliveryKey, reservationId: reservation.id, type: "reservation_approved", referenceId: "delayed", requestedAt });
    let calls = 0;
    const client = { send: async () => { calls++; return { id: "fake-delayed-delivery" }; } };
    assert.equal((await sendPendingApprovalEmails(repo, { now, emailClient: client })).sent, 1);
    const auditKey = `reservation-approval/${deliveryKey}`;
    assert.equal((await repo.getEmailDelivery(auditKey))?.requestedAt, now.toISOString());
    assert.equal((await repo.listApprovalEmailDeliveries())[0].requestedAt, requestedAt);
    await repo.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, retryCount: 0, lastAttemptAt: now.toISOString() });
    assert.equal((await sendPendingApprovalEmails(repo, { now: new Date(now.getTime() + 7 * 86400000), emailClient: client })).sent, 1);
    assert.equal(calls, 1);
    assert.equal((await repo.listApprovalEmailDeliveries())[0].sentAt, now.toISOString());
  } finally { await fixture.close(); }
});
