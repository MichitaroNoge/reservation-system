import { RateLimitError } from "../abuse-limits";
import { reservationNotificationSnapshot } from "./reservation-notification-state";
import type { ApprovalEmailType } from "../domain";
import { buildEmailContent } from "../email/email-layout";
import { approvalTypeTemplateKey, reservationTemplateVariables } from "../email/email-template-catalog";
import { getOrCreateEmailDelivery, renderRepositoryEmail } from "../email/template-email-service";
import { EmailDeliveryError, type EmailClient } from "../email/resend-email-client";
import { repositoryEmailClient } from "../email/email-sender-settings";
import { deliveryRecipients, reservationNotificationRecipients } from "../email/reservation-recipients";
import type { ReservationRepository } from "../repositories/reservation-repository";

type Options = { now?: Date; emailClient?: EmailClient; maxRetries?: number; timeoutMs?: number };
const defaultMaxRetries = 5;

export async function requestAndSendApprovalEmail(repository: ReservationRepository, reservationId: string, type: ApprovalEmailType, referenceId?: string, options: Options = {}) {
  const deliveryKey = approvalEmailDeliveryKey(reservationId, type, referenceId);
  const reservation = (await repository.listReservations()).find(item => item.id === reservationId);
  if (!reservation) throw new Error("Reservation not found");
  await repository.createApprovalEmailDelivery({ snapshotKey: reservationNotificationSnapshot(reservation), deliveryKey, reservationId, type, referenceId: referenceId ?? null, requestedAt: (options.now ?? new Date()).toISOString() });
  const delivery = await sendApprovalEmailDelivery(repository, deliveryKey, options);
  if (!delivery.sentAt) throw new EmailDeliveryError(delivery.lastError ?? "承認メールを送信できませんでした。再試行状態を確認してください。");
  return delivery;
}

export async function sendPendingApprovalEmails(repository: ReservationRepository, options: Options = {}) {
  const maxRetries = options.maxRetries ?? defaultMaxRetries;
  const pending = (await repository.listApprovalEmailDeliveries()).filter((item) => !item.sentAt && !item.stoppedAt && (!item.nextAttemptAt || Date.parse(item.nextAttemptAt) <= (options.now ?? new Date()).getTime()) && item.retryCount < maxRetries);
  const result = { pending: pending.length, sent: 0, skipped: 0, failed: 0, errors: [] as { reservationId: string; message: string }[] };
  for (const delivery of pending) {
    try {
      const updated = await sendApprovalEmailDelivery(repository, delivery.deliveryKey, options);
      if (updated.sentAt) result.sent += 1;
      else if (updated.stoppedAt || updated.nextAttemptAt) result.skipped += 1;
      else { result.failed += 1; result.errors.push({ reservationId: updated.reservationId, message: updated.lastError ?? "メールを送信できませんでした。" }); }
    } catch (error) {
      result.failed += 1;
      result.errors.push({ reservationId: delivery.reservationId, message: error instanceof Error ? error.message : "Unknown email error" });
    }
  }
  return result;
}

export async function sendApprovalEmailDelivery(repository: ReservationRepository, deliveryKey: string, options: Options = {}) {
  const queued = (await repository.listApprovalEmailDeliveries()).find(item => item.deliveryKey === deliveryKey);
  if (!queued) throw new Error("Approval email delivery not found");
  // Freeze provider payload before the send transaction. If its final commit fails,
  // the next attempt must still use exactly the same body and idempotency key.
  let preparationError: unknown;
  if (repository.withTransaction && !queued.sentAt && !queued.stoppedAt) {
    try {
      const auditKey = `reservation-approval/${deliveryKey}`;
      if (!await repository.getEmailDelivery(auditKey)) {
        const booking = (await repository.listReservations()).find(item => item.id === queued.reservationId);
        if (!booking) throw new Error("Reservation not found");
        const recipients = await reservationNotificationRecipients(repository, booking);
        if (!recipients.length) throw new Error("Reservation email is required");
        const templateKey = approvalTypeTemplateKey(queued.type);
        const rendered = await renderRepositoryEmail(repository, templateKey, reservationTemplateVariables(booking));
        await getOrCreateEmailDelivery(repository, { deliveryKey: auditKey, reservationId: booking.id, templateKey, recipient: recipients.join(","), subject: rendered.subject, body: rendered.body, status: "pending", requestedAt: queued.requestedAt, sentAt: null, lastError: null });
      }
    } catch (error) { preparationError = error; }
  }
  const run = (repo: ReservationRepository) => sendLockedApprovalEmail(repo, deliveryKey, options, preparationError);
  return repository.withTransaction ? repository.withTransaction(`reservation:${queued.reservationId}`, run) : run(repository);
}

