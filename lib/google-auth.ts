import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { TokenPayload } from "google-auth-library";

export class GoogleAuthError extends Error {
  constructor(message: string, public statusCode = 400) { super(message); }
}
export const googleChallengeCookie = "customer_google_challenge";
export const googleChallengeSchema = z.object({ nonce: z.string().regex(/^[A-Za-z0-9_-]{43}$/), mode: z.enum(["login", "link", "reauth"]), uid: z.string().max(128), expires: z.number().int() }).strict();
export type GoogleChallenge = z.infer<typeof googleChallengeSchema>;
export function googleAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  const secret = process.env.GOOGLE_AUTH_COOKIE_SECRET ?? "";
  if (!clientId.endsWith(".apps.googleusercontent.com") || secret.length < 32) throw new GoogleAuthError("Googleログインの準備ができていません。管理者にお問い合わせください。", 503);
  return { clientId, secret };
}
export function signGoogleChallenge(challenge: GoogleChallenge, secret: string) {
  const body = Buffer.from(JSON.stringify(challenge)).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
export function readGoogleChallenge(cookie: string, secret: string, now = Date.now()) {
  try {
    if (cookie.length > 2048) throw new Error();
    const [body, signature, extra] = cookie.split(".");
    if (extra || !body || !signature) throw new Error();
    const expected = createHmac("sha256", secret).update(body).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const challenge = googleChallengeSchema.parse(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
    if (challenge.expires <= now || challenge.expires > now + 10 * 60_000) throw new Error();
    return challenge;
  } catch { throw new GoogleAuthError("本人確認の有効期限が切れました。もう一度お試しください。", 401); }
}
export function newGoogleChallenge(mode: GoogleChallenge["mode"], uid = "", now = Date.now()): GoogleChallenge {
  return { mode, uid, nonce: randomBytes(32).toString("base64url"), expires: now + 5 * 60_000 };
}
export function assertGoogleClaims(payload: TokenPayload | undefined, clientId: string, nonce: string, now = Date.now() / 1000) {
  const p = payload as (TokenPayload & { nonce?: string }) | undefined;
  if (!p || !["https://accounts.google.com", "accounts.google.com"].includes(p.iss) || p.aud !== clientId || typeof p.exp !== "number" || !Number.isFinite(p.exp) || p.exp <= now || typeof p.iat !== "number" || !Number.isFinite(p.iat) || p.iat > now + 30 || p.nonce !== nonce || typeof p.sub !== "string" || !p.sub || p.sub.length > 255 || p.email_verified !== true || !p.email) {
    throw new GoogleAuthError("Googleの本人確認結果を確認できませんでした。もう一度お試しください。", 401);
  }
  return { sub: p.sub, email: z.string().email().max(255).parse(p.email), name: typeof p.name === "string" ? p.name.slice(0, 100) : "" };
}
export function assertSameOrigin(request: Request) {
  const url = new URL(request.url);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new GoogleAuthError("HTTPS接続が必要です。", 403);
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") throw new GoogleAuthError("この画面からの操作は許可されていません。", 403);
}
export function isGoogleCustomerSessionCurrent(token: { uid: string; customerGoogleSub?: unknown; customerGoogleSessionVersion?: unknown; customerGoogleAuthenticatedAt?: unknown }, user: { uid: string; disabled: boolean; tokensValidAfterTime?: string; providerData: { providerId: string; uid: string }[]; customClaims?: Record<string, unknown> }) {
  const authenticatedAt = token.customerGoogleAuthenticatedAt;
  const validAfter = user.tokensValidAfterTime ? Math.floor(Date.parse(user.tokensValidAfterTime) / 1000) : 0;
  return !user.disabled && user.uid === token.uid && typeof authenticatedAt === "number" && Number.isSafeInteger(authenticatedAt) && authenticatedAt > 0 && authenticatedAt <= Date.now() / 1000 + 30 && authenticatedAt >= validAfter && typeof token.customerGoogleSub === "string" && typeof token.customerGoogleSessionVersion === "string" && user.customClaims?.customerGoogleVersion === token.customerGoogleSessionVersion && user.providerData.some(p => p.providerId === "google.com" && p.uid === token.customerGoogleSub);
}
