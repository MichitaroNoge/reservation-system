import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateStoreAssignments } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const repository = getReservationRepository();
    const current = (await repository.listReservations()).find((reservation) => reservation.id === id);
    if (!current) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    const assignments = validateStoreAssignments(await readJsonObject(request), current.people);
    const reservation = await repository.assignStores(id, assignments);
    return NextResponse.json({ reservation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
