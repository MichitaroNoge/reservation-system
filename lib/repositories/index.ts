import { FirebaseSqlConnectReservationRepository } from "./firebase-sql-connect-repository";
import type { ReservationRepository } from "./reservation-repository";

let repository: ReservationRepository | undefined;

export function getReservationRepository() {
  repository ??= createReservationRepository();
  return repository;
}

function createReservationRepository(): ReservationRepository {
  return new FirebaseSqlConnectReservationRepository();
}
