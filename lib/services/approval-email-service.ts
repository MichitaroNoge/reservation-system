import type { ApprovalEmailType } from "../domain";
import { buildApprovalEmailContent } from "../email/approval-email-template";
import { ResendEmailClient, type EmailClient } from "../email/resend-email-client";
import type { ReservationRepository } from "../repositories/reservation-repository";

type Options = { now?: Date; emailClient?: EmailClient; maxRetries?: number };
const defaultMaxRetries = 5;

export async function requestAndSendApprovalEmail(repository: ReservationRepository, reservationId: string, type: ApprovalEmailType, referenceId?: string, options: Options = {}) {
  const deliveryKey = approvalEmailDeliveryKey(reservationId, type, referenceId);
  await repository.createApprovalEmailDelivery({ deliveryKey, reservationId, type, referenceId: referenceId ?? null, requestedAt: (options.now ?? new Date()).toISOString() });
  return sendApprovalEmailDelivery(repository, deliveryKey, options);
}

export async function sendPendingApprovalEmails(repository: ReservationRepository, options: Options = {}) {
  const maxRetries = options.maxRetries ?? defaultMaxRetries;
  const pending = (await repository.listApprovalEmailDeliveries()).filter((item) => !item.sentAt && item.retryCount < maxRetries);
  const result = { pending: pending.length, sent: 0, skipped: 0, failed: 0, errors: [] as { reservationId: string; message: string }[] };
  for (const delivery of pending) {
    try {
      const updated = await sendApprovalEmailDelivery(repository, delivery.deliveryKey, options);
      if (updated.sentAt) result.sent += 1;
      else result.skipped += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ reservationId: delivery.reservationId, message: error instanceof Error ? error.message : "Unknown email error" });
    }
  }
  return result;
}

export async function sendApprovalEmailDelivery(repository: ReservationRepository, deliveryKey: string, options: Options = {}) {
  const delivery = (await repository.listApprovalEmailDeliveries()).find((item) => item.deliveryKey === deliveryKey);
  if (!delivery) throw new Error(`Approval email delivery not found: ${deliveryKey}`);
  if (delivery.sentAt || delivery.retryCount >= (options.maxRetries ?? defaultMaxRetries)) return delivery;
  const reservation = (await repository.listReservations()).find((item) => item.id === delivery.reservationId);
  if (!reservation) throw new Error(`Reservation not found: ${delivery.reservationId}`);
  const attemptedAt = (options.now ?? new Date()).toISOString();
  const retryCount = delivery.retryCount + 1;
  if (!reservation.email) return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, lastAttemptAt: attemptedAt, retryCount: options.maxRetries ?? defaultMaxRetries, lastError: "Reservation email is required" });
  try {
    const emailClient = options.emailClient ?? new ResendEmailClient();
    const content = buildApprovalEmailContent(reservation, delivery.type);
    await emailClient.send({ to: reservation.email, ...content, idempotencyKey: `reservation-approval/${delivery.deliveryKey}` });
    return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: attemptedAt, lastAttemptAt: attemptedAt, retryCount, lastError: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    await repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, lastAttemptAt: attemptedAt, retryCount, lastError: message });
    throw error;
  }
}

export function approvalEmailDeliveryKey(reservationId: string, type: ApprovalEmailType, referenceId?: string) {
  return [reservationId, type, referenceId].filter(Boolean).join("/");
}
