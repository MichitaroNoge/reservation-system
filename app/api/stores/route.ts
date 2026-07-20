import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stores = await getReservationRepository().listStores();
    return NextResponse.json({ stores });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
