import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject, validateConfirmedReservationRequestInput } from "@/lib/api-validation";
import { findOwnedReservationByAuthenticatedCustomer } from "@/lib/customer-reservation-access";
import { assertReservationStatusTransition, reservationStatusCodes } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repository = getReservationRepository();
    const reservationIdFromBody = typeof body.reservationId === "string" ? body.reservationId : "";
    const ownedReservation = reservationIdFromBody
      ? await findOwnedReservationByAuthenticatedCustomer(request, repository, reservationIdFromBody)
      : null;
    const input = validateConfirmedReservationRequestInput(body, { allowMissingContact: Boolean(ownedReservation) });
    const reservationId = normalizeReservationId(input.reservationId);
    const current = ownedReservation ?? (await repository.listReservations()).find((reservation) => normalizeReservationId(reservation.id) === reservationId);
    if (!current) return NextResponse.json({ error: "予約が見つかりません。予約IDを確認してください。" }, { status: 404 });

    if (!ownedReservation) {
      const emailMatches = Boolean(input.email && current.email?.toLowerCase() === input.email.toLowerCase());
      const phoneMatches = Boolean(input.phone && normalizePhone(current.phone) === normalizePhone(input.phone));
      if (!emailMatches && !phoneMatches) return NextResponse.json({ error: "予約時のメールアドレスまたは電話番号と一致しません。" }, { status: 400 });
    }

    try {
      assertReservationStatusTransition(current.status, reservationStatusCodes.confirmedRequested);
    } catch {
      return NextResponse.json({ error: "この予約は現在のステータスでは本予約への変更申請ができません。" }, { status: 400 });
    }

    const reservation = await repository.updateReservationStatus(current.id, reservationStatusCodes.confirmedRequested, {
      requestType: "confirmed_from_temporary",
    });
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
