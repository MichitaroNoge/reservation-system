import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, validateFeeAcknowledgement, readJsonObject, validateReservationChangeRequestInput } from "@/lib/api-validation";
import { findOwnedReservationByAuthenticatedCustomer } from "@/lib/customer-reservation-access";
import { getReservationRepository } from "@/lib/repositories";

import { assertReservationLeadTime } from "@/lib/reservation-lead-time";

import { cancellationFeeNotice, isFeeExemptPeopleOnlyChange, reservationChangeFeeContext } from "@/lib/cancellation-policy";
import { matchesPendingReservationChange } from "@/lib/reservation-change";
import { repositoryTransaction } from "@/lib/repositories/transaction";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const requests = await (await getReservationRepository()).listReservationChangeRequests();
    return NextResponse.json({ requests });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repository = (await getReservationRepository());
    const acknowledged = validateFeeAcknowledgement(body.cancellationFeeAcknowledged);
    const input = validateReservationChangeRequestInput(body, { allowMissingContact: true });
    await findOwnedReservationByAuthenticatedCustomer(request, repository, input.reservationId);
    return await repositoryTransaction(repository, `reservation:${input.reservationId.trim().toUpperCase()}`, async repository => {
      const ownedReservation = await findOwnedReservationByAuthenticatedCustomer(request, repository, input.reservationId);
      const existingRequest = (await repository.listReservationChangeRequests()).find(item => matchesPendingReservationChange(item, input));
      const settings = await repository.getSystemSettings();
      const days = isFeeExemptPeopleOnlyChange(ownedReservation, input) ? 1 : settings.reservationLeadDays;
      // Reconfirming the exact pending request is not a new change after the cutoff.
      if (!existingRequest) {
        assertReservationLeadTime(ownedReservation.date, days);
        assertReservationLeadTime(input.requestedDate, days);
      }
      const notice = cancellationFeeNotice(ownedReservation, input.requestedPeople);
      if (notice && !acknowledged) return NextResponse.json({ error: `${notice.message} 内容を確認してから申請してください。` }, { status: 409 });
      const context = reservationChangeFeeContext(ownedReservation, input.requestedPeople);
      if (context && body.cancellationFeeContext !== context) return NextResponse.json({ error: "予約内容またはキャンセル料の条件が更新されています。予約一覧を再読み込みし、最新のキャンセル料の案内を確認して再申請してください。" }, { status: 409 });
      const feeAcknowledgement = context && acknowledged ? { context, acceptedAt: new Date().toISOString() } : null;
      const changeRequest = await repository.createReservationChangeRequest({ ...input, email: ownedReservation.email, phone: ownedReservation.phone, feeAcknowledgement });
      return NextResponse.json({ request: changeRequest }, { status: existingRequest ? 200 : 201 });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
