import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateStoreInput } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ name: string }> }) {
  try {
    await requireAdmin(request);
    const { name } = await context.params;
    const input = validateStoreInput(await readJsonObject(request));
    const store = await getReservationRepository().updateStore(decodeURIComponent(name), input);
    return NextResponse.json({ store });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ name: string }> }) {
  try {
    await requireAdmin(_request);
    const { name } = await context.params;
    await getReservationRepository().deleteStore(decodeURIComponent(name));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
