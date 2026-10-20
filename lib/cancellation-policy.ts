import type { Reservation, ReservationStatus } from "./domain";

export function isCompletedBooking(status: ReservationStatus) {
  return ["confirmed", "waiting_for_visit", "visited"].includes(status);
}

type PolicyReservation = Pick<Reservation, "status" | "people" | "initialConfirmedPeople">;
export type CancellationFeeNotice = { kind: "cancellation" | "reduction" | "unknown"; message: string };

/** A missing historical baseline must never be interpreted as a fee exemption. */
export function cancellationFeeNotice(reservation: PolicyReservation, requestedPeople?: number): CancellationFeeNotice | null {
  if (!isCompletedBooking(reservation.status)) return null;
  if (requestedPeople === undefined) return { kind: "cancellation", message: "本予約完了後の取り消しは、キャンセル料100％を頂きます。" };
  if (!Number.isInteger(requestedPeople) || requestedPeople < 1 || requestedPeople >= reservation.people) return null;
  const initial = reservation.initialConfirmedPeople;
  if (!initial || initial < 1) return { kind: "unknown", message: "本予約完了後、初回予約人数から50％以上の減員は、キャンセル料100％を頂きます。この予約は初回の本予約人数を確認できないため、適用の有無は店舗へお問い合わせください。" };
  if (requestedPeople * 2 > initial) return null;
  return { kind: "reduction", message: `初回の本予約${initial}名から${requestedPeople}名への変更は、${initial - requestedPeople}名の減員（50％以上）となるため、キャンセル料100％を頂きます。` };
}

type PeopleChange = { requestedDate: string; requestedStartTime: string; requestedPeople: number; requestedMenuItems: string[] };
export function isFeeExemptPeopleOnlyChange(reservation: PolicyReservation & Pick<Reservation, "date" | "startTime" | "menuItems">, input: PeopleChange) {
  const left = [...reservation.menuItems].sort();
  const right = [...input.requestedMenuItems].sort();
  return ["temporary_requested", "temporary_confirmed", "confirmed_requested", "confirmed", "waiting_for_visit"].includes(reservation.status)
    && input.requestedPeople !== reservation.people
    && Number.isInteger(input.requestedPeople) && input.requestedPeople > 0
    && !cancellationFeeNotice(reservation, input.requestedPeople)
    && reservation.date === input.requestedDate && (reservation.startTime ?? "10:00") === input.requestedStartTime
    && left.length === right.length && left.every((name, index) => name === right[index]);
}
