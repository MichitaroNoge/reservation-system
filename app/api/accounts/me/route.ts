import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp, requireFirebaseUser, requireVerifiedFirebaseUser } from "@/lib/auth";
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

export async function DELETE(request: Request) {
  try {
    const user = await requireVerifiedFirebaseUser(request);
    const repository = getReservationRepository();
    const reservations = await repository.listReservationsForReservationAccount(user.uid);
    if (reservations.length > 0) {
      return NextResponse.json({ error: "予約履歴があるため、アカウントを削除できません。" }, { status: 409 });
    }

    const account = await repository.findAccountByFirebaseUid(user.uid);
    if (!account?.id) return NextResponse.json({ error: "削除するアカウントが見つかりません。" }, { status: 404 });

    await repository.deactivateAccount(account.id);
    try {
      await getAuth(getFirebaseAdminApp()).deleteUser(user.uid);
    } catch (error) {
      await repository.reactivateAccount(account.id);
      throw error;
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
