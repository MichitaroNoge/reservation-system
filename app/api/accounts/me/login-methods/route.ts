import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getFirebaseAdminApp, requireVerifiedFirebaseUser, requireRecentlyAuthenticatedFirebaseUser } from "@/lib/auth";
import { assertSameOrigin, GoogleAuthError } from "@/lib/google-auth";
import { googleErrorResponse, readGoogleJson } from "@/lib/google-http";
import { getReservationRepository } from "@/lib/repositories";
import { repositoryTransaction } from "@/lib/repositories/transaction";
import { assertAccountNotDeleting } from "@/lib/services/account-lifecycle-service";
import { isPasswordEnabled, isPrivilegedUser, unlinkGoogleCustomer } from "@/lib/services/google-login-service";
import { notifyAuthenticationChange } from "@/lib/services/authentication-notification-service";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request) {
  try {
    const session = await requireVerifiedFirebaseUser(request), auth = getAuth(getFirebaseAdminApp());
    const user = await auth.getUser(session.uid);
    const google = user.providerData.find(p => p.providerId === "google.com");
    return NextResponse.json({ password: isPasswordEnabled(user), google: Boolean(google), googleEmail: google?.email ?? null }, { headers });
  } catch (e) { return googleErrorResponse(e); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRecentlyAuthenticatedFirebaseUser(request);
    const { password } = z.object({ password: z.string().min(8, "パスワードは8文字以上で入力してください。").max(128) }).strict().parse(await readGoogleJson(request));
    const repository = await getReservationRepository(), auth = getAuth(getFirebaseAdminApp());
    await repositoryTransaction(repository, `account:${session.uid}`, async repo => {
      await assertAccountNotDeleting(repo, session.uid);
      const user = await auth.getUser(session.uid);
      if (isPrivilegedUser(user)) throw new GoogleAuthError("管理者の認証情報はこの画面で変更できません。", 403);
      if (user.disabled || (await repo.listInactiveAccounts()).some(a => a.firebaseUid === session.uid)) throw new GoogleAuthError("このアカウントは利用できません。", 403);
      await auth.setCustomUserClaims(session.uid, { ...user.customClaims, customerGoogleVersion: randomUUID() });
      await auth.updateUser(session.uid, { password });
      await auth.revokeRefreshTokens(session.uid);
    });
    const notification = await notifyAuthenticationChange(repository, session.uid, "パスワードを設定・変更しました");
    return NextResponse.json({ changed: true, notification }, { headers });
  } catch (e) { return googleErrorResponse(e); }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRecentlyAuthenticatedFirebaseUser(request), repository = await getReservationRepository();
    await unlinkGoogleCustomer(repository, getAuth(getFirebaseAdminApp()), session.uid);
    const notification = await notifyAuthenticationChange(repository, session.uid, "Googleアカウントの連携を解除しました");
    return NextResponse.json({ unlinked: true, notification }, { headers });
  } catch (e) { return googleErrorResponse(e); }
}
