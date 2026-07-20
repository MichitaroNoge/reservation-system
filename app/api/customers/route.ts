import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  try {
    const customers = await getReservationRepository().listCustomers();
    return NextResponse.json({ customers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
