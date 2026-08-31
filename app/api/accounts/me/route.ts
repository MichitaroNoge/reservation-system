import { NextResponse } from "next/server";
import { requireFirebaseUser, requireVerifiedFirebaseUser } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, validateCustomerInput } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireVerifiedFirebaseUser(request);
    const account = await getReservationRepository().findAccountByFirebaseUid(user.uid);
    return NextResponse.json({ account });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const input = validateCustomerInput(await readJsonObject(request));
    const repository = getReservationRepository();
    const existing = await repository.findAccountByFirebaseUid(user.uid);
    const accountInput = { ...input, contact: user.email ?? input.contact };
    const account = existing
      ? await repository.updateAccount(existing.id!, accountInput)
      : await repository.createAccount({ ...accountInput, firebaseUid: user.uid });

    return NextResponse.json({ account }, { status: existing ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
