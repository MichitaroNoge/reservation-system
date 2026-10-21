import assert from "node:assert/strict";
import { test } from "node:test";
import { reservationStatusCodes, type ApprovalEmailDelivery, type ApprovalEmailType, type EmailDelivery, type EmailSettings, type EmailTemplate, type Reservation } from "../lib/domain";
import { defaultEmailTemplates } from "../lib/email/email-template-catalog";
import { EmailDeliveryError, type EmailClient, type SendEmailInput } from "../lib/email/resend-email-client";
import { confirmationEmailIdempotencyKey, isConfirmationEmailDue, sendConfirmationEmailForReservation, sendDueConfirmationEmails } from "../lib/services/confirmation-email-service";
import { receiptEmailIdempotencyKey, sendPendingReceiptEmails, sendReceiptEmailForReservation } from "../lib/services/receipt-email-service";
import { approvalEmailDeliveryKey, requestAndSendApprovalEmail, sendPendingApprovalEmails } from "../lib/services/approval-email-service";
import type { ReservationRepository } from "../lib/repositories/reservation-repository";

const now = new Date("2026-08-14T00:00:00+09:00");

test("confirmation email due calculation respects schedule date and sent flag", () => {
  assert.equal(isConfirmationEmailDue(reservation({ id: "RSV-BEFORE", date: "2026-08-21" }), now, 6), false);
  assert.equal(isConfirmationEmailDue(reservation({ id: "RSV-DUE", date: "2026-08-20" }), now, 6), true);
  assert.equal(isConfirmationEmailDue(reservation({ id: "RSV-SENT", date: "2026-08-20", confirmationContactedAt: now.toISOString() }), now, 6), false);
  assert.equal(isConfirmationEmailDue(reservation({ id: "RSV-TEMP", date: "2026-08-20", status: reservationStatusCodes.temporaryConfirmed }), now, 6), false);
});

test("confirmation email service sends due unsent reservations only", async () => {
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-BEFORE", date: "2026-08-21" }),
    reservation({ id: "RSV-DUE", date: "2026-08-20" }),
    reservation({ id: "RSV-SENT", date: "2026-08-20", confirmationContactedAt: now.toISOString() }),
    reservation({ id: "RSV-NO-EMAIL", date: "2026-08-20", email: undefined }),
  ]);
  const emailClient = new RecordingEmailClient();

  const result = await sendDueConfirmationEmails(repository, { now, daysBefore: 6, emailClient });

  assert.equal(result.checked, 4);
  assert.equal(result.due, 2);
  assert.equal(result.sent, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.failed, 0);
  assert.deepEqual(emailClient.sent.map((message) => message.to), ["kenta@example.jp"]);
  assert.equal(emailClient.sent[0].idempotencyKey, confirmationEmailIdempotencyKey(repository.get("RSV-DUE")!));
  assert.equal(repository.get("RSV-DUE")?.confirmationContactedAt, now.toISOString());
  assert.equal(repository.get("RSV-NO-EMAIL")?.confirmationContactedAt, null);
});

test("confirmation email service marks sent only after successful Resend send", async () => {
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-FAIL", date: "2026-08-20" }),
  ]);
  const emailClient = new RecordingEmailClient(new Error("Resend unavailable"));

  const result = await sendDueConfirmationEmails(repository, { now, daysBefore: 6, emailClient });

  assert.equal(result.sent, 0);
  assert.equal(result.failed, 1);
  assert.equal(repository.get("RSV-FAIL")?.confirmationContactedAt, null);
});

test("confirmation email service does not send again after a successful run", async () => {
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-DUE", date: "2026-08-20" }),
  ]);
  const emailClient = new RecordingEmailClient();

  await sendDueConfirmationEmails(repository, { now, daysBefore: 6, emailClient });
  const second = await sendDueConfirmationEmails(repository, { now, daysBefore: 6, emailClient });

  assert.equal(emailClient.sent.length, 1);
  assert.equal(second.sent, 0);
  assert.equal(second.due, 0);
});

