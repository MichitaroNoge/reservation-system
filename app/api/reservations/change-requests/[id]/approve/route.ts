import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { requestAndSendApprovalEmail } from "@/lib/services/approval-email-service";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const repository = getReservationRepository();
    const result = await repository.approveReservationChangeRequest(id);
    let approvalEmail: { status: "sent" | "failed"; error?: string } = { status: "sent" };
    try {
      await requestAndSendApprovalEmail(repository, result.reservation.id, "reservation_change_approved", id);
    } catch (error) {
      approvalEmail = { status: "failed", error: error instanceof Error ? error.message : "Unknown email error" };
    }
    return NextResponse.json({ ...result, approvalEmail });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
