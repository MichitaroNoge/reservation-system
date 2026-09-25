import { NextResponse } from "next/server";
import { isAdminToken, requireAdmin, requireVerifiedFirebaseUser } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateCreateReservationInput } from "@/lib/api-validation";
import { reservationStatusCodes } from "@/lib/domain";
import { getReservationRepository } from "@/lib/repositories";
import { sendReceiptEmailForReservation } from "@/lib/services/receipt-email-service";

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
      const user = await requireVerifiedFirebaseUser(request);
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
        input.receiptEmailRequestedAt = new Date().toISOString();
      } else {
        input.customerAccountMode = "admin";
        input.accountFirebaseUid = undefined;
      }
    }

    let reservation = await repository.createReservation(input);
    let receiptEmail: { status: "not_requested" | "sent" | "failed"; error?: string } = { status: "not_requested" };
    if (reservation.receiptEmailRequestedAt) {
      try {
        reservation = await sendReceiptEmailForReservation(repository, reservation.id);
        receiptEmail = { status: "sent" };
      } catch (error) {
        receiptEmail = { status: "failed", error: error instanceof Error ? error.message : "Unknown email error" };
      }
    }
    return NextResponse.json({ reservation, receiptEmail }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
