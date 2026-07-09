import { NextResponse } from "next/server";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  const reservations = await getReservationRepository().listReservations();
  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  const input = await request.json();
  const reservation = await getReservationRepository().createReservation(input);
  return NextResponse.json({ reservation }, { status: 201 });
}
