import test from "node:test";
import assert from "node:assert/strict";
import { accountHasIncompleteReservations } from "../lib/account-deletion";
import type { Reservation, ReservationChangeRequest, ReservationStatus } from "../lib/domain";
import { InMemoryReservationRepository } from "../lib/repositories/in-memory-reservation-repository";

function reservation(status: ReservationStatus, date = "2026-10-10", id = `RSV-${status}`): Reservation {
  return {
    id,
    customer: "削除テスト",
    email: "delete@example.com",
    phone: "090-0000-0000",
    date,
    startTime: "12:00",
    people: 2,
    menuItems: [],
    totalAmount: 0,
    store: null,
    status,
    received: "2026/10/01 10:00",
  };
}

function pendingChange(reservationId: string): ReservationChangeRequest {
  return {
    id: "change-1",
    reservationId,
    customer: "削除テスト",
    phone: "090-0000-0000",
    currentDate: "2026-10-01",
    currentStartTime: "12:00",
    currentPeople: 2,
    currentMenuItems: [],
    requestedDate: "2026-10-02",
    requestedStartTime: "13:00",
    requestedPeople: 2,
    requestedMenuItems: [],
    status: "requested",
    requestedAt: "2026-10-01T00:00:00.000Z",
  };
}

test("account without reservations can be deleted", () => {
  assert.equal(accountHasIncompleteReservations([], []), false);
});

test("past reservations do not prevent account deletion", () => {
  assert.equal(accountHasIncompleteReservations([reservation("visited", "2026-10-02")], []), false);
});

test("past reservation with an incomplete status still prevents deletion", () => {
  assert.equal(accountHasIncompleteReservations([reservation("confirmed", "2026-10-02")], []), true);
});

test("future active reservation prevents account deletion", () => {
  assert.equal(accountHasIncompleteReservations([reservation("waiting_for_visit")], []), true);
});

test("temporary and confirmed reservations prevent deletion while current", () => {
  for (const status of ["temporary_requested", "temporary_confirmed", "confirmed_requested", "confirmed"] as const) {
    assert.equal(accountHasIncompleteReservations([reservation(status)], []), true, status);
  }
});

test("pending cancellation and pending change request prevent deletion", () => {
  const past = reservation("confirmed", "2026-10-02", "RSV-PENDING");
  assert.equal(accountHasIncompleteReservations([reservation("cancellation_requested", "2026-10-02")], []), true);
  assert.equal(accountHasIncompleteReservations([past], [pendingChange(past.id)]), true);
});

test("completed and rejected reservations allow deletion", () => {
  for (const status of ["temporary_rejected", "confirmed_rejected", "visited", "cancelled"] as const) {
    assert.equal(accountHasIncompleteReservations([reservation(status)], []), false, status);
  }
});

test("obsolete pending changes on completed reservations do not trap account deletion", () => {
  for (const status of ["temporary_rejected", "confirmed_rejected", "visited", "cancelled"] as const) {
    const completed = reservation(status);
    assert.equal(accountHasIncompleteReservations([completed], [pendingChange(completed.id)]), false, status);
  }
});

test("deactivating an account keeps its reservation snapshot available", async () => {
  const repository = new InMemoryReservationRepository();
  const account = await repository.createAccount({
    firebaseUid: "delete-user",
    name: "削除前の氏名",
    contact: "delete@example.com",
    phone: "090-1234-5678",
    accountType: "individual",
  });
  const created = await repository.createReservation({
    customerAccountMode: "account",
    accountFirebaseUid: "delete-user",
    date: "2026-09-01",
    startTime: "12:00",
    people: 2,
    name: "削除前の氏名",
    email: "delete@example.com",
    phone: "090-1234-5678",
    menuItems: [],
    status: "visited",
  });

  await repository.deactivateAccount(account.id!);

  assert.equal(await repository.findAccountByFirebaseUid("delete-user"), null);
  const stored = (await repository.listReservations()).find((item) => item.id === created.id);
  assert.equal(stored?.customer, "削除前の氏名");
  assert.equal(stored?.email, "delete@example.com");
  assert.equal(stored?.phone, "090-1234-5678");
});
