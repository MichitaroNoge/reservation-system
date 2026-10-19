import { createHash } from "node:crypto";
import { isConfirmedReservation, type Reservation } from "../domain";
import { reconcileReservationReadiness } from "./reservation-update-service";
import { repositoryTransaction } from "../repositories/transaction";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { buildEmailContent } from "../email/email-layout";
import { reservationTemplateVariables } from "../email/email-template-catalog";
import { getOrCreateEmailDelivery, renderRepositoryEmail } from "../email/template-email-service";
import type { EmailClient } from "../email/resend-email-client";
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
  idempotencyKeyScope?: string;
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
      await sendConfirmationEmailForReservation(repository, reservation.id, { now, emailClient: options.emailClient });
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

  const deliveryKey = confirmationEmailIdempotencyKey(reservation, options.idempotencyKeyScope);
  let delivery = await repository.getEmailDelivery(deliveryKey);
  if (!delivery) {
    const rendered = await renderRepositoryEmail(repository, "reservation_reminder", reservationTemplateVariables(reservation));
    delivery = await getOrCreateEmailDelivery(repository, { deliveryKey, reservationId: reservation.id, templateKey: "reservation_reminder", recipient: recipients.join(","), subject: rendered.subject, body: rendered.body, status: "pending", requestedAt: now.toISOString(), sentAt: null, lastError: null });
  }
  const content = buildEmailContent(delivery.subject, delivery.body);
  try {
    if (delivery.status !== "sent") {
      const emailClient = options.emailClient ?? await repositoryEmailClient(repository);
      await emailClient.send({ ...deliveryRecipients(delivery.recipient), ...content, idempotencyKey: deliveryKey });
    }
    await repository.updateEmailDelivery(deliveryKey, { status: "sent", sentAt: now.toISOString(), lastError: null });
  } catch (error) {
      const audit = await repository.getEmailDelivery(deliveryKey);
      if (audit?.status !== "sent") await repository.updateEmailDelivery(deliveryKey, { status: "failed", sentAt: null, lastError: error instanceof Error ? error.message : "Unknown email error" });
    throw error;
  }
  return repositoryTransaction(repository, `reservation:${reservation.id}`, async repo => {
    const current = (await repo.listReservations()).find(item => item.id === reservation.id);
    if (!current || !isConfirmedReservation(current) || confirmationEmailIdempotencyKey(current) !== confirmationEmailIdempotencyKey(reservation)) {
      throw Object.assign(new Error("送信中に予約内容が変更されました。最新の内容で確認連絡を行ってください。"), { statusCode: 409 });
    }
    return reconcileReservationReadiness(repo, await repo.updateConfirmationContact(reservation.id, now.toISOString()));
  });
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
  return ["reservation-confirmation", reservation.id, revision, scope].filter(Boolean).join("/");
}

export function confirmationEmailDaysBefore() {
  const value = Number(process.env.CONFIRMATION_EMAIL_DAYS_BEFORE ?? defaultDaysBefore);
  return Number.isFinite(value) && value >= 0 ? value : defaultDaysBefore;
}
