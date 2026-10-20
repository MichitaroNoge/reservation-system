import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "./auth";

type SessionAdmin = Pick<Auth, "getUser" | "setCustomUserClaims" | "revokeRefreshTokens">;

/** Operator-only helper, never exposed as a public endpoint. */
export async function revokeUserSessions(uid: string, auth: SessionAdmin = getAuth(getFirebaseAdminApp())) {
  if (!uid.trim()) throw new Error("Firebase UID is required.");
  await auth.revokeRefreshTokens(uid);
}

export async function removeAdminAccessAndRevokeSessions(uid: string, auth: SessionAdmin = getAuth(getFirebaseAdminApp())) {
  if (!uid.trim()) throw new Error("Firebase UID is required.");
  const user = await auth.getUser(uid);
  const fallback = (process.env.FIREBASE_AUTH_ADMIN_EMAILS ?? "").split(",").map(email => email.trim().toLowerCase());
  if (user.email && fallback.includes(user.email.toLowerCase())) {
    throw new Error("このユーザーは管理者メール許可リストに含まれています。先に全環境の許可リストから削除し、アプリを再起動・再デプロイしてください。");
  }
  const claims = { ...user.customClaims };
  delete claims.admin;
  if (claims.role === "admin") delete claims.role;
  await auth.setCustomUserClaims(uid, claims);
  // Failure must propagate: removing claims alone does not invalidate already-issued ID tokens.
  await auth.revokeRefreshTokens(uid);
}
