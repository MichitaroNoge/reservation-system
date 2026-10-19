import { NextResponse } from "next/server";
import { ApiAuthError, isAdminToken, requireAdmin, requireVerifiedFirebaseUser } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateCreateReservationInput } from "@/lib/api-validation";
import { reservationStatusCodes } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";
import { createReservationOnce } from "@/lib/services/reservation-submission-service";
import { sendReceiptEmailForReservation } from "@/lib/services/receipt-email-service";
import { assertAccountNotDeleting } from "@/lib/services/account-lifecycle-service";

import { assertReservationLeadTime } from "@/lib/reservation-lead-time";
import { requireCancellationPolicyAgreement, recordPolicyConsent } from "@/lib/services/policy-consent-service";
import { isAccountProfileComplete } from "@/lib/account-profile";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const reservations = await (await getReservationRepository()).listReservations();
    return NextResponse.json({ reservations }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = validateCreateReservationInput(await readJsonObject(request));
    const repository = (await getReservationRepository());
    const publicStatuses: readonly string[] = [reservationStatusCodes.temporaryRequested, reservationStatusCodes.confirmedRequested];
    const isPublicReservationRequest = !input.status || publicStatuses.includes(input.status);

    const user = isPublicReservationRequest ? await requireVerifiedFirebaseUser(request) : await requireAdmin(request);
    input.customerAccountMode = !isPublicReservationRequest || (isAdminToken(user) && input.customerAccountMode !== "account") ? "admin" : "account";
    const needsPolicyConsent = input.customerAccountMode === "account" && input.status === reservationStatusCodes.confirmedRequested;
    let reservation = await createReservationOnce(repository, user.uid, request.headers.get("Idempotency-Key"), input, async (repository) => {
      if (isPublicReservationRequest && (!isAdminToken(user) || input.customerAccountMode === "account")) {
        assertReservationLeadTime(input.date, (await repository.getSystemSettings()).reservationLeadDays);
      }
      if (!isPublicReservationRequest) {
        input.customerAccountMode = "admin";
        input.accountFirebaseUid = undefined;
      } else {
        if (!isAdminToken(user) || input.customerAccountMode === "account") {
          await assertAccountNotDeleting(repository, user.uid);
          // Account is keyed only by the authenticated Firebase UID.
          // Do not search by email and do not attach historical/admin reservations.
          const account = await repository.findAccountByFirebaseUid(user.uid);
          if (!account && (await repository.listInactiveAccounts()).some(item => item.firebaseUid === user.uid)) throw new ApiAuthError("このアカウントは無効化されています。管理者にお問い合わせください。", 403);
          if (!isAccountProfileComplete(account)) throw Object.assign(new Error("予約申請の前に、お客様情報の登録を完了してください。"), { statusCode: 409 });
          input.accountFirebaseUid = user.uid;
          input.customerAccountMode = "account";
          input.receiptEmailRequestedAt = new Date().toISOString();
        } else {
          input.customerAccountMode = "admin";
          input.accountFirebaseUid = undefined;
        }
      }

      if (needsPolicyConsent) requireCancellationPolicyAgreement(input.cancellationPolicyAgreement);
      const created = await repository.createReservation(input);
      return needsPolicyConsent ? recordPolicyConsent(repository, created.id, user.uid, "confirmed_request") : created;
    });
    let receiptEmail: { status: "not_requested" | "sent" | "failed"; error?: string } = { status: "not_requested" };
    if (reservation.receiptEmailRequestedAt) {
      try {
        reservation = await sendReceiptEmailForReservation(repository, reservation.id);
        receiptEmail = reservation.receiptEmailSentAt
          ? { status: "sent" }
          : { status: "failed", error: reservation.receiptEmailLastError ?? "受付メールの再試行上限に達しました。管理者にお問い合わせください。" };
      } catch (error) {
        receiptEmail = { status: "failed", error: error instanceof Error ? error.message : "Unknown email error" };
      }
    }
    return NextResponse.json({ reservation, receiptEmail }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
