import { NextResponse } from "next/server";
import { requireVerifiedFirebaseUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireVerifiedFirebaseUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const customer = await getReservationRepository().findAccountByFirebaseUid(user.uid);
    return NextResponse.json({ customer });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
