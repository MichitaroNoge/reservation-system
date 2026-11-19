import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createCalendarFixture } from "./calendar-fixture";
import { GET as customerReservations } from "../../app/api/accounts/me/reservations/route";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../lib/db/client";
import * as s from "../../lib/db/schema";
import { InquiryRepository } from "../../lib/inquiries/repository";
import { deliverInquiryMail } from "../../lib/inquiries/mail-service";
import { dispatchQueuedMail, mailJobKey } from "../../lib/mail-dispatch";
import { RateLimitError } from "../../lib/abuse-limits";
import { POST as approveChange } from "../../app/api/reservations/change-requests/[id]/approve/route";
import { POST as rejectChange } from "../../app/api/reservations/change-requests/[id]/reject/route";
import { POST as submitChange } from "../../app/api/reservations/change-requests/route";
import { DrizzleReservationRepository } from "../../lib/repositories/drizzle-reservation-repository";

test("customer change history keeps distinct menu names containing separators", async () => {
  const fixture = await createCalendarFixture();
  try {
    await fixture.repo.createAccount({ firebaseUid: "calendar-test-user", name: "変更履歴の確認", contact: "quality@example.test", phone: "09000000000" });
    for (const name of ["セット,単品", "単品", "セット"]) {
      await fixture.repo.createMenu({ name, description: "", price: 1000, duration: "60分", displayOrder: 1 });
    }
    const booking = await fixture.repo.createReservation({ name: "変更履歴の確認", email: "quality@example.test", phone: "09000000000", accountFirebaseUid: "calendar-test-user", date: "2099-12-15", startTime: "12:00", people: 5, status: "temporary_confirmed", menuItems: ["検証メニュー"] });
    const input = { reservationId: booking.id, email: booking.email, requestedDate: booking.date, requestedStartTime: "13:00", requestedPeople: 5 };
    const single = await fixture.repo.createReservationChangeRequest({ ...input, requestedMenuItems: ["セット,単品"] });
    const multiple = await fixture.repo.createReservationChangeRequest({ ...input, requestedMenuItems: ["単品", "セット"] });
    assert.notEqual(single.id, multiple.id);
    const response = await customerReservations(new Request("http://localhost/api/accounts/me/reservations", { headers: { authorization: "Bearer calendar-test-member" } }));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.reservations.length, 1);
    assert.deepEqual(result.changeRequests.map((item: { id: string }) => item.id).sort(), [single.id, multiple.id].sort());
  } finally { await fixture.close(); }
});

test("a send-limit deferral preserves an earlier ambiguous inquiry attempt and its expiry", async () => {
  const fixture = await createCalendarFixture(), db = await getDatabase();
  try {
    const repo = new InquiryRepository(db), sender = { from: "検証 <sender@example.test>", replyTo: "", testRecipient: "" };
    const number = await repo.create({ name: "復旧確認", email: "quality@example.test", category: "other", subject: "質問", body: "本文", requestKey: randomUUID() }, "user:owner", "owner", null, []);
    const replyId = await repo.prepareReply(number, { subject: "回答", body: "回答本文", requestKey: randomUUID(), revision: 1 }, "admin", "管理者");
    for (const target of [{ number }, { number, replyId }]) {
      const first = Date.now() - 22 * 3600000;
      const claim = await repo.claimMail(target, sender, first);
      await repo.finishMail(target, claim!.token, { error: "unknown" });
      await assert.rejects(deliverInquiryMail(repo, target, { sender: async () => sender, client: async () => ({ send: async () => { throw new RateLimitError(3600); } }) }), RateLimitError);
      const detail = await repo.detail(number);
      assert.equal("replyId" in target ? detail.replies[0].emailStatus : detail.inquiry.receiptEmailStatus, "unknown");
      const [state] = "replyId" in target
        ? await db.select({ attempts: s.inquiryReply.attempts, first: s.inquiryReply.firstAttemptAt }).from(s.inquiryReply).where(eq(s.inquiryReply.id, replyId))
        : await db.select({ attempts: s.inquiry.receiptAttempts, first: s.inquiry.receiptFirstAttemptAt }).from(s.inquiry);
      assert.equal(state.attempts, 1);
      assert.equal(Date.parse(state.first!), first);
      await assert.rejects(repo.claimMail(target, sender, first + 23 * 3600000 + 1), /再送期限/);
    }
  } finally { await fixture.close(); }
});

