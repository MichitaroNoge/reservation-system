import { RateLimitError } from "../abuse-limits";
import type { Reservation } from "../domain";
import { buildEmailContent } from "../email/email-layout";
import { reservationTemplateVariables } from "../email/email-template-catalog";
import { getOrCreateEmailDelivery, renderRepositoryEmail } from "../email/template-email-service";
import type { EmailClient } from "../email/resend-email-client";
import { repositoryEmailClient } from "../email/email-sender-settings";
import { deliveryRecipients, reservationNotificationRecipients } from "../email/reservation-recipients";
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
  timeoutMs?: number;
};

const defaultMaxRetries = 5;

export async function sendPendingReceiptEmails(repository: ReservationRepository, options: ReceiptEmailServiceOptions = {}): Promise<ReceiptEmailRunResult> {
  const reservations = await repository.listReservations();
  const pending = reservations.filter((reservation) => isReceiptEmailPending(reservation, options.maxRetries, options.now));
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
  const retryDelay = Date.parse(reservation.receiptEmailNextAttemptAt ?? "") - (options.now ?? new Date()).getTime();
  // The durable queue must retain a deferred receipt rather than marking it delivered.
  if (retryDelay > 0) throw new RateLimitError(Math.max(1, Math.ceil(retryDelay / 1000)));
  if ((reservation.receiptEmailRetryCount ?? 0) >= (options.maxRetries ?? defaultMaxRetries)) throw Object.assign(new Error("受付メールの再送回数の上限に達しました。送信履歴を確認してください。"), { statusCode: 409 });
  if (!reservation.email) throw new Error(`Reservation email is required: ${reservation.id}`);

  const now = options.now ?? new Date();
  const attemptedAt = now.toISOString();
  const retryCount = (reservation.receiptEmailRetryCount ?? 0) + 1;
  const deliveryKey = receiptEmailIdempotencyKey(reservation);
  const recipients = await reservationNotificationRecipients(repository, reservation);
  if (!recipients.length) throw new Error(`Reservation email is required: ${reservation.id}`);
  let retryWindowExpired = false;
  try {
    let delivery = await repository.getEmailDelivery(deliveryKey);
    if (!delivery) {
      const rendered = await renderRepositoryEmail(repository, "reservation_received", reservationTemplateVariables(reservation));
      delivery = await getOrCreateEmailDelivery(repository, { deliveryKey, reservationId: reservation.id, templateKey: "reservation_received", recipient: recipients.join(","), subject: rendered.subject, body: rendered.body, status: "pending", requestedAt: attemptedAt, sentAt: null, lastError: null });
    }
    // The cron endpoint also calls this service directly, outside the queue's expiry guard.
    // Keep the same safe window used by confirmation/approval/inquiry mail retries.
    const firstAttempt = Date.parse(delivery.requestedAt);
    if (delivery.status !== "sent" && (!Number.isFinite(firstAttempt) || now.getTime() - firstAttempt > 23 * 3600000)) {
      retryWindowExpired = true;
      throw Object.assign(new Error("安全な再送期限を超えました。受付メールの送信履歴を確認してください。"), { statusCode: 409 });
    }
    const content = buildEmailContent(delivery.subject, delivery.body);
    if (delivery.status !== "sent") {
      const emailClient = options.emailClient ?? await repositoryEmailClient(repository);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          emailClient.send({
            ...deliveryRecipients(delivery.recipient),
            subject: content.subject, text: content.text, html: content.html,
            idempotencyKey: deliveryKey,
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("メールの送信結果を確認できませんでした。")), options.timeoutMs ?? 20000);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    const sentAt = delivery.sentAt ?? attemptedAt;
    await repository.updateEmailDelivery(deliveryKey, { status: "sent", sentAt, lastError: null });
    return repository.updateReceiptEmailDelivery(reservation.id, { sentAt, lastAttemptAt: attemptedAt, retryCount, lastError: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    const delivery = await repository.getEmailDelivery(deliveryKey);
    if (delivery && delivery.status !== "sent") await repository.updateEmailDelivery(deliveryKey, { status: "failed", sentAt: null, lastError: message });
    await repository.updateReceiptEmailDelivery(reservation.id, { sentAt: null, lastAttemptAt: attemptedAt, retryCount: retryWindowExpired ? options.maxRetries ?? defaultMaxRetries : error instanceof RateLimitError ? reservation.receiptEmailRetryCount ?? 0 : retryCount, nextAttemptAt: error instanceof RateLimitError ? new Date(now.getTime() + error.retryAfter * 1000).toISOString() : null, lastError: message });
    throw error;
  }
}

export function isReceiptEmailPending(reservation: Reservation, maxRetries = defaultMaxRetries, now = new Date()) {
  return Boolean(reservation.receiptEmailRequestedAt)
    && (!reservation.receiptEmailNextAttemptAt || Date.parse(reservation.receiptEmailNextAttemptAt) <= now.getTime())
    && !reservation.receiptEmailSentAt
    && (reservation.receiptEmailRetryCount ?? 0) < maxRetries;
}

export function receiptEmailIdempotencyKey(reservation: Pick<Reservation, "id">) {
  return `reservation-receipt/${reservation.id}`;
}
