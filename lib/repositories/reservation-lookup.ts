import type { ReservationRepository } from "./reservation-repository";

/** Prefer the indexed lookup, including inside the caller's existing transaction. */
export async function findReservation(repository: ReservationRepository, id: string) {
  return repository.getReservation
    ? repository.getReservation(id)
    : (await repository.listReservations()).find(item => item.id === id) ?? null;
}

export async function findApprovalDelivery(repository: ReservationRepository, key: string) {
  return repository.getApprovalEmailDelivery
    ? repository.getApprovalEmailDelivery(key)
    : (await repository.listApprovalEmailDeliveries()).find(item => item.deliveryKey === key) ?? null;
}

export async function reservationChangeRequests(repository: ReservationRepository, reservationId: string) {
  return repository.listReservationChangeRequestsForReservation
    ? repository.listReservationChangeRequestsForReservation(reservationId)
    : (await repository.listReservationChangeRequests()).filter(item => item.reservationId === reservationId);
}

export async function findReservationChangeRequest(repository: ReservationRepository, id: string) {
  return repository.getReservationChangeRequest
    ? repository.getReservationChangeRequest(id)
    : (await repository.listReservationChangeRequests()).find(item => item.id === id) ?? null;
}
