import { isConfirmedReservation, type Reservation } from "../domain";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { buildConfirmationEmailContent } from "../email/confirmation-email-template";
import { ResendEmailClient, type EmailClient } from "../email/resend-email-client";

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
};

const defaultDaysBefore = 6;

export async function sendDueConfirmationEmails(
  repository: ReservationRepository,
  options: ConfirmationEmailServiceOptions = {},
): Promise<ConfirmationEmailRunResult> {
  const now = options.now ?? new Date();
  const daysBefore = options.daysBefore ?? confirmationEmailDaysBefore();
  const emailClient = options.emailClient ?? new ResendEmailClient();
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
      const content = buildConfirmationEmailContent(reservation);
      await emailClient.send({
        to: reservation.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
        idempotencyKey: confirmationEmailIdempotencyKey(reservation),
      });
      await repository.updateConfirmationContact(reservation.id, now.toISOString());
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

export function confirmationEmailIdempotencyKey(reservation: Pick<Reservation, "id">) {
  return `reservation-confirmation/${reservation.id}`;
}

export function confirmationEmailDaysBefore() {
  const value = Number(process.env.CONFIRMATION_EMAIL_DAYS_BEFORE ?? defaultDaysBefore);
  return Number.isFinite(value) && value >= 0 ? value : defaultDaysBefore;
}
