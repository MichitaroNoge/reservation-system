import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateReservationChangeRequestInput } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const requests = await getReservationRepository().listReservationChangeRequests();
    return NextResponse.json({ requests });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = validateReservationChangeRequestInput(await readJsonObject(request));
    const changeRequest = await getReservationRepository().createReservationChangeRequest(input);
    return NextResponse.json({ request: changeRequest }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
