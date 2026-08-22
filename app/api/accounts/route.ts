import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const accounts = await getReservationRepository().listAccounts();
    return NextResponse.json({ accounts });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body.firebaseUid || !body.name || !body.contact) {
      return NextResponse.json({ error: "firebaseUid, name and contact are required" }, { status: 400 });
    }
    const account = await getReservationRepository().createAccount({
      firebaseUid: body.firebaseUid,
      name: body.name,
      contact: body.contact,
      phone: body.phone,
      address: body.address,
      accountType: body.accountType,
      companyBranchName: body.companyBranchName,
      contactPersonName: body.contactPersonName,
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
