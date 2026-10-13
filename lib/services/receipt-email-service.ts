import type { Reservation } from "../domain";
import { buildEmailContent } from "../email/email-layout";
import { reservationTemplateVariables } from "../email/email-template-catalog";
import { getOrCreateEmailDelivery, renderRepositoryEmail } from "../email/template-email-service";
import type { EmailClient } from "../email/resend-email-client";
import { repositoryEmailClient } from "../email/email-sender-settings";
import type { ReservationRepository } from "../repositories/reservation-repository";

export type ReceiptEmailRunResult = {
  checked: number;
  pending: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: { reservationId: string; message: string }[];
};

export type ReceiptEmailServiceOptions = {
  now?: Date;
  emailClient?: EmailClient;
  maxRetries?: number;
};

const defaultMaxRetries = 5;

export async function sendPendingReceiptEmails(repository: ReservationRepository, options: ReceiptEmailServiceOptions = {}): Promise<ReceiptEmailRunResult> {
  const reservations = await repository.listReservations();
  const pending = reservations.filter((reservation) => isReceiptEmailPending(reservation, options.maxRetries));
  const result: ReceiptEmailRunResult = { checked: reservations.length, pending: pending.length, sent: 0, skipped: 0, failed: 0, errors: [] };
  if (pending.length === 0) return result;

  for (const reservation of pending) {
    if (!reservation.email) {
      const attemptedAt = (options.now ?? new Date()).toISOString();
      await repository.updateReceiptEmailDelivery(reservation.id, {
        sentAt: null,
        lastAttemptAt: attemptedAt,
        retryCount: options.maxRetries ?? defaultMaxRetries,
        lastError: "予約にメールアドレスが設定されていません。",
      });
      result.skipped += 1;
      continue;
    }
    try {
      await sendReceiptEmailForReservation(repository, reservation.id, options);
      result.sent += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ reservationId: reservation.id, message: error instanceof Error ? error.message : "Unknown email error" });
    }
  }
  return result;
}

export async function sendReceiptEmailForReservation(repository: ReservationRepository, reservationId: string, options: ReceiptEmailServiceOptions = {}) {
  const reservation = (await repository.listReservations()).find((item) => item.id === reservationId);
  if (!reservation) throw new Error(`Reservation not found: ${reservationId}`);
  if (!reservation.receiptEmailRequestedAt || reservation.receiptEmailSentAt) return reservation;
  if ((reservation.receiptEmailRetryCount ?? 0) >= (options.maxRetries ?? defaultMaxRetries)) return reservation;
  if (!reservation.email) throw new Error(`Reservation email is required: ${reservation.id}`);

  const now = options.now ?? new Date();
  const attemptedAt = now.toISOString();
  const retryCount = (reservation.receiptEmailRetryCount ?? 0) + 1;
  const deliveryKey = receiptEmailIdempotencyKey(reservation);
  let delivery = await repository.getEmailDelivery(deliveryKey);
  if (!delivery) {
    const rendered = await renderRepositoryEmail(repository, "reservation_received", reservationTemplateVariables(reservation));
    delivery = await getOrCreateEmailDelivery(repository, { deliveryKey, reservationId: reservation.id, templateKey: "reservation_received", recipient: reservation.email, subject: rendered.subject, body: rendered.body, status: "pending", requestedAt: attemptedAt, sentAt: null, lastError: null });
  }
  const content = buildEmailContent(delivery.subject, delivery.body);
  const emailClient = options.emailClient ?? await repositoryEmailClient(repository);

  try {
    await emailClient.send({
      to: reservation.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      idempotencyKey: deliveryKey,
    });
    await repository.updateEmailDelivery(deliveryKey, { status: "sent", sentAt: attemptedAt, lastError: null });
    return repository.updateReceiptEmailDelivery(reservation.id, { sentAt: attemptedAt, lastAttemptAt: attemptedAt, retryCount, lastError: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    await repository.updateEmailDelivery(deliveryKey, { status: "failed", sentAt: null, lastError: message });
    await repository.updateReceiptEmailDelivery(reservation.id, { sentAt: null, lastAttemptAt: attemptedAt, retryCount, lastError: message });
    throw error;
  }
}

export function isReceiptEmailPending(reservation: Reservation, maxRetries = defaultMaxRetries) {
  return Boolean(reservation.receiptEmailRequestedAt)
    && !reservation.receiptEmailSentAt
    && (reservation.receiptEmailRetryCount ?? 0) < maxRetries;
}

export function receiptEmailIdempotencyKey(reservation: Pick<Reservation, "id">) {
  return `reservation-receipt/${reservation.id}`;
}
