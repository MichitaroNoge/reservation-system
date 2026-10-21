import type { CreateReservationChangeRequestInput, ReservationChangeRequest } from "./domain";

type ChangeDetails = Pick<CreateReservationChangeRequestInput, "reservationId" | "requestedDate" | "requestedStartTime" | "requestedPeople" | "requestedMenuItems" | "reason">;
/** Used by the server and UI so reconfirmation cannot reopen a different change after its cutoff. */
export function matchesPendingReservationChange(request: ReservationChangeRequest, input: ChangeDetails) {
  const left = [...request.requestedMenuItems].sort(), right = [...input.requestedMenuItems].sort();
  return request.status === "requested" && request.reservationId === input.reservationId.trim().toUpperCase()
    && request.requestedDate === input.requestedDate && request.requestedStartTime === input.requestedStartTime
    && request.requestedPeople === input.requestedPeople && (request.reason ?? "") === (input.reason ?? "").trim()
    && left.length === right.length && left.every((name, index) => name === right[index]);
}
