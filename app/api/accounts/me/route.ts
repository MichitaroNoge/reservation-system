import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { ApiAuthError, getFirebaseAdminApp, requireFirebaseUser, requireVerifiedFirebaseUser, requireRecentlyAuthenticatedFirebaseUser } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { accountHasIncompleteReservations, activeReservationDeletionMessage } from "@/lib/account-deletion";
import { getReservationRepository } from "@/lib/repositories";
import { repositoryTransaction } from "@/lib/repositories/transaction";
import { saveAuthenticatedAccountProfile, updateAuthenticatedAccountProfile } from "@/lib/services/account-profile-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireVerifiedFirebaseUser(request);
    const account = await (await getReservationRepository()).findAccountByFirebaseUid(user.uid);
    if (!account && (await (await getReservationRepository()).listInactiveAccounts()).some(item => item.firebaseUid === user.uid)) {
      throw new ApiAuthError("このアカウントは無効化されています。管理者にお問い合わせください。", 403);
    }
    return NextResponse.json({ account });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const body = await readJsonObject(request);
    const repository = (await getReservationRepository());
    return await repositoryTransaction(repository, `account:${user.uid}`, async (repository) => {
      const { account, created } = await saveAuthenticatedAccountProfile(repository, user, body);
      return NextResponse.json({ account }, { status: created ? 201 : 200 });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireVerifiedFirebaseUser(request);
    const repository = (await getReservationRepository());
    const body = await readJsonObject(request);
    const account = await updateAuthenticatedAccountProfile(repository, user.uid, body);
    return NextResponse.json({ account });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireRecentlyAuthenticatedFirebaseUser(request);
    const repository = (await getReservationRepository());
    const account = await repositoryTransaction(repository, `account:${user.uid}`, async (repository) => {
      const deletion = await repository.getAccountDeletion?.(user.uid);
      if (deletion?.completedAt) return NextResponse.json({ deleted: true });
      if (deletion) return NextResponse.json({ error: "アカウントの削除処理中です。しばらく待っても完了しない場合は管理者にお問い合わせください。" }, { status: 409 });
      const reservations = await repository.listReservationsForReservationAccount(user.uid);
      const changeRequests = await repository.listReservationChangeRequests();
      if (accountHasIncompleteReservations(reservations, changeRequests)) {
        return NextResponse.json({ error: activeReservationDeletionMessage }, { status: 409 });
      }

      const account = await repository.findAccountByFirebaseUid(user.uid);
      // Registration may have created only the Firebase user when profile persistence failed.
      // A missing application profile must not prevent the authenticated owner from deleting it.
      if (!account?.id) {
        const inactive = (await repository.listInactiveAccounts()).find(item => item.firebaseUid === user.uid);
        if (inactive) {
          return NextResponse.json({ error: "このアカウントは無効化されています。管理者にお問い合わせください。" }, { status: 403 });
        }
        await repository.recordAccountDeletion?.(user.uid);
        return null;
      }

      await repository.recordAccountDeletion?.(user.uid);
      await repository.deactivateAccount(account.id);
      return { ...account, id: account.id };
    });
    if (account instanceof Response) return account;
    const auth = getAuth(getFirebaseAdminApp());
    try {
      await auth.deleteUser(user.uid);
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found")) {
        // A timeout can mean deletion succeeded but the response was lost. Only
        // restore access when Firebase positively confirms the user still exists.
        let exists = false;
        try { await auth.getUser(user.uid); exists = true; }
        catch (lookupError) {
          if (!(typeof lookupError === "object" && lookupError !== null && "code" in lookupError && lookupError.code === "auth/user-not-found")) throw error;
        }
        if (exists) {
          await repositoryTransaction(repository, `account:${user.uid}`, async repository => {
            await repository.clearAccountDeletion?.(user.uid);
            if (account) await repository.reactivateAccount(account.id);
          });
          throw error;
        }
      }
    }

    await repositoryTransaction(repository, `account:${user.uid}`, async repository => {
      await repository.recordAccountDeletion?.(user.uid, new Date().toISOString());
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
