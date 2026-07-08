import { NextResponse } from "next/server";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  const menus = await getReservationRepository().listMenus();
  return NextResponse.json({ menus });
}
