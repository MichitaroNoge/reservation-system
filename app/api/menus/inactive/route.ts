import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const menus = await getReservationRepository().listInactiveMenus();
    return NextResponse.json({ menus });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
