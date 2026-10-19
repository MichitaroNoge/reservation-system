import { isConfirmedReservation, isTemporaryReservationExpired, type Reservation } from "./domain";
export type ReminderKind = "booking" | "menu";
export function isReservationReminderTarget(reservation: Pick<Reservation,"status"|"date"> & {menuItems?:string[]}, kind: ReminderKind, today: string) {
  if (reservation.date < today) return false;
  return kind === "booking" ? isTemporaryReservationExpired(reservation,today) : isConfirmedReservation(reservation) && !reservation.menuItems?.length;
}
