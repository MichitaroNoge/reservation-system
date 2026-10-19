import assert from "node:assert/strict";
import { test } from "node:test";
import { cancellationFeeNotice, isFeeExemptPeopleOnlyChange } from "../lib/cancellation-policy";
import { earliestReservationDate, assertReservationLeadTime } from "../lib/reservation-lead-time";
import { InMemoryReservationRepository } from "../lib/repositories/in-memory-reservation-repository";
import { validateFeeAcknowledgement } from "../lib/api-validation";
const booking = { status: "confirmed" as const, people: 60, initialConfirmedPeople: 60, date: "2030-10-20", startTime: "12:00", menuItems: ["昼食"] };
test("fee rules include exactly 50%, odd sizes, cumulative reductions, but not temporary bookings", () => {
  assert.equal(cancellationFeeNotice(booking)?.kind, "cancellation");
  for (const people of [55, 40, 31, 60, 65]) assert.equal(cancellationFeeNotice(booking, people), null);
  for (const people of [30, 29, 1]) assert.equal(cancellationFeeNotice(booking, people)?.kind, "reduction");
  assert.equal(cancellationFeeNotice({ ...booking, people: 40 }, 30)?.kind, "reduction");
  assert.equal(cancellationFeeNotice({ ...booking, people: 61, initialConfirmedPeople: 61 }, 31), null);
  assert.equal(cancellationFeeNotice({ ...booking, people: 61, initialConfirmedPeople: 61 }, 30)?.kind, "reduction");
  for (const status of ["temporary_requested", "temporary_confirmed", "confirmed_requested"] as const) {
    assert.equal(cancellationFeeNotice({ ...booking, status }), null);
    assert.equal(cancellationFeeNotice({ ...booking, status }, 1), null);
  }
  assert.equal(cancellationFeeNotice({ ...booking, initialConfirmedPeople: null }, 55)?.kind, "unknown");
});
test("only fee-exempt party-size-only changes have a one-day cutoff using Japan dates", () => {
  const input = { requestedDate: booking.date, requestedStartTime: booking.startTime, requestedPeople: 40, requestedMenuItems: booking.menuItems };
  assert.equal(isFeeExemptPeopleOnlyChange(booking, input), true);
  for (const delta of [{ requestedPeople: 30 }, { requestedDate: "2030-10-21" }, { requestedStartTime: "12:30" }, { requestedMenuItems: [] }, { requestedPeople: 60 }]) assert.equal(isFeeExemptPeopleOnlyChange(booking, { ...input, ...delta }), false);
  assert.equal(isFeeExemptPeopleOnlyChange({ ...booking, initialConfirmedPeople: null }, input), false);
  const now = new Date("2030-10-19T15:00:00Z");
  assert.equal(earliestReservationDate(1, now), "2030-10-21");
  assert.throws(() => assertReservationLeadTime("2030-10-20", 1, now));
  assert.doesNotThrow(() => assertReservationLeadTime("2030-10-21", 1, now));
});
test("initial confirmed count survives repeated edits and automatic readiness changes", async () => {
  const repo = new InMemoryReservationRepository({ reservations: [], menus: [], stores: [] });
  const pending = await repo.createReservation({ name: "検証", email: "test@example.test", phone: "09012345678", date: "2030-10-20", people: 60, status: "confirmed_requested" });
  assert.equal(pending.initialConfirmedPeople, null);
  const approved = await repo.updateReservationStatus(pending.id, "confirmed");
  assert.equal(approved.initialConfirmedPeople, 60);
  await repo.updateReservation(pending.id, { people: 55 });
  await repo.updateReservationStatus(pending.id, "waiting_for_visit");
  await repo.updateReservation(pending.id, { people: 40 });
  const current = (await repo.listReservations())[0];
  assert.equal(current.initialConfirmedPeople, 60);
  assert.equal(cancellationFeeNotice(current, 30)?.kind, "reduction");
});
test("fee acknowledgement accepts booleans only", () => {
  assert.equal(validateFeeAcknowledgement(undefined), false);
  assert.equal(validateFeeAcknowledgement(false), false);
  assert.equal(validateFeeAcknowledgement(true), true);
  for (const value of ["true", 1, {}, null]) assert.throws(() => validateFeeAcknowledgement(value));
});
