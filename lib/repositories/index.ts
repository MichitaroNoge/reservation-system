import { FileReservationRepository } from "./file-reservation-repository";
import { FirebaseSqlConnectReservationRepository } from "./firebase-sql-connect-repository";
import type { ReservationRepository } from "./reservation-repository";

let repository: ReservationRepository | undefined;

export function getReservationRepository() {
  repository ??= createReservationRepository();
  return repository;
}

function createReservationRepository(): ReservationRepository {
  const repositoryType = process.env.RESERVATION_REPOSITORY ?? "dataconnect";
  if (repositoryType === "dataconnect") return new FirebaseSqlConnectReservationRepository();
  return new FileReservationRepository();
}
