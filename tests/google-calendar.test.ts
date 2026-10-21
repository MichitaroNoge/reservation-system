import assert from "node:assert/strict";
import { test } from "node:test";
import { approvedKind, calendarEvent, type CalendarBooking } from "../lib/google-calendar/policy";
const booking: CalendarBooking = { number: "RSV-123", customer: "検証のお客様", date: "2099-11-15", start: "12:00", end: "12:45", people: 30, kind: "confirmed", cancellationPending: false, menus: ["団体ランチ"], stores: [{ name: "新宿店", people: 20 }, { name: "渋谷店", people: 10 }] };
test("Google calendar eligibility excludes initial applications and rejections, retains approved pending changes", () => {
  for (const status of ["temporary_requested", "confirmed_requested", "temporary_rejected", "confirmed_rejected", "cancelled"] as const) assert.equal(approvedKind(status), null);
  assert.equal(approvedKind("temporary_confirmed"), "temporary");
  for (const status of ["confirmed", "waiting_for_visit", "visited"] as const) assert.equal(approvedKind(status), "confirmed");
  assert.equal(approvedKind("confirmed_requested", "confirmed_from_temporary"), "temporary");
  assert.equal(approvedKind("cancellation_requested"), null);
  assert.equal(approvedKind("cancellation_requested", null, "temporary"), "temporary");
  assert.equal(approvedKind("cancellation_requested", null, "confirmed"), "confirmed");
});
test("Google calendar event includes operational fields and Japanese time, omits contact and free-text information", () => {
  const event = calendarEvent({ ...booking, email: "private@example.test", phone: "private-phone", address: "private-address", remarks: "private-remarks" } as CalendarBooking);
  assert.match(event.summary, /【本予約】検証のお客様・30名／RSV-123/);
  assert.match(event.description, /新宿店 20名・渋谷店 10名/);
  assert.equal(event.start.dateTime, "2099-11-15T12:00:00+09:00"); assert.equal(event.end.timeZone, "Asia/Tokyo");
  assert.doesNotMatch(JSON.stringify(event), /private-|@example/); assert.equal(event.visibility, "default"); assert.equal("attendees" in event, false);
  assert.notEqual(calendarEvent({ ...booking, kind: "temporary" }).colorId, event.colorId);
});
test("Google calendar overnight events use next date and cancellation applications stay clearly identified", () => {
  const event = calendarEvent({ ...booking, start: "23:30", end: "00:30", cancellationPending: true });
  assert.equal(event.end.dateTime, "2099-11-16T00:30:00+09:00"); assert.match(event.summary, /キャンセル申請中/);
  assert.throws(() => calendarEvent({ ...booking, start: "25:00" }), /invalid_time/);
});
