import { ApiAuthError } from "../auth";
import type { ReservationRepository } from "../repositories/reservation-repository";

export async function assertAccountNotDeleting(repository: ReservationRepository, uid: string) {
  if (await repository.getAccountDeletion?.(uid)) {
    throw new ApiAuthError("このアカウントは削除手続き中または削除済みです。", 403);
  }
}
