import assert from "node:assert/strict";
import { test } from "node:test";
import { adminBookingEditFormSchema, adminBookingFormSchema } from "../lib/admin-booking-form";

test("admin registration and historical edits retain minute precision independently of customer applications", () => {
  const booking = { name: "検証", email: "fixture@example.test", phone: "09000000000", address: "", date: "2020-01-01", people: 1, menuItems: [], startTime: "19:07" };
  assert.equal(adminBookingFormSchema.safeParse(booking).success, true);
  assert.equal(adminBookingEditFormSchema.safeParse(booking).success, true);
  assert.equal(adminBookingFormSchema.safeParse({ ...booking, startTime: "24:07" }).success, false);
});