async function sendLockedApprovalEmail(repository: ReservationRepository, deliveryKey: string, options: Options, preparationError?: unknown) {
  const delivery = (await repository.listApprovalEmailDeliveries()).find((item) => item.deliveryKey === deliveryKey);
  if (!delivery) throw new Error(`Approval email delivery not found: ${deliveryKey}`);
  if (delivery.sentAt || delivery.stoppedAt || (delivery.nextAttemptAt && Date.parse(delivery.nextAttemptAt) > (options.now ?? new Date()).getTime()) || delivery.retryCount >= (options.maxRetries ?? defaultMaxRetries)) return delivery;
  const reservation = (await repository.listReservations()).find((item) => item.id === delivery.reservationId);
  if (!reservation) throw new Error(`Reservation not found: ${delivery.reservationId}`);
  const attemptedAt = (options.now ?? new Date()).toISOString();
  const retryCount = delivery.retryCount + 1;
  const auditKey = `reservation-approval/${delivery.deliveryKey}`;
  const existingAudit = await repository.getEmailDelivery(auditKey);
  if (existingAudit?.status === "sent") return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: existingAudit.sentAt ?? attemptedAt, lastAttemptAt: attemptedAt, retryCount, lastError: null });
  if (existingAudit && delivery.retryCount > 0 && Date.parse(attemptedAt) - Date.parse(existingAudit.requestedAt) > 23 * 3600000) {
    return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, stoppedAt: attemptedAt, lastAttemptAt: attemptedAt, retryCount: delivery.retryCount, lastError: "安全な再送期限を超えました。Resendの送信履歴を確認し、予約通知メール画面から復旧してください。" });
  }
  const stillApplicable = delivery.type === "cancellation_approved"
    ? reservation.status === "cancelled"
    : ["temporary_confirmed", "confirmed_requested", "confirmed", "waiting_for_visit"].includes(reservation.status);
  const sameSnapshot = delivery.snapshotKey === reservationNotificationSnapshot(reservation);
  if (!stillApplicable || !sameSnapshot) {
    const message = "予約の状態が変更されたため、古い承認メールの送信を停止しました。";
    if (existingAudit) await repository.updateEmailDelivery(auditKey, { status: "failed", sentAt: null, lastError: message });
    return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, lastAttemptAt: attemptedAt, retryCount: delivery.retryCount, stoppedAt: attemptedAt, lastError: message });
  }
  const recipients = await reservationNotificationRecipients(repository, reservation);
  if (!recipients.length) return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, lastAttemptAt: attemptedAt, retryCount: options.maxRetries ?? defaultMaxRetries, lastError: "Reservation email is required" });
  const templateKey = approvalTypeTemplateKey(delivery.type);
  try {
    if (preparationError) throw preparationError;
    const emailClient = options.emailClient ?? await repositoryEmailClient(repository);
    let audit = await repository.getEmailDelivery(auditKey);
    if (!audit) {
      const rendered = await renderRepositoryEmail(repository, templateKey, reservationTemplateVariables(reservation));
      audit = await getOrCreateEmailDelivery(repository, { deliveryKey: auditKey, reservationId: reservation.id, templateKey, recipient: recipients.join(","), subject: rendered.subject, body: rendered.body, status: "pending", requestedAt: delivery.requestedAt, sentAt: null, lastError: null });
    }
    if (audit.status !== "sent") {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          emailClient.send({ ...deliveryRecipients(audit.recipient), ...buildEmailContent(audit.subject, audit.body), idempotencyKey: auditKey }),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new EmailDeliveryError("メールの送信結果を確認できません。送信状況を確認してください。")), options.timeoutMs ?? 20000); }),
        ]);
      } finally { if (timer) clearTimeout(timer); }
    }
    await repository.updateEmailDelivery(auditKey, { status: "sent", sentAt: attemptedAt, lastError: null });
    return repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: attemptedAt, lastAttemptAt: attemptedAt, retryCount, lastError: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    const audit = await repository.getEmailDelivery(auditKey);
    if (audit && audit.status !== "sent") await repository.updateEmailDelivery(auditKey, { status: "failed", sentAt: null, lastError: message });
    await repository.updateApprovalEmailDelivery(deliveryKey, { sentAt: null, lastAttemptAt: attemptedAt, retryCount: error instanceof RateLimitError ? delivery.retryCount : retryCount, nextAttemptAt: error instanceof RateLimitError ? new Date(Date.parse(attemptedAt) + error.retryAfter * 1000).toISOString() : null, lastError: message });
    // Commit the outbox update even when the provider failed.
    return (await repository.listApprovalEmailDeliveries()).find(item => item.deliveryKey === deliveryKey)!;
  }
}

export function approvalEmailDeliveryKey(reservationId: string, type: ApprovalEmailType, referenceId?: string) {
  return [reservationId, type, referenceId].filter(Boolean).join("/");
}
