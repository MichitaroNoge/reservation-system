import { NextResponse } from "next/server";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  const customers = await getReservationRepository().listCustomers();
  return NextResponse.json({ customers });
}
