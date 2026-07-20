import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject, validateCreateReservationInput } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  try {
    const reservations = await getReservationRepository().listReservations();
    return NextResponse.json({ reservations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = validateCreateReservationInput(await readJsonObject(request));
    const reservation = await getReservationRepository().createReservation(input);
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
