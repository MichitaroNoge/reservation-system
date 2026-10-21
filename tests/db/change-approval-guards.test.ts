import assert from "node:assert/strict";
import { test } from "node:test";
import { createCalendarFixture } from "./calendar-fixture";
import { POST as submit } from "../../app/api/reservations/change-requests/route";
import { POST as approve } from "../../app/api/reservations/change-requests/[id]/approve/route";
import { reservationChangeFeeContext } from "../../lib/cancellation-policy";
import { earliestReservationDate } from "../../lib/reservation-lead-time";
import { DrizzleReservationRepository } from "../../lib/repositories/drizzle-reservation-repository";
import { getDatabase } from "../../lib/db/client";

const base = { name: "検証", email: "owner@example.test", phone: "09012345678", date: "2099-11-15", startTime: "12:00", people: 60, menuItems: ["検証メニュー"] };
const request = (body: object = {}, token = "calendar-test-member") => new Request("http://localhost:3000/api/reservations/change-requests", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const input = (id: string, date = base.date, people = 30) => ({ reservationId: id, requestedDate: date, requestedStartTime: base.startTime, requestedPeople: people, requestedMenuItems: base.menuItems });

test("fee conditions are rechecked at approval, and only the owner can durably reconfirm the same pending change", async () => {
 const fixture = await createCalendarFixture();
 try {
  const repo = fixture.repo;
  await repo.createAccount({ firebaseUid: "calendar-test-user", name: "本人", contact: base.email, phone: base.phone });
  const booking = await repo.createReservation({ ...base, status: "temporary_confirmed", accountFirebaseUid: "calendar-test-user" });
  const submitted = await submit(request(input(booking.id)));
  assert.equal(submitted.status, 201);
  const pending = (await submitted.json()).request;
  assert.equal(pending.feeAcknowledgement, null);
  await repo.updateReservationStatus(booking.id, "confirmed_requested", { requestType: "confirmed_from_temporary" });
  const confirmed = await repo.updateReservationStatus(booking.id, "confirmed");
  await repo.assignStores(booking.id, [{ store: "検証店舗", people: 60 }]);
  assert.equal((await approve(request({}, ""), context(pending.id))).status, 401);
  assert.equal((await approve(request({}), context(pending.id))).status, 403);
  const refused = await approve(request({}, "calendar-test-admin"), context(pending.id));
  assert.equal(refused.status, 409); assert.match((await refused.json()).error, /再申請/);
  const unchanged = (await repo.listReservations()).find(r => r.id === booking.id)!;
  assert.equal(unchanged.people, 60); assert.equal(unchanged.storeAssignments?.[0].people, 60);
  assert.equal((await repo.listReservationChangeRequests())[0].status, "requested");
  assert.equal((await repo.listApprovalEmailDeliveries()).length, 0);
  assert.equal((await submit(request({ ...input(booking.id), cancellationFeeAcknowledged: true, cancellationFeeContext: "stale" }))).status, 409);
  const foreign = await repo.createReservation({ ...base, status: "confirmed" });
  assert.equal((await submit(request({ ...input(foreign.id), cancellationFeeAcknowledged: true, cancellationFeeContext: reservationChangeFeeContext(foreign, 30) }))).status, 403);
  const proof = reservationChangeFeeContext(confirmed, 30);
  const before = Date.now();
  const accepted = await submit(request({ ...input(booking.id), cancellationFeeAcknowledged: true, cancellationFeeContext: proof, feeAcknowledgement: { context: "forged", acceptedAt: "1900-01-01" } }));
  assert.equal(accepted.status, 200);
  const reconfirmed = (await accepted.json()).request;
  assert.equal(reconfirmed.id, pending.id); assert.equal(reconfirmed.feeAcknowledgement.context, proof);
  assert.ok(Date.parse(reconfirmed.feeAcknowledgement.acceptedAt) >= before);
  const replay = await submit(request({ ...input(booking.id), cancellationFeeAcknowledged: true, cancellationFeeContext: proof }));
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).request.feeAcknowledgement.acceptedAt, reconfirmed.feeAcknowledgement.acceptedAt);
  assert.equal((await repo.listReservationChangeRequests()).length, 1);
  const reloaded = new DrizzleReservationRepository(await getDatabase());
  assert.deepEqual((await reloaded.listReservationChangeRequests())[0].feeAcknowledgement, reconfirmed.feeAcknowledgement);
  assert.equal((await approve(request({}, "calendar-test-admin"), context(pending.id))).status, 200);
  assert.equal((await repo.listReservations()).find(r => r.id === booking.id)?.people, 30);
  assert.equal((await repo.listApprovalEmailDeliveries()).length, 1);

  const second = await repo.createReservation({ ...base, status: "confirmed", accountFirebaseUid: "calendar-test-user" });
  const oldProof = reservationChangeFeeContext(second, 30);
  const secondResponse = await submit(request({ ...input(second.id), cancellationFeeAcknowledged: true, cancellationFeeContext: oldProof }));
  assert.equal(secondResponse.status, 201); const secondId = (await secondResponse.json()).request.id;
  const changed = await repo.updateReservation(second.id, { people: 55 });
  assert.equal((await approve(request({}, "calendar-test-admin"), context(secondId))).status, 409);
  assert.equal((await submit(request({ ...input(second.id), cancellationFeeAcknowledged: true, cancellationFeeContext: oldProof }))).status, 409);
  assert.equal((await submit(request({ ...input(second.id), expectedRevision: changed.revision, cancellationFeeAcknowledged: true, cancellationFeeContext: reservationChangeFeeContext(changed, 30) }))).status, 200);
  assert.equal((await approve(request({}, "calendar-test-admin"), context(secondId))).status, 200);

  // An accepted request can be reconfirmed after its original cutoff, without reopening new requests.
  const tomorrow = earliestReservationDate(1);
  const near = await repo.createReservation({ ...base, date: tomorrow, status: "temporary_confirmed", accountFirebaseUid: "calendar-test-user" });
  const nearResponse = await submit(request(input(near.id, tomorrow)));
  assert.equal(nearResponse.status, 201); const nearId = (await nearResponse.json()).request.id;
  const nearConfirmed = await repo.updateReservationStatus(near.id, "confirmed");
  assert.equal((await approve(request({}, "calendar-test-admin"), context(nearId))).status, 409);
  assert.equal((await submit(request({ ...input(near.id, tomorrow), cancellationFeeAcknowledged: true, cancellationFeeContext: reservationChangeFeeContext(nearConfirmed, 30) }))).status, 200);
  assert.equal((await submit(request({ ...input(near.id, tomorrow, 25), cancellationFeeAcknowledged: true, cancellationFeeContext: reservationChangeFeeContext(nearConfirmed, 25) }))).status, 400);
  assert.equal((await approve(request({}, "calendar-test-admin"), context(nearId))).status, 200);
 } finally { await fixture.close(); }
});
