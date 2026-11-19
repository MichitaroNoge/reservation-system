import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { sql } from "drizzle-orm";
import { createCalendarFixture } from "./calendar-fixture";
import { getDatabase } from "../../lib/db/client";
import { DrizzleReservationRepository } from "../../lib/repositories/drizzle-reservation-repository";
import { findReservation } from "../../lib/repositories/reservation-lookup";
import { saveReservationDetails } from "../../lib/services/reservation-update-service";
import { isConfirmationEmailDue } from "../../lib/services/confirmation-email-service";
import { reservationAvailability } from "../../lib/reservation-availability";
import { reservationNotificationProblems } from "../../lib/services/reservation-notification-recovery";

const booking = { name: "性能検証", email: "performance@example.test", phone: "09000000000", date: "2099-12-15", startTime: "12:00", people: 5, status: "confirmed" as const, menuItems: ["検証メニュー"] };

test("single reservation edits and keyed delivery reads do not load the complete reservation/history tables", async () => {
  const fixture = await createCalendarFixture();
  const reservation = await fixture.repo.createReservation(booking);
  await fixture.repo.createApprovalEmailDelivery({ deliveryKey: "performance-key", reservationId: reservation.id, type: "reservation_approved", requestedAt: "2026-11-01T00:00:00Z" });
  const scan = mock.method(DrizzleReservationRepository.prototype, "listReservations", async () => { throw new Error("Full table read is forbidden for a single record"); });
  const history = mock.method(DrizzleReservationRepository.prototype, "listApprovalEmailDeliveries", async () => { throw new Error("Full delivery read is forbidden for a single key"); });
  try {
    const saved = await saveReservationDetails(fixture.repo, reservation.id, { remarks: "更新" }, reservation.revision);
    assert.equal(saved.remarks, "更新");
    assert.equal(saved.revision, (reservation.revision ?? 0) + 1);
    await assert.rejects(saveReservationDetails(fixture.repo, reservation.id, { remarks: "競合" }, reservation.revision), (error: unknown) => (error as { statusCode?: number }).statusCode === 409);
    assert.equal((await findReservation(fixture.repo, reservation.id))?.remarks, "更新");
    assert.equal(await findReservation(fixture.repo, "RSV-missing"), null);
    assert.equal((await fixture.repo.getApprovalEmailDelivery("performance-key"))?.reservationId, reservation.id);
    assert.equal((await fixture.repo.createApprovalEmailDelivery({ deliveryKey: "performance-key", reservationId: reservation.id, type: "reservation_approved", requestedAt: "2026-11-01T00:00:00Z" })).reservationId, reservation.id);
    assert.equal(await fixture.repo.getApprovalEmailDelivery("missing-key"), null);
    await fixture.repo.updateApprovalEmailDelivery("performance-key", { sentAt: "2026-11-01T00:00:00Z", lastAttemptAt: "2026-11-01T00:00:00Z", retryCount: 0, lastError: null });
    assert.deepEqual(await reservationNotificationProblems(fixture.repo), { total: 0, notifications: [] });
  } finally { scan.mock.restore(); history.mock.restore(); await fixture.close(); }
});

test("availability candidates preserve full-scan results for overnight, unknown, closed and multi-day reservations", async () => {
  const fixture = await createCalendarFixture();
  try {
    await fixture.repo.createMenu({ name: "長時間", description: "", price: 1000, duration: "4320分", displayOrder: 2 });
    const menus = await fixture.repo.listMenus();
    for (let offset = -6; offset <= 3; offset++) {
      const date = new Date(Date.parse("2099-12-15T00:00:00Z") + offset * 86400000).toISOString().slice(0, 10);
      for (const status of ["confirmed", "temporary_requested", "cancellation_requested", "visited", "cancelled"] as const) {
        await fixture.repo.createReservation({ ...booking, date, startTime: "23:00", endTime: offset % 2 ? "01:00" : "23:00", menuItems: ["長時間"], status });
      }
    }
    const target = await fixture.repo.createReservation({ ...booking, startTime: "00:15", endTime: "01:30" });
    const db = await getDatabase();
    await db.execute(sql`update reservation set usage_time='',usage_end_time=null where reservation_code='RSV-1021'`);
    const all = await fixture.repo.listReservations();
    const candidates = await fixture.repo.listAvailabilityReservations(target, menus);
    assert.ok(candidates.length < all.length);
    assert.deepEqual(reservationAvailability(target, candidates, 100, menus), reservationAvailability(target, all, 100, menus));
  } finally { await fixture.close(); }
});

test("notification candidate queries preserve retry boundaries, status rules and Japan date scheduling", async () => {
  const fixture = await createCalendarFixture();
  try {
    const time = new Date("2099-12-15T15:00:00Z"); // midnight on the 16th in Japan
    for (const status of ["confirmed", "waiting_for_visit", "temporary_confirmed", "visited", "cancelled"] as const) {
      for (const date of ["2099-12-15", "2099-12-16", "2099-12-22", "2099-12-23", "2100-01-01"]) {
        await fixture.repo.createReservation({ ...booking, date, status });
      }
    }
    const all = await fixture.repo.listReservations();
    await fixture.repo.updateConfirmationContact(all[0].id, time.toISOString());
    const original = await fixture.repo.listReservations();
    for (const days of [0, 6, 6.5, -1]) {
      const candidates = await fixture.repo.confirmationEmailCandidates(time, days);
      assert.equal(candidates.checked, original.length);
      assert.deepEqual(candidates.reservations.filter(r => isConfirmationEmailDue(r, time, days)).map(r => r.id).sort(), original.filter(r => isConfirmationEmailDue(r, time, days)).map(r => r.id).sort());
    }
    for (let i = 0; i < 6; i++) await fixture.repo.createApprovalEmailDelivery({ deliveryKey: `boundary-${i}`, reservationId: all[i].id, type: "reservation_approved", requestedAt: time.toISOString() });
    const db = await getDatabase();
    await db.execute(sql`update approval_email_delivery set sent_at=${time.toISOString()} where delivery_key='boundary-0'`);
    await db.execute(sql`update approval_email_delivery set stopped_at=${time.toISOString()} where delivery_key='boundary-1'`);
    await db.execute(sql`update approval_email_delivery set retry_count=5 where delivery_key='boundary-2'`);
    await db.execute(sql`update approval_email_delivery set next_attempt_at=${new Date(time.getTime() + 1).toISOString()} where delivery_key='boundary-3'`);
    await db.execute(sql`update approval_email_delivery set next_attempt_at=${time.toISOString()} where delivery_key='boundary-4'`);
    const pending = await fixture.repo.pendingApprovalEmailDeliveries(time, 5);
    assert.deepEqual(pending.map(item => item.deliveryKey).sort(), ["boundary-4", "boundary-5"]);
  } finally { await fixture.close(); }
});
