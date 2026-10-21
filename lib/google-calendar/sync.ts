import "server-only";
import { createHash } from "node:crypto";
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import type { ReservationDatabase } from "../repositories/drizzle-reservation-repository";
import { getDatabase } from "../db/client";
import * as s from "../db/schema";
import { calculateReservationEndTime } from "../domain";
import { calendarEvent, type ApprovedKind } from "./policy";
import { CalendarError, decrypt } from "./security";
import { googleCalendarClient, type CalendarClient } from "./client";

export const calendarLock = sql`select pg_try_advisory_xact_lock(hashtextextended('google-calendar:global',0)) as acquired`;
export type ClientFactory = (refreshToken: string) => Promise<CalendarClient>;
const now = () => new Date().toISOString();
function nextEventId(id: string) { const h = createHash("sha256").update(`${id}:next`).digest("hex").slice(0, 32); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; }
export async function calendarTransaction<T>(db: ReservationDatabase, work: (db: ReservationDatabase) => Promise<T>) {
  return db.transaction(async tx => {
    const lock = await tx.execute(calendarLock);
    if (!lock.rows[0]?.acquired) throw new CalendarError("busy", 409);
    return work(tx as unknown as ReservationDatabase);
  });
}
export async function runCalendarSync(db?: ReservationDatabase, factory: ClientFactory = googleCalendarClient, limit = 5) {
  const database = db ?? await getDatabase();
  let processed = 0, failed = 0, cachedToken: string | undefined, cachedClient: CalendarClient | undefined;
  const cachedFactory: ClientFactory = async token => {
    if (!cachedClient || cachedToken !== token) { cachedClient = await factory(token); cachedToken = token; }
    return cachedClient;
  };
  const started = Date.now();
  for (let i = 0; i < Math.min(10, Math.max(1, limit)) && Date.now() - started < 20_000; i++) {
    const result = await syncOne(database, cachedFactory);
    processed += result.processed; failed += result.failed;
    if (!result.processed || result.failed) break;
  }
  return { processed, failed };
}
async function syncOne(database: ReservationDatabase, factory: ClientFactory) {
  return calendarTransaction(database, async tx => {
    const [connection] = await tx.select().from(s.googleCalendarConnection).where(eq(s.googleCalendarConnection.key, "default"));
    if (!connection?.enabled || !connection.refreshToken || !connection.calendarId) return { processed: 0, failed: 0 };
    await tx.update(s.googleCalendarConnection).set({ lastRunAt: now() }).where(eq(s.googleCalendarConnection.key, "default"));
    const jobs = await tx.select().from(s.googleCalendarSync).where(and(inArray(s.googleCalendarSync.status, ["pending", "error"]), lte(s.googleCalendarSync.nextAttemptAt, now()))).orderBy(asc(s.googleCalendarSync.nextAttemptAt), asc(s.googleCalendarSync.reservationId)).limit(1);
    let client: CalendarClient | undefined, processed = 0, failed = 0;
    const started = Date.now();
    for (const job of jobs) {
      if (Date.now() - started > 20_000) break;
      try {
        const [booking] = await tx.select({ number: s.reservation.reservationCode, customer: s.reservation.reserverName, group: s.reservation.groupName, date: s.reservation.usageDate, start: s.reservation.usageTime, end: s.reservation.usageEndTime, people: s.reservation.expectedPeople, status: s.reservation.status }).from(s.reservation).where(eq(s.reservation.id, job.reservationId));
        if (!booking) continue;
        const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
        const active = job.approvedKind !== null && (booking.date >= today || job.remotePresent) && !["CANCELLED", "TEMPORARY_REJECTED", "CONFIRMED_REJECTED", "TEMPORARY_REQUESTED"].includes(booking.status);
        let remotePresent = job.remotePresent, eventId = job.eventId;
        if (active) {
          const menus = await tx.select({ name: s.menu.name, duration: s.menu.durationMinutes }).from(s.reservationDetail).innerJoin(s.menu, eq(s.menu.id, s.reservationDetail.menuId)).where(eq(s.reservationDetail.reservationId, job.reservationId));
          const stores = await tx.select({ name: s.store.name, people: s.storeAssignment.people }).from(s.storeAssignment).innerJoin(s.store, eq(s.store.id, s.storeAssignment.storeId)).where(eq(s.storeAssignment.reservationId, job.reservationId));
          const event = calendarEvent({ number: booking.number, customer: booking.group || booking.customer || "お客様", date: booking.date, start: booking.start, end: booking.end ?? calculateReservationEndTime(booking.start, menus.map(m => m.name), menus.map(m => ({ name: m.name, duration: `${m.duration}分` }))) ?? null, people: booking.people, kind: job.approvedKind as ApprovedKind, cancellationPending: booking.status === "CANCELLATION_REQUESTED", menus: menus.map(m => m.name), stores });
          client ??= await factory(decrypt(connection.refreshToken));
          try { await client.put(connection.calendarId, eventId, event); }
          catch (error) {
            if (!(error instanceof CalendarError) || error.code !== "event_deleted") throw error;
            // Google keeps tombstones for deleted IDs; use a new persisted identity for restoration.
            eventId = nextEventId(eventId);
            await tx.update(s.googleCalendarSync).set({ eventId }).where(eq(s.googleCalendarSync.reservationId, job.reservationId));
            await client.put(connection.calendarId, eventId, event);
          }
          remotePresent = true;
        } else {
          client ??= await factory(decrypt(connection.refreshToken));
          // A successful insert may have lost its response (or its DB commit). Never
          // use remotePresent as proof that no event exists. The deterministic
          // successor also covers a tombstone restoration whose commit was lost.
          await client.remove(connection.calendarId, eventId);
          await client.remove(connection.calendarId, nextEventId(eventId));
          remotePresent = false; eventId = nextEventId(eventId);
        }
        // Persist remote identity even if a concurrent reservation change queued a newer revision.
        await tx.update(s.googleCalendarSync).set({ remotePresent, eventId, syncedAt: now() }).where(eq(s.googleCalendarSync.reservationId, job.reservationId));
        await tx.update(s.googleCalendarSync).set({ status: active ? "synced" : "excluded", lastError: job.lastError === "approval_unknown" ? "approval_unknown" : null, attempts: 0 }).where(and(eq(s.googleCalendarSync.reservationId, job.reservationId), eq(s.googleCalendarSync.revision, job.revision)));
        processed++;
      } catch (error) {
        const code = error instanceof CalendarError ? error.code : error instanceof Error && error.message === "invalid_time" ? "invalid_time" : "provider_error";
        failed++;
        await tx.update(s.googleCalendarSync).set({ status: "error", lastError: code, attempts: job.attempts + 1, nextAttemptAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7)) * 1000).toISOString() }).where(and(eq(s.googleCalendarSync.reservationId, job.reservationId), eq(s.googleCalendarSync.revision, job.revision)));
        if (["reconnect_required", "calendar_missing"].includes(code)) {
          await tx.update(s.googleCalendarConnection).set({ lastError: code, enabled: false }).where(eq(s.googleCalendarConnection.key, "default")); break;
        }
      }
    }
    if (processed && !failed && client) await tx.update(s.googleCalendarConnection).set({ lastSuccessAt: now(), lastError: null }).where(eq(s.googleCalendarConnection.key, "default"));
    return { processed, failed };
  });
}