test("manual confirmation contact sends an email before marking contacted", async () => {
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-MANUAL", date: "2026-08-30" }),
  ]);
  const emailClient = new RecordingEmailClient();

  const updated = await sendConfirmationEmailForReservation(repository, "RSV-MANUAL", { now, emailClient });

  assert.equal(emailClient.sent.length, 1);
  assert.equal(emailClient.sent[0].idempotencyKey, confirmationEmailIdempotencyKey(repository.get("RSV-MANUAL")!));
  assert.equal(updated.confirmationContactedAt, now.toISOString());
  const delivery = await repository.getEmailDelivery(confirmationEmailIdempotencyKey(repository.get("RSV-MANUAL")!));
  assert.equal(delivery?.status, "sent");
  assert.equal(delivery?.subject, emailClient.sent[0].subject);
  assert.match(delivery?.body ?? "", /RSV-MANUAL/);
});

test("confirmation email service uses the template stored for its templateKey", async () => {
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-CUSTOM-TEMPLATE", date: "2026-08-30" }),
  ]);
  const current = await repository.getEmailTemplate("reservation_reminder");
  assert.ok(current);
  await repository.upsertEmailTemplate({
    ...current,
    subject: "ご来店確認 {{reservationId}}",
    body: "{{customerName}} 様\n店舗: {{storeName}}",
  });
  const emailClient = new RecordingEmailClient();

  await sendConfirmationEmailForReservation(repository, "RSV-CUSTOM-TEMPLATE", {
    now,
    emailClient,
  });

  assert.equal(emailClient.sent[0].subject, "ご来店確認 RSV-CUSTOM-TEMPLATE");
  assert.match(emailClient.sent[0].text, /佐藤 健太 様/);
});

test("email retry uses the original subject and body snapshot after template changes", async () => {
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-SNAPSHOT", date: "2026-08-30" }),
  ]);
  const failedClient = new RecordingEmailClient(new Error("Resend unavailable"));

  await assert.rejects(
    () => sendConfirmationEmailForReservation(repository, "RSV-SNAPSHOT", { now, emailClient: failedClient }),
    /Resend unavailable/,
  );
  const deliveryKey = confirmationEmailIdempotencyKey(repository.get("RSV-SNAPSHOT")!);
  const original = await repository.getEmailDelivery(deliveryKey);
  assert.equal(original?.status, "failed");

  const template = await repository.getEmailTemplate("reservation_reminder");
  assert.ok(template);
  await repository.upsertEmailTemplate({
    ...template,
    subject: "変更後の件名 {{reservationId}}",
    body: "変更後の本文 {{customerName}}",
  });

  const retryClient = new RecordingEmailClient();
  await sendConfirmationEmailForReservation(repository, "RSV-SNAPSHOT", { now, emailClient: retryClient });

  assert.equal(retryClient.sent[0].subject, original?.subject);
  assert.equal(retryClient.sent[0].text.includes(original?.body ?? ""), true);
  assert.equal((await repository.getEmailDelivery(deliveryKey))?.status, "sent");
});

test("manual confirmation contact can use a scoped idempotency key for resend after clearing", async () => {
  const later = new Date("2026-08-14T00:05:00+09:00");
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-MANUAL-RESEND", date: "2026-08-30" }),
  ]);
  const emailClient = new RecordingEmailClient();

  await sendConfirmationEmailForReservation(repository, "RSV-MANUAL-RESEND", {
    now,
    emailClient,
    idempotencyKeyScope: `manual/${now.toISOString()}`,
  });
  await repository.updateConfirmationContact("RSV-MANUAL-RESEND", null);
  await sendConfirmationEmailForReservation(repository, "RSV-MANUAL-RESEND", {
    now: later,
    emailClient,
    idempotencyKeyScope: `manual/${later.toISOString()}`,
  });

  assert.equal(emailClient.sent.length, 2);
  assert.equal(emailClient.sent[0].idempotencyKey, confirmationEmailIdempotencyKey(repository.get("RSV-MANUAL-RESEND")!, `manual/${now.toISOString()}`));
  assert.equal(emailClient.sent[1].idempotencyKey, confirmationEmailIdempotencyKey(repository.get("RSV-MANUAL-RESEND")!, `manual/${later.toISOString()}`));
});

