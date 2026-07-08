import { NextResponse } from "next/server";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  const stores = await getReservationRepository().listStores();
  return NextResponse.json({ stores });
}
