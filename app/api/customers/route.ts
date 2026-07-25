import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateCustomerInput } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const customers = await getReservationRepository().listCustomers();
    return NextResponse.json({ customers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const input = validateCustomerInput(await readJsonObject(request));
    const customer = await getReservationRepository().createCustomer(input);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