test("manual confirmation contact does not update contacted when email send fails", async () => {
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-MANUAL-FAIL", date: "2026-08-30" }),
  ]);
  const emailClient = new RecordingEmailClient(new Error("Resend unavailable"));

  await assert.rejects(
    () => sendConfirmationEmailForReservation(repository, "RSV-MANUAL-FAIL", { now, emailClient }),
    /Resend unavailable/,
  );
  assert.equal(repository.get("RSV-MANUAL-FAIL")?.confirmationContactedAt, null);
});

test("manual confirmation contact does not send again when already contacted", async () => {
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-MANUAL-SENT", date: "2026-08-30", confirmationContactedAt: now.toISOString() }),
  ]);
  const emailClient = new RecordingEmailClient();

  const existing = await sendConfirmationEmailForReservation(repository, "RSV-MANUAL-SENT", { now, emailClient });

  assert.equal(emailClient.sent.length, 0);
  assert.equal(existing.confirmationContactedAt, now.toISOString());
});

test("email delivery errors can be returned as API errors", () => {
  const error = new EmailDeliveryError("確認メールの送信に失敗しました");

  assert.equal(error.name, "EmailDeliveryError");
  assert.equal(error.statusCode, 502);
});

test("receipt email service sends a requested receipt once and records delivery", async () => {
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-RECEIPT", receiptEmailRequestedAt: now.toISOString() }),
  ]);
  const emailClient = new RecordingEmailClient();

  const first = await sendPendingReceiptEmails(repository, { now, emailClient });
  const second = await sendPendingReceiptEmails(repository, { now, emailClient });

  assert.equal(first.sent, 1);
  assert.equal(second.pending, 0);
  assert.equal(emailClient.sent.length, 1);
  assert.equal(emailClient.sent[0].idempotencyKey, receiptEmailIdempotencyKey({ id: "RSV-RECEIPT" }));
  assert.equal(repository.get("RSV-RECEIPT")?.receiptEmailSentAt, now.toISOString());
});

test("receipt email failure is recorded and remains retryable", async () => {
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-RECEIPT-FAIL", receiptEmailRequestedAt: now.toISOString() }),
  ]);
  const emailClient = new RecordingEmailClient(new Error("Resend unavailable"));

  await assert.rejects(() => sendReceiptEmailForReservation(repository, "RSV-RECEIPT-FAIL", { now, emailClient }), /Resend unavailable/);

  const failed = repository.get("RSV-RECEIPT-FAIL");
  assert.equal(failed?.receiptEmailSentAt, null);
  assert.equal(failed?.receiptEmailRetryCount, 1);
  assert.equal(failed?.receiptEmailLastError, "Resend unavailable");
});

test("receipt email safely stops retrying when an address is missing", async () => {
  const repository = new MemoryReservationRepository([
    reservation({ id: "RSV-RECEIPT-NO-EMAIL", email: undefined, receiptEmailRequestedAt: now.toISOString() }),
  ]);

  const result = await sendPendingReceiptEmails(repository, { now });

  assert.equal(result.skipped, 1);
  assert.equal(repository.get("RSV-RECEIPT-NO-EMAIL")?.receiptEmailRetryCount, 5);
  assert.equal(repository.get("RSV-RECEIPT-NO-EMAIL")?.receiptEmailSentAt, null);
});

test("approval email service sends each approval event only once", async () => {
  const repository = new MemoryReservationRepository([reservation({ id: "RSV-APPROVAL" })]);
  const emailClient = new RecordingEmailClient();

  await requestAndSendApprovalEmail(repository, "RSV-APPROVAL", "reservation_approved", undefined, { now, emailClient });
  await requestAndSendApprovalEmail(repository, "RSV-APPROVAL", "reservation_approved", undefined, { now, emailClient });

  assert.equal(emailClient.sent.length, 1);
  assert.match(emailClient.sent[0].subject, /予約申請が承認されました/);
  assert.equal(emailClient.sent[0].idempotencyKey, `reservation-approval/${approvalEmailDeliveryKey("RSV-APPROVAL", "reservation_approved")}`);
});

