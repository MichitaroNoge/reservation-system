import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject, validateReservationStatus } from "@/lib/api-validation";
import { assertReservationStatusTransition } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const nextStatus = validateReservationStatus(body.status);
    const manualReason = typeof body.manualReason === "string" ? body.manualReason.trim() : "";
    const repository = getReservationRepository();
    const current = (await repository.listReservations()).find((reservation) => reservation.id === id);
    if (!current) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    assertReservationStatusTransition(current.status, nextStatus, { manual: Boolean(String(manualReason ?? "").trim()) });
    const reservation = await repository.updateReservationStatus(id, nextStatus);
    return NextResponse.json({ reservation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