test("inquiry receipt and reply rate limits defer the durable job without exhausting delivery attempts", async () => {
  const fixture = await createCalendarFixture(), db = await getDatabase();
  try {
    const repo = new InquiryRepository(db);
    const number = await repo.create({ name: "送信待機", email: "quality@example.test", category: "other", subject: "質問", body: "本文", requestKey: randomUUID() }, "user:owner", "owner", null, []);
    for (const reply of [false, true]) {
      const replyId = reply ? await repo.prepareReply(number, { subject: "回答", body: "回答本文", requestKey: randomUUID(), revision: (await repo.detail(number)).inquiry.revision }, "admin", "管理者") : undefined;
      const target = { kind: "inquiry" as const, number, replyId };
      const key = mailJobKey(target);
      let limited = true, sent = 0;
      const payloads: string[] = [];
      const dispatch = () => dispatchQueuedMail(fixture.repo, db, async queued => {
        assert.equal(queued.kind, "inquiry");
        await deliverInquiryMail(repo, target, {
          sender: async () => ({ from: "検証 <sender@example.test>", replyTo: "", testRecipient: "" }),
          client: async () => ({ send: async input => {
            payloads.push(JSON.stringify(input));
            if (limited) throw new RateLimitError(3600);
            sent++; return { id: "quality-fake-mail" };
          } }),
        });
      });
      for (let attempt = 0; attempt < 5; attempt++) {
        const started = Date.now();
        await dispatch();
        const [job] = await db.select().from(s.transactionalMailJob).where(eq(s.transactionalMailJob.key, key));
        assert.equal(job.status, "queued");
        assert.equal(job.attempts, 0, "a local send limit is not a provider delivery failure");
        assert.ok(Date.parse(job.availableAt) >= started + 3600000);
        assert.equal(job.leaseToken, null);
        await db.update(s.transactionalMailJob).set({ availableAt: new Date(0).toISOString() }).where(eq(s.transactionalMailJob.key, key));
      }
      const [state] = replyId
        ? await db.select({ attempts: s.inquiryReply.attempts, first: s.inquiryReply.firstAttemptAt }).from(s.inquiryReply).where(eq(s.inquiryReply.id, replyId))
        : await db.select({ attempts: s.inquiry.receiptAttempts, first: s.inquiry.receiptFirstAttemptAt }).from(s.inquiry);
      assert.equal(state.attempts, 0); assert.equal(state.first, null);
      limited = false;
      await dispatch(); await dispatch();
      assert.equal(sent, 1);
      assert.equal(new Set(payloads).size, 1, "deferrals keep the same frozen recipient, body and provider key");
      assert.equal((await db.select().from(s.transactionalMailJob).where(eq(s.transactionalMailJob.key, key)))[0].status, "done");
      const detail = await repo.detail(number);
      assert.equal(replyId ? detail.replies.find(item => item.id === replyId)?.emailStatus : detail.inquiry.receiptEmailStatus, "sent");
    }
  } finally { await fixture.close(); }
});