test("approval emails retain failures for periodic retry", async () => {
  const repository = new MemoryReservationRepository([reservation({ id: "RSV-CHANGE" })]);
  await assert.rejects(() => requestAndSendApprovalEmail(repository, "RSV-CHANGE", "reservation_change_approved", "RCR-1", { now, emailClient: new RecordingEmailClient(new Error("Resend unavailable")) }));

  const result = await sendPendingApprovalEmails(repository, { now, emailClient: new RecordingEmailClient() });
  assert.equal(result.sent, 1);
  assert.equal((await repository.listApprovalEmailDeliveries())[0].retryCount, 2);
  assert.ok((await repository.listApprovalEmailDeliveries())[0].sentAt);
});

test("reminders exclude past visit dates using the Japan calendar date", () => {
  const midnight = new Date("2026-08-13T15:00:00Z");
  assert.equal(isConfirmationEmailDue(reservation({ date: "2026-08-13" }), midnight, 6), false);
  assert.equal(isConfirmationEmailDue(reservation({ date: "2026-08-14" }), midnight, 6), true);
});

test("a run without due reminders does not require mail settings", async () => {
  const repository = new MemoryReservationRepository([reservation({ date: "2026-09-01" })]);
  assert.equal((await sendDueConfirmationEmails(repository, { now })).due, 0);
});

test("changed reservations receive a fresh reminder snapshot and delivery key", async () => {
  const repository = new MemoryReservationRepository([reservation({ id: "RSV-CHANGED-REMINDER" })]);
  const emailClient = new RecordingEmailClient();
  await sendConfirmationEmailForReservation(repository, "RSV-CHANGED-REMINDER", { now, emailClient });
  const current = repository.get("RSV-CHANGED-REMINDER")!;
  current.date = "2026-08-21";
  current.confirmationContactedAt = null;
  current.status = "confirmed";
  await sendConfirmationEmailForReservation(repository, current.id, { now, emailClient });
  assert.equal(emailClient.sent.length, 2);
  assert.notEqual(emailClient.sent[0].idempotencyKey, emailClient.sent[1].idempotencyKey);
  assert.notEqual(emailClient.sent[0].text, emailClient.sent[1].text);
});

test("an in-flight reservation edit does not mark the changed booking as contacted", async () => {
  const repository = new MemoryReservationRepository([reservation({ id: "RSV-SEND-RACE" })]);
  let key = "";
  const emailClient: EmailClient = { async send(message) {
    key = message.idempotencyKey;
    repository.get("RSV-SEND-RACE")!.date = "2026-08-21";
    return { id: "sent" };
  } };
  await assert.rejects(sendConfirmationEmailForReservation(repository, "RSV-SEND-RACE", { now, emailClient }), /送信中に予約内容が変更/);
  assert.equal(repository.get("RSV-SEND-RACE")?.confirmationContactedAt, null);
  assert.equal((await repository.getEmailDelivery(key))?.status, "sent");
});

test("receipt template failures increment retries without claiming email delivery", async () => {
  const repository = new MemoryReservationRepository([reservation({ id: "RSV-TEMPLATE-FAIL", receiptEmailRequestedAt: now.toISOString() })]);
  const template = (await repository.getEmailTemplate("reservation_received"))!;
  await repository.upsertEmailTemplate({ ...template, isActive: false });
  await assert.rejects(sendReceiptEmailForReservation(repository, "RSV-TEMPLATE-FAIL", { now, emailClient: new RecordingEmailClient() }), /無効/);
  assert.equal(repository.get("RSV-TEMPLATE-FAIL")?.receiptEmailRetryCount, 1);
  assert.equal(repository.get("RSV-TEMPLATE-FAIL")?.receiptEmailSentAt, null);
});

test("temporary and confirmed approvals send separate notifications", async () => {
  const repository = new MemoryReservationRepository([reservation({ id: "RSV-APPROVAL-STAGES" })]);
  const emailClient = new RecordingEmailClient();
  await requestAndSendApprovalEmail(repository, "RSV-APPROVAL-STAGES", "reservation_approved", "temporary_confirmed", { now, emailClient });
  await requestAndSendApprovalEmail(repository, "RSV-APPROVAL-STAGES", "reservation_approved", "confirmed", { now, emailClient });
  assert.equal(emailClient.sent.length, 2);
  assert.notEqual(emailClient.sent[0].idempotencyKey, emailClient.sent[1].idempotencyKey);
});

