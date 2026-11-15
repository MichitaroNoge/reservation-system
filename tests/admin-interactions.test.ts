import assert from "node:assert/strict";
import test from "node:test";
import { AdminActionGate, retryableAdminBatch } from "../lib/admin-interactions";
import { adminBookingEditFormSchema, adminBookingFormSchema } from "../lib/admin-booking-form";

test("confirmed operations cannot execute twice while the first request is pending", async () => {
  const gate = new AdminActionGate();
  let finish!: () => void;
  let updates = 0;
  const first = gate.run(async () => { updates++; await new Promise<void>(resolve => { finish = resolve; }); });
  assert.equal(gate.busy, true);
  assert.equal(await gate.run(() => { updates++; }), false);
  assert.equal(updates, 1);
  finish(); assert.equal(await first, true); assert.equal(gate.busy, false);
});

test("failed or explicitly incomplete operations remain retryable and are never treated as success", async () => {
  const gate = new AdminActionGate();
  await assert.rejects(gate.run(() => { throw new Error("保存失敗"); }), /保存失敗/);
  assert.equal(gate.busy, false);
  await assert.rejects(gate.run(() => false), /完了しませんでした/);
  assert.equal(await gate.run(async () => true), true);
});

test("batch retries send only failed targets, including repeated partial failures", async () => {
  const calls: string[] = []; let failures = 2;
  const batch = retryableAdminBatch(["A", "B", "C"], async item => { calls.push(item); if (item === "B" && failures-- > 0) throw new Error("通信失敗"); });
  assert.deepEqual(await batch.run(), { completed: 2, failed: 1 });
  assert.deepEqual(await batch.run(), { completed: 2, failed: 1 });
  assert.deepEqual(await batch.run(), { completed: 3, failed: 0 });
  assert.deepEqual(await batch.run(), { completed: 3, failed: 0 });
  assert.deepEqual(calls, ["A", "B", "C", "B", "B"]);
});

const booking = { name: "検証 太郎", phone: "000-0000-0000", email: "review@example.invalid", address: "", date: "2026-01-01", startTime: "12:00", people: 15, menuItems: [] };
test("admin reservation form allows historical dates and retains optional reservation metadata", () => {
  const value = { ...booking, status: "confirmed", remarks: "保存内容", paymentCondition: "on_site", groupNameKana: "ケンショウ" };
  assert.deepEqual(adminBookingFormSchema.parse(value), value);
});
test("editing a historical group booking preserves incomplete optional group information", () => {
  assert.equal(adminBookingEditFormSchema.safeParse({ ...booking, bookingType: "travel_agency_group", groupName: "旧予約" }).success, true);
  assert.equal(adminBookingFormSchema.safeParse({ ...booking, bookingType: "travel_agency_group", groupName: "旧予約" }).success, false);
});
test("admin reservation form reports invalid inputs at their respective fields", () => {
  const result = adminBookingFormSchema.safeParse({ ...booking, name: " ", email: "invalid", date: "2026-02-30", startTime: "25:00", people: 1.5 });
  assert.equal(result.success, false);
  if (!result.success) for (const key of ["name", "email", "date", "startTime", "people"]) assert.ok(result.error.issues.some(issue => issue.path[0] === key), key);
  for (const people of [0, 1000, NaN]) assert.equal(adminBookingFormSchema.safeParse({ ...booking, people }).success, false);
  for (const people of [1, 999]) assert.equal(adminBookingFormSchema.safeParse({ ...booking, people }).success, true);
});
test("group booking requires contact and group fields without changing the reservation's people count", () => {
  const result = adminBookingFormSchema.safeParse({ ...booking, bookingType: "travel_agency_group" });
  assert.equal(result.success, false);
  if (!result.success) for (const key of ["bookingContactName", "dayContactName", "dayContactPhone", "groupName", "groupType"]) assert.ok(result.error.issues.some(issue => issue.path[0] === key), key);
  const value = adminBookingFormSchema.parse({ ...booking, bookingType: "travel_agency_group", bookingContactName: "担当", dayContactName: "責任者", dayContactPhone: "000-0000-0000", groupName: "検証団体", groupType: "その他", tcCount: 2, dgCount: 1 });
  assert.equal(value.people, 15); assert.equal(value.tcCount, 2);
});
