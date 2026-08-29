import assert from "node:assert/strict";
import { test } from "node:test";
import { reservationStatusCodes, type Reservation } from "../lib/domain";
import { EmailDeliveryError, type EmailClient, type SendEmailInput } from "../lib/email/resend-email-client";
import { confirmationEmailIdempotencyKey, isConfirmationEmailDue, sendConfirmationEmailForReservation, sendDueConfirmationEmails } from "../lib/services/confirmation-email-service";
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