test("repeated change decisions are conflicts without changing bookings, history or notifications", async () => {
  const fixture = await createCalendarFixture();
  try {
    const request = () => new Request("http://localhost/api", { method: "POST", headers: { authorization: "Bearer calendar-test-admin" } });
    for (const decide of [approveChange, rejectChange]) {
      const booking = await fixture.repo.createReservation({ name: "処理競合", email: "quality@example.test", phone: "09000000000", date: "2099-12-15", startTime: "12:00", people: 5, status: "temporary_confirmed", menuItems: ["検証メニュー"] });
      const change = await fixture.repo.createReservationChangeRequest({ reservationId: booking.id, email: booking.email, requestedDate: booking.date, requestedStartTime: "13:00", requestedPeople: 6, requestedMenuItems: booking.menuItems });
      const context = { params: Promise.resolve({ id: change.id }) };
      assert.equal((await decide(request(), context)).status, 200);
      const before = { reservation: await fixture.repo.getReservation(booking.id), changes: await fixture.repo.listReservationChangeRequests(), history: await fixture.repo.listReservationHistory(booking.id), deliveries: await fixture.repo.listApprovalEmailDeliveries() };
      for (const repeat of [approveChange, rejectChange]) {
        const response = await repeat(request(), context);
        assert.equal(response.status, 409);
        assert.match((await response.json()).error, /既に処理/);
      }
      assert.deepEqual({ reservation: await fixture.repo.getReservation(booking.id), changes: await fixture.repo.listReservationChangeRequests(), history: await fixture.repo.listReservationHistory(booking.id), deliveries: await fixture.repo.listApprovalEmailDeliveries() }, before);
    }
  } finally { await fixture.close(); }
});

test("single change submissions and decisions read only their booking and request history", async () => {
  const fixture = await createCalendarFixture();
  try {
    await fixture.repo.createAccount({ firebaseUid: "calendar-test-user", name: "所有者", contact: "quality@example.test", phone: "09000000000" });
    const input = { name: "変更対象", email: "quality@example.test", phone: "09000000000", date: "2099-12-15", startTime: "12:00", people: 5, status: "temporary_confirmed" as const, menuItems: ["検証メニュー"] };
    const own = await fixture.repo.createReservation({ ...input, accountFirebaseUid: "calendar-test-user" });
    const other = await fixture.repo.createReservation(input);
    const changeInput = { reservationId: own.id, email: input.email, requestedDate: input.date, requestedStartTime: "13:00", requestedPeople: 6, requestedMenuItems: input.menuItems };
    const first = await fixture.repo.createReservationChangeRequest(changeInput);
    const otherRequest = await fixture.repo.createReservationChangeRequest({ ...changeInput, reservationId: other.id });
    const all = await fixture.repo.listReservationChangeRequests();
    assert.deepEqual(await fixture.repo.listReservationChangeRequestsForReservation(own.id), all.filter(item => item.reservationId === own.id));
    assert.deepEqual(await fixture.repo.getReservationChangeRequest(otherRequest.id), all.find(item => item.id === otherRequest.id));
    const scan = mock.method(DrizzleReservationRepository.prototype, "listReservationChangeRequests", async () => { throw new Error("Unrelated change histories must not be read"); });
    try {
      const request = (token: string, body?: object) => new Request("http://localhost/api", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const replay = await submitChange(request("calendar-test-member", changeInput));
      assert.equal(replay.status, 200); assert.equal((await replay.json()).request.id, first.id);
      const created = await submitChange(request("calendar-test-member", { ...changeInput, requestedPeople: 7 }));
      assert.equal(created.status, 201);
      const createdId = (await created.json()).request.id;
      assert.equal((await approveChange(request("calendar-test-member"), { params: Promise.resolve({ id: createdId }) })).status, 403);
      assert.equal((await approveChange(request("calendar-test-admin"), { params: Promise.resolve({ id: createdId }) })).status, 200);
      assert.equal((await rejectChange(request("calendar-test-admin"), { params: Promise.resolve({ id: first.id }) })).status, 200);
      for (const id of ["invalid-uuid", randomUUID()]) assert.equal((await approveChange(request("calendar-test-admin"), { params: Promise.resolve({ id }) })).status, 404);
      assert.equal((await fixture.repo.getReservation(own.id))?.people, 7);
      assert.equal((await fixture.repo.getReservation(other.id))?.people, 5);
      assert.equal((await fixture.repo.getReservationChangeRequest(otherRequest.id))?.status, "requested");
    } finally { scan.mock.restore(); }
  } finally { await fixture.close(); }
});
