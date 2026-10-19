import assert from "node:assert/strict";
import { test } from "node:test";
import { createCalendarFixture } from "./calendar-fixture";
import { calendarDay, calendarCapacityWarning } from "../../lib/reservation-calendar";

test("calendar API to SQL approval flow refreshes counts, enforces admin, and honours blackout changes", async () => {
  const fixture = await createCalendarFixture();
  try {
    const { GET: list } = await import("../../app/api/reservations/route");
    const { GET: availability } = await import("../../app/api/reservations/[id]/availability/route");
    const { PATCH: decide } = await import("../../app/api/reservations/[id]/status/route");
    const request = (path: string, status?: string, token = "calendar-test-admin") => new Request(`http://localhost${path}`, {
      method: status ? "PATCH" : "GET", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      ...(status ? { body: JSON.stringify({ status }) } : {}),
    });
    assert.equal((await list(new Request("http://localhost/api/reservations"))).status, 401);
    assert.equal((await list(request("/api/reservations", undefined, "calendar-test-member"))).status, 403);
    const date = "2030-11-15";
    const base = { name: "既存予約", email: "test@example.test", phone: "09000000000", date, startTime: "12:00", people: 60, menuItems: ["検証メニュー"], status: "confirmed" as const };
    await fixture.repo.createReservation(base);
    const pending = await fixture.repo.createReservation({ ...base, name: "承認対象", people: 30, tcCount: 2, status: "confirmed_requested", remarks: "申請内容を確認" });
    const readDay = async () => {
      const response = await list(request("/api/reservations"));
      assert.equal(response.status, 200);
      return calendarDay(date, (await response.json()).reservations, await fixture.repo.listMenus(), await fixture.repo.getSystemSettings());
    };
    assert.equal((await readDay()).peak, 60);
    const context = { params: Promise.resolve({ id: pending.id }) };
    const detail = await availability(request(`/api/reservations/${pending.id}/availability`), context);
    assert.equal(detail.status, 200);
    const body = await detail.json();
    assert.equal(body.reservation.remarks, "申請内容を確認");
    assert.equal(body.availability.current, 30); // TC is already included.
    assert.equal((await decide(request(`/api/reservations/${pending.id}/status`, "confirmed"), context)).status, 200);
    assert.equal((await readDay()).peak, 90);
    await fixture.repo.createReservation({ ...base, people: 20, status: "temporary_confirmed" }); // Another operator's update.
    assert.equal(calendarCapacityWarning(await readDay()), "仮予約込みで上限超過");
    const blocked = await fixture.repo.createReservation({ ...base, name: "受入不可の申請", status: "confirmed_requested" });
    await fixture.repo.saveSystemSettings({ acceptanceCapacity: 100, blockedPeriods: [{ start: `${date}T12:00`, end: `${date}T13:00`, reason: "点検" }] });
    const blockedContext = { params: Promise.resolve({ id: blocked.id }) };
    assert.equal((await decide(request(`/api/reservations/${blocked.id}/status`, "confirmed"), blockedContext)).status, 400);
    assert.equal((await decide(request(`/api/reservations/${blocked.id}/status`, "confirmed_rejected"), blockedContext)).status, 200);
    const final = await readDay();
    assert.equal(final.entries.some(entry => entry.reservation.id === blocked.id), false);
    assert.equal(final.blocks[0].reason, "点検");
  } finally { await fixture.close(); }
});
