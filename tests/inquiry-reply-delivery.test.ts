import assert from "node:assert/strict";
import { test } from "node:test";
import { isReplyDeliveryComplete, repliesForDeliveryResult } from "../lib/inquiries/reply-delivery-presentation";
import type { InquiryMailStatus, InquiryReply } from "../lib/inquiries/types";

const reply = (id: string, emailStatus: InquiryMailStatus, createdAt: string): InquiryReply => ({
  id, emailStatus, createdAt, subject: "保存した回答", body: "回答内容", sentAt: null,
});

test("additional replies remain blocked until every delivery is sent or explicitly closed", () => {
  for (const status of ["pending", "sending", "failed", "unknown"] as const) {
    assert.equal(isReplyDeliveryComplete(status), false, status);
    const unresolved = reply("unresolved", status, "2026-11-09T01:00:00Z");
    const newer = reply("newer", "sent", "2026-11-09T02:00:00Z");
    assert.deepEqual(repliesForDeliveryResult([newer, unresolved]), [unresolved]);
  }
  assert.equal(isReplyDeliveryComplete("sent"), true);
  assert.equal(isReplyDeliveryComplete("not_sent"), true);
});

test("legacy threads show all unresolved replies in chronological order without mutating the API result", () => {
  const first = reply("first", "unknown", "2026-11-09T01:00:00Z");
  const second = reply("second", "failed", "2026-11-09T02:00:00Z");
  const done = reply("done", "not_sent", "2026-11-09T03:00:00Z");
  const input = [done, second, first];
  assert.deepEqual(repliesForDeliveryResult(input), [first, second]);
  assert.deepEqual(input, [done, second, first]);
});

test("resolved threads show only their latest saved answer, including an explicitly closed email", () => {
  const first = reply("first", "sent", "2026-11-09T01:00:00Z");
  const latest = reply("latest", "not_sent", "2026-11-09T02:00:00Z");
  assert.deepEqual(repliesForDeliveryResult([latest, first]), [latest]);
  assert.deepEqual(repliesForDeliveryResult([]), []);
});
