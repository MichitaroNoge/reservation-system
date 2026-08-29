import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateReservationChangeRequestInput } from "@/lib/api-validation";
import { findOwnedReservationByAuthenticatedCustomer } from "@/lib/customer-reservation-access";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const requests = await getReservationRepository().listReservationChangeRequests();
    return NextResponse.json({ requests });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repository = getReservationRepository();
    const input = validateReservationChangeRequestInput(body, { allowMissingContact: true });
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
    const changeRequest = await repository.createReservationChangeRequest({ ...input, email: ownedReservation.email, phone: ownedReservation.phone });
    return NextResponse.json({ request: changeRequest }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function sameMenuItems(left: string[], right: string[]) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}
