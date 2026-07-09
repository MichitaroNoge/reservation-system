import { NextResponse } from "next/server";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const input = await request.json();
  const reservation = await getReservationRepository().updateReservation(id, input);
  return NextResponse.json({ reservation });
}
