import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject, validateMenuInput } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await context.params;
    const input = validateMenuInput(await readJsonObject(request));
    const menu = await getReservationRepository().updateMenu(decodeURIComponent(name), input);
    return NextResponse.json({ menu });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await context.params;
    await getReservationRepository().deleteMenu(decodeURIComponent(name));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
