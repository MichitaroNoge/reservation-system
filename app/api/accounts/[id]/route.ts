import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../lib/auth";
import { getReservationRepository } from "../../../../lib/repositories";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await context.params;
  const body = await request.json();
  const repository = getReservationRepository();
  return NextResponse.json(await repository.updateAccount(id, {
    id,
    name: body.name,
    contact: body.contact,
    phone: body.phone,
    address: body.address,
    accountType: body.accountType,
    companyBranchName: body.companyBranchName,
    contactPersonName: body.contactPersonName,
  }));
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await context.params;
  const repository = getReservationRepository();
  await repository.deactivateAccount(id);
  return new Response(null, { status: 204 });
}
