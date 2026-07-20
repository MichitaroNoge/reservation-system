import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateCreateReservationInput } from "@/lib/api-validation";
import { reservationStatusCodes } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const reservations = await getReservationRepository().listReservations();
    return NextResponse.json({ reservations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = validateCreateReservationInput(await readJsonObject(request));
    const publicStatuses: readonly string[] = [reservationStatusCodes.temporaryRequested, reservationStatusCodes.confirmedRequested];
    if (input.status && !publicStatuses.includes(input.status)) await requireAdmin(request);
    const reservation = await getReservationRepository().createReservation(input);
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
