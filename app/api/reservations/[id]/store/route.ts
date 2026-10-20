import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { saveReservationAssignments } from "@/lib/services/reservation-update-service";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const repository = (await getReservationRepository());
    const reservation = await saveReservationAssignments(repository, id, await readJsonObject(request));
    return NextResponse.json({ reservation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
