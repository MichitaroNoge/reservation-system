import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateConfirmationContactedAt } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { sendConfirmationEmailForReservation } from "@/lib/services/confirmation-email-service";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const { contactedAt } = await readJsonObject(request);
    const nextContactedAt = validateConfirmationContactedAt(contactedAt);
    const repository = getReservationRepository();
    const reservation = nextContactedAt
      ? await sendConfirmationEmailForReservation(repository, id, {
        now: new Date(nextContactedAt),
        idempotencyKeyScope: `manual/${nextContactedAt}`,
      })
      : await repository.updateConfirmationContact(id, null);
    return NextResponse.json({ reservation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
