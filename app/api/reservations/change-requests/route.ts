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
    const reservationIdFromBody = typeof body.reservationId === "string" ? body.reservationId : "";
    const ownedReservation = reservationIdFromBody
      ? await findOwnedReservationByAuthenticatedCustomer(request, repository, reservationIdFromBody)
      : null;
    const input = validateReservationChangeRequestInput(body, { allowMissingContact: Boolean(ownedReservation) });
    const changeRequest = await repository.createReservationChangeRequest(ownedReservation
      ? { ...input, email: ownedReservation.email, phone: ownedReservation.phone }
      : input);
    return NextResponse.json({ request: changeRequest }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
