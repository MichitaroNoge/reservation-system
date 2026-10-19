import type { ApprovalEmailType } from "../domain";
import { buildEmailContent } from "../email/email-layout";
import { approvalTypeTemplateKey, reservationTemplateVariables } from "../email/email-template-catalog";
import { getOrCreateEmailDelivery, renderRepositoryEmail } from "../email/template-email-service";
import { EmailDeliveryError, type EmailClient } from "../email/resend-email-client";
import { repositoryEmailClient } from "../email/email-sender-settings";
import { deliveryRecipients, reservationNotificationRecipients } from "../email/reservation-recipients";
import type { ReservationRepository } from "../repositories/reservation-repository";

type Options = { now?: Date; emailClient?: EmailClient; maxRetries?: number };
const defaultMaxRetries = 5;

export async function requestAndSendApprovalEmail(repository: ReservationRepository, reservationId: string, type: ApprovalEmailType, referenceId?: string, options: Options = {}) {
  const deliveryKey = approvalEmailDeliveryKey(reservationId, type, referenceId);
  await repository.createApprovalEmailDelivery({ deliveryKey, reservationId, type, referenceId: referenceId ?? null, requestedAt: (options.now ?? new Date()).toISOString() });
  const delivery = await sendApprovalEmailDelivery(repository, deliveryKey, options);
  if (!delivery.sentAt) throw new EmailDeliveryError(delivery.lastError ?? "承認メールを送信できませんでした。再試行状態を確認してください。");
  return delivery;
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
  const auditKey = `reservation-approval/${delivery.deliveryKey}`;
  const existingAudit = await repository.getEmailDelivery(auditKey);
  if (existingAudit?.status === "sent") return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: existingAudit.sentAt ?? attemptedAt, lastAttemptAt: attemptedAt, retryCount, lastError: null });
  const stillApplicable = delivery.type === "cancellation_approved"
    ? reservation.status === "cancelled"
    : ["temporary_confirmed", "confirmed_requested", "confirmed", "waiting_for_visit"].includes(reservation.status);
  if (!stillApplicable) {
    const message = "予約の状態が変更されたため、古い承認メールの送信を停止しました。";
    if (existingAudit) await repository.updateEmailDelivery(auditKey, { status: "failed", sentAt: null, lastError: message });
    return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, lastAttemptAt: attemptedAt, retryCount: options.maxRetries ?? defaultMaxRetries, lastError: message });
  }
  const recipients = await reservationNotificationRecipients(repository, reservation);
  if (!recipients.length) return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, lastAttemptAt: attemptedAt, retryCount: options.maxRetries ?? defaultMaxRetries, lastError: "Reservation email is required" });
  const templateKey = approvalTypeTemplateKey(delivery.type);
  try {
    const emailClient = options.emailClient ?? await repositoryEmailClient(repository);
    let audit = await repository.getEmailDelivery(auditKey);
    if (!audit) {
      const rendered = await renderRepositoryEmail(repository, templateKey, reservationTemplateVariables(reservation));
      audit = await getOrCreateEmailDelivery(repository, { deliveryKey: auditKey, reservationId: reservation.id, templateKey, recipient: recipients.join(","), subject: rendered.subject, body: rendered.body, status: "pending", requestedAt: delivery.requestedAt, sentAt: null, lastError: null });
    }
    if (audit.status !== "sent") await emailClient.send({ ...deliveryRecipients(audit.recipient), ...buildEmailContent(audit.subject, audit.body), idempotencyKey: auditKey });
    await repository.updateEmailDelivery(auditKey, { status: "sent", sentAt: attemptedAt, lastError: null });
    return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: attemptedAt, lastAttemptAt: attemptedAt, retryCount, lastError: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    const audit = await repository.getEmailDelivery(auditKey);
    if (audit && audit.status !== "sent") await repository.updateEmailDelivery(auditKey, { status: "failed", sentAt: null, lastError: message });
    await repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, lastAttemptAt: attemptedAt, retryCount, lastError: message });
    throw error;
  }
}

export function approvalEmailDeliveryKey(reservationId: string, type: ApprovalEmailType, referenceId?: string) {
  return [reservationId, type, referenceId].filter(Boolean).join("/");
}
