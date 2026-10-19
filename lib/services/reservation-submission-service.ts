import { createHash } from "node:crypto";
import { ApiValidationError } from "../api-validation";
import type { CreateReservationInput, Reservation } from "../domain";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { repositoryTransaction } from "../repositories/transaction";
import { assertAccountNotDeleting } from "./account-lifecycle-service";

export async function createReservationOnce(repository: ReservationRepository, uid: string, requestKey: string | null, input: CreateReservationInput, work: (repository: ReservationRepository) => Promise<Reservation>) {
  if (requestKey !== null && !/^[a-zA-Z0-9_-]{16,128}$/.test(requestKey)) throw new ApiValidationError("送信識別子が不正です。画面を再読み込みしてください。");
  const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  return repositoryTransaction(repository, `account:${uid}`, async repository => {
    await assertAccountNotDeleting(repository, uid);
    // The legacy Data Connect backend has no durable submission table yet.
    if (!requestKey || !repository.getReservationSubmission || !repository.recordReservationSubmission) return work(repository);
    const existing = await repository.getReservationSubmission(uid, requestKey);
    if (existing) {
      if (existing.requestHash !== requestHash) throw Object.assign(new Error("同じ送信識別子で予約内容が変更されています。再度内容を確認してください。"), { statusCode: 409 });
      const reservation = (await repository.listReservations()).find(item => item.id === existing.reservationCode);
      if (!reservation) throw Object.assign(new Error("保存済みの予約を確認できません。管理者にお問い合わせください。"), { statusCode: 409 });
      if (reservation.accountId && !(await repository.findAccountByFirebaseUid(uid))) throw Object.assign(new Error("このアカウントは無効化されています。管理者にお問い合わせください。"), { statusCode: 403 });
      return reservation;
    }
    const reservation = await work(repository);
    await repository.recordReservationSubmission({ firebaseUid: uid, requestKey, requestHash, reservationCode: reservation.id });
    return reservation;
  });
}
