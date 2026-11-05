import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import { createCalendarFixture } from "./calendar-fixture";
import { getDatabase } from "../../lib/db/client";
import * as schema from "../../lib/db/schema";
import { InquiryRepository } from "../../lib/inquiries/repository";
import * as controller from "../../lib/inquiries/controllers";
import { issueChallenge } from "../../lib/inquiries/http";
import { PAST_MEAL_DATE_MESSAGE } from "../../lib/inquiries/availability";

function request(body?: object, token = "", cookie = "") {
  return new Request("http://localhost/api/inquiries", { method: body ? "POST" : "GET", headers: { origin: "http://localhost", "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

test("member and anonymous APIs reject past dates and 1000 people, preserve accepted retries after midnight and create no rejected mail", async () => {
  const fixture = await createCalendarFixture(), db = await getDatabase(), repo = new InquiryRepository(db);
  const clock = mock.method(Date, "now", () => Date.parse("2026-11-05T14:59:59.900Z"));
  const previousSecret = process.env.INQUIRY_FORM_SECRET;
  process.env.INQUIRY_FORM_SECRET = "test-only-inquiry-form-secret-32-chars";
  try {
    const submissions = [];
    for (const token of ["calendar-test-member", ""]) {
      const issued = issueChallenge(request(), Date.now() - 3000);
      const proof = await issued.json(), cookie = issued.headers.get("set-cookie")!.split(";")[0];
      const input = { name: "境界値の検証", email: `${randomUUID()}@example.test`, category: "availability", body: "入力を保持する検証", mealDate: "2026-11-05", mealStartTime: "00:00", people: 999, ...proof };
      const past = await controller.submit(request({ ...input, mealDate: "2026-11-04" }, token, cookie));
      assert.equal(past.status, 400);
      assert.deepEqual((await past.json()).fields.mealDate, [PAST_MEAL_DATE_MESSAGE]);
      const tooMany = await controller.submit(request({ ...input, people: 1000 }, token, cookie));
      assert.equal(tooMany.status, 400);
      assert.deepEqual((await tooMany.json()).fields.people, ["人数は999名以内で入力してください。"]);
      const accepted = await controller.submit(request(input, token, cookie));
      assert.equal(accepted.status, 201);
      submissions.push({ input, token, cookie, number: (await accepted.json()).number });
    }
    clock.mock.mockImplementation(() => Date.parse("2026-11-05T15:00:00.100Z"));
    for (const { input, token, cookie, number } of submissions) {
      const replay = await controller.submit(request(input, token, cookie));
      assert.equal(replay.status, 201);
      assert.equal((await replay.json()).number, number);
      const newKey = randomUUID();
      const issued = issueChallenge(request(), Date.now() - 3000, newKey);
      const proof = await issued.json(), newCookie = issued.headers.get("set-cookie")!.split(";")[0];
      const expired = await controller.submit(request({ ...input, ...proof }, token, newCookie));
      assert.equal(expired.status, 400);
      assert.deepEqual((await expired.json()).fields.mealDate, [PAST_MEAL_DATE_MESSAGE]);
      const valid = await controller.submit(request({ ...input, ...proof, email: `${randomUUID()}@example.test`, mealDate: "2026-11-06", people: 1 }, token, newCookie));
      assert.equal(valid.status, 201);
      assert.equal((await repo.detail(number)).inquiry.availability?.mealDate, "2026-11-05");
      const conflict = await controller.submit(request({ ...input, people: 998 }, token, cookie));
      assert.equal(conflict.status, 409);
    }
    assert.equal((await db.select().from(schema.inquiry)).length, 4);
    assert.equal((await db.select().from(schema.emailDelivery)).length, 4);
  } finally {
    clock.mock.restore();
    if (previousSecret === undefined) delete process.env.INQUIRY_FORM_SECRET; else process.env.INQUIRY_FORM_SECRET = previousSecret;
    await fixture.close();
  }
});
