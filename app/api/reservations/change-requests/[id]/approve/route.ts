import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { approvalEmailDeliveryKey, requestAndSendApprovalEmail } from "@/lib/services/approval-email-service";
import { repositoryTransaction } from "@/lib/repositories/transaction";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const repository = (await getReservationRepository());
    const currentRequest = (await repository.listReservationChangeRequests()).find(item => item.id === id);
    if (!currentRequest) return NextResponse.json({ error: "予約変更申請が見つかりません。" }, { status: 404 });
    const result = await repositoryTransaction(repository, `reservation:${currentRequest.reservationId}`, async repo => {
      const updated = await repo.approveReservationChangeRequest(id);
      await repo.createApprovalEmailDelivery({ deliveryKey: approvalEmailDeliveryKey(updated.reservation.id, "reservation_change_approved", id), reservationId: updated.reservation.id, type: "reservation_change_approved", referenceId: id, requestedAt: new Date().toISOString() });
      return updated;
    });
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
