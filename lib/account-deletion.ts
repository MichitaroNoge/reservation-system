import type { Reservation, ReservationChangeRequest } from "./domain";

const completedReservationStatuses = new Set<Reservation["status"]>([
  "temporary_rejected",
  "confirmed_rejected",
  "visited",
  "cancelled",
]);

export const activeReservationDeletionMessage =
  "現在、有効な予約があるためアカウントを削除できません。予約の利用完了またはキャンセル完了後に、再度お手続きください。";

export function accountHasIncompleteReservations(
  reservations: Reservation[],
  changeRequests: ReservationChangeRequest[],
) {
  // Requests left behind by a completed/cancelled reservation can no longer be
  // approved. They must not permanently prevent its owner from leaving.
  const reservationIds = new Set(reservations.filter(reservation => !completedReservationStatuses.has(reservation.status)).map((reservation) => reservation.id));
  const hasPendingChangeRequest = changeRequests.some(
    (request) =>
      request.status === "requested" && reservationIds.has(request.reservationId),
  );
  if (hasPendingChangeRequest) return true;

  return reservations.some(
    (reservation) => !completedReservationStatuses.has(reservation.status),
  );
}
