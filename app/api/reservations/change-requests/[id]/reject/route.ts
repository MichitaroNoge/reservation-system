import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const changeRequest = await getReservationRepository().rejectReservationChangeRequest(id);
    return NextResponse.json({ request: changeRequest });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
