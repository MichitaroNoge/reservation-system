import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { withAccountTransaction } from "@/lib/services/account-profile-service";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const account = await withAccountTransaction((await getReservationRepository()), id, repository => repository.reactivateAccount(id));
    return NextResponse.json({ account });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
