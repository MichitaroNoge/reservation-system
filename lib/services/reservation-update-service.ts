import { getAutomaticReservationStatus, type Reservation, type UpdateReservationInput } from "../domain";
import { validateStoreAssignments } from "../api-validation";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { repositoryTransaction } from "../repositories/transaction";

export async function reconcileReservationReadiness(repository: ReservationRepository, reservation: Reservation) {
  const status = getAutomaticReservationStatus(reservation);
  return status === reservation.status ? reservation : repository.updateReservationStatus(reservation.id, status);
}

export async function saveReservationDetails(repository: ReservationRepository, id: string, input: UpdateReservationInput) {
  return repositoryTransaction(repository, `reservation:${id}`, async repo => {
    const current = (await repo.listReservations()).find(item => item.id === id);
    if (!current) throw new Error(`Reservation not found: ${id}`);
    const resetAssignments = (input.people !== undefined && input.people !== current.people)
      || (input.date !== undefined && input.date !== current.date)
      || (input.startTime !== undefined && input.startTime !== current.startTime);
    let reservation = await repo.updateReservation(id, input);
    if (resetAssignments) reservation = await repo.assignStores(id, []);
    return reconcileReservationReadiness(repo, reservation);
  });
}

export async function saveReservationAssignments(repository: ReservationRepository, id: string, body: Record<string, unknown>) {
  return repositoryTransaction(repository, `reservation:${id}`, async repo => {
    const current = (await repo.listReservations()).find(item => item.id === id);
    if (!current) throw new Error(`Reservation not found: ${id}`);
    const assignments = validateStoreAssignments(body, current.people);
    return reconcileReservationReadiness(repo, await repo.assignStores(id, assignments));
  });
}

export async function saveConfirmationContact(repository: ReservationRepository, id: string, contactedAt: string | null) {
  return repositoryTransaction(repository, `reservation:${id}`, async repo =>
    reconcileReservationReadiness(repo, await repo.updateConfirmationContact(id, contactedAt)));
}
