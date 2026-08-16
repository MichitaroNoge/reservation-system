import {
  daysUntilVisit as calculateDaysUntilVisit,
  isConfirmationContactDue as isConfirmationContactDueByRule,
  isTemporaryReservationExpired as isTemporaryReservationExpiredByRule,
  reservationAssignments,
  reservationDisplayStatusLabel,
  reservationStatusLabel,
} from "@/lib/domain";
import { DEFAULT_START_TIME } from "./constants";
import type { BookingForm, Customer, Reservation, Status } from "./types";

export function statusLabel(status: Status) {
  return reservationStatusLabel(status);
}

export function reservationMenuLabel(reservation: Reservation) {
  const items = reservation.menuItems?.length ? reservation.menuItems : reservation.menu ? [reservation.menu] : [];
  return menuSelectionLabel(items);
}

export function reservationCustomerSubLabel(reservation: Reservation) {
  return reservation.bookingType === "travel_agency_group" && reservation.groupName ? reservation.groupName : "";
}

export function policyAgreementLabel(reservation: Reservation) {
  if (!reservation.policyAgreement) return "未同意";
  const label = reservation.policyAgreement.kind === "temporary" ? "仮予約の注意事項" : "キャンセルポリシー";
  return `${label}に同意済み（${new Date(reservation.policyAgreement.acceptedAt).toLocaleString("ja-JP")}）`;
}

export function menuSelectionLabel(menuItems: string[]) {
  return menuItems.length ? menuItems.join("、") : "メニュー未確定";
}

export function reservationStartTime(reservation: Pick<Reservation, "startTime">) {
  return reservation.startTime || DEFAULT_START_TIME;
}

export function reservationDateTimeLabel(reservation: Pick<Reservation, "date" | "startTime">) {
  return `${reservation.date.replaceAll("-", "/")} ${reservationStartTime(reservation)}`;
}

export function bookingFormDateTimeLabel(form: Pick<BookingForm, "date" | "startTime">) {
  return `${form.date.replaceAll("-", "/")} ${form.startTime || DEFAULT_START_TIME}`;
}

export function daysUntilVisit(date: string) {
  return calculateDaysUntilVisit(date, todayIso());
}

export function assignmentLabel(reservation: Reservation) {
  const assignments = reservationAssignments(reservation);
  return assignments.length ? assignments.map((assignment) => `${assignment.store} ${assignment.people}名`).join(" / ") : "";
}

export function isConfirmationContactDue(reservation: Reservation, windowDays: number) {
  return isConfirmationContactDueByRule(reservation, windowDays, todayIso());
}

export function isTemporaryReservationExpired(reservation: Reservation) {
  return isTemporaryReservationExpiredByRule(reservation, todayIso());
}

export function reservationDisplayLabel(reservation: Reservation) {
  return reservationDisplayStatusLabel(reservation, todayIso());
}

export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function monthIso(date: string) {
  return date.slice(0, 7);
}

export function dateHeadingLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}

export function fullDateHeadingLabel(date: string) {
  const [year, month, day] = date.split("-");
  const weekday = new Date(`${date}T00:00:00`).toLocaleDateString("ja-JP", { weekday: "short" });
  return `${Number(year)}年${Number(month)}月${Number(day)}日（${weekday}）`;
}

export function selectedMenuTotal(menuItems: string[], menuCatalog: { name: string; price: number }[]) {
  return menuItems.reduce((total, name) => total + (menuCatalog.find((menu) => menu.name === name)?.price ?? 0), 0);
}

export function buildCustomers(reservations: Reservation[]): Customer[] {
  const grouped = new Map<string, Customer>();
  reservations.forEach((reservation) => {
    const current = grouped.get(reservation.customer);
    grouped.set(reservation.customer, {
      name: reservation.customer,
      contact: reservation.email ?? current?.contact ?? "customer@example.jp",
      phone: reservation.phone,
      address: reservation.address ?? current?.address,
      accountType: current?.accountType ?? (reservation.bookingType === "travel_agency_group" ? "travel_agency" : "individual"),
      count: (current?.count ?? 0) + 1,
      last: reservation.date.replaceAll("-", "/"),
    });
  });
  return Array.from(grouped.values());
}
