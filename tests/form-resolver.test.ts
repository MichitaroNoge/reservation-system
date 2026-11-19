import assert from "node:assert/strict";
import { test } from "node:test";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerBookingScheduleSchema } from "../lib/customer-booking-schedule";
import { inquiryFormSchema } from "../lib/inquiries/types";
import { loginMethodPasswordSchema } from "../lib/login-method-settings";

const options = { fields: {}, shouldUseNativeValidation: false, criteriaMode: "all" as const };

test("booking resolver returns Japanese field errors for invalid numbers and non-quarter-hour times", async () => {
  const resolve = zodResolver(customerBookingScheduleSchema("2099-11-15"));
  const invalid = await resolve({ date: "2099-11-14", startTime: "19:07", people: NaN }, undefined, options);
  assert.deepEqual(invalid.values, {});
  assert.match(invalid.errors.date?.message ?? "", /2099-11-15/);
  assert.match(invalid.errors.startTime?.message ?? "", /15分単位/);
  assert.match(invalid.errors.people?.message ?? "", /人数は1〜999名の整数/);
  const valid = { date: "2099-11-15", startTime: "19:15", people: 10 };
  assert.deepEqual((await resolve(valid, undefined, options)).values, valid);
});

test("inquiry resolver maps nested refinement errors, accepts numeric strings and normalizes email", async () => {
  const resolve = zodResolver(inquiryFormSchema);
  const values = { name: "本人", email: "Customer@Example.test", category: "availability" as const, mealDate: "2099-11-15", mealStartTime: "12:00", people: "24" };
  const result = await resolve(values, undefined, options);
  assert.deepEqual(result.errors, {});
  assert.equal(result.values.email, "customer@example.test");
  const invalid = await resolve({ ...values, mealStartTime: "", people: "abc" }, undefined, options);
  assert.match(invalid.errors.mealStartTime?.message ?? "", /食事開始時間/);
  assert.match(invalid.errors.people?.message ?? "", /人数/);
});

test("password resolver applies omitted defaults and preserves current-password and confirmation errors", async () => {
  const values = { password: "password123", confirmPassword: "password123" };
  const added = await zodResolver(loginMethodPasswordSchema(false))(values, undefined, options);
  assert.deepEqual(added.values, { currentPassword: "", ...values });
  const invalid = await zodResolver(loginMethodPasswordSchema(true))({ ...values, confirmPassword: "different" }, undefined, options);
  assert.match(invalid.errors.currentPassword?.message ?? "", /現在のパスワード/);
  assert.match(invalid.errors.confirmPassword?.message ?? "", /一致しません/);
});
