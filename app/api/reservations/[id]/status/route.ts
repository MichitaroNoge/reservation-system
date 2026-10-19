import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateReservationStatus } from "@/lib/api-validation";
import { assertReservationStatusTransition, isVisitReadyReservation, reservationStatusCodes, type ApprovalEmailType } from "@/lib/domain";
import { ApiValidationError } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { repositoryTransaction } from "@/lib/repositories/transaction";
import { approvalEmailDeliveryKey, requestAndSendApprovalEmail } from "@/lib/services/approval-email-service";

import { reservationAvailability } from "@/lib/reservation-availability";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const nextStatus = validateReservationStatus(body.status);
    const manualReason = typeof body.manualReason === "string" ? body.manualReason.trim() : "";
    const repository = (await getReservationRepository());
    const updated = await repositoryTransaction(repository, `reservation:${id}`, async (repository) => {
      const current = (await repository.listReservations()).find((reservation) => reservation.id === id);
      if (!current) return null;
      if (nextStatus === reservationStatusCodes.waitingForVisit && !manualReason && !isVisitReadyReservation(current)) {
        throw new ApiValidationError("メニュー・店舗割当・確認連絡が完了していません。");
      }
      assertReservationStatusTransition(current.status, nextStatus, { manual: Boolean(String(manualReason ?? "").trim()) });
      const approving = (current.status === reservationStatusCodes.temporaryRequested && nextStatus === reservationStatusCodes.temporaryConfirmed)
        || (current.status === reservationStatusCodes.confirmedRequested && nextStatus === reservationStatusCodes.confirmed);
      if (approving) {
        const [settings, menus] = await Promise.all([repository.getSystemSettings(), repository.listMenus()]);
        if (reservationAvailability(current, [], settings.acceptanceCapacity, menus, settings.blockedPeriods).blockedPeriods.length) {
          throw new ApiValidationError("受入不可の日時と重なるため承認できません。");
        }
      }
      const reservation = await repository.updateReservationStatus(id, nextStatus);
      const approvalEmailType = approvalEmailTypeForTransition(current.status, nextStatus, current.requestType);
      if (approvalEmailType) await repository.createApprovalEmailDelivery({
        deliveryKey: approvalEmailDeliveryKey(id, approvalEmailType, nextStatus),
        reservationId: id, type: approvalEmailType, referenceId: nextStatus, requestedAt: new Date().toISOString(),
      });
      return { reservation, approvalEmailType };
    });
    if (!updated) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    const { reservation, approvalEmailType } = updated;
    let approvalEmail: { status: "not_requested" | "sent" | "failed"; error?: string } = { status: "not_requested" };
    if (approvalEmailType) {
      try {
        await requestAndSendApprovalEmail(repository, reservation.id, approvalEmailType, nextStatus);
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
