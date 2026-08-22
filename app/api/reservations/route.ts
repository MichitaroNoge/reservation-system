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
    const repository = getReservationRepository();
    const publicStatuses: readonly string[] = [reservationStatusCodes.temporaryRequested, reservationStatusCodes.confirmedRequested];
    const isPublicReservationRequest = !input.status || publicStatuses.includes(input.status);

    if (!isPublicReservationRequest) {
      await requireAdmin(request);
      input.customerAccountMode = "admin";
      input.accountFirebaseUid = undefined;
    } else {
      const user = await verifyOptionalFirebaseUser(request);
      if (!user) throw new ApiAuthError("Customer authentication required.", 401);
      if (!isAdminToken(user)) {
        // Account is keyed only by the authenticated Firebase UID.
        // Do not search by email and do not attach historical/admin reservations.
        let account = await repository.findAccountByFirebaseUid(user.uid);
        if (!account) {
          account = await repository.createAccount({
            firebaseUid: user.uid,
            name: input.name,
            contact: user.email ?? input.email,
            phone: input.phone,
            address: input.address,
            accountType: input.accountType ?? (input.bookingType === "travel_agency_group" ? "travel_agency" : "individual"),
            companyBranchName: input.companyBranchName,
            contactPersonName: input.contactPersonName,
          });
        }
        input.accountFirebaseUid = user.uid;
        input.customerAccountMode = "account";
      } else {
        input.customerAccountMode = "admin";
        input.accountFirebaseUid = undefined;
      }
    }

    const reservation = await repository.createReservation(input);
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
