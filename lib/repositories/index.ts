import { FileReservationRepository } from "./file-reservation-repository";
import type { ReservationRepository } from "./reservation-repository";

let repository: ReservationRepository | undefined;

export function getReservationRepository() {
  repository ??= new FileReservationRepository();
  return repository;
}
