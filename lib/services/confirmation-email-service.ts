import { createHash } from "node:crypto";
import { isConfirmedReservation, type Reservation } from "../domain";
import { reconcileReservationReadiness } from "./reservation-update-service";
import { repositoryTransaction } from "../repositories/transaction";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { buildEmailContent } from "../email/email-layout";
import { reservationTemplateVariables } from "../email/email-template-catalog";
import { getOrCreateEmailDelivery, renderRepositoryEmail } from "../email/template-email-service";
import { EmailDeliveryError, type EmailClient } from "../email/resend-email-client";
import { repositoryEmailClient } from "../email/email-sender-settings";
import { deliveryRecipients, reservationNotificationRecipients } from "../email/reservation-recipients";

export type ConfirmationEmailRunResult = {
  checked: number;
  due: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: { reservationId: string; message: string }[];
};

export type ConfirmationEmailServiceOptions = {
  now?: Date;
  daysBefore?: number;
  emailClient?: EmailClient;
  /** Deprecated: retries use the persisted generation, never a click timestamp. */
  idempotencyKeyScope?: string;
  timeoutMs?: number;
};

const defaultDaysBefore = 6;

export async function sendDueConfirmationEmails(
  repository: ReservationRepository,
  options: ConfirmationEmailServiceOptions = {},
): Promise<ConfirmationEmailRunResult> {
  const now = options.now ?? new Date();
  const daysBefore = options.daysBefore ?? confirmationEmailDaysBefore();
  const reservations = await repository.listReservations();
  const dueReservations = reservations.filter((reservation) => isConfirmationEmailDue(reservation, now, daysBefore));
  const result: ConfirmationEmailRunResult = {
    checked: reservations.length,
    due: dueReservations.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const reservation of dueReservations) {
    if (!reservation.email) {
      result.skipped += 1;
      continue;
    }

    try {
      await sendConfirmationEmailForReservation(repository, reservation.id, { now, emailClient: options.emailClient, timeoutMs: options.timeoutMs });
      result.sent += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({
        reservationId: reservation.id,
        message: error instanceof Error ? error.message : "Unknown email error",
      });
    }
  }

  return result;
}

