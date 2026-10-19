import { randomUUID } from "node:crypto";
import type { Auth, UserRecord } from "firebase-admin/auth";
import { GoogleAuthError } from "../google-auth";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { repositoryTransaction } from "../repositories/transaction";
import { assertAccountNotDeleting } from "./account-lifecycle-service";

type GoogleIdentity = { sub: string; email: string; name: string };
export type GoogleAuthStore = Pick<Auth, "getUserByProviderUid" | "getUserByEmail" | "getUser" | "createUser" | "updateUser" | "deleteUser" | "createCustomToken" | "setCustomUserClaims" | "revokeRefreshTokens">;
export const isMissingFirebaseUser = (error: unknown) => !!error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found";
async function optionalUser(find: () => Promise<UserRecord>) { try { return await find(); } catch (e) { if (isMissingFirebaseUser(e)) return null; throw e; } }
export function isPasswordEnabled(user: UserRecord) { return user.providerData.some(p => p.providerId === "password"); }
export function isPrivilegedUser(user: UserRecord) {
  const allow = (process.env.FIREBASE_AUTH_ADMIN_EMAILS ?? "").split(",").map(s => s.trim().toLowerCase());
  return user.customClaims?.admin === true || user.customClaims?.role === "admin" || Boolean(user.email && user.emailVerified && allow.includes(user.email.toLowerCase()));
}
async function assertCustomerUser(repo: ReservationRepository, user: UserRecord) {
  if (user.disabled || isPrivilegedUser(user)) throw new GoogleAuthError("このアカウントではお客様向けGoogleログインを利用できません。従来の方法でログインしてください。", 403);
  await assertAccountNotDeleting(repo, user.uid);
  if ((await repo.listInactiveAccounts()).some(a => a.firebaseUid === user.uid)) throw new GoogleAuthError("このアカウントは無効化されています。管理者にお問い合わせください。", 403);
}
/** Google sub is stored in Firebase. Serialize provider mutations: privileged Admin linking can override bindings. */
export async function authenticateGoogleCustomer(repo: ReservationRepository, auth: GoogleAuthStore, identity: GoogleIdentity, mode: "login" | "link" | "reauth", targetUid?: string) {
  const provisioned = await repositoryTransaction(repo, "customer-google-identities", async repo => {
    let user = await optionalUser(() => auth.getUserByProviderUid("google.com", identity.sub));
    if (mode !== "login") {
      if (!targetUid) throw new GoogleAuthError("ログインしてください。", 401);
      const target = await auth.getUser(targetUid);
      await assertCustomerUser(repo, target);
      if (user && user.uid !== targetUid) throw new GoogleAuthError("このGoogleアカウントは別のアカウントに連携済みです。", 409);
      if (mode === "reauth" && !user) throw new GoogleAuthError("連携済みのGoogleアカウントを選択してください。", 403);
      if (mode === "link" && !user) {
        if (target.providerData.some(p => p.providerId === "google.com")) throw new GoogleAuthError("別のGoogleアカウントが連携済みです。", 409);
        if (!isPasswordEnabled(target)) throw new GoogleAuthError("既存のログイン方法で本人確認を行ってください。", 403);
        user = await auth.updateUser(targetUid, { providerToLink: { providerId: "google.com", uid: identity.sub, email: identity.email, displayName: identity.name } });
      } else user = target;
    } else if (!user) {
      if ((process.env.FIREBASE_AUTH_ADMIN_EMAILS ?? "").split(",").some(s => s.trim().toLowerCase() === identity.email.toLowerCase())) throw new GoogleAuthError("管理者は従来の方法でログインしてください。", 403);
      // Matching email is only a reason to stop and request explicit linking, never a sign-in key.
      const duplicate = await optionalUser(() => auth.getUserByEmail(identity.email));
      if (duplicate) throw new GoogleAuthError("このメールアドレスは登録済みです。従来の方法でログインし、「ログイン方法」からGoogleアカウントを連携してください。", 409);
      user = await auth.createUser({ email: identity.email, emailVerified: true, displayName: identity.name || undefined });
      try { user = await auth.updateUser(user.uid, { providerToLink: { providerId: "google.com", uid: identity.sub, email: identity.email, displayName: identity.name } }); }
      catch (error) {
        // A lost response may still have committed the provider link. Do not delete or overwrite users.
        const linked = await optionalUser(() => auth.getUserByProviderUid("google.com", identity.sub));
        if (linked?.uid !== user.uid) {
          // Roll back only this request's brand-new, positively confirmed empty identity.
          // If a lookup is uncertain, leave it untouched and fail closed.
          const pending = await auth.getUser(user.uid);
          if (pending.providerData.length === 0 && !await repo.findAccountByFirebaseUid(user.uid)) await auth.deleteUser(user.uid);
          throw error;
        }
        user = linked;
      }
    }
    if (!user) throw new GoogleAuthError("Googleログインを完了できませんでした。", 503);
    await assertCustomerUser(repo, user);
    return user;
  });
  // Serialize token issuance with account deletion and authentication-method changes.
  return repositoryTransaction(repo, `account:${provisioned.uid}`, async repo => {
    const user = await auth.getUser(provisioned.uid);
    await assertCustomerUser(repo, user);
    if (!user.providerData.some(p => p.providerId === "google.com" && p.uid === identity.sub)) throw new GoogleAuthError("Googleの連携状態が変更されました。もう一度ログインしてください。", 409);
    const version = typeof user.customClaims?.customerGoogleVersion === "string" ? user.customClaims.customerGoogleVersion : randomUUID();
    if (user.customClaims?.customerGoogleVersion !== version) await auth.setCustomUserClaims(user.uid, { ...user.customClaims, customerGoogleVersion: version });
    const token = await auth.createCustomToken(user.uid, { customerGoogleSub: identity.sub, customerGoogleSessionVersion: version, customerGoogleAuthenticatedAt: Math.floor(Date.now() / 1000) });
    return { token, uid: user.uid };
  });
}
export async function unlinkGoogleCustomer(repo: ReservationRepository, auth: GoogleAuthStore, uid: string) {
  return repositoryTransaction(repo, `account:${uid}`, async repo => {
    const user = await auth.getUser(uid); await assertCustomerUser(repo, user);
    if (!isPasswordEnabled(user)) throw new GoogleAuthError("Google連携を解除する前にパスワードを設定してください。", 409);
    if (!user.providerData.some(p => p.providerId === "google.com")) return;
    // Rotate before unlinking so every previously issued custom token becomes unusable by our APIs.
    await auth.setCustomUserClaims(uid, { ...user.customClaims, customerGoogleVersion: randomUUID() });
    await auth.updateUser(uid, { providersToUnlink: ["google.com"] });
    await auth.revokeRefreshTokens(uid);
  });
}
