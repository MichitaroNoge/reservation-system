import "server-only";
import { asc, count, eq, isNotNull, or, sql } from "drizzle-orm";
import { googleCalendarConnection as connection, googleCalendarSync as sync, reservation } from "../db/schema";
import type { ReservationDatabase } from "../repositories/drizzle-reservation-repository";
import { calendarConfig, CalendarError, calendarMessages, decrypt } from "./security";
import { googleCalendarClient } from "./client";
import { type ClientFactory, calendarTransaction } from "./sync";

export async function calendarSettings(db: ReservationDatabase) {
  let configured = true; try { calendarConfig(); } catch { configured = false; }
  const [row] = await db.select({ email: connection.email, calendarId: connection.calendarId, enabled: connection.enabled, lastRunAt: connection.lastRunAt, lastSuccessAt: connection.lastSuccessAt, lastError: connection.lastError, recoveryAvailable: sql<boolean>`(${connection.lastError} = 'calendar_missing')`, connected: sql<boolean>`(${connection.refreshToken} <> '')` }).from(connection).where(eq(connection.key, "default"));
  const totals = await db.select({ status: sync.status, count: count() }).from(sync).where(or(isNotNull(sync.approvedKind), eq(sync.remotePresent, true), eq(sync.status, "error"))).groupBy(sync.status);
  const attention = await db.select({ number: reservation.reservationCode, status: sync.status, code: sync.lastError, syncedAt: sync.syncedAt }).from(sync).innerJoin(reservation, eq(sync.reservationId, reservation.id)).where(or(eq(sync.status, "error"), eq(sync.lastError, "approval_unknown"))).orderBy(asc(reservation.usageDate)).limit(20);
  return { supported: true, configured, connection: row ? { ...row, lastError: row.lastError ? calendarMessages[row.lastError] ?? "連携設定を確認してください。" : null } : null, counts: Object.fromEntries(totals.map(t => [t.status, t.count])), errors: attention.map(r => ({ ...r, message: r.code === "approval_unknown" ? "承認履歴が確認できないため連携対象外です。" : calendarMessages[r.code ?? ""] ?? "連携処理を確認してください。" })) };
}
export async function changeCalendarSettings(db: ReservationDatabase, action: "pause" | "resume" | "retry" | "disconnect") {
  return calendarTransaction(db, async tx => {
    const [row] = await tx.select().from(connection).where(eq(connection.key, "default"));
    if (!row) throw new CalendarError("reconnect_required", 409);
    if (action === "disconnect") { await tx.update(connection).set({ enabled: false, refreshToken: "", lastError: null }).where(eq(connection.key, "default")); return; }
    if (action === "pause") { await tx.update(connection).set({ enabled: false }).where(eq(connection.key, "default")); return; }
    if (!row.refreshToken || !row.calendarId || row.lastError === "reconnect_required") throw new CalendarError("reconnect_required", 409);
    if (row.lastError === "calendar_missing") throw new CalendarError("calendar_missing", 409);
    if (action === "resume") await tx.update(connection).set({ enabled: true, lastError: null }).where(eq(connection.key, "default"));
    await tx.update(sync).set({ status: "pending", nextAttemptAt: new Date().toISOString(), attempts: 0, lastError: null }).where(eq(sync.status, "error"));
  });
}
export async function createOrRecoverCalendar(db: ReservationDatabase, calendarId?: string, factory: ClientFactory = googleCalendarClient, replaceCalendarId?: string) {
  // Commit an uncertainty marker BEFORE calling the non-idempotent calendars.insert API.
  const row = await calendarTransaction(db, async tx => {
    const [r] = await tx.select().from(connection).where(eq(connection.key, "default"));
    if (!r?.refreshToken) throw new CalendarError("reconnect_required", 409);
    if (r.calendarId) {
      if (replaceCalendarId !== r.calendarId || r.lastError !== "calendar_missing") throw new CalendarError("calendar_creation_unknown", 409);
      // Verify that the old calendar really is unavailable before disconnecting it.
      const oldClient = await factory(decrypt(r.refreshToken));
      try { await oldClient.verifyCalendar(r.calendarId); throw new CalendarError("calendar_still_available", 409); }
      catch (error) { if (!(error instanceof CalendarError) || error.code !== "calendar_missing") throw error; }
    } else if (replaceCalendarId) throw new CalendarError("busy", 409);
    if (!calendarId && r.lastError === "calendar_creation_unknown") throw new CalendarError("calendar_creation_unknown", 409);
    await tx.update(connection).set({ calendarId: null, enabled: false, lastError: "calendar_creation_unknown" }).where(eq(connection.key, "default")); return r;
  });
  await calendarTransaction(db, async tx => {
    // Reconnection/disconnection may have happened while Google was processing the request.
    const [current] = await tx.select().from(connection).where(eq(connection.key, "default"));
    if (!current?.refreshToken || current.googleSub !== row.googleSub || current.calendarId) throw new CalendarError("busy", 409);
    const client = await factory(decrypt(row.refreshToken));
    const id = calendarId ? (await client.verifyCalendar(calendarId), calendarId) : await client.createCalendar();
    await tx.update(connection).set({ calendarId: id, enabled: true, lastError: null }).where(eq(connection.key, "default"));
    await tx.update(sync).set({ status: "pending", remotePresent: false, attempts: 0, lastError: null, nextAttemptAt: new Date().toISOString() });
  });
}
