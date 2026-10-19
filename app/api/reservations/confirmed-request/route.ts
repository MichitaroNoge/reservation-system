import { NextResponse } from "next/server";
import { apiErrorResponse, validateCancellationPolicyAgreement, readJsonObject, validateConfirmedReservationRequestInput } from "@/lib/api-validation";
import { findOwnedReservationByAuthenticatedCustomer } from "@/lib/customer-reservation-access";
import { assertReservationStatusTransition, reservationStatusCodes } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";
import { repositoryTransaction } from "@/lib/repositories/transaction";
import { requireVerifiedFirebaseUser } from "@/lib/auth";

import { assertReservationLeadTime } from "@/lib/reservation-lead-time";

import { cancellationPolicyVersion } from "@/lib/cancellation-policy-consent";
import { requireCancellationPolicyAgreement, recordPolicyConsent } from "@/lib/services/policy-consent-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repository = (await getReservationRepository());
    const input = validateConfirmedReservationRequestInput(body, { allowMissingContact: true });
    const user = await requireVerifiedFirebaseUser(request);
    requireCancellationPolicyAgreement(validateCancellationPolicyAgreement(body.cancellationPolicyAgreement));
    return await repositoryTransaction(repository, `reservation:${input.reservationId.trim().toUpperCase()}`, async (repository) => {
      const current = await findOwnedReservationByAuthenticatedCustomer(request, repository, input.reservationId);
      if (!current) return NextResponse.json({ error: "予約が見つかりません。予約IDを確認してください。" }, { status: 404 });
      if (current.status === reservationStatusCodes.confirmedRequested && current.requestType === "confirmed_from_temporary") {
        const alreadyRecorded = current.policyConsents?.some(item => item.source === "confirmed_change_request" && item.version === cancellationPolicyVersion);
        return NextResponse.json({ reservation: alreadyRecorded ? current : await recordPolicyConsent(repository, current.id, user.uid, "confirmed_change_request") });
      }
      if (current.status !== reservationStatusCodes.temporaryConfirmed) return NextResponse.json({ error: "仮予約確定済みの予約だけ本予約への変更申請ができます。" }, { status: 400 });

      try {
        assertReservationStatusTransition(current.status, reservationStatusCodes.confirmedRequested);
      } catch {
        return NextResponse.json({ error: "この予約は現在のステータスでは本予約への変更申請ができません。" }, { status: 400 });
      }

      assertReservationLeadTime(current.date, (await repository.getSystemSettings()).reservationLeadDays);
      await repository.updateReservationStatus(current.id, reservationStatusCodes.confirmedRequested, {
        requestType: "confirmed_from_temporary",
      });
      const reservation = await recordPolicyConsent(repository, current.id, user.uid, "confirmed_change_request");
      return NextResponse.json({ reservation });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
