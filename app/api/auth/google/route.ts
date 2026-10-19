import { NextResponse, type NextRequest } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { createHash } from "node:crypto";
import { consumeLimits } from "@/lib/abuse-limits";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp, requireFirebaseUser, assertRecentAuthentication } from "@/lib/auth";
import { assertGoogleClaims, assertSameOrigin, GoogleAuthError, googleAuthConfig, googleChallengeCookie, readGoogleChallenge } from "@/lib/google-auth";
import { googleErrorResponse, readGoogleJson } from "@/lib/google-http";
import { getReservationRepository } from "@/lib/repositories";
import { authenticateGoogleCustomer } from "@/lib/services/google-login-service";
import { notifyAuthenticationChange } from "@/lib/services/authentication-notification-service";
import { repositoryProvider } from "@/lib/db/environment";
export const runtime = "nodejs";
const verifier = new OAuth2Client();
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (repositoryProvider() !== "drizzle") throw new GoogleAuthError("Googleログインには、トランザクション対応のDB構成が必要です。", 503);
    if (Number(request.headers.get("content-length")) > 16384) throw new GoogleAuthError("認証情報が大きすぎます。", 413);
    const { credential } = z.object({ credential: z.string().min(1).max(12000) }).strict().parse(await readGoogleJson(request));
    const { clientId, secret } = googleAuthConfig();
    const challenge = readGoogleChallenge(request.cookies.get(googleChallengeCookie)?.value ?? "", secret);
    if (challenge.mode !== "login") {
      const user = await requireFirebaseUser(request);
      if (user.uid !== challenge.uid) throw new GoogleAuthError("ログイン状態が変わりました。やり直してください。", 403);
      if (challenge.mode === "link") { assertRecentAuthentication(user); if (user.firebase.sign_in_provider !== "password") throw new GoogleAuthError("現在のパスワードで本人確認を行ってください。", 403); }
    }
    // Bound untrusted verification traffic and consume each challenge exactly once, across processes.
    await consumeLimits([{ key: "google:verify:global", max: 100, seconds: 60 }, { key: `google:nonce:${challenge.nonce}`, max: 1, seconds: 600 }]);
    let identity;
    try { identity = assertGoogleClaims((await verifier.verifyIdToken({ idToken: credential, audience: clientId })).getPayload(), clientId, challenge.nonce); }
    catch { throw new GoogleAuthError("Googleの本人確認に失敗しました。もう一度お試しください。", 401); }
    const repository = await getReservationRepository();
    const result = await authenticateGoogleCustomer(repository, getAuth(getFirebaseAdminApp()), identity, challenge.mode, challenge.uid);
    const notification = challenge.mode === "link" ? await notifyAuthenticationChange(repository, result.uid, "Googleアカウントを連携しました") : undefined;
    console.info(JSON.stringify({ event: "customer_google_auth", mode: challenge.mode, actor: createHash("sha256").update(result.uid).digest("hex"), result: "success" }));
    const response = NextResponse.json({ ...result, notification }, { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    response.cookies.set(googleChallengeCookie, "", { maxAge: 0, path: "/api/auth/google", httpOnly: true, sameSite: "strict", secure: new URL(request.url).protocol === "https:" });
    return response;
  } catch (e) { return googleErrorResponse(e); }
}
