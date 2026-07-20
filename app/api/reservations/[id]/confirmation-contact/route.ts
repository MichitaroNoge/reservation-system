import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject, validateConfirmationContactedAt } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { contactedAt } = await readJsonObject(request);
    const reservation = await getReservationRepository().updateConfirmationContact(id, validateConfirmationContactedAt(contactedAt));
    return NextResponse.json({ reservation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
