import assert from "node:assert/strict";
import { test } from "node:test";
import { customerBookingScheduleSchema } from "../lib/customer-booking-schedule";

const schema = customerBookingScheduleSchema("2026-11-06");
const valid = { date: "2026-11-06", startTime: "00:00", people: 1 };

test("booking schedule accepts the first available day, midnight and party size boundaries", () => {
  assert.equal(schema.safeParse(valid).success, true);
  assert.equal(schema.safeParse({ ...valid, startTime: "23:59", people: 999 }).success, true);
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
