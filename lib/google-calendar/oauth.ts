import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminApp, isAdminToken } from "../auth";
import type { ReservationDatabase } from "../repositories/drizzle-reservation-repository";
import { googleCalendarFlow as flow, googleCalendarConnection as connection } from "../db/schema";
import { calendarConfig, calendarScope, CalendarError, decrypt, encrypt, flowCookie, hash } from "./security";
import { authorizationUrl, oauthClient } from "./client";
import { calendarTransaction } from "./sync";
export async function beginCalendarOAuth(db: ReservationDatabase, request: Request, uid: string) {
  const config = calendarConfig();
  if (new URL(request.url).origin !== config.origin) throw new CalendarError("invalid_flow", 403);
  const state = randomBytes(32).toString("base64url"), browser = randomBytes(32).toString("base64url"), verifier = randomBytes(32).toString("base64url");
  await db.delete(flow).where(lt(flow.expiresAt, new Date().toISOString()));
  await db.insert(flow).values({ stateHash: hash(state), browserHash: hash(browser), uid, verifier: encrypt(verifier), expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
  const url = new URL(authorizationUrl(state, createHash("sha256").update(verifier).digest("base64url"))); url.searchParams.set("nonce", state);
  const result = NextResponse.json({ url: url.toString() }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  result.cookies.set(flowCookie, browser, { httpOnly: true, sameSite: "lax", secure: config.origin.startsWith("https:"), maxAge: 600, path: "/api/admin/google-calendar" }); return result;
}
export async function completeCalendarOAuth(db: ReservationDatabase, request: Request) {
  const config = calendarConfig(), url = new URL(request.url);
  if (url.origin !== config.origin || url.searchParams.getAll("state").length !== 1 || url.searchParams.getAll("code").length > 1) throw new CalendarError("invalid_flow", 400);
  const state = url.searchParams.get("state") ?? "", code = url.searchParams.get("code");
  const browser = (request.headers.get("cookie") ?? "").split(";").map(v => v.trim()).find(v => v.startsWith(`${flowCookie}=`))?.slice(flowCookie.length + 1) ?? "";
  if (!/^[\w-]{43}$/.test(state) || !/^[\w-]{43}$/.test(browser)) throw new CalendarError("invalid_flow", 400);
  const [grant] = await db.delete(flow).where(and(eq(flow.stateHash, hash(state)), eq(flow.browserHash, hash(browser)), gt(flow.expiresAt, new Date().toISOString()))).returning();
  if (!grant) throw new CalendarError("invalid_flow", 400);
  const admin = await getAuth(getFirebaseAdminApp()).getUser(grant.uid);
  if (admin.disabled || !isAdminToken({ ...admin.customClaims, uid: admin.uid, email: admin.email, email_verified: admin.emailVerified } as DecodedIdToken) || (admin.tokensValidAfterTime && Date.parse(admin.tokensValidAfterTime) > Date.parse(grant.createdAt))) throw new CalendarError("invalid_flow", 403);
  if (url.searchParams.has("error")) throw new CalendarError("access_denied", 400);
  if (!code || code.length > 4096) throw new CalendarError("invalid_flow", 400);
  const client = oauthClient();
  let tokens;
  try { tokens = (await client.getToken({ code, codeVerifier: decrypt(grant.verifier), redirect_uri: config.redirectUri })).tokens; }
  catch { throw new CalendarError("invalid_flow", 400); }
  if (!tokens.id_token || !tokens.refresh_token || !tokens.scope?.split(" ").includes(calendarScope)) throw new CalendarError("access_denied", 400);
  const claims = (await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId })).getPayload() as { sub?: string; email?: string; email_verified?: boolean; nonce?: string } | undefined;
  if (!claims?.sub || !claims.email || claims.email_verified !== true || claims.nonce !== state) throw new CalendarError("invalid_flow", 400);
  const identity = { sub: claims.sub, email: claims.email };
  await calendarTransaction(db, async tx => {
    const [previous] = await tx.select().from(connection).where(eq(connection.key, "default"));
    if (previous && previous.googleSub !== identity.sub) throw new CalendarError("different_account", 409);
    const values = { googleSub: identity.sub, email: identity.email, refreshToken: encrypt(tokens.refresh_token!), connectedBy: grant.uid, enabled: Boolean(previous?.calendarId) && previous?.lastError !== "calendar_missing", lastError: previous?.lastError === "calendar_missing" ? "calendar_missing" : previous?.lastError === "calendar_creation_unknown" && !previous.calendarId ? "calendar_creation_unknown" : null };
    await tx.insert(connection).values({ key: "default", ...values }).onConflictDoUpdate({ target: connection.key, set: values });
  });
}
