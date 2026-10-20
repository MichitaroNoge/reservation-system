import { NextResponse } from "next/server";
import { requireVerifiedFirebaseUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { sendAccountEmailChangedNotification } from "@/lib/services/account-email-change-service";
import { repositoryTransaction } from "@/lib/repositories/transaction";
import { assertAccountNotDeleting } from "@/lib/services/account-lifecycle-service";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const user = await requireVerifiedFirebaseUser(request);
    const newEmail = user.email?.trim().toLowerCase();
    if (!newEmail) return NextResponse.json({ error: "認証済みメールアドレスを確認できません。" }, { status: 400 });
    const repository = (await getReservationRepository());
    const result = await repositoryTransaction(repository, `account:${user.uid}`, async repository => {
      await assertAccountNotDeleting(repository, user.uid);
      const account = await repository.findAccountByFirebaseUid(user.uid);
      if (!account?.id) return NextResponse.json({ error: "アカウントが見つかりません。" }, { status: 404 });
      const oldEmail = account.contact.trim().toLowerCase();
      if (oldEmail === newEmail) return NextResponse.json({ account, changed: false });
      const duplicate = (await repository.listAccounts()).find((item) => item.firebaseUid !== user.uid && item.contact.trim().toLowerCase() === newEmail);
      if (duplicate) return NextResponse.json({ error: "このメールアドレスは別のアカウントで使用されています。" }, { status: 409 });
      const updated = await repository.updateAccount(account.id, { ...account, contact: newEmail });
      return { account: updated, oldEmail };
    });
    if (result instanceof Response) return result;
    const { account: updated, oldEmail } = result;
    const changedAt = new Date().toISOString();
    const notification = await sendAccountEmailChangedNotification(repository, updated, oldEmail, newEmail, changedAt).catch(() => ({ status: "failed" as const }));
    return NextResponse.json({ account: updated, changed: true, notification });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
