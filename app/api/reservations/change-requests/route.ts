import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, validateFeeAcknowledgement, readJsonObject, validateReservationChangeRequestInput } from "@/lib/api-validation";
import { findOwnedReservationByAuthenticatedCustomer } from "@/lib/customer-reservation-access";
import { getReservationRepository } from "@/lib/repositories";

import { assertReservationLeadTime } from "@/lib/reservation-lead-time";

import { cancellationFeeNotice, isFeeExemptPeopleOnlyChange } from "@/lib/cancellation-policy";
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
      const existingRequest = (await repository.listReservationChangeRequests()).find((item) =>
        item.status === "requested" &&
        item.reservationId === ownedReservation.id &&
        item.requestedDate === input.requestedDate &&
        item.requestedStartTime === input.requestedStartTime &&
        item.requestedPeople === input.requestedPeople &&
        sameMenuItems(item.requestedMenuItems, input.requestedMenuItems) &&
        (item.reason ?? "") === (input.reason ?? "")
      );
      if (existingRequest) return NextResponse.json({ request: existingRequest });
      const settings = await repository.getSystemSettings();
      const days = isFeeExemptPeopleOnlyChange(ownedReservation, input) ? 1 : settings.reservationLeadDays;
      assertReservationLeadTime(ownedReservation.date, days);
      assertReservationLeadTime(input.requestedDate, days);
      const notice = cancellationFeeNotice(ownedReservation, input.requestedPeople);
      if (notice && !acknowledged) return NextResponse.json({ error: `${notice.message} 内容を確認してから申請してください。` }, { status: 409 });
      const changeRequest = await repository.createReservationChangeRequest({ ...input, email: ownedReservation.email, phone: ownedReservation.phone });
      return NextResponse.json({ request: changeRequest }, { status: 201 });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function sameMenuItems(left: string[], right: string[]) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}
