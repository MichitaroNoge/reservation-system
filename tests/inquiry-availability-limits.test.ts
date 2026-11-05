import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { availabilityDateError, inquiryAvailabilitySchema, inquiryToday, PAST_MEAL_DATE_MESSAGE } from "../lib/inquiries/availability";
import { ApiRequestError, requestJson } from "../app/reservations/api-client";

test("availability party size accepts 1 and 999, and rejects 1000 and fractional values", () => {
  const details = { mealDate: "2099-11-05", mealStartTime: "12:00", people: 1 };
  for (const people of [1, 999, "999"]) assert.equal(inquiryAvailabilitySchema.safeParse({ ...details, people }).success, true);
  for (const people of [0, -1, 1.5, 1000, "1000"]) assert.equal(inquiryAvailabilitySchema.safeParse({ ...details, people }).success, false);
});

test("availability dates use Japan's day even when the UTC date has not changed", () => {
  const before = Date.parse("2026-11-05T14:59:59.999Z"), after = before + 1;
  assert.equal(inquiryToday(before), "2026-11-05");
  assert.equal(inquiryToday(after), "2026-11-06");
  assert.equal(availabilityDateError("2026-11-05", before), undefined);
  assert.equal(availabilityDateError("2026-11-05", after), PAST_MEAL_DATE_MESSAGE);
  assert.equal(availabilityDateError("2026-11-06", after), undefined);
  assert.equal(availabilityDateError("2026-11-07", after), undefined);
});

test("the same open form's date is checked against the clock again on submission", () => {
  const clock = mock.method(Date, "now", () => Date.parse("2026-11-05T14:59:59.999Z"));
  try {
    assert.equal(availabilityDateError("2026-11-05"), undefined);
    clock.mock.mockImplementation(() => Date.parse("2026-11-05T15:00:00.000Z"));
    assert.equal(availabilityDateError("2026-11-05"), "食事日は本日以降を指定してください。");
  } finally { clock.mock.restore(); }
});

test("invalid dates keep the existing date-format validation rather than a misleading past-day error", () => {
  assert.equal(availabilityDateError(""), undefined);
  assert.equal(availabilityDateError("2026-02-30"), undefined);
  assert.equal(inquiryAvailabilitySchema.shape.mealDate.safeParse("2026-02-30").success, false);
});

test("API field errors reach the form while preserving its HTTP status and message", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => Response.json({ error: "入力内容を確認してください。", fields: { mealDate: [PAST_MEAL_DATE_MESSAGE], people: ["人数は999名以内で入力してください。"], ignored: [42] } }, { status: 400 }));
  try {
    await assert.rejects(requestJson("/api/inquiries"), (error: unknown) => {
      assert.ok(error instanceof ApiRequestError);
      assert.equal(error.status, 400);
      assert.equal(error.message, "入力内容を確認してください。");
      assert.deepEqual(error.fields, { mealDate: [PAST_MEAL_DATE_MESSAGE], people: ["人数は999名以内で入力してください。"] });
      return true;
    });
  } finally { fetch.mock.restore(); }
});
