import assert from "node:assert/strict";
import { test } from "node:test";
import { customerBookingScheduleSchema, customerBookingStartTimes, customerBookingTimeSchema } from "../lib/customer-booking-schedule";
import { apiErrorResponse } from "../lib/api-validation";

const schema = customerBookingScheduleSchema("2026-11-06");
const valid = { date: "2026-11-06", startTime: "00:00", people: 1 };

test("booking schedule accepts the first available day, midnight and party size boundaries", () => {
  assert.equal(schema.safeParse(valid).success, true);
  assert.equal(schema.safeParse({ ...valid, startTime: "23:45", people: 999 }).success, true);
});

test("booking schedule accepts only quarter-hour times throughout the day", () => {
  const accepted: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute++) {
      const startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const result = schema.safeParse({ ...valid, startTime });
      assert.equal(result.success, minute % 15 === 0, startTime);
      if (result.success) accepted.push(startTime);
      else {
        assert.equal(result.error.issues[0].path[0], "startTime");
        assert.match(result.error.issues[0].message, /15分単位/);
      }
    }
  }
  assert.equal(accepted.length, 96);
  assert.deepEqual(customerBookingStartTimes, accepted);
});

test("reservation application time validation returns a field-level 400 error", async () => {
  const result = customerBookingTimeSchema.partial().safeParse({ startTime: "19:01" });
  assert.equal(result.success, false);
  if (result.success) return;
  const response = apiErrorResponse(result.error);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.fields.startTime[0], /15分単位/);
  // Preserve the existing API default and ignore automatically calculated end times.
  assert.equal(customerBookingTimeSchema.partial().safeParse({}).success, true);
  assert.equal(customerBookingTimeSchema.partial().safeParse({ startTime: "19:15", endTime: "20:55" }).success, true);
});

test("booking schedule identifies missing, invalid and too-early dates at the date field", () => {
  for (const date of ["", "2026-02-30", "2026-11-05"]) {
    const result = schema.safeParse({ ...valid, date });
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.error.issues[0].path[0], "date");
  }
});

test("booking schedule rejects non-integer and out-of-range party sizes before advancing", () => {
  for (const people of [0, -1, 1.5, 1000, NaN, Infinity]) {
    const result = schema.safeParse({ ...valid, people });
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.error.issues[0].path[0], "people");
  }
});

test("booking schedule rejects incomplete and invalid times at the time field", () => {
  for (const startTime of ["", "24:00", "12:60", "9:00"]) {
    const result = schema.safeParse({ ...valid, startTime });
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.error.issues[0].path[0], "startTime");
  }
});
