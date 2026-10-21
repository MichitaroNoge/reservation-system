import assert from "node:assert/strict";
import { test } from "node:test";
import { createCalendarFixture } from "./calendar-fixture";
import { POST as approve } from "../../app/api/reservations/change-requests/[id]/approve/route";

const base = { name: "検証", email: "owner@example.test", phone: "09012345678", date: "2099-11-15", startTime: "12:00", people: 60, menuItems: ["検証メニュー"] };
const request = (body: object = {}, token = "calendar-test-member") => new Request("http://localhost:3000/api/reservations/change-requests", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const input = (id: string, date = base.date, people = 30) => ({ reservationId: id, requestedDate: date, requestedStartTime: base.startTime, requestedPeople: people, requestedMenuItems: base.menuItems });

test("change approvals reject newly blocked dates, menu extensions and overnight overlaps without partial writes", async () => {
 const fixture = await createCalendarFixture();
 try {
  const repo = fixture.repo;
  const booking = await repo.createReservation({ ...base, status: "confirmed" });
  await repo.assignStores(booking.id, [{ store: "検証店舗", people: 60 }]);
  const change = await repo.createReservationChangeRequest({ ...input(booking.id, "2099-11-16", 60), email: base.email });
  const blockedPeriods = [{ start: "2099-11-16T12:00", end: "2099-11-16T13:00", reason: "受入不可" }];
  await repo.saveSystemSettings({ acceptanceCapacity: 100, reservationLeadDays: 3, blockedPeriods });
  const rejected = await approve(request({}, "calendar-test-admin"), context(change.id));
  assert.equal(rejected.status, 400); assert.match((await rejected.json()).error, /受入不可/);
  const untouched = (await repo.listReservations()).find(r => r.id === booking.id)!;
  assert.equal(untouched.date, base.date); assert.equal(untouched.storeAssignments?.[0].people, 60);
  assert.equal((await repo.listReservationChangeRequests())[0].status, "requested");
  assert.equal((await repo.listApprovalEmailDeliveries()).length, 0);
  await repo.saveSystemSettings({ acceptanceCapacity: 100, reservationLeadDays: 3, blockedPeriods: [{ start: "2099-11-16T13:00", end: "2099-11-16T14:00", reason: "" }] });
  assert.equal((await approve(request({}, "calendar-test-admin"), context(change.id))).status, 200); // Touching boundary only.

  await repo.createMenu({ name: "長時間メニュー", description: "", price: 1000, duration: "120分", displayOrder: 2 });
  const longer = await repo.createReservation({ ...base, status: "confirmed" });
  const extended = await repo.createReservationChangeRequest({ ...input(longer.id, "2099-11-16", 60), email: base.email, requestedMenuItems: ["長時間メニュー"] });
  assert.equal((await approve(request({}, "calendar-test-admin"), context(extended.id))).status, 400);
  assert.deepEqual((await repo.listReservations()).find(r => r.id === longer.id)?.menuItems, base.menuItems);

  const overnight = await repo.createReservation({ ...base, status: "confirmed" });
  const late = await repo.createReservationChangeRequest({ ...input(overnight.id, "2099-11-16", 60), email: base.email, requestedStartTime: "23:45" });
  await repo.saveSystemSettings({ acceptanceCapacity: 100, reservationLeadDays: 3, blockedPeriods: [{ start: "2099-11-17T00:00", end: "2099-11-17T00:15", reason: "" }] });
  assert.equal((await approve(request({}, "calendar-test-admin"), context(late.id))).status, 400);
  // Rejection and later approval remain possible after the block is removed.
  await repo.saveSystemSettings({ acceptanceCapacity: 100, reservationLeadDays: 3, blockedPeriods: [] });
  assert.equal((await approve(request({}, "calendar-test-admin"), context(late.id))).status, 200);
 } finally { await fixture.close(); }
});
