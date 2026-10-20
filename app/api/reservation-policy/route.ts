import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { earliestReservationDate } from "@/lib/reservation-lead-time";
export const runtime = "nodejs";
export async function GET() {
  try {
    const days = (await (await getReservationRepository()).getSystemSettings()).reservationLeadDays ?? 3;
    return NextResponse.json({ days, minimumDate: earliestReservationDate(days) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
