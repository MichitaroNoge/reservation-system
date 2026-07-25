import { NextResponse } from "next/server";
import { verifyOptionalFirebaseUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await verifyOptionalFirebaseUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!user.email) return NextResponse.json({ reservations: [] });

    const email = user.email.toLowerCase();
    const reservations = (await getReservationRepository().listReservations())
      .filter((reservation) => reservation.email?.toLowerCase() === email)
      .sort((a, b) => `${b.date}T${b.startTime ?? "10:00"}`.localeCompare(`${a.date}T${a.startTime ?? "10:00"}`, "ja-JP", { numeric: true }));

    return NextResponse.json({ reservations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
