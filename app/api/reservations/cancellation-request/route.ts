import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject, validateCancellationRequestInput } from "@/lib/api-validation";
import { findOwnedReservationByAuthenticatedCustomer } from "@/lib/customer-reservation-access";
import { assertReservationStatusTransition, reservationStatusCodes } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repository = getReservationRepository();
    const input = validateCancellationRequestInput(body, { allowMissingContact: true });
    const current = await findOwnedReservationByAuthenticatedCustomer(request, repository, input.reservationId);
    if (!current) return NextResponse.json({ error: "予約が見つかりません。予約IDを確認してください。" }, { status: 404 });

    try {
      assertReservationStatusTransition(current.status, reservationStatusCodes.cancellationRequested);
    } catch {
      return NextResponse.json({ error: "この予約は現在のステータスではキャンセル申請できません。" }, { status: 400 });
    }
    const reservation = await repository.updateReservationStatus(current.id, reservationStatusCodes.cancellationRequested);
    return NextResponse.json({ reservation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
