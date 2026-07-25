import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject, validateCancellationRequestInput } from "@/lib/api-validation";
import { assertReservationStatusTransition, reservationStatusCodes } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = validateCancellationRequestInput(await readJsonObject(request));
    const repository = getReservationRepository();
    const reservationId = normalizeReservationId(input.reservationId);
    const current = (await repository.listReservations()).find((reservation) => normalizeReservationId(reservation.id) === reservationId);
    if (!current) return NextResponse.json({ error: "予約が見つかりません。予約IDを確認してください。" }, { status: 404 });

    const emailMatches = Boolean(input.email && current.email?.toLowerCase() === input.email.toLowerCase());
    const phoneMatches = Boolean(input.phone && normalizePhone(current.phone) === normalizePhone(input.phone));
    if (!emailMatches && !phoneMatches) return NextResponse.json({ error: "予約時のメールアドレスまたは電話番号と一致しません。" }, { status: 400 });

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

function normalizeReservationId(id: string) {
  return id.trim().toUpperCase();
}

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9+]/g, "");
}
