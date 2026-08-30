import {
  calculateReservationEndTime,
  reservationAssignments,
  reservationStatusLabel,
} from "@/lib/domain";
import { DEFAULT_START_TIME } from "./constants";
import type { BookingForm, Customer, Menu, Reservation, Status } from "./types";

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

export function reservationBookingTypeLabel(reservation: Pick<Reservation, "bookingType">) {
  return reservation.bookingType === "travel_agency_group" ? "旅行会社様専用 団体予約" : "一般予約";
}

export function reservationBookingTypeShortLabel(reservation: Pick<Reservation, "bookingType">) {
  return reservation.bookingType === "travel_agency_group" ? "旅行会社" : "一般";
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

export function reservationDateTimeLabel(reservation: Pick<Reservation, "date" | "startTime" | "endTime">) {
  const endTime = reservation.endTime ? `〜${reservation.endTime}` : "";
  return `${reservation.date.replaceAll("-", "/")} ${reservationStartTime(reservation)}${endTime}`;
}

export function bookingFormDateTimeLabel(form: Pick<BookingForm, "date" | "startTime" | "endTime">) {
  if (!form.date && !form.startTime) return "日時未入力";
  if (!form.date) return `日付未入力 ${form.startTime}`;
  if (!form.startTime) return `${form.date.replaceAll("-", "/")} 時刻未入力`;
  const endTime = form.endTime ? `〜${form.endTime}` : "";
  return `${form.date.replaceAll("-", "/")} ${form.startTime}${endTime}`;
}

export function bookingFormEndTime(form: Pick<BookingForm, "startTime" | "menuItems" | "endTime">, menuCatalog: Pick<Menu, "name" | "duration">[]) {
  if (!form.startTime) return "";
  return form.endTime || calculateReservationEndTime(form.startTime, form.menuItems, menuCatalog);
}

export function daysUntilVisit(date: string) {
  const visitDate = new Date(`${date}T00:00:00`);
  const today = new Date(`${todayIso()}T00:00:00`);
  if (Number.isNaN(visitDate.getTime()) || Number.isNaN(today.getTime())) return Number.POSITIVE_INFINITY;
  return Math.ceil((visitDate.getTime() - today.getTime()) / 86400000);
}

export function assignmentLabel(reservation: Reservation) {
  const assignments = reservationAssignments(reservation);
  return assignments.length ? assignments.map((assignment) => `${assignment.store} ${assignment.people}名`).join(" / ") : "";
}

export function isConfirmationContactDue(reservation: Reservation, windowDays: number) {
  const days = daysUntilVisit(reservation.date);
  return reservation.status === "confirmed" && !reservation.confirmationContactedAt && days >= 0 && days < windowDays;
}

function addCalendarMonths(date: Date, months: number) {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function isTemporaryReservationExpired(reservation: Reservation) {
  if (reservation.status !== "temporary_confirmed") return false;
  const visitDate = new Date(`${reservation.date}T00:00:00`);
  if (Number.isNaN(visitDate.getTime())) return false;
  return visitDate < addCalendarMonths(new Date(`${todayIso()}T00:00:00`), 1);
}

export function reservationDisplayLabel(reservation: Reservation) {
  if (isTemporaryReservationExpired(reservation)) return "仮予約確定（期限切れ）";
  if (reservation.status === "waiting_for_visit") return "本予約確定（来店待ち）";
  return statusLabel(reservation.status);
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

/**
 * Compatibility fallback used by the current admin page while Account API migration is in progress.
 * Never derive a login Account from an admin/guest reservation snapshot. Only reservations that
 * already carry accountId may participate in this fallback view.
 */
export function buildCustomers(reservations: Reservation[]): Customer[] {
  const grouped = new Map<string, Customer>();
  reservations.filter((reservation) => Boolean(reservation.accountId)).forEach((reservation) => {
    const key = reservation.accountId!;
    const current = grouped.get(key);
    grouped.set(key, {
      id: key,
      name: reservation.customer,
      contact: reservation.email ?? current?.contact ?? "",
      phone: reservation.phone,
      address: reservation.address ?? current?.address,
      accountType: current?.accountType ?? (reservation.bookingType === "travel_agency_group" ? "travel_agency" : "individual"),
      count: (current?.count ?? 0) + 1,
      last: reservation.date.replaceAll("-", "/"),
    });
  });
  return Array.from(grouped.values());
}
