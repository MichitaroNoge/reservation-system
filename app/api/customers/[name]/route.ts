import { NextResponse } from "next/server";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const input = await request.json();
  const customer = await getReservationRepository().updateCustomer(decodeURIComponent(name), input);
  return NextResponse.json({ customer });
}

export async function DELETE(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  await getReservationRepository().deleteCustomer(decodeURIComponent(name));
  return NextResponse.json({ ok: true });
}
