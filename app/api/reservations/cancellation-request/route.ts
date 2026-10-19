import { NextResponse } from "next/server";
import { apiErrorResponse, validateFeeAcknowledgement, readJsonObject, validateCancellationRequestInput } from "@/lib/api-validation";
import { findOwnedReservationByAuthenticatedCustomer } from "@/lib/customer-reservation-access";
import { assertReservationStatusTransition, reservationStatusCodes } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";
import { repositoryTransaction } from "@/lib/repositories/transaction";
import { requireVerifiedFirebaseUser } from "@/lib/auth";

import { cancellationFeeNotice } from "@/lib/cancellation-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repository = (await getReservationRepository());
    const acknowledged = validateFeeAcknowledgement(body.cancellationFeeAcknowledged);
    const input = validateCancellationRequestInput(body, { allowMissingContact: true });
    await requireVerifiedFirebaseUser(request);
    return await repositoryTransaction(repository, `reservation:${input.reservationId.trim().toUpperCase()}`, async (repository) => {
      const current = await findOwnedReservationByAuthenticatedCustomer(request, repository, input.reservationId);
      if (!current) return NextResponse.json({ error: "予約が見つかりません。予約IDを確認してください。" }, { status: 404 });

      try {
        assertReservationStatusTransition(current.status, reservationStatusCodes.cancellationRequested);
      } catch {
        return NextResponse.json({ error: "この予約は現在のステータスではキャンセル申請できません。" }, { status: 400 });
      }
      const notice = cancellationFeeNotice(current);
      if (notice && !acknowledged) return NextResponse.json({ error: `${notice.message} 内容を確認してから申請してください。` }, { status: 409 });
      const reservation = await repository.updateReservationStatus(current.id, reservationStatusCodes.cancellationRequested);
      return NextResponse.json({ reservation });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
