import { NextResponse } from "next/server";
import { verifyOptionalFirebaseUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await verifyOptionalFirebaseUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const repository = getReservationRepository();
    const reservations = (await repository.listReservationsForReservationAccount(user.uid))
      .sort((a, b) => `${b.date}T${b.startTime ?? "10:00"}`.localeCompare(`${a.date}T${a.startTime ?? "10:00"}`, "ja-JP", { numeric: true }));
    const reservationIds = new Set(reservations.map((reservation) => reservation.id));
    const changeRequests = (await repository.listReservationChangeRequests())
      .filter((request) => reservationIds.has(request.reservationId))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt, "ja-JP", { numeric: true }));
    return NextResponse.json({ reservations, changeRequests });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
