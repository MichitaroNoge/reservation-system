import { ApiAuthError, verifyOptionalFirebaseUser } from "./auth";
import type { Reservation } from "./domain";
import type { ReservationRepository } from "./repositories/reservation-repository";

export async function findOwnedReservationByAuthenticatedCustomer(
  request: Request,
  repository: ReservationRepository,
  reservationId: string,
): Promise<Reservation> {
  const user = await verifyOptionalFirebaseUser(request);
  if (!user) throw new ApiAuthError("Customer authentication required.", 401);

  const reservation = (await repository.listReservationsForReservationAccount(user.uid))
    .find((item) => normalizeReservationId(item.id) === normalizeReservationId(reservationId));
  if (!reservation) throw new ApiAuthError("Reservation permission required.", 403);
  return reservation;
}

function normalizeReservationId(id: string) {
  return id.trim().toUpperCase();
}
