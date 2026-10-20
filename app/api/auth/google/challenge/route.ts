import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeLimits } from "@/lib/abuse-limits";
import { requireFirebaseUser, assertRecentAuthentication } from "@/lib/auth";
import { assertSameOrigin, GoogleAuthError, googleAuthConfig, googleChallengeCookie, newGoogleChallenge, signGoogleChallenge } from "@/lib/google-auth";
import { googleErrorResponse, readGoogleJson } from "@/lib/google-http";
import { repositoryProvider } from "@/lib/db/environment";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (repositoryProvider() !== "drizzle") throw new GoogleAuthError("Googleログインには、トランザクション対応のDB構成が必要です。", 503);
    const { mode } = z.object({ mode: z.enum(["login", "link", "reauth"]) }).strict().parse(await readGoogleJson(request));
    const { clientId, secret } = googleAuthConfig();
    let uid = "";
    if (mode !== "login") { const user = await requireFirebaseUser(request); uid = user.uid; if (mode === "link") { assertRecentAuthentication(user); if (user.firebase.sign_in_provider !== "password") throw new GoogleAuthError("現在のパスワードで本人確認を行ってください。", 403); } }
    await consumeLimits([{ key: `google:challenge:${uid || "public"}`, max: uid ? 10 : 100, seconds: 60 }]);
    const challenge = newGoogleChallenge(mode, uid);
    const response = NextResponse.json({ clientId, nonce: challenge.nonce }, { headers: { "Cache-Control": "private, no-store" } });
    response.cookies.set(googleChallengeCookie, signGoogleChallenge(challenge, secret), { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "strict", maxAge: 300, path: "/api/auth/google" });
    return response;
  } catch (e) { return googleErrorResponse(e); }
}
