import { FirebaseSqlConnectReservationRepository } from "./firebase-sql-connect-repository";
import type { ReservationRepository } from "./reservation-repository";
import { repositoryProvider } from "../db/environment";
import { getDatabase } from "../db/client";
import { DrizzleReservationRepository } from "./drizzle-reservation-repository";

let repository: Promise<ReservationRepository> | undefined;
let drizzleRepository: { db: Awaited<ReturnType<typeof getDatabase>>; value: ReservationRepository } | undefined;

export function getReservationRepository() {
  if (repositoryProvider() === "drizzle") return getDatabase().then(db => {
    if (drizzleRepository?.db !== db) drizzleRepository = { db, value: new DrizzleReservationRepository(db) };
    return drizzleRepository.value;
  });
  repository ??= createReservationRepository().catch(error => { repository = undefined; throw error; });
  return repository;
}

async function createReservationRepository(): Promise<ReservationRepository> {
  if (repositoryProvider() === "drizzle") return new DrizzleReservationRepository(await getDatabase());
  return new FirebaseSqlConnectReservationRepository();
}
