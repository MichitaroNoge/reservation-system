import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { resolveLegacyAccountId, updateAdminAccountProfile, withAccountTransaction } from "@/lib/services/account-profile-service";

export const runtime = "nodejs";

async function resolveAccountId(name: string, explicitId?: string) {
  return resolveLegacyAccountId((await getReservationRepository()), name, explicitId);
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
    const customer = await updateAdminAccountProfile((await getReservationRepository()), id, body);
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
    await withAccountTransaction((await getReservationRepository()), id, repository => repository.deactivateAccount(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
