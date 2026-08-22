import { NextResponse } from "next/server";
import { getReservationRepository } from "../../../lib/repositories";
import { requireAdminSession } from "../../../lib/auth";

export async function GET() {
  await requireAdminSession();
  const repository = getReservationRepository();
  return NextResponse.json(await repository.listAccounts());
}

export async function POST(request: Request) {
  await requireAdminSession();
  const body = await request.json();
  if (!body.firebaseUid || !body.name || !body.contact) {
    return NextResponse.json({ error: "firebaseUid, name and contact are required" }, { status: 400 });
  }
  const repository = getReservationRepository();
  const account = await repository.createAccount({
    firebaseUid: body.firebaseUid,
    name: body.name,
    contact: body.contact,
    phone: body.phone,
    address: body.address,
    accountType: body.accountType,
    companyBranchName: body.companyBranchName,
    contactPersonName: body.contactPersonName,
  });
  return NextResponse.json(account, { status: 201 });
}
