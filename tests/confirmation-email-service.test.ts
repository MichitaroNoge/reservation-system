import assert from "node:assert/strict";
import { test } from "node:test";
import { reservationStatusCodes, type ApprovalEmailDelivery, type ApprovalEmailType, type Reservation } from "../lib/domain";
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
  assert.equal(emailClient.sent[0].idempotencyKey, confirmationEmailIdempotencyKey({ id: "RSV-DUE" }));
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
  assert.equal(emailClient.sent[0].idempotencyKey, confirmationEmailIdempotencyKey({ id: "RSV-MANUAL" }));
  assert.equal(updated.confirmationContactedAt, now.toISOString());
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
  assert.equal(emailClient.sent[0].idempotencyKey, confirmationEmailIdempotencyKey({ id: "RSV-MANUAL-RESEND" }, `manual/${now.toISOString()}`));
  assert.equal(emailClient.sent[1].idempotencyKey, confirmationEmailIdempotencyKey({ id: "RSV-MANUAL-RESEND" }, `manual/${later.toISOString()}`));
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
  private approvalEmailDeliveries: ApprovalEmailDelivery[] = [];
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

  async createApprovalEmailDelivery(input: { deliveryKey: string; reservationId: string; type: ApprovalEmailType; referenceId?: string | null; requestedAt: string }) {
    const existing = this.approvalEmailDeliveries.find((item) => item.deliveryKey === input.deliveryKey);
    if (existing) return existing;
    const delivery: ApprovalEmailDelivery = { ...input, retryCount: 0, sentAt: null, lastAttemptAt: null, lastError: null };
    this.approvalEmailDeliveries.push(delivery);
    return delivery;
  }

  async updateApprovalEmailDelivery(deliveryKey: string, input: { sentAt?: string | null; lastAttemptAt: string; retryCount: number; lastError?: string | null }) {
    const delivery = this.approvalEmailDeliveries.find((item) => item.deliveryKey === deliveryKey);
    if (!delivery) throw new Error(`Approval email delivery not found: ${deliveryKey}`);
    Object.assign(delivery, { sentAt: input.sentAt ?? null, lastAttemptAt: input.lastAttemptAt, retryCount: input.retryCount, lastError: input.lastError ?? null });
    return delivery;
  }

  listReservationsForReservationAccount = unsupported;
  createReservation = unsupported;
  updateReservation = unsupported;
  updateReservationStatus = unsupported;
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
