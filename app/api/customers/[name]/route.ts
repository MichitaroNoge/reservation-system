import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const body = await readJsonObject(request);
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";
    if (!id || !name || !contact) return NextResponse.json({ error: "id, name and contact are required." }, { status: 400 });
    const customer = await getReservationRepository().updateAccount(id, {
      id,
      name,
      contact,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      address: typeof body.address === "string" ? body.address : undefined,
      accountType: body.accountType === "travel_agency" ? "travel_agency" : "individual",
      companyBranchName: typeof body.companyBranchName === "string" ? body.companyBranchName : undefined,
      contactPersonName: typeof body.contactPersonName === "string" ? body.contactPersonName : undefined,
    });
    return NextResponse.json({ customer });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? "";
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
    await getReservationRepository().deactivateAccount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
