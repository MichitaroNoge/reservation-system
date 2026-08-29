import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await request.json();
    const account = await getReservationRepository().updateAccount(id, {
      id,
      name: body.name,
      contact: body.contact,
      phone: body.phone,
      address: body.address,
      accountType: body.accountType,
      companyBranchName: body.companyBranchName,
      contactPersonName: body.contactPersonName,
    });
    return NextResponse.json({ account });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    await getReservationRepository().deactivateAccount(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
