import { finishHistory } from "@/lib/services/reservation-history-service";
import { historyActor, reservationSnapshot } from "@/lib/reservation-history";
import { NextResponse } from "next/server";
import { findReservation, findReservationChangeRequest } from "@/lib/repositories/reservation-lookup";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { approvalEmailDeliveryKey, requestAndSendApprovalEmail } from "@/lib/services/approval-email-service";
import { repositoryTransaction } from "@/lib/repositories/transaction";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(request);
    const { id } = await context.params;
    const repository = (await getReservationRepository());
    const currentRequest = await findReservationChangeRequest(repository, id);
    if (!currentRequest) return NextResponse.json({ error: "予約変更申請が見つかりません。" }, { status: 404 });
    const result = await repositoryTransaction(repository, `reservation:${currentRequest.reservationId}`, async repo => {
      const before = await findReservation(repo, currentRequest.reservationId);
      if (!before) throw new Error("予約が見つかりません。");
      const decisionAt = new Date().toISOString();
      const beforeSnapshot = { ...before, ...reservationSnapshot(before) };
      const updated = await repo.approveReservationChangeRequest(id);

      const delivery = await repo.createApprovalEmailDelivery({ deliveryKey: approvalEmailDeliveryKey(updated.reservation.id, "reservation_change_approved", id), reservationId: updated.reservation.id, type: "reservation_change_approved", referenceId: id, requestedAt: new Date().toISOString() });
      await finishHistory(repo, beforeSnapshot, updated.reservation, { kind: "change", status: "approved", actor: historyActor(user, "admin"), referenceId: id, reason: currentRequest.reason, feeAcknowledgement: updated.request.feeAcknowledgement, notificationReference: Date.parse(delivery.requestedAt) >= Date.parse(decisionAt) ? { deliveryKey: delivery.deliveryKey, requestedAt: delivery.requestedAt } : undefined });
      return updated;
    });
    let approvalEmail: { status: "pending" | "sent" | "failed"; error?: string } = { status: "sent" };
    if (repository.queueTransactionalEmail) approvalEmail = { status: "pending" };
    else try {
      await requestAndSendApprovalEmail(repository, result.reservation.id, "reservation_change_approved", id);
    } catch (error) {
      approvalEmail = { status: "failed", error: error instanceof Error ? error.message : "Unknown email error" };
    }
    return NextResponse.json({ ...result, approvalEmail });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
