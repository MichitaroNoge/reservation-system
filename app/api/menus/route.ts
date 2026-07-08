import { NextResponse } from "next/server";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  const menus = await getReservationRepository().listMenus();
  return NextResponse.json({ menus });
}

export async function POST(request: Request) {
  const input = await request.json();
  const menu = await getReservationRepository().createMenu(input);
  return NextResponse.json({ menu }, { status: 201 });
}
