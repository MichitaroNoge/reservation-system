import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateStoreInput } from "@/lib/api-validation";
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

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const input = validateStoreInput(await readJsonObject(request));
    const store = await getReservationRepository().createStore(input);
    return NextResponse.json({ store }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