export async function sendConfirmationEmailForReservation(
  repository: ReservationRepository,
  reservationId: string,
  options: Omit<ConfirmationEmailServiceOptions, "daysBefore"> = {},
) {
  const now = options.now ?? new Date();
  const found = (await repository.listReservations()).find((item) => item.id === reservationId);
  if (!found) throw new Error(`Reservation not found: ${reservationId}`);
  const reservation = structuredClone(found);
  if (reservation.confirmationContactedAt) return reservation;
  if (!isConfirmedReservation(reservation)) throw Object.assign(new Error("本予約が確定していないため確認メールを送信できません。"), { statusCode: 409 });
  const recipients = await reservationNotificationRecipients(repository, reservation);
  if (!recipients.length) throw new Error(`Reservation email is required: ${reservation.id}`);

  const canonicalKey = confirmationEmailIdempotencyKey(reservation);
  const legacy = !(reservation.confirmationEmailGeneration ?? 0) ? await repository.findLegacyConfirmationEmailDelivery?.(canonicalKey) : null;
  let delivery = legacy ?? await repository.getEmailDelivery(canonicalKey);
  if (!delivery) {
    const rendered = await renderRepositoryEmail(repository, "reservation_reminder", reservationTemplateVariables(reservation));
    delivery = await getOrCreateEmailDelivery(repository, { deliveryKey: canonicalKey, reservationId: reservation.id, templateKey: "reservation_reminder", recipient: recipients.join(","), subject: rendered.subject, body: rendered.body, status: "pending", requestedAt: now.toISOString(), sentAt: null, lastError: null });
  }
  const deliveryKey = delivery.deliveryKey;
  const result = await repositoryTransaction(repository, `reservation:${reservation.id}`, async repo => {
    const current = (await repo.listReservations()).find(item => item.id === reservation.id);
    if (!current || !isConfirmedReservation(current) || confirmationEmailIdempotencyKey(current) !== canonicalKey) throw Object.assign(new Error("送信中に予約内容が変更されました。最新の内容で確認連絡を行ってください。"), { statusCode: 409 });
    if (current.confirmationContactedAt) return { reservation: current };
    const audit = (await repo.getEmailDelivery(deliveryKey))!;
    // Resend retains keys for 24 hours. Never create a new send for an ambiguous old attempt.
    if (audit.status !== "sent" && now.getTime() - Date.parse(audit.requestedAt) > 23 * 3600000) throw Object.assign(new Error("安全な再送期限を超えました。Resendの送信履歴を確認してください。送信済みの場合は手動で確認連絡済みにしてください。未送信を確認して新たに送る場合は、手動で確認連絡済みにした後、未実施に戻して送信してください。"), { statusCode: 409 });
    try {
      if (audit.status !== "sent") {
        const client = options.emailClient ?? await repositoryEmailClient(repo);
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            client.send({ ...deliveryRecipients(audit.recipient), ...buildEmailContent(audit.subject, audit.body), idempotencyKey: deliveryKey }),
            new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new EmailDeliveryError("メールの送信結果を確認できません。同じ送信を再試行してください。")), options.timeoutMs ?? 20000); }),
          ]);
        } finally { if (timer) clearTimeout(timer); }
      }
      await repo.updateEmailDelivery(deliveryKey, { status: "sent", sentAt: audit.sentAt ?? now.toISOString(), lastError: null });
    } catch (error) {
      const saved = await repo.getEmailDelivery(deliveryKey);
      if (saved?.status !== "sent") await repo.updateEmailDelivery(deliveryKey, { status: "failed", sentAt: null, lastError: "メールの送信結果を確認してください。" });
      return { error };
    }
    const latest = (await repo.listReservations()).find(item => item.id === reservation.id);
    if (!latest || !isConfirmedReservation(latest) || confirmationEmailIdempotencyKey(latest) !== canonicalKey) throw Object.assign(new Error("送信中に予約内容が変更されました。最新の内容で確認連絡を行ってください。"), { statusCode: 409 });
    return { reservation: await reconcileReservationReadiness(repo, await repo.updateConfirmationContact(reservation.id, now.toISOString())) };
  });
  if ("error" in result) throw result.error;
  return result.reservation;
}

export function isConfirmationEmailDue(reservation: Reservation, now: Date, daysBefore = confirmationEmailDaysBefore()) {
  if (!isConfirmedReservation(reservation)) return false;
  if (reservation.confirmationContactedAt) return false;
  const todayInJapan = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (reservation.date < todayInJapan) return false;
  const scheduledAt = confirmationEmailScheduledAt(reservation, daysBefore);
  return scheduledAt.getTime() <= now.getTime();
}

export function confirmationEmailScheduledAt(reservation: Pick<Reservation, "date">, daysBefore = confirmationEmailDaysBefore()) {
  const [year, month, day] = reservation.date.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0));
  date.setUTCDate(date.getUTCDate() - daysBefore);
  return date;
}

export function confirmationEmailIdempotencyKey(reservation: Pick<Reservation, "id"> & Partial<Reservation>, scope?: string) {
  const revision = reservation.date ? createHash("sha256").update(JSON.stringify({
    date: reservation.date, startTime: reservation.startTime, endTime: reservation.endTime,
    people: reservation.people, customer: reservation.customer, email: reservation.email,
    menuItems: [...reservation.menuItems ?? []].sort(),
    assignments: [...reservation.storeAssignments ?? []].sort((a, b) => a.store.localeCompare(b.store)),
  })).digest("hex").slice(0, 24) : undefined;
  return ["reservation-confirmation", reservation.id, revision, (reservation.confirmationEmailGeneration ?? 0) > 0 ? `generation/${reservation.confirmationEmailGeneration}` : undefined, scope].filter(Boolean).join("/");
}

export function confirmationEmailDaysBefore() {
  const value = Number(process.env.CONFIRMATION_EMAIL_DAYS_BEFORE ?? defaultDaysBefore);
  return Number.isFinite(value) && value >= 0 ? value : defaultDaysBefore;
}
