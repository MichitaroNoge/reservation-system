import { isConfirmedReservation, isTemporaryReservationExpired, isVisitReadyReservation, reservationAssignments, reservationStatusLabel, type Reservation, type ReservationStatus } from "./domain";

export const reservationFilters = ["すべて", "承認待ち", "仮予約確定", "仮予約確定（期限切れ）", "本予約確定", "本予約確定（メニュー未確定）", "本予約確定（店舗未割当）", "本予約確定（未確認連絡）", "本予約確定（来店待ち）"] as const;
export const reservationSortKeys = ["status", "id", "customer", "date", "menu", "store", "contact"] as const;
export type SearchReservation = Omit<Reservation, "menuItems" | "totalAmount"> & { menuItems?: string[]; totalAmount?: number };
export type ReservationSearch = { search: string; dateFrom: string; dateTo: string; statuses: ReservationStatus[]; filter: typeof reservationFilters[number]; sortKey: typeof reservationSortKeys[number]; direction: "asc" | "desc" };
export function normalizedDateRange(query: Pick<ReservationSearch, "dateFrom" | "dateTo">) {
  return query.dateFrom && query.dateTo && query.dateFrom > query.dateTo ? { from: query.dateTo, to: query.dateFrom } : { from: query.dateFrom, to: query.dateTo };
}
export function reservationListStatus(reservation: SearchReservation, today: string) {
  if (isTemporaryReservationExpired(reservation, today)) return "仮予約確定（期限切れ）";
  return reservation.status === "waiting_for_visit" ? "本予約確定（来店待ち）" : reservationStatusLabel(reservation.status);
}
export function matchesReservation(r: SearchReservation, query: ReservationSearch, today: string) {
  const range = normalizedDateRange(query);
  if ((range.from && r.date < range.from) || (range.to && r.date > range.to)) return false;
  const keyword = query.search.trim().toLowerCase();
  if (keyword && ![r.id, r.customer, r.groupName ?? "", r.phone, r.email ?? ""].some(value => value.toLowerCase().includes(keyword))) return false;
  if (query.statuses.length && !query.statuses.includes(r.status)) return false;
  switch (query.filter) {
    case "すべて": return true;
    case "承認待ち": return ["temporary_requested", "confirmed_requested", "cancellation_requested"].includes(r.status);
    case "仮予約確定（期限切れ）": return isTemporaryReservationExpired(r, today);
    case "本予約確定": return isConfirmedReservation(r);
    case "本予約確定（メニュー未確定）": return isConfirmedReservation(r) && !r.menuItems?.length;
    case "本予約確定（店舗未割当）": return isConfirmedReservation(r) && !reservationAssignments(r).length;
    case "本予約確定（未確認連絡）": return isConfirmedReservation(r) && !r.confirmationContactedAt;
    case "本予約確定（来店待ち）": return isVisitReadyReservation(r);
    default: return reservationStatusLabel(r.status) === query.filter;
  }
}
export function reservationSortValue(r: SearchReservation, key: ReservationSearch["sortKey"], today: string): string | number {
  switch (key) {
    case "status": return reservationListStatus(r, today);
    case "id": return Number(r.id.replace(/\D/g, "")) || r.id;
    case "customer": return r.customer;
    case "date": return r.date + "T" + (r.startTime || "10:00");
    case "menu": return (r.menuItems?.length ? r.menuItems : r.menu ? [r.menu] : []).join("、") || "メニュー未確定";
    case "store": return reservationAssignments(r).map(a => `${a.store} ${a.people}名`).join(" / ") || "未割当";
    case "contact": return r.confirmationContactedAt ? "連絡済み" + r.confirmationContactedAt : "未連絡";
  }
}
export function compareReservations(a: SearchReservation, b: SearchReservation, query: ReservationSearch, today: string) {
  const x = reservationSortValue(a, query.sortKey, today), y = reservationSortValue(b, query.sortKey, today);
  return compareReservationSortValues(x, y, query.direction);
}
const collator = new Intl.Collator("ja-JP", { numeric: true });
export function compareReservationSortValues(x: string | number, y: string | number, direction: "asc" | "desc") {
  const result = typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y));
  return direction === "asc" ? result : -result;
}
