import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesPendingReservationChange } from "../lib/reservation-change";
import type { ReservationChangeRequest } from "../lib/domain";
const pending: ReservationChangeRequest = { id: "change-1", reservationId: "RSV-1001", customer: "検証", phone: "09012345678", currentDate: "2099-11-15", currentStartTime: "12:00", currentPeople: 60, currentMenuItems: ["昼食"], requestedDate: "2099-11-16", requestedStartTime: "13:00", requestedPeople: 30, requestedMenuItems: ["昼食", "飲料"], reason: "人数変更", status: "requested", requestedAt: "2026-10-20T00:00:00Z" };
const input = { reservationId: pending.reservationId, requestedDate: pending.requestedDate, requestedStartTime: pending.requestedStartTime, requestedPeople: pending.requestedPeople, requestedMenuItems: pending.requestedMenuItems, reason: pending.reason };
test("cutoff exemption matches only the exact pending change, including menus, reason and booking ownership", () => {
 assert.equal(matchesPendingReservationChange(pending, input), true);
 assert.equal(matchesPendingReservationChange(pending, { ...input, reservationId: " rsv-1001 ", requestedMenuItems: ["飲料", "昼食"], reason: " 人数変更 " }), true);
 for (const delta of [{ reservationId: "RSV-1002" }, { requestedDate: "2099-11-17" }, { requestedStartTime: "14:00" }, { requestedPeople: 29 }, { requestedMenuItems: ["昼食"] }, { reason: "別の変更" }]) assert.equal(matchesPendingReservationChange(pending, { ...input, ...delta }), false);
 assert.equal(matchesPendingReservationChange({ ...pending, status: "approved" }, input), false);
 assert.equal(matchesPendingReservationChange({ ...pending, status: "rejected" }, input), false);
});
