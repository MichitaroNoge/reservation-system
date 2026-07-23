import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject, validateCancellationRequestInput } from "@/lib/api-validation";
import { assertReservationStatusTransition, reservationStatusCodes } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = validateCancellationRequestInput(await readJsonObject(request));
    const repository = getReservationRepository();
    const current = (await repository.listReservations()).find((reservation) => reservation.id === input.reservationId);
    if (!current) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });

    const emailMatches = Boolean(input.email && current.email?.toLowerCase() === input.email.toLowerCase());
    const phoneMatches = Boolean(input.phone && normalizePhone(current.phone) === normalizePhone(input.phone));
    if (!emailMatches && !phoneMatches) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });

    assertReservationStatusTransition(current.status, reservationStatusCodes.cancellationRequested);
    const reservation = await repository.updateReservationStatus(current.id, reservationStatusCodes.cancellationRequested);
    return NextResponse.json({ reservation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9+]/g, "");
}
