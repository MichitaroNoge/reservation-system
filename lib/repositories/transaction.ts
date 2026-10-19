import type { ReservationRepository } from "./reservation-repository";

/** Legacy Data Connect behavior is unchanged; Drizzle supplies an atomic local transaction. */
export function repositoryTransaction<T>(repository: ReservationRepository, key: string, work: (repository: ReservationRepository) => Promise<T>): Promise<T> {
  return repository.withTransaction ? repository.withTransaction(key, work) : work(repository);
}
