import { calculateReservationEndTime, type CreateReservationChangeRequestInput, type ReservationChangeRequest, type Reservation, type Menu } from "./domain";

/** Preserve an explicitly scheduled end when the time and menu selection are unchanged. */
export function reservationChangeEndTime(current: Pick<Reservation, "startTime" | "endTime" | "menuItems">, request: Pick<ReservationChangeRequest, "requestedStartTime" | "requestedMenuItems">, menus: Pick<Menu, "name" | "duration">[]) {
  const left = [...current.menuItems].sort(), right = [...request.requestedMenuItems].sort();
  const unchanged = (current.startTime ?? "10:00") === request.requestedStartTime && left.length === right.length && left.every((name, index) => name === right[index]);
  return unchanged && current.endTime ? current.endTime : calculateReservationEndTime(request.requestedStartTime, request.requestedMenuItems, menus);
}

type ChangeDetails = Pick<CreateReservationChangeRequestInput, "reservationId" | "requestedDate" | "requestedStartTime" | "requestedPeople" | "requestedMenuItems" | "reason">;
/** Used by the server and UI so reconfirmation cannot reopen a different change after its cutoff. */
export function matchesPendingReservationChange(request: ReservationChangeRequest, input: ChangeDetails) {
  const left = [...request.requestedMenuItems].sort(), right = [...input.requestedMenuItems].sort();
  return request.status === "requested" && request.reservationId === input.reservationId.trim().toUpperCase()
    && request.requestedDate === input.requestedDate && request.requestedStartTime === input.requestedStartTime
    && request.requestedPeople === input.requestedPeople && (request.reason ?? "") === (input.reason ?? "").trim()
    && left.length === right.length && left.every((name, index) => name === right[index]);
}