test("approval email remains sent when its secondary bookkeeping fails", async () => {
  const repository = new MemoryReservationRepository([reservation({ id: "RSV-APPROVAL-BOOKKEEPING" })]);
  const emailClient = new RecordingEmailClient();
  const update = repository.updateApprovalEmailDelivery.bind(repository);
  let failOnce = true;
  repository.updateApprovalEmailDelivery = async (key, input) => {
    if (input.sentAt && failOnce) { failOnce = false; throw new Error("bookkeeping unavailable"); }
    return update(key, input);
  };
  await assert.rejects(requestAndSendApprovalEmail(repository, "RSV-APPROVAL-BOOKKEEPING", "reservation_approved", "confirmed", { emailClient, now }), /bookkeeping/);
  const auditKey = `reservation-approval/${approvalEmailDeliveryKey("RSV-APPROVAL-BOOKKEEPING", "reservation_approved", "confirmed")}`;
  assert.equal((await repository.getEmailDelivery(auditKey))?.status, "sent");
  await sendPendingApprovalEmails(repository, { emailClient, now });
  assert.equal(emailClient.sent.length, 1);
  assert.ok((await repository.listApprovalEmailDeliveries())[0].sentAt);
});

test("queued approval emails stop after cancellation instead of confirming a cancelled visit", async () => {
  const repository = new MemoryReservationRepository([reservation({ id: "RSV-OBSOLETE-APPROVAL", status: "cancelled" })]);
  await repository.createApprovalEmailDelivery({ deliveryKey: "obsolete-approval", reservationId: "RSV-OBSOLETE-APPROVAL", type: "reservation_approved", requestedAt: now.toISOString() });
  const emailClient = new RecordingEmailClient();
  const result = await sendPendingApprovalEmails(repository, { emailClient, now });
  assert.equal(result.skipped, 1); assert.equal(emailClient.sent.length, 0);
  assert.match((await repository.listApprovalEmailDeliveries())[0].lastError!, /送信を停止/);
  assert.equal((await sendPendingApprovalEmails(repository, { emailClient, now })).pending, 0);
});

class RecordingEmailClient implements EmailClient {
  sent: SendEmailInput[] = [];

  constructor(private error?: Error) {}

  async send(input: SendEmailInput) {
    this.sent.push(input);
    if (this.error) throw this.error;
    return { id: `email-${this.sent.length}` };
  }
}

class MemoryReservationRepository implements ReservationRepository {
  async getSystemSettings() { return {acceptanceCapacity:null}; }
  async saveSystemSettings(input: import("../lib/domain").SystemSettings) { return input; }
  private approvalEmailDeliveries: ApprovalEmailDelivery[] = [];
  private emailTemplates: EmailTemplate[] = defaultEmailTemplates();
  private emailDeliveries: EmailDelivery[] = [];
  private emailSettings: EmailSettings | null = null;
  constructor(private reservations: Reservation[]) {}

  get(id: string) {
    return this.reservations.find((reservation) => reservation.id === id);
  }

  async listReservations() {
    return this.reservations;
  }

  async updateConfirmationContact(id: string, contactedAt: string | null) {
    const target = this.get(id);
    if (!target) throw new Error(`Reservation not found: ${id}`);
    target.confirmationContactedAt = contactedAt;
    return target;
  }

  async updateReceiptEmailDelivery(id: string, input: { sentAt?: string | null; lastAttemptAt: string; retryCount: number; lastError?: string | null }) {
    const target = this.get(id);
    if (!target) throw new Error(`Reservation not found: ${id}`);
    target.receiptEmailSentAt = input.sentAt ?? null;
    target.receiptEmailLastAttemptAt = input.lastAttemptAt;
    target.receiptEmailRetryCount = input.retryCount;
    target.receiptEmailLastError = input.lastError ?? null;
    return target;
  }

  async listApprovalEmailDeliveries() { return this.approvalEmailDeliveries; }

