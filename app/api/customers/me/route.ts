import { NextResponse } from "next/server";
import { verifyOptionalFirebaseUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await verifyOptionalFirebaseUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!user.email) return NextResponse.json({ customer: null });

    const customer = await getReservationRepository().findCustomerForReservationAccount(user.uid, user.email);
    return NextResponse.json({ customer });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
