import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createCalendarFixture } from "./calendar-fixture";
import { getDatabase } from "../../lib/db/client";
import * as s from "../../lib/db/schema";
import { PATCH as editReservation } from "../../app/api/reservations/[id]/route";
import { DrizzleReservationRepository } from "../../lib/repositories/drizzle-reservation-repository";
import { dispatchQueuedMail, mailJobKey } from "../../lib/mail-dispatch";
import { sendPendingReceiptEmails, sendReceiptEmailForReservation } from "../../lib/services/receipt-email-service";
import { confirmationEmailIdempotencyKey, sendConfirmationEmailForReservation } from "../../lib/services/confirmation-email-service";
import { EmailDeliveryError, type SendEmailInput } from "../../lib/email/resend-email-client";
import { RateLimitError } from "../../lib/abuse-limits";
import { InquiryRepository } from "../../lib/inquiries/repository";
import { readAdminScreen } from "../../lib/admin-screen";
import { issueChallenge, verifyChallenge } from "../../lib/inquiries/http";
import { challenge, submit, myInquiries } from "../../lib/inquiries/controllers";
const base = { name: "架空の検証者", email: "review@example.test", phone: "09000000000", date: "2099-01-15", startTime: "12:00", endTime: "14:00", people: 60, menuItems: ["検証メニュー"], status: "confirmed" as const };
const request = (path: string, body?: object, token = "calendar-test-admin", cookie = "") => new Request("http://localhost" + path, { method: body ? "POST" : "GET", headers: { origin: "http://localhost", "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}), ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const sender = { from: "Review <sender@example.test>", replyTo: "", testRecipient: "" };

test("admin edits reject missing or stale revisions without reverting people or assignments", async () => {
  const f = await createCalendarFixture();
  try {
    const initial = await f.repo.createReservation({ ...base, people: 12 });
    const patch = (body: object, token = "calendar-test-admin") => editReservation(new Request("http://localhost/api/reservations/" + initial.id, { method: "PATCH", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: initial.id }) });
    for (const invalid of [undefined, -1, "0", true, 1.5]) assert.equal((await patch({ people: 20, expectedRevision: invalid })).status, 400);
    assert.equal((await patch({ people: 20, expectedRevision: 0 }, "calendar-test-member")).status, 403);
    assert.equal((await patch({ people: 20, expectedRevision: initial.revision })).status, 200);
    await f.repo.assignStores(initial.id, [{ store: "検証店舗", people: 20 }]);
    const stale = await patch({ people: 12, remarks: "備考だけ変更したつもり", expectedRevision: initial.revision });
    assert.equal(stale.status, 409); assert.match((await stale.json()).error, /入力内容は保持/);
    const current = (await f.repo.getReservation(initial.id))!;
    assert.equal(current.people, 20); assert.deepEqual(current.storeAssignments, [{ store: "検証店舗", people: 20 }]);
    const saved = await patch({ remarks: "最新の予約で追記", expectedRevision: current.revision });
    assert.equal(saved.status, 200); assert.equal((await saved.json()).reservation.people, 20);
  } finally { await f.close(); }
});

test("people-only and date-only approvals preserve the scheduled end and check its complete blocked interval", async () => {
  const f = await createCalendarFixture();
  const change = async (id: string, extras: object = {}) => f.repo.createReservationChangeRequest({ reservationId: id, email: base.email, requestedDate: base.date, requestedStartTime: base.startTime, requestedPeople: 55, requestedMenuItems: base.menuItems, ...extras });
  try {
    const first = await f.repo.createReservation(base);
    const approved = await f.repo.approveReservationChangeRequest((await change(first.id)).id);
    assert.equal(approved.reservation.endTime, "14:00");
    await f.repo.updateMenu("検証メニュー", { name: "検証メニュー", description: "", price: 1000, duration: "30分", displayOrder: 1 });
    const moved = await f.repo.approveReservationChangeRequest((await change(first.id, { requestedDate: "2099-01-16", requestedPeople: 55 })).id);
    assert.equal(moved.reservation.endTime, "14:00");
    const second = await f.repo.createReservation(base);
    await f.repo.saveSystemSettings({ acceptanceCapacity: 100, reservationLeadDays: 3, blockedPeriods: [{ start: "2099-01-15T13:30", end: "2099-01-15T14:30", reason: "受入不可" }] });
    await assert.rejects(f.repo.approveReservationChangeRequest((await change(second.id)).id), /受入不可/);
    assert.equal((await f.repo.getReservation(second.id))!.people, 60);
    const timeChange = await change(second.id, { requestedStartTime: "10:00" });
    assert.equal((await f.repo.approveReservationChangeRequest(timeChange.id)).reservation.endTime, "10:30");
  } finally { await f.close(); }
});

test("a deferred receipt stays queued without consuming retries and is delivered once when due", async () => {
  const f = await createCalendarFixture(), db = await getDatabase();
  try {
    const reservation = await f.repo.createReservation({ ...base, receiptEmailRequestedAt: new Date().toISOString() });
    await sendPendingReceiptEmails(f.repo, { emailClient: { send: async () => { throw new RateLimitError(3600); } } });
    let sent = 0;
    const dispatch = () => dispatchQueuedMail(f.repo, db, async target => { if (target.kind === "reservation_receipt") await sendReceiptEmailForReservation(f.repo, target.reservationId, { emailClient: { send: async () => { sent++; return { id: "fake-receipt" }; } } }); });
    await dispatch();
    const key = mailJobKey({ kind: "reservation_receipt", reservationId: reservation.id });
    const [waiting] = await db.select().from(s.transactionalMailJob).where(eq(s.transactionalMailJob.key, key));
    assert.equal(waiting.status, "queued"); assert.equal(waiting.attempts, 0); assert.equal(sent, 0); assert.ok(Date.parse(waiting.availableAt) > Date.now());
    await db.update(s.reservation).set({ receiptEmailNextAttemptAt: new Date(0).toISOString() }).where(eq(s.reservation.reservationCode, reservation.id));
    await db.update(s.transactionalMailJob).set({ availableAt: new Date(0).toISOString() }).where(eq(s.transactionalMailJob.key, key));
    await dispatch(); await dispatch();
    assert.equal(sent, 1); assert.ok((await f.repo.getReservation(reservation.id))!.receiptEmailSentAt);
    assert.equal((await db.select().from(s.transactionalMailJob).where(eq(s.transactionalMailJob.key, key)))[0].status, "done");
  } finally { await f.close(); }
});

test("confirmation retries share a provider identity through lost responses, clearing and legacy scoped attempts", async () => {
  const f = await createCalendarFixture();
  try {
    const reservation = await f.repo.createReservation(base), now = new Date();
    const messages: SendEmailInput[] = [], accepted = new Set<string>();
    let loseResponse = true;
    const emailClient = { send: async (input: SendEmailInput) => { messages.push(input); accepted.add(input.idempotencyKey); if (loseResponse) { loseResponse = false; throw new EmailDeliveryError("synthetic lost response"); } return { id: "fake-confirmation" }; } };
    await assert.rejects(sendConfirmationEmailForReservation(f.repo, reservation.id, { now, emailClient, idempotencyKeyScope: "manual/first-click" }), /lost response/);
    await sendConfirmationEmailForReservation(f.repo, reservation.id, { now: new Date(now.getTime() + 60000), emailClient, idempotencyKeyScope: "manual/retry-click" });
    assert.equal(messages.length, 2); assert.equal(accepted.size, 1); assert.equal(messages[0].idempotencyKey, messages[1].idempotencyKey);
    await f.repo.updateConfirmationContact(reservation.id, null);
    assert.equal((await f.repo.getReservation(reservation.id))!.confirmationEmailGeneration, 1);
    await sendConfirmationEmailForReservation(f.repo, reservation.id, { now: new Date(now.getTime() + 120000), emailClient });
    assert.equal(accepted.size, 2);
    const legacyReservation = await f.repo.createReservation(base), legacyKey = confirmationEmailIdempotencyKey(legacyReservation, "manual/old-click");
    await f.repo.createEmailDelivery({ deliveryKey: legacyKey, templateKey: "reservation_reminder", reservationId: legacyReservation.id, recipient: base.email, subject: "以前の件名", body: "以前の本文", requestedAt: now.toISOString(), status: "failed", sentAt: null, lastError: "synthetic" });
    await sendConfirmationEmailForReservation(f.repo, legacyReservation.id, { now, emailClient });
    assert.equal(messages.at(-1)!.idempotencyKey, legacyKey); assert.equal(messages.at(-1)!.subject, "以前の件名");
    const expired = await f.repo.createReservation(base), old = new Date(now.getTime() - 25 * 3600000);
    await assert.rejects(sendConfirmationEmailForReservation(f.repo, expired.id, { now: old, emailClient: { send: async () => { throw new EmailDeliveryError("unknown"); } } }));
    const before = messages.length;
    await assert.rejects(sendConfirmationEmailForReservation(f.repo, expired.id, { now, emailClient }), /安全な再送期限/);
    assert.equal(messages.length, before);
  } finally { await f.close(); }
});

test("confirmation finalization rollback and timeout preserve the frozen key for a safe retry", async () => {
  const f = await createCalendarFixture();
  const original = DrizzleReservationRepository.prototype.updateConfirmationContact;
  let fail = true;
  const fault = mock.method(DrizzleReservationRepository.prototype, "updateConfirmationContact", async function(this: DrizzleReservationRepository, id: string, contactedAt: string | null) { if (fail) { fail = false; throw Error("synthetic commit failure"); } return original.call(this, id, contactedAt); });
  try {
    const reservation = await f.repo.createReservation(base), keys: string[] = [];
    const emailClient = { send: async (input: SendEmailInput) => { keys.push(input.idempotencyKey); return { id: "fake-stable" }; } };
    await assert.rejects(sendConfirmationEmailForReservation(f.repo, reservation.id, { emailClient }), /commit failure/);
    const pending = await f.repo.getEmailDelivery(keys[0]); assert.ok(pending); assert.equal(pending.status, "pending");
    await sendConfirmationEmailForReservation(f.repo, reservation.id, { emailClient });
    assert.equal(keys[0], keys[1]); assert.ok((await f.repo.getReservation(reservation.id))!.confirmationContactedAt);
    const timed = await f.repo.createReservation(base);
    await assert.rejects(sendConfirmationEmailForReservation(f.repo, timed.id, { timeoutMs: 5, emailClient: { send: async () => new Promise(() => {}) } }), /送信結果を確認できません/);
    const retried = await sendConfirmationEmailForReservation(f.repo, timed.id, { emailClient }); assert.ok(retried.confirmationContactedAt);
  } finally { fault.mock.restore(); await f.close(); }
});

test("anonymous undelivered replies remain actionable while signed-in customers can use history", async () => {
  const f = await createCalendarFixture(), repo = new InquiryRepository(await getDatabase());
  const create = (uid: string | null) => repo.create({ name: "架空の問い合わせ者", email: base.email, category: "other", subject: "検証", body: "本文", requestKey: randomUUID() }, "fixture", uid, null, []);
  const count = async () => (await readAdminScreen("dashboard")).summary.tasks.unansweredInquiries;
  const answer = async (number: string) => repo.prepareReply(number, { subject: "Re: 検証", body: "回答", requestKey: randomUUID(), revision: (await repo.detail(number)).inquiry.revision }, "admin", "管理者");
  try {
    const anonymous = await create(null), id = await answer(anonymous);
    assert.equal(await count(), 1);
    const claim = await repo.claimMail({ number: anonymous, replyId: id }, sender);
    await repo.finishMail({ number: anonymous, replyId: id }, claim!.token, { error: "failed" });
    assert.equal(await count(), 1); assert.equal((await repo.list({ keyword: "", status: "unhandled", page: 1, pageSize: 20 })).total, 1);
    assert.equal((await myInquiries(request("/api/accounts/me/inquiries", undefined, "calendar-test-member"), anonymous)).status, 404);
    await repo.resolveReplyMail(anonymous, id, "not_sent", (await repo.detail(anonymous)).inquiry.revision, "admin");
    assert.equal(await count(), 0);
    const next = await answer(anonymous); assert.equal(await count(), 1);
    const nextClaim = await repo.claimMail({ number: anonymous, replyId: next }, sender);
    await repo.finishMail({ number: anonymous, replyId: next }, nextClaim!.token, { id: "fake-delivery" }); assert.equal(await count(), 0);
    const member = await create("calendar-test-user"); assert.equal(await count(), 1); await answer(member); assert.equal(await count(), 0);
    assert.equal((await repo.detail(member, "calendar-test-user")).replies[0].body, "回答");
  } finally { await f.close(); }
});

test("anonymous proof renewal retains idempotency after expiry or a lost response and keeps spam guards", async () => {
  const f = await createCalendarFixture(), db = await getDatabase(); process.env.INQUIRY_FORM_SECRET = "isolated-review-proof-secret-at-least-thirty-two";
  try {
    const key = randomUUID(), first = issueChallenge(request("/api/inquiries/challenge", undefined, ""), Date.now() - 31 * 60000, key), proof = await first.json();
    const cookie = first.headers.get("set-cookie")!.split(";")[0]; assert.match(first.headers.get("set-cookie")!, /Max-Age=86400/);
    const input = { name: "検証者", email: "anonymous@example.test", category: "other", subject: "質問", body: "30分以上かけて入力した本文", ...proof };
    assert.equal((await submit(request("/api/inquiries", input, "", cookie))).status, 403);
    const renewed = issueChallenge(request("/api/inquiries/challenge", undefined, "", cookie), Date.now() - 3000, key), fresh = await renewed.json();
    assert.equal(fresh.requestKey, proof.requestKey);
    const accepted = await submit(request("/api/inquiries", { ...input, ...fresh }, "", cookie)); assert.equal(accepted.status, 201);
    const number = (await accepted.json()).number;
    const again = await submit(request("/api/inquiries", { ...input, ...fresh }, "", cookie)); assert.equal(again.status, 201); assert.equal((await again.json()).number, number);
    assert.equal((await db.select().from(s.inquiry)).length, 1); assert.equal((await db.select().from(s.transactionalMailJob)).length, 1);
    assert.equal((await submit(request("/api/inquiries", { ...input, ...fresh, body: "別内容" }, "", cookie))).status, 409);
    const justIssued = issueChallenge(request("/api/inquiries/challenge", undefined, "", cookie), Date.now(), key), just = await justIssued.json();
    assert.throws(() => verifyChallenge(request("/api", undefined, "", cookie), just.formToken, key), /少し待って/);
    assert.equal((await challenge(request("/api/inquiries/challenge?requestKey=" + key, undefined, "", cookie))).status, 200);
    for (const params of ["requestKey=bad", "other=x", "requestKey=" + key + "&requestKey=" + key]) assert.equal((await challenge(request("/api/inquiries/challenge?" + params, undefined, "", cookie))).status, 400);
  } finally { await f.close(); }
});
