import type { Reservation } from "../domain";
import type { ReservationRepository } from "../repositories/reservation-repository";

export async function reservationNotificationRecipients(repository: ReservationRepository, reservation: Reservation) {
  if (!reservation.accountId) return reservation.email ? [reservation.email] : [];
  const account = (await repository.listAccounts()).find((item) => item.id === reservation.accountId);
  if (!account) return reservation.email ? [reservation.email] : [];
  const additional = (await repository.listAccountContactEmails(account.id!)).filter((item) => item.verifiedAt).map((item) => item.email);
  return [...new Set([account.contact, ...additional].map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

export function deliveryRecipients(value: string) {
  const [to, ...bcc] = value.split(",").map((email) => email.trim()).filter(Boolean);
  return { to, bcc };
}
