import assert from "node:assert/strict";
import { test } from "node:test";
import { createCalendarFixture } from "./calendar-fixture";
import { cancellationPolicyVersion } from "../../lib/cancellation-policy-consent";
import { POST as submit } from "../../app/api/reservations/route";
import { POST as convert } from "../../app/api/reservations/confirmed-request/route";
import { POST as cancel } from "../../app/api/reservations/cancellation-request/route";
import { POST as change } from "../../app/api/reservations/change-requests/route";
import { PATCH as decide } from "../../app/api/reservations/[id]/status/route";
import { PATCH as edit } from "../../app/api/reservations/[id]/route";
import { PATCH as assign } from "../../app/api/reservations/[id]/store/route";
import { PATCH as contact } from "../../app/api/reservations/[id]/confirmation-contact/route";
import { POST as approveChange } from "../../app/api/reservations/change-requests/[id]/approve/route";
import { GET as own } from "../../app/api/accounts/me/reservations/route";

const base = { name: "最終検証", email: "owner@example.test", phone: "09012345678", date: "2099-11-15", startTime: "12:00", people: 5, menuItems: ["検証メニュー"], paymentCondition: "invoice" as const };
const agreement = { accepted: true, version: cancellationPolicyVersion };
const context = (id: string) => ({ params: Promise.resolve({ id }) });
function request(body?: object, admin = false, key?: string) {
  return new Request("http://localhost/api/reservations", {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", authorization: `Bearer calendar-test-${admin ? "admin" : "member"}`, ...(key ? { "Idempotency-Key": key } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function payload(response: Response, status = 200) {
  const body = await response.json();
  assert.equal(response.status, status, JSON.stringify(body));
  return body;
}

test("customer submission through approval, change and visit preserves ownership, prices and readiness", async () => {
  const fixture = await createCalendarFixture();
  try {
    const input = { ...base, status: "temporary_requested" };
    await payload(await submit(request(input)), 409); // A complete customer profile is required.
    await fixture.repo.createAccount({ firebaseUid: "calendar-test-user", name: base.name, contact: base.email, phone: base.phone });
    await fixture.repo.createAccount({ firebaseUid: "foreign-final", name: "別人", contact: "other@example.test", phone: base.phone });
    await payload(await submit(request({ ...input, status: "confirmed" })), 403);
    for (const people of [0, 1000, 1.5]) await payload(await submit(request({ ...input, people })), 400);
    const created = (await payload(await submit(request(input, false, "final-lifecycle-submit-001")), 201)).reservation;
    const replay = await payload(await submit(request(input, false, "final-lifecycle-submit-001")), 201);
    assert.equal(replay.reservation.id, created.id);
    await payload(await submit(request({ ...input, people: 6 }, false, "final-lifecycle-submit-001")), 409);
    const foreign = await fixture.repo.createReservation({ ...base, status: "temporary_confirmed", accountFirebaseUid: "foreign-final" });
    await payload(await cancel(request({ reservationId: foreign.id })), 403);
    await payload(await convert(request({ reservationId: foreign.id, cancellationPolicyAgreement: agreement })), 403);
    const proxy = (await payload(await submit(request({ ...base, status: "confirmed" }, true)), 201)).reservation;
    const history = await payload(await own(request()));
    assert.deepEqual(history.reservations.map((r: { id: string }) => r.id), [created.id]);
    assert.notEqual(created.id, proxy.id); // Matching snapshot email never attaches an admin booking.
    await payload(await decide(request({ status: "temporary_confirmed" }), context(created.id)), 403);
    await payload(await decide(request({ status: "temporary_confirmed" }, true), context(created.id)));
    await payload(await convert(request({ reservationId: created.id })), 400);
    await payload(await convert(request({ reservationId: created.id, cancellationPolicyAgreement: agreement })));
    const confirmed = (await payload(await decide(request({ status: "confirmed" }, true), context(created.id)))).reservation;
    assert.equal(confirmed.initialConfirmedPeople, 5);
    assert.equal(confirmed.paymentCondition, "invoice");
    assert.equal(confirmed.policyConsents.length, 1);
    await payload(await decide(request({ status: "waiting_for_visit" }, true), context(created.id)), 400);
    await payload(await assign(request({ assignments: [{ store: "検証店舗", people: 4 }] }, true), context(created.id)), 400);
    await payload(await assign(request({ assignments: [{ store: "検証店舗", people: 2 }, { store: "検証店舗", people: 3 }] }, true), context(created.id)), 400);
    await payload(await assign(request({ assignments: [{ store: "検証店舗", people: 5 }] }, true), context(created.id)));
    const ready = (await payload(await contact(request({ contactedAt: new Date().toISOString(), sendEmail: false }, true), context(created.id)))).reservation;
    assert.equal(ready.status, "waiting_for_visit");
    const changeBody = { reservationId: created.id, requestedDate: base.date, requestedStartTime: base.startTime, requestedPeople: 4, requestedMenuItems: base.menuItems };
    const pending = (await payload(await change(request(changeBody)), 201)).request;
    await payload(await approveChange(request({}, false), context(pending.id)), 403);
    const updated = (await payload(await approveChange(request({}, true), context(pending.id)))).reservation;
    assert.equal(updated.people, 4);
    assert.equal(updated.initialConfirmedPeople, 5);
    assert.equal(updated.status, "confirmed");
    assert.deepEqual(updated.storeAssignments, []);
    assert.equal(updated.confirmationContactedAt, null);
    assert.equal(updated.totalAmount, confirmed.totalAmount);
    await payload(await edit(request({ people: 3, expectedRevision: confirmed.revision }, true), context(created.id)), 409);
    await payload(await assign(request({ assignments: [{ store: "検証店舗", people: 4 }] }, true), context(created.id)));
    await payload(await contact(request({ contactedAt: new Date().toISOString(), sendEmail: false }, true), context(created.id)));
    await payload(await decide(request({ status: "visited" }), context(created.id)), 403);
    assert.equal((await payload(await decide(request({ status: "visited" }, true), context(created.id)))).reservation.status, "visited");
    await payload(await cancel(request({ reservationId: created.id, cancellationFeeAcknowledged: true })), 400);
    await payload(await change(request({ ...changeBody, requestedPeople: 5 })), 400);
  } finally { await fixture.close(); }
});

test("cancellation approval is admin-only, preserves fee baseline, and prevents pending changes", async () => {
  const fixture = await createCalendarFixture();
  try {
    await fixture.repo.createAccount({ firebaseUid: "calendar-test-user", name: base.name, contact: base.email, phone: base.phone });
    const booking = await fixture.repo.createReservation({ ...base, status: "confirmed", accountFirebaseUid: "calendar-test-user" });
    const pending = (await payload(await change(request({ reservationId: booking.id, requestedDate: base.date, requestedStartTime: base.startTime, requestedPeople: 4, requestedMenuItems: base.menuItems })), 201)).request;
    await payload(await cancel(request({ reservationId: booking.id })), 409);
    assert.equal((await payload(await cancel(request({ reservationId: booking.id, cancellationFeeAcknowledged: true })))).reservation.status, "cancellation_requested");
    await payload(await approveChange(request({}, true), context(pending.id)), 409);
    await payload(await decide(request({ status: "cancelled" }), context(booking.id)), 403);
    const cancelled = (await payload(await decide(request({ status: "cancelled" }, true), context(booking.id)))).reservation;
    assert.equal(cancelled.initialConfirmedPeople, 5);
    assert.equal(cancelled.people, 5);
    const notices = (await fixture.repo.listApprovalEmailDeliveries()).filter(d => d.reservationId === booking.id && d.type === "cancellation_approved");
    assert.equal(notices.length, 1);
    await payload(await decide(request({ status: "cancelled" }, true), context(booking.id)));
    assert.equal((await fixture.repo.listApprovalEmailDeliveries()).filter(d => d.reservationId === booking.id).length, 1);
  } finally { await fixture.close(); }
});

test("parallel API requests share submission keys and reject stale edits across PostgreSQL connections", { skip: process.env.DB_TEST_DRIVER !== "postgres" }, async () => {
  const fixture = await createCalendarFixture();
  try {
    await fixture.repo.createAccount({ firebaseUid: "calendar-test-user", name: base.name, contact: base.email, phone: base.phone });
    const submitted = await Promise.all(Array.from({ length: 5 }, () => submit(request({ ...base, status: "temporary_requested" }, false, "final-parallel-submit-001"))));
    const ids = await Promise.all(submitted.map(async response => (await payload(response, 201)).reservation.id));
    assert.equal(new Set(ids).size, 1);
    assert.equal((await fixture.repo.listReservations()).length, 1);
    const initial = (await fixture.repo.listReservations())[0];
    const saves = await Promise.all([6, 7].map(people => edit(request({ people, expectedRevision: initial.revision }, true), context(initial.id))));
    assert.deepEqual(saves.map(response => response.status).sort(), [200, 409]);
    const winner = (await fixture.repo.listReservations())[0];
    assert.equal(winner.revision, initial.revision! + 1);
    assert.ok([6, 7].includes(winner.people));
    const decisions = await Promise.all(["temporary_confirmed", "temporary_rejected"].map(status => decide(request({ status }, true), context(initial.id))));
    assert.deepEqual(decisions.map(response => response.status).sort(), [200, 400]);
    const final = (await fixture.repo.listReservations())[0];
    assert.ok(["temporary_confirmed", "temporary_rejected"].includes(final.status));
    const outbox = await fixture.repo.listApprovalEmailDeliveries();
    assert.equal(outbox.length, final.status === "temporary_confirmed" ? 1 : 0);
  } finally { await fixture.close(); }
});

test("change requests in rejected, visited and cancellation states return a business error without writes", async () => {
  const fixture = await createCalendarFixture();
  try {
    await fixture.repo.createAccount({ firebaseUid: "calendar-test-user", name: base.name, contact: base.email, phone: base.phone });
    for (const status of ["temporary_rejected", "confirmed_rejected", "visited", "cancellation_requested", "cancelled"] as const) {
      const booking = await fixture.repo.createReservation({ ...base, status, accountFirebaseUid: "calendar-test-user" });
      const result = await payload(await change(request({ reservationId: booking.id, requestedDate: base.date, requestedStartTime: base.startTime, requestedPeople: base.people, requestedMenuItems: base.menuItems })), 400);
      assert.match(result.error, /現在のステータスでは変更申請できません/);
      const current = (await fixture.repo.listReservations()).find(r => r.id === booking.id)!;
      assert.equal(current.status, status);
      assert.equal(current.revision, booking.revision);
      assert.equal(current.people, booking.people);
    }
    assert.deepEqual(await fixture.repo.listReservationChangeRequests(), []);
    assert.deepEqual(await fixture.repo.listApprovalEmailDeliveries(), []);
  } finally { await fixture.close(); }
});

test("a concurrent cancellation cannot be undone by approval of a pending change", { skip: process.env.DB_TEST_DRIVER !== "postgres" }, async () => {
  const fixture = await createCalendarFixture();
  try {
    await fixture.repo.createAccount({ firebaseUid: "calendar-test-user", name: base.name, contact: base.email, phone: base.phone });
    for (let attempt = 0; attempt < 3; attempt++) {
      const booking = await fixture.repo.createReservation({ ...base, status: "confirmed", accountFirebaseUid: "calendar-test-user" });
      const pending = (await payload(await change(request({ reservationId: booking.id, requestedDate: base.date, requestedStartTime: base.startTime, requestedPeople: 4, requestedMenuItems: base.menuItems })), 201)).request;
      const operations = [
        () => cancel(request({ reservationId: booking.id, cancellationFeeAcknowledged: true })),
        () => approveChange(request({}, true), context(pending.id)),
      ];
      if (attempt % 2) operations.reverse();
      const results = await Promise.all(operations.map(operation => operation()));
      assert.ok(results.every(response => [200, 409].includes(response.status)));
      const current = (await fixture.repo.listReservations()).find(r => r.id === booking.id)!;
      const reviewed = (await fixture.repo.listReservationChangeRequests()).find(r => r.id === pending.id)!;
      assert.equal(current.status, "cancellation_requested");
      assert.equal(current.people, reviewed.status === "approved" ? 4 : 5);
      assert.equal(current.initialConfirmedPeople, 5);
    }
  } finally { await fixture.close(); }
});
