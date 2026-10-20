import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { withAccountTransaction } from "@/lib/services/account-profile-service";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const body = await readJsonObject(request);
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
    const customer = await withAccountTransaction((await getReservationRepository()), id, repository => repository.reactivateAccount(id));
    return NextResponse.json({ customer });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
