import assert from "node:assert/strict";
import { test } from "node:test";
import { AnonymousInquiryFormSession } from "../components/inquiries/anonymous-form-session";

test("long-running anonymous forms renew proof without changing their submission identity", async () => {
  let now = 1000, issued = 0; const keys: string[] = [], waits: number[] = [];
  const session = new AnonymousInquiryFormSession("stable-submission", async key => { keys.push(key); return { requestKey: key, formToken: "proof-" + ++issued }; }, { now: () => now, wait: async delay => { waits.push(delay); now += delay; } });
  await Promise.all([session.prepare(), session.prepare()]); assert.equal(issued, 1);
  assert.equal(await session.token(), "proof-1"); assert.deepEqual(waits, [2100]);
  now += 31 * 60000;
  assert.equal(await session.token(), "proof-2"); assert.equal(session.requestKey, "stable-submission"); assert.deepEqual(keys, ["stable-submission", "stable-submission"]);
  assert.equal(await session.token(), "proof-2"); assert.equal(issued, 2);
});

test("preparation failures allow safe retry with the original key and retain the minimum proof age", async () => {
  let now = 1000, attempts = 0;
  const session = new AnonymousInquiryFormSession("same-request", async key => { if (++attempts === 1) throw Error("temporary network failure"); return { requestKey: key, formToken: "renewed" }; }, { now: () => now, wait: async delay => { assert.ok(delay >= 2000); now += delay; } });
  await assert.rejects(session.prepare(), /network/);
  assert.equal(await session.token(), "renewed"); assert.equal(session.requestKey, "same-request");
  await session.prepare(true); assert.equal(await session.token(), "renewed"); assert.equal(attempts, 3);
});

test("an unrelated challenge can never silently replace a submission key", async () => {
  const session = new AnonymousInquiryFormSession("original", async () => ({ requestKey: "different", formToken: "proof" }));
  await assert.rejects(session.token(), /送信識別子/); assert.equal(session.requestKey, "original");
});
