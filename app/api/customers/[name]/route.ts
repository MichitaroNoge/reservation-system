import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateCustomerInput } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ name: string }> }) {
  try {
    await requireAdmin(request);
    const { name } = await context.params;
    const input = validateCustomerInput(await readJsonObject(request));
    const customer = await getReservationRepository().updateCustomer(decodeURIComponent(name), input);
    return NextResponse.json({ customer });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ name: string }> }) {
  try {
    await requireAdmin(_request);
    const { name } = await context.params;
    await getReservationRepository().deleteCustomer(decodeURIComponent(name));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
