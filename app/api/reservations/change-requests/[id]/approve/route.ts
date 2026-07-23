import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const result = await getReservationRepository().approveReservationChangeRequest(id);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
