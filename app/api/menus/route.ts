import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject, validateMenuInput } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  try {
    const menus = await getReservationRepository().listMenus();
    return NextResponse.json({ menus });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = validateMenuInput(await readJsonObject(request));
    const menu = await getReservationRepository().createMenu(input);
    return NextResponse.json({ menu }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
