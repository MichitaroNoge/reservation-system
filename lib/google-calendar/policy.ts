import type { ReservationStatus } from "../domain";

export type ApprovedKind = "temporary" | "confirmed" | "approved";
export function approvedKind(status: ReservationStatus, requestType?: string | null, previous: ApprovedKind | null = null): ApprovedKind | null {
  if (status === "temporary_confirmed" || (status === "confirmed_requested" && requestType === "confirmed_from_temporary")) return "temporary";
  if (["confirmed", "waiting_for_visit", "visited"].includes(status)) return "confirmed";
  return status === "cancellation_requested" ? previous : null;
}
export type CalendarBooking = {
  number: string; customer: string; date: string; start: string; end: string | null;
  people: number; kind: ApprovedKind; cancellationPending: boolean; menus: string[];
  stores: { name: string; people: number }[];
};
export type CalendarEvent = {
  summary: string; description: string; colorId: string; visibility: "default";
  start: { dateTime: string; timeZone: "Asia/Tokyo" }; end: { dateTime: string; timeZone: "Asia/Tokyo" };
  extendedProperties: { private: { reservationSystem: "v1"; reservationNumber: string } };
};
export function calendarEvent(booking: CalendarBooking): CalendarEvent {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.start) || !booking.end || !/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.end)) throw new Error("invalid_time");
  const endDate = booking.end > booking.start ? booking.date : new Date(Date.parse(`${booking.date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  return {
    summary: `【${booking.cancellationPending ? "キャンセル申請中・" : ""}${booking.kind === "temporary" ? "仮予約" : booking.kind === "approved" ? "承認済み" : "本予約"}】${booking.customer}・${booking.people}名／${booking.number}`,
    description: [`予約番号：${booking.number}`, `人数：${booking.people}名`, `店舗：${booking.stores.length ? booking.stores.map(s => `${s.name} ${s.people}名`).join("・") : "未割当"}`, `メニュー：${booking.menus.join("・") || "来店後に注文"}`, "予約内容の変更は予約管理サイトで行ってください。"].join("\n"),
    colorId: booking.kind === "temporary" ? "5" : "9", visibility: "default",
    start: { dateTime: `${booking.date}T${booking.start}:00+09:00`, timeZone: "Asia/Tokyo" },
    end: { dateTime: `${endDate}T${booking.end}:00+09:00`, timeZone: "Asia/Tokyo" },
    extendedProperties: { private: { reservationSystem: "v1", reservationNumber: booking.number } },
  };
}
