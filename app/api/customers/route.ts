import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const customers = await getReservationRepository().listAccounts();
    return NextResponse.json({ customers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await readJsonObject(request);
    const firebaseUid = typeof body.firebaseUid === "string" ? body.firebaseUid.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";
    if (!firebaseUid || !name || !contact) {
      return NextResponse.json({ error: "Account creation requires firebaseUid, name and contact." }, { status: 400 });
    }
    const customer = await getReservationRepository().createAccount({
      firebaseUid,
      name,
      contact,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      address: typeof body.address === "string" ? body.address : undefined,
      accountType: body.accountType === "travel_agency" ? "travel_agency" : "individual",
      companyBranchName: typeof body.companyBranchName === "string" ? body.companyBranchName : undefined,
      contactPersonName: typeof body.contactPersonName === "string" ? body.contactPersonName : undefined,
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
