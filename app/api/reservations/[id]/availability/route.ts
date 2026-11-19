import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { reservationAvailability } from "@/lib/reservation-availability";
import { findReservation } from "@/lib/repositories/reservation-lookup";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const repository = await getReservationRepository();
    const [reservation, settings, menus] = await Promise.all([findReservation(repository, id), repository.getSystemSettings(), repository.listMenus()]);
    if (!reservation) return NextResponse.json({ error: "予約が見つかりません。" }, { status: 404 });
    const reservations = repository.listAvailabilityReservations ? await repository.listAvailabilityReservations(reservation, menus) : await repository.listReservations();
    return NextResponse.json({ reservation, availability: reservationAvailability(reservation, reservations, settings.acceptanceCapacity, menus, settings.blockedPeriods) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
