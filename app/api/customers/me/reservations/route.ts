import { NextResponse } from "next/server";
import { requireVerifiedFirebaseUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireVerifiedFirebaseUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const reservations = (await getReservationRepository().listReservationsForReservationAccount(user.uid))
      .sort((a, b) => `${b.date}T${b.startTime ?? "10:00"}`.localeCompare(`${a.date}T${a.startTime ?? "10:00"}`, "ja-JP", { numeric: true }));

    return NextResponse.json({ reservations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
