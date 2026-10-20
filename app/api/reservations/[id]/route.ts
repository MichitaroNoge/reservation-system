import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateUpdateReservationInput } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { saveReservationDetails } from "@/lib/services/reservation-update-service";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const input = validateUpdateReservationInput(await readJsonObject(request));
    const reservation = await saveReservationDetails((await getReservationRepository()), id, input);
    return NextResponse.json({ reservation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
