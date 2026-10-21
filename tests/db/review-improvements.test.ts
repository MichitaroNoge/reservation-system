import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { randomUUID, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { createCalendarFixture } from "./calendar-fixture";
import { getDatabase } from "../../lib/db/client";
import * as s from "../../lib/db/schema";
import { requestAndSendApprovalEmail, sendPendingApprovalEmails } from "../../lib/services/approval-email-service";
import { sendReceiptEmailForReservation } from "../../lib/services/receipt-email-service";
import { EmailDeliveryError, ResendEmailClient } from "../../lib/email/resend-email-client";
import { RateLimitError } from "../../lib/abuse-limits";
import { InquiryRepository } from "../../lib/inquiries/repository";
import { deliverInquiryMail } from "../../lib/inquiries/mail-service";
import { resolveReplyMail } from "../../lib/inquiries/controllers";
import { calendarDay, calendarCapacityWarning } from "../../lib/reservation-calendar";
import { calendarSettings, createOrRecoverCalendar } from "../../lib/google-calendar/settings";
import { CalendarError, encrypt } from "../../lib/google-calendar/security";
import type { CalendarClient } from "../../lib/google-calendar/client";
import { GET as notificationProblems, POST as notificationRecovery } from "../../app/api/admin/reservation-notifications/route";
import { recoverReservationNotification } from "../../lib/services/reservation-notification-recovery";
import { PUT as saveSettings } from "../../app/api/system-settings/route";

const base = { name: "検証", email: "owner@example.test", phone: "09012345678", date: "2099-11-15", startTime: "12:00", people: 60, menuItems: ["検証メニュー"] };
const sender = { from: "検証 <sender@example.test>", replyTo: "", testRecipient: "" };
const request = (body: object, token = "calendar-test-admin") => new Request("http://localhost/api", { method: "POST", headers: { origin: "http://localhost", authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(body) });

test("review fixes prevent stale notices, retry starvation, update loss, false occupancy and stuck inquiry/calendar recovery", async () => {
 const fixture = await createCalendarFixture(), repo = fixture.repo, db = await getDatabase();
 try {
  // Old immutable mail bodies must never arrive after a newer approved update.
  const r = await repo.createReservation({ ...base, status: "confirmed" });
  let fail = true; const received: string[] = [];
  const client = { send: async (message: { text: string }) => { if (fail) throw new EmailDeliveryError("fake failure", "failed"); received.push(message.text); return { id: "fake" }; } };
  await repo.updateReservation(r.id, { date: "2099-11-16" });
  await assert.rejects(requestAndSendApprovalEmail(repo, r.id, "reservation_change_approved", "change-A", { emailClient: client }));
  fail = false; await repo.updateReservation(r.id, { date: "2099-11-17" });
  await requestAndSendApprovalEmail(repo, r.id, "reservation_change_approved", "change-B", { emailClient: client });
  await sendPendingApprovalEmails(repo, { emailClient: client });
  assert.equal(received.length, 1); assert.match(received[0], /2099-11-17/);
  assert.ok((await repo.listApprovalEmailDeliveries()).find(d => d.referenceId === "change-A")?.stoppedAt);
  // Automatic readiness status changes alone do not suppress a valid approval.
  const ready = await repo.createReservation({ ...base, status: "confirmed" });
  await repo.createApprovalEmailDelivery({ deliveryKey: "ready", reservationId: ready.id, type: "reservation_approved", requestedAt: new Date().toISOString() });
  await repo.updateReservationStatus(ready.id, "waiting_for_visit");
  assert.equal((await sendPendingApprovalEmails(repo, { emailClient: client })).sent, 1);

  // Six mails to one address are delivered across cooldown windows, not abandoned at five attempts.
  process.env.RESEND_API_KEY = "re_fake"; process.env.RESEND_FROM_EMAIL = sender.from; process.env.RESEND_ALLOWED_FROM_EMAILS = "sender@example.test";
  let providerCalls = 0;
  const send = mock.method(ResendEmailClient.prototype, "send", async () => { providerCalls++; return { id: "fake-mail" }; });
  try {
   for (let i = 0; i < 6; i++) {
    const b = await repo.createReservation({ ...base, email: "shared@example.test", status: "confirmed" });
    await repo.createApprovalEmailDelivery({ deliveryKey: "rate-" + i, reservationId: b.id, type: "reservation_approved", requestedAt: new Date().toISOString() });
   }
   const start = Date.now();
   for (let i = 0; i < 6; i++) {
    await db.update(s.abuseLimit).set({ expiresAt: new Date(0).toISOString() }).where(eq(s.abuseLimit.bucketKey, createHash("sha256").update("email:cooldown:shared@example.test").digest("hex")));
    await sendPendingApprovalEmails(repo, { now: new Date(start + i * 61000) });
   }
   assert.equal(providerCalls, 6);
   const queued = (await repo.listApprovalEmailDeliveries()).filter(d => d.deliveryKey.startsWith("rate-"));
   assert.ok(queued.every(d => d.sentAt && d.retryCount === 1));
  } finally { send.mock.restore(); }
  // Explicit recovery is admin-only, requires confirmation and is idempotent after lost responses.
  assert.equal((await notificationProblems(request({}, "calendar-test-member"))).status, 403);
  assert.equal((await notificationRecovery(request({ action: "record_sent", deliveryKey: "missing", revision: 0 }))).status, 400);
  const legacy = await repo.createReservation({ ...base, status: "confirmed" });
  await repo.createApprovalEmailDelivery({ deliveryKey: "legacy-unknown", reservationId: legacy.id, type: "reservation_approved", requestedAt: new Date().toISOString() });
  await repo.updateApprovalEmailDelivery("legacy-unknown", { stoppedAt: new Date().toISOString(), retryCount: 5, lastAttemptAt: new Date().toISOString(), lastError: "旧通知" });
  const recoverySend = mock.method(ResendEmailClient.prototype, "send", async () => { return { id: "fake-recovery" }; });
  try {
    await recoverReservationNotification(repo, "legacy-unknown", 0, "send_current");
    await recoverReservationNotification(repo, "legacy-unknown", 0, "send_current");
    assert.equal(recoverySend.mock.callCount(), 1);
    await assert.rejects(recoverReservationNotification(repo, "legacy-unknown", 0, "record_sent"), /既に作成/);
  } finally { recoverySend.mock.restore(); }

  // Receipt throttling also waits without using a delivery attempt.
  const receipt = await repo.createReservation({ ...base, status: "confirmed_requested", receiptEmailRequestedAt: new Date().toISOString() });
  const start = new Date(); let sends = 0;
  await assert.rejects(sendReceiptEmailForReservation(repo, receipt.id, { now: start, emailClient: { send: async () => { throw new RateLimitError(60); } } }));
  const waiting = (await repo.listReservations()).find(b => b.id === receipt.id)!;
  assert.equal(waiting.receiptEmailRetryCount, 0); assert.ok(waiting.receiptEmailNextAttemptAt);
  await sendReceiptEmailForReservation(repo, receipt.id, { now: start, emailClient: { send: async () => { sends++; return { id: "fake" }; } } });
  assert.equal(sends, 0);
  await sendReceiptEmailForReservation(repo, receipt.id, { now: new Date(start.getTime() + 61000), emailClient: { send: async () => { sends++; return { id: "fake" }; } } });
  assert.equal(sends, 1);

  // Approval never reverts a reservation changed after the request was submitted.
  const booking = await repo.createReservation({ ...base, status: "confirmed" });
  const change = (people: number, expectedRevision?: number) => repo.createReservationChangeRequest({ expectedRevision, reservationId: booking.id, email: base.email, requestedDate: base.date, requestedStartTime: base.startTime, requestedPeople: people, requestedMenuItems: base.menuItems });
  const older = await change(55), newer = await change(50);
  await repo.approveReservationChangeRequest(newer.id);
  await assert.rejects(repo.approveReservationChangeRequest(older.id), /古い内容で上書き/);
  assert.equal((await repo.listReservations()).find(b => b.id === booking.id)?.people, 50);
  assert.equal((await repo.listReservationChangeRequests()).find(c => c.id === older.id)?.status, "requested");
  // Explicit customer resubmission rebases that same pending request without duplicates.
  await assert.rejects(change(55), /再申請/);
  await assert.rejects(change(55, 0), /更新されています/);
  const refreshed = await change(55, 1); assert.equal(refreshed.id, older.id);
  await repo.approveReservationChangeRequest(refreshed.id);
  assert.equal((await repo.listReservations()).find(b => b.id === booking.id)?.people, 55);
  const stale = await repo.getSystemSettings();
  await repo.saveSystemSettings({ ...stale, blockedPeriods: [{ start: "2099-12-01T12:00", end: "2099-12-01T13:00", reason: "貸切" }] });
  await assert.rejects(repo.saveSystemSettings({ ...stale, acceptanceCapacity: 200 }), /更新されました/);
  assert.equal((await repo.getSystemSettings()).blockedPeriods.length, 1);
  assert.equal((await saveSettings(request({ ...stale, acceptanceCapacity: 200 }))).status, 409);
  assert.equal((await saveSettings(request({ acceptanceCapacity: 200 }))).status, 409);

  for (const [status, expected] of [["confirmed_requested", "pending"], ["temporary_requested", "pending"], ["temporary_confirmed", "temporary"], ["confirmed", "booked"]] as const) {
   const b = await repo.createReservation({ ...base, status });
   const cancelling = await repo.updateReservationStatus(b.id, "cancellation_requested");
   const day = calendarDay(base.date, [cancelling], await repo.listMenus(), { acceptanceCapacity: 50 });
   assert.equal(day.entries[0].kind, expected);
   assert.equal(day.peak, expected === "booked" ? 60 : 0);
   assert.equal(calendarCapacityWarning(day), expected === "booked" ? "本予約で上限超過" : expected === "temporary" ? "仮予約込みで上限超過" : null);
  }
  const temp = await repo.createReservation({ ...base, status: "temporary_confirmed" });
  await repo.updateReservationStatus(temp.id, "confirmed_requested");
  assert.equal(calendarDay(base.date, [await repo.updateReservationStatus(temp.id, "cancellation_requested")], [], {}).entries[0].kind, "temporary");

  // A failed/ambiguous reply remains visible and can be explicitly closed without resending.
  const inquiries = new InquiryRepository(db);
  const number = await inquiries.create({ name: "本人", email: "inquiry@example.test", category: "other", subject: "件名", body: "質問", requestKey: randomUUID() }, "user:owner", "owner", null, []);
  const reply = await inquiries.prepareReply(number, { subject: "回答", body: "回答本文", requestKey: randomUUID(), revision: 1 }, "admin", "管理者");
  const claim = await inquiries.claimMail({ number, replyId: reply }, sender, Date.now() - 24 * 3600000);
  await inquiries.finishMail({ number, replyId: reply }, claim!.token, { error: "unknown" });
  await assert.rejects(inquiries.claimMail({ number, replyId: reply }, sender), /期限/);
  const revision = (await inquiries.detail(number)).inquiry.revision;
  assert.equal((await resolveReplyMail(request({ outcome: "not_sent", revision, confirmed: true }, "calendar-test-member"), number, reply)).status, 403);
  assert.equal((await resolveReplyMail(request({ outcome: "not_sent", revision }), number, reply)).status, 400);
  assert.equal((await resolveReplyMail(request({ outcome: "not_sent", revision, confirmed: true }), number, reply)).status, 200);
  await inquiries.resolveReplyMail(number, reply, "not_sent", revision, "admin"); // lost confirmation response
  assert.equal((await inquiries.detail(number, "owner")).replies[0].body, "回答本文");
  assert.equal((await inquiries.detail(number, "owner")).replies[0].resolution, undefined);
  await deliverInquiryMail(inquiries, { number, replyId: reply }, { sender: async () => { throw new Error("must not call"); }, client: async () => { throw new Error("must not send"); } });
  await inquiries.setStatus(number, "closed", (await inquiries.detail(number)).inquiry.revision);
  await inquiries.setStatus(number, "in_progress", (await inquiries.detail(number)).inquiry.revision);
  const next = await inquiries.prepareReply(number, { subject: "追加回答", body: "追記", requestKey: randomUUID(), revision: (await inquiries.detail(number)).inquiry.revision }, "admin", "管理者");
  const active = await inquiries.claimMail({ number, replyId: next }, sender);
  await assert.rejects(inquiries.resolveReplyMail(number, next, "not_sent", (await inquiries.detail(number)).inquiry.revision, "admin"), /送信中/);
  await inquiries.finishMail({ number, replyId: next }, active!.token, { error: "failed" });
  await inquiries.resolveReplyMail(number, next, "sent", (await inquiries.detail(number)).inquiry.revision, "admin");
  assert.equal((await inquiries.detail(number)).replies[1].emailStatus, "sent");

  if (process.env.DB_TEST_DRIVER === "postgres") {
   const settings = await repo.getSystemSettings();
   const simultaneous = await Promise.allSettled([1, 2].map(n => repo.saveSystemSettings({ ...settings, acceptanceCapacity: 100 + n })));
   assert.equal(simultaneous.filter(result => result.status === "fulfilled").length, 1);
   const b = await repo.createReservation({ ...base, status: "confirmed" });
   const a = await repo.createReservationChangeRequest({ reservationId: b.id, email: base.email, requestedDate: base.date, requestedStartTime: base.startTime, requestedPeople: 55, requestedMenuItems: base.menuItems });
   const c = await repo.createReservationChangeRequest({ reservationId: b.id, email: base.email, requestedDate: base.date, requestedStartTime: base.startTime, requestedPeople: 50, requestedMenuItems: base.menuItems });
   const approvals = await Promise.allSettled([a.id, c.id].map(id => repo.approveReservationChangeRequest(id)));
   assert.equal(approvals.filter(result => result.status === "fulfilled").length, 1);
   assert.equal(approvals.filter(result => result.status === "rejected").length, 1);
   let calls = 0;
   const mail = { send: async () => { calls++; return { id: "fake-concurrent" }; } };
   await Promise.all([1, 2].map(() => requestAndSendApprovalEmail(repo, b.id, "reservation_approved", "concurrent", { emailClient: mail })));
   assert.equal(calls, 1);
   // A booking edit cannot race between applicability validation and mail sending.
   let started!: () => void, release!: () => void;
   const sending = new Promise<void>(resolve => { started = resolve; });
   const gate = new Promise<void>(resolve => { release = resolve; });
   const sendInProgress = requestAndSendApprovalEmail(repo, b.id, "reservation_change_approved", "lock-check", { emailClient: { send: async () => { started(); await gate; return { id: "fake-locked" }; } } });
   await sending;
   let edited = false;
   const edit = repo.updateReservation(b.id, { date: "2099-11-20" }).then(() => { edited = true; });
   try { await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(edited, false); } finally { release(); await sendInProgress; await edit; }
   assert.equal(edited, true);
  }

  // Recover a deleted calendar only after confirmation and an actual missing-calendar check.
  process.env.GOOGLE_CALENDAR_CLIENT_ID = "test.apps.googleusercontent.com"; process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "fake"; process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64"); process.env.GOOGLE_CALENDAR_REDIRECT_URI = "https://calendar.example.test/api/admin/google-calendar/callback";
  await db.insert(s.googleCalendarConnection).values({ key: "default", googleSub: "sub", email: "admin@example.test", refreshToken: encrypt("fake"), calendarId: "deleted-calendar", connectedBy: "admin", enabled: false, lastError: "calendar_missing" });
  assert.equal((await calendarSettings(db)).connection?.recoveryAvailable, true);
  let creates = 0, missing = false;
  const calendar: CalendarClient = { createCalendar: async () => { creates++; return "new-calendar"; }, verifyCalendar: async id => { if (id === "deleted-calendar" && missing) throw new CalendarError("calendar_missing"); }, put: async () => {}, remove: async () => {} };
  await assert.rejects(createOrRecoverCalendar(db, undefined, async () => calendar), CalendarError);
  await assert.rejects(createOrRecoverCalendar(db, undefined, async () => calendar, "deleted-calendar"), (e: unknown) => e instanceof CalendarError && e.code === "calendar_still_available");
  assert.equal(creates, 0); missing = true;
  await createOrRecoverCalendar(db, undefined, async () => calendar, "deleted-calendar");
  const connection = (await db.select().from(s.googleCalendarConnection))[0];
  assert.equal(connection.calendarId, "new-calendar"); assert.equal(connection.enabled, true); assert.equal(creates, 1);
  assert.ok((await db.select().from(s.googleCalendarSync)).every(job => job.status === "pending" && !job.remotePresent));
 } finally { await fixture.close(); }
});


test("approval retries retain the exact payload after a lost transaction commit", { timeout: 60000 }, async () => {
 const fixture = await createCalendarFixture(), repo = fixture.repo, db = await getDatabase();
 try {
  const booking = await repo.createReservation({ ...base, status: "confirmed" });
  const sent: { text: string; idempotencyKey: string }[] = [];
  const client = { send: async (input: { text: string; idempotencyKey: string }) => { sent.push(input); return { id: "fake-provider-result" }; } };
  const transaction = db.transaction.bind(db);
  let rollback = true;
  const failure = mock.method(db, "transaction", async (work: Parameters<typeof db.transaction>[0]) => transaction(async tx => {
    const result = await work(tx);
    if (rollback && sent.length) { rollback = false; throw new Error("forced_commit_loss"); }
    return result;
  }));
  try { await assert.rejects(requestAndSendApprovalEmail(repo, booking.id, "reservation_approved", "rollback", { emailClient: client }), /forced_commit_loss/); }
  finally { failure.mock.restore(); }
  assert.equal(sent.length, 1);
  const template = (await repo.getEmailTemplate("reservation_approved"))!;
  await repo.upsertEmailTemplate({ ...template, subject: "テンプレート変更後", body: "変更後の本文" });
  await requestAndSendApprovalEmail(repo, booking.id, "reservation_approved", "rollback", { emailClient: client });
  assert.equal(sent.length, 2); assert.equal(sent[0].text, sent[1].text); assert.equal(sent[0].idempotencyKey, sent[1].idempotencyKey);
  // Network stalls release the booking lock and old ambiguous provider keys are not replayed after expiry.
  const timed = await repo.createReservation({ ...base, status: "confirmed" });
  await repo.createApprovalEmailDelivery({ deliveryKey: timed.id + "/reservation_approved/timeout", reservationId: timed.id, type: "reservation_approved", referenceId: "timeout", requestedAt: new Date(Date.now() - 24 * 3600000).toISOString() });
  let calls = 0;
  const hanging = { send: async () => { calls++; return new Promise<{ id: string }>(() => {}); } };
  await assert.rejects(requestAndSendApprovalEmail(repo, timed.id, "reservation_approved", "timeout", { emailClient: hanging, timeoutMs: 5 }));
  assert.equal(calls, 1);
  await assert.rejects(requestAndSendApprovalEmail(repo, timed.id, "reservation_approved", "timeout", { emailClient: hanging, timeoutMs: 5 }), /再送期限/);
  assert.equal(calls, 1); assert.ok((await repo.listApprovalEmailDeliveries()).find(d => d.reservationId === timed.id)?.stoppedAt);
 } finally { await fixture.close(); }
});
