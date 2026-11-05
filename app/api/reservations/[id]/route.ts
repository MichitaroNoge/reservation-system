import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateUpdateReservationInput, validateReservationRevision } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { saveReservationDetails } from "@/lib/services/reservation-update-service";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const expectedRevision = validateReservationRevision(body.expectedRevision);
    const input = validateUpdateReservationInput(body);
    const reservation = await saveReservationDetails((await getReservationRepository()), id, input, expectedRevision);
    return NextResponse.json({ reservation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function GET(request: Request, context: {params: Promise<{id: string}>}) {try{await requireAdmin(request);const {id}=await context.params;const repo=await getReservationRepository();const reservation=repo.getReservation?await repo.getReservation(id):(await repo.listReservations()).find(r=>r.id===id);return reservation?NextResponse.json({reservation},{headers:{"Cache-Control":"private, no-store"}}):NextResponse.json({error:"予約が見つかりません。"},{status:404});}catch(error){return apiErrorResponse(error);}}
