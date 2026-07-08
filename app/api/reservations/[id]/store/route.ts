import { NextResponse } from "next/server";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { store } = await request.json();
  const reservation = await getReservationRepository().assignStore(id, store);
  return NextResponse.json({ reservation });
}
