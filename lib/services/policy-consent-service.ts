import { ApiValidationError } from "../api-validation";
import { cancellationPolicyVersion, cancellationPolicyText, type CancellationPolicyAgreementInput, type CancellationPolicyConsent } from "../cancellation-policy-consent";
import type { ReservationRepository } from "../repositories/reservation-repository";
export function requireCancellationPolicyAgreement(agreement: CancellationPolicyAgreementInput | undefined) {
  if (!agreement?.accepted) throw new ApiValidationError("キャンセルポリシーを確認し、同意にチェックを入れてください。");
  if (agreement.version !== cancellationPolicyVersion) throw Object.assign(new Error("キャンセルポリシーが更新されました。画面を再読み込みして内容をご確認ください。"), { statusCode: 409 });
}
export async function recordPolicyConsent(repository: ReservationRepository, reservationId: string, firebaseUid: string, source: CancellationPolicyConsent["source"]) {
  if (!repository.recordCancellationPolicyConsent) throw Object.assign(new Error("この環境では同意記録を保存できません。管理者にお問い合わせください。"), { statusCode: 503 });
  return repository.recordCancellationPolicyConsent(reservationId, { firebaseUid, source, version: cancellationPolicyVersion, policyText: cancellationPolicyText, acceptedAt: new Date().toISOString() });
}
