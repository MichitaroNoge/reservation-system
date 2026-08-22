import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

async function resolveAccountId(name: string, explicitId?: string) {
  if (explicitId) return explicitId;
  const decodedName = decodeURIComponent(name);
  const account = (await getReservationRepository().listAccounts()).find((item) => item.name === decodedName);
  return account?.id ?? "";
}

export async function PATCH(request: Request, context: { params: Promise<{ name: string }> }) {
  try {
    await requireAdmin(request);
    const { name: routeName } = await context.params;
    const body = await readJsonObject(request);
    const explicitId = typeof body.id === "string" ? body.id.trim() : "";
    const id = await resolveAccountId(routeName, explicitId);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";
    if (!id || !name || !contact) return NextResponse.json({ error: "Account not found, or name/contact is missing." }, { status: 400 });
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

export async function DELETE(request: Request, context: { params: Promise<{ name: string }> }) {
  try {
    await requireAdmin(request);
    const { name } = await context.params;
    const id = await resolveAccountId(name);
    if (!id) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    await getReservationRepository().deactivateAccount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
