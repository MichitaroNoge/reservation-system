import { NextResponse } from "next/server";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { contactedAt } = await request.json();
  const reservation = await getReservationRepository().updateConfirmationContact(id, contactedAt ?? null);
  return NextResponse.json({ reservation });
}
