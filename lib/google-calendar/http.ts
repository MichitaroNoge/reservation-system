import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../auth";
import { repositoryProvider } from "../db/environment";
import { getDatabase } from "../db/client";
import { sameOrigin, readBody } from "../inquiries/http";
import { CalendarError, calendarMessages, flowCookie } from "./security";
import { beginCalendarOAuth, completeCalendarOAuth } from "./oauth";
import { calendarSettings, changeCalendarSettings, createOrRecoverCalendar } from "./settings";
import { runCalendarSync } from "./sync";
export const calendarJson = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
export function calendarError(error: unknown) {
  if (error instanceof z.ZodError) return calendarJson({ error: "入力内容を確認してください。" }, 400);
  if (error instanceof CalendarError) return calendarJson({ error: calendarMessages[error.code] ?? "処理を完了できませんでした。", code: error.code }, error.statusCode);
  if (error && typeof error === "object" && "statusCode" in error && [400, 401, 403, 409, 413, 415, 429].includes(Number(error.statusCode))) return calendarJson({ error: "操作内容とログイン状態を確認してください。" }, Number(error.statusCode));
  console.error(JSON.stringify({ event: "google_calendar_operation_failed" }));
  return calendarJson({ error: "処理を完了できませんでした。時間をおいて再度お試しください。" }, 503);
}
export async function calendarAdmin(request: Request, connect = false) {
  try {
    const admin = await requireAdmin(request);
    if (repositoryProvider() !== "drizzle") {
      if (request.method !== "GET") throw new CalendarError("setup_required");
      return calendarJson({ supported: false });
    }
    const db = await getDatabase();
    if (request.method === "GET") return calendarJson(await calendarSettings(db));
    sameOrigin(request); const body = await readBody(request);
    if (connect) { z.object({}).strict().parse(body); return await beginCalendarOAuth(db, request, admin.uid); }
    const input = z.discriminatedUnion("action", [z.object({ action: z.enum(["pause", "resume", "retry", "disconnect", "create"]) }).strict(), z.object({ action: z.enum(["replace_create", "replace_recover"]), replaceCalendarId: z.string().min(1).max(512), calendarId: z.string().min(1).max(512).regex(/^[A-Za-z0-9_@.\-]+$/).optional(), confirmed: z.literal(true) }).strict(), z.object({ action: z.literal("recover"), calendarId: z.string().min(1).max(512).regex(/^[A-Za-z0-9_@.\-]+$/) }).strict()]).parse(body);
    if (input.action === "create" || input.action === "recover") await createOrRecoverCalendar(db, input.action === "recover" ? input.calendarId : undefined);
    else if (input.action === "replace_create" || input.action === "replace_recover") {
      if (input.action === "replace_recover" && !input.calendarId) throw new CalendarError("invalid_flow", 400);
      await createOrRecoverCalendar(db, input.action === "replace_recover" ? input.calendarId : undefined, undefined, input.replaceCalendarId);
    } else await changeCalendarSettings(db, input.action);
    if (!["pause", "disconnect"].includes(input.action)) { try { await runCalendarSync(db); } catch (e) { if (!(e instanceof CalendarError) || e.code !== "busy") throw e; } }
    return calendarJson(await calendarSettings(db));
  } catch (error) { return calendarError(error); }
}
export async function calendarCallback(request: Request) {
  let outcome = "connected";
  try {
    if (repositoryProvider() !== "drizzle") throw new CalendarError("setup_required");
    await completeCalendarOAuth(await getDatabase(), request);
  } catch (error) { outcome = error instanceof CalendarError ? error.code : "invalid_flow"; }
  const result = NextResponse.redirect(new URL(`/?googleCalendar=${encodeURIComponent(outcome)}`, request.url), 303);
  result.cookies.set(flowCookie, "", { httpOnly: true, sameSite: "lax", maxAge: 0, path: "/api/admin/google-calendar" });
  result.headers.set("Cache-Control", "private, no-store"); result.headers.set("Referrer-Policy", "no-referrer"); return result;
}
export async function calendarJob(request: Request) {
  try {
    const expected = process.env.CRON_SECRET;
    if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return calendarJson({ error: "認証が必要です。" }, 401);
    if (repositoryProvider() !== "drizzle") throw new CalendarError("setup_required");
    return calendarJson(await runCalendarSync());
  } catch (error) { return calendarError(error); }
}
