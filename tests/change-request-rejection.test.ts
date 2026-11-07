import assert from "node:assert/strict";
import { test } from "node:test";
import { apiErrorResponse } from "../lib/api-validation";
import { InMemoryReservationRepository } from "../lib/repositories/in-memory-reservation-repository";

test("memory repository rejects changes to closed bookings as a client error without creating a request", async () => {
  const repository = new InMemoryReservationRepository({ reservations: [], menus: [], stores: [] });
  for (const status of ["temporary_rejected", "confirmed_rejected", "visited", "cancellation_requested", "cancelled"] as const) {
    const reservation = await repository.createReservation({ name: "検証", email: "owner@example.test", phone: "09012345678", date: "2099-11-15", people: 5, menuItems: [], status });
    await assert.rejects(repository.createReservationChangeRequest({ reservationId: reservation.id, email: reservation.email, requestedDate: reservation.date, requestedStartTime: "12:00", requestedPeople: 5, requestedMenuItems: [] }), (error: unknown) => {
      assert.equal(apiErrorResponse(error).status, 400);
      return true;
    });
    assert.equal((await repository.listReservations()).find(r => r.id === reservation.id)?.status, status);
  }
  assert.deepEqual(await repository.listReservationChangeRequests(), []);
});
