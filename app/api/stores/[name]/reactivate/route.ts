import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const body = await readJsonObject(request);
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
    const store = await getReservationRepository().reactivateStore(id);
    return NextResponse.json({ store });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
