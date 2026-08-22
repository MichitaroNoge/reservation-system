import { NextResponse } from "next/server";
import { ApiAuthError, isAdminToken, requireAdmin, verifyOptionalFirebaseUser } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateCreateReservationInput } from "@/lib/api-validation";
import { reservationStatusCodes } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const reservations = await getReservationRepository().listReservations();
    return NextResponse.json({ reservations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = validateCreateReservationInput(await readJsonObject(request));
    const publicStatuses: readonly string[] = [reservationStatusCodes.temporaryRequested, reservationStatusCodes.confirmedRequested];
    const isPublicReservationRequest = !input.status || publicStatuses.includes(input.status);
    if (!isPublicReservationRequest) {
      await requireAdmin(request);
      input.customerAccountMode = "admin";
    } else {
      const user = await verifyOptionalFirebaseUser(request);
      if (!user) throw new ApiAuthError("Customer authentication required.", 401);
      if (!isAdminToken(user)) {
        input.customerFirebaseUid = user.uid;
        input.customerAccountMode = "account";
      } else {
        input.customerAccountMode = "admin";
      }
    }
    const reservation = await getReservationRepository().createReservation(input);
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
