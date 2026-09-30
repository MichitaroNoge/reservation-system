import { isConfirmedReservation, type Reservation } from "../domain";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { buildEmailContent } from "../email/email-layout";
import { reservationTemplateVariables } from "../email/email-template-catalog";
import { getOrCreateEmailDelivery, renderRepositoryEmail } from "../email/template-email-service";
import type { EmailClient } from "../email/resend-email-client";
import { repositoryEmailClient } from "../email/email-sender-settings";

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
  const emailClient = options.emailClient ?? await repositoryEmailClient(repository);
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
      await sendConfirmationEmailForReservation(repository, reservation.id, { now, emailClient });
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
  const emailClient = options.emailClient ?? await repositoryEmailClient(repository);
  const reservation = (await repository.listReservations()).find((item) => item.id === reservationId);
  if (!reservation) throw new Error(`Reservation not found: ${reservationId}`);
  if (reservation.confirmationContactedAt) return reservation;
  if (!reservation.email) throw new Error(`Reservation email is required: ${reservation.id}`);

  const deliveryKey = confirmationEmailIdempotencyKey(reservation, options.idempotencyKeyScope);
  let delivery = await repository.getEmailDelivery(deliveryKey);
  if (!delivery) {
    const rendered = await renderRepositoryEmail(repository, "reservation_reminder", reservationTemplateVariables(reservation));
    delivery = await getOrCreateEmailDelivery(repository, { deliveryKey, reservationId: reservation.id, templateKey: "reservation_reminder", recipient: reservation.email, subject: rendered.subject, body: rendered.body, status: "pending", requestedAt: now.toISOString(), sentAt: null, lastError: null });
  }
  const content = buildEmailContent(delivery.subject, delivery.body);
  try {
    await emailClient.send({ to: delivery.recipient, ...content, idempotencyKey: deliveryKey });
    await repository.updateEmailDelivery(deliveryKey, { status: "sent", sentAt: now.toISOString(), lastError: null });
    return repository.updateConfirmationContact(reservation.id, now.toISOString());
  } catch (error) {
    await repository.updateEmailDelivery(deliveryKey, { status: "failed", sentAt: null, lastError: error instanceof Error ? error.message : "Unknown email error" });
    throw error;
  }
}

export function isConfirmationEmailDue(reservation: Reservation, now: Date, daysBefore = confirmationEmailDaysBefore()) {
  if (!isConfirmedReservation(reservation)) return false;
  if (reservation.confirmationContactedAt) return false;
  const scheduledAt = confirmationEmailScheduledAt(reservation, daysBefore);
  return scheduledAt.getTime() <= now.getTime();
}

export function confirmationEmailScheduledAt(reservation: Pick<Reservation, "date">, daysBefore = confirmationEmailDaysBefore()) {
  const [year, month, day] = reservation.date.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0));
  date.setUTCDate(date.getUTCDate() - daysBefore);
  return date;
}

export function confirmationEmailIdempotencyKey(reservation: Pick<Reservation, "id">, scope?: string) {
  return scope ? `reservation-confirmation/${reservation.id}/${scope}` : `reservation-confirmation/${reservation.id}`;
}

export function confirmationEmailDaysBefore() {
  const value = Number(process.env.CONFIRMATION_EMAIL_DAYS_BEFORE ?? defaultDaysBefore);
  return Number.isFinite(value) && value >= 0 ? value : defaultDaysBefore;
}