  async createApprovalEmailDelivery(input: Parameters<ReservationRepository["createApprovalEmailDelivery"]>[0]) {
    const existing = this.approvalEmailDeliveries.find((item) => item.deliveryKey === input.deliveryKey);
    if (existing) return existing;
    const delivery: ApprovalEmailDelivery = { ...input, retryCount: 0, sentAt: null, lastAttemptAt: null, lastError: null };
    this.approvalEmailDeliveries.push(delivery);
    return delivery;
  }

  async updateApprovalEmailDelivery(deliveryKey: string, input: Parameters<ReservationRepository["updateApprovalEmailDelivery"]>[1]) {
    const delivery = this.approvalEmailDeliveries.find((item) => item.deliveryKey === deliveryKey);
    if (!delivery) throw new Error(`Approval email delivery not found: ${deliveryKey}`);
    Object.assign(delivery, { ...input, sentAt: input.sentAt ?? null, lastAttemptAt: input.lastAttemptAt, retryCount: input.retryCount, lastError: input.lastError ?? null });
    return delivery;
  }

  async listEmailTemplates() { return this.emailTemplates; }
  async getEmailTemplate(templateKey: string) { return this.emailTemplates.find((item) => item.templateKey === templateKey) ?? null; }
  async upsertEmailTemplate(input: EmailTemplate) {
    const index = this.emailTemplates.findIndex((item) => item.templateKey === input.templateKey);
    if (index >= 0) this.emailTemplates[index] = input; else this.emailTemplates.push(input);
    return input;
  }
  async getEmailDelivery(deliveryKey: string) { return this.emailDeliveries.find((item) => item.deliveryKey === deliveryKey) ?? null; }
  async createEmailDelivery(input: EmailDelivery) { this.emailDeliveries.push(input); return input; }
  async updateEmailDelivery(deliveryKey: string, input: Pick<EmailDelivery, "status" | "sentAt" | "lastError">) {
    const delivery = this.emailDeliveries.find((item) => item.deliveryKey === deliveryKey);
    if (!delivery) throw new Error(`Email delivery not found: ${deliveryKey}`);
    Object.assign(delivery, input); return delivery;
  }
  async getEmailSettings() { return this.emailSettings; }
  async upsertEmailSettings(input: EmailSettings) { this.emailSettings = input; return input; }

  listReservationsForReservationAccount = unsupported;
  createReservation = unsupported;
  updateReservation = unsupported;
  async updateReservationStatus(id: string, status: Reservation["status"]) { const current = this.get(id); if (!current) throw new Error("Reservation not found"); current.status = status; return current; }
  assignStores = unsupported;
  listReservationChangeRequests = unsupported;
  createReservationChangeRequest = unsupported;
  approveReservationChangeRequest = unsupported;
  rejectReservationChangeRequest = unsupported;
  listAccounts = unsupported;
  listInactiveAccounts = unsupported;
  findAccountByFirebaseUid = unsupported;
  createAccount = unsupported;
  updateAccount = unsupported;
  deactivateAccount = unsupported;
  reactivateAccount = unsupported;
  listAccountContactEmails = unsupported;
  findAccountContactEmailByToken = unsupported;
  createAccountContactEmail = unsupported;
  verifyAccountContactEmail = async () => { unsupported(); };
  deleteAccountContactEmail = unsupported;
  listStores = unsupported;
  listInactiveStores = unsupported;
  createStore = unsupported;
  updateStore = unsupported;
  deleteStore = unsupported;
  reactivateStore = unsupported;
  listMenus = unsupported;
  listInactiveMenus = unsupported;
  createMenu = unsupported;
  updateMenu = unsupported;
  deleteMenu = unsupported;
  reactivateMenu = unsupported;
}

function reservation(overrides: Partial<Reservation>): Reservation {
  return {
    id: "RSV-1000",
    customer: "佐藤 健太",
    email: "kenta@example.jp",
    date: "2026-08-20",
    startTime: "10:00",
    people: 2,
    menuItems: ["季節のコース"],
    totalAmount: 4800,
    store: "渋谷店",
    storeAssignments: [{ store: "渋谷店", people: 2 }],
    status: reservationStatusCodes.confirmed,
    confirmationContactedAt: null,
    received: "2026-08-01 10:00",
    phone: "090-0000-0000",
    ...overrides,
  };
}

async function unsupported(): Promise<never> {
  throw new Error("Unsupported in this test.");
}
