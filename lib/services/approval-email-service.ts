import type { ApprovalEmailType } from "../domain";
import { buildEmailContent } from "../email/email-layout";
import { approvalTypeTemplateKey, reservationTemplateVariables } from "../email/email-template-catalog";
import { getOrCreateEmailDelivery, renderRepositoryEmail } from "../email/template-email-service";
import type { EmailClient } from "../email/resend-email-client";
import { repositoryEmailClient } from "../email/email-sender-settings";
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
  const accountEmail = reservation.accountId ? (await repository.listAccounts()).find((account) => account.id === reservation.accountId)?.contact : undefined;
  const recipient = accountEmail ?? reservation.email;
  if (!recipient) return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, lastAttemptAt: attemptedAt, retryCount: options.maxRetries ?? defaultMaxRetries, lastError: "Reservation email is required" });
  const templateKey = approvalTypeTemplateKey(delivery.type);
  const auditKey = `reservation-approval/${delivery.deliveryKey}`;
  try {
    const emailClient = options.emailClient ?? await repositoryEmailClient(repository);
    let audit = await repository.getEmailDelivery(auditKey);
    if (!audit) {
      const rendered = await renderRepositoryEmail(repository, templateKey, reservationTemplateVariables(reservation));
      audit = await getOrCreateEmailDelivery(repository, { deliveryKey: auditKey, reservationId: reservation.id, templateKey, recipient, subject: rendered.subject, body: rendered.body, status: "pending", requestedAt: delivery.requestedAt, sentAt: null, lastError: null });
    }
    await emailClient.send({ to: audit.recipient, ...buildEmailContent(audit.subject, audit.body), idempotencyKey: auditKey });
    await repository.updateEmailDelivery(auditKey, { status: "sent", sentAt: attemptedAt, lastError: null });
    return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: attemptedAt, lastAttemptAt: attemptedAt, retryCount, lastError: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    const audit = await repository.getEmailDelivery(auditKey);
    if (audit) await repository.updateEmailDelivery(auditKey, { status: "failed", sentAt: null, lastError: message });
    await repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, lastAttemptAt: attemptedAt, retryCount, lastError: message });
    throw error;
  }
}

export function approvalEmailDeliveryKey(reservationId: string, type: ApprovalEmailType, referenceId?: string) {
  return [reservationId, type, referenceId].filter(Boolean).join("/");
}
