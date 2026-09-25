import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateReservationStatus } from "@/lib/api-validation";
import { assertReservationStatusTransition, reservationStatusCodes, type ApprovalEmailType } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";
import { requestAndSendApprovalEmail } from "@/lib/services/approval-email-service";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const nextStatus = validateReservationStatus(body.status);
    const manualReason = typeof body.manualReason === "string" ? body.manualReason.trim() : "";
    const repository = getReservationRepository();
    const current = (await repository.listReservations()).find((reservation) => reservation.id === id);
    if (!current) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    assertReservationStatusTransition(current.status, nextStatus, { manual: Boolean(String(manualReason ?? "").trim()) });
    const reservation = await repository.updateReservationStatus(id, nextStatus);
    const approvalEmailType = approvalEmailTypeForTransition(current.status, nextStatus, current.requestType);
    let approvalEmail: { status: "not_requested" | "sent" | "failed"; error?: string } = { status: "not_requested" };
    if (approvalEmailType) {
      try {
        await requestAndSendApprovalEmail(repository, reservation.id, approvalEmailType);
        approvalEmail = { status: "sent" };
      } catch (error) {
        approvalEmail = { status: "failed", error: error instanceof Error ? error.message : "Unknown email error" };
      }
    }
    return NextResponse.json({ reservation: { ...reservation, status: nextStatus }, approvalEmail });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function approvalEmailTypeForTransition(currentStatus: string, nextStatus: string, requestType: string | null | undefined): ApprovalEmailType | null {
  if (currentStatus === reservationStatusCodes.temporaryRequested && nextStatus === reservationStatusCodes.temporaryConfirmed) return "reservation_approved";
  if (currentStatus === reservationStatusCodes.confirmedRequested && nextStatus === reservationStatusCodes.confirmed) {
    return requestType === "confirmed_from_temporary" ? "confirmed_change_approved" : "reservation_approved";
  }
  if (currentStatus === reservationStatusCodes.cancellationRequested && nextStatus === reservationStatusCodes.cancelled) return "cancellation_approved";
  return null;
}
