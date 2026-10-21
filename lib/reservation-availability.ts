import { policyConsentDetail } from "./cancellation-policy-consent";
import { menuDurationMinutes, paymentConditionLabel, type AcceptanceBlock, type Menu, type Reservation, type ReservationStatus } from "./domain";

export type AvailabilityReservation = Pick<Reservation, "id" | "date" | "startTime" | "endTime" | "menuItems" | "people" | "status" | "customer" | "requestType" | "tcCount" | "cancellationPreviousStatus" | "initialConfirmedPeople">;
const seatedPeople = (r: Pick<Reservation, "people" | "tcCount">) => r.people;
type Kind = "booked" | "temporary" | "pending";
export const reservationOccupancyKind = (r: AvailabilityReservation): Kind | null => {
  if (r.status === "cancellation_requested") {
    if (r.cancellationPreviousStatus && r.cancellationPreviousStatus !== "cancellation_requested") return reservationOccupancyKind({ ...r, status: r.cancellationPreviousStatus });
    return r.initialConfirmedPeople != null ? "booked" : "pending";
  }
  if (["confirmed", "waiting_for_visit", "visited"].includes(r.status)) return "booked";
  if (r.status === "temporary_confirmed" || (r.status === "confirmed_requested" && r.requestType === "confirmed_from_temporary")) return "temporary";
  return ["temporary_requested", "confirmed_requested"].includes(r.status) ? "pending" : null;
};
export function approvalDecision(status: ReservationStatus, requestType?: Reservation["requestType"]) {
  if (status === "temporary_requested") return { approve: "temporary_confirmed", reject: "temporary_rejected" } as const;
  if (status === "confirmed_requested") return { approve: "confirmed", reject: requestType === "confirmed_from_temporary" ? "temporary_confirmed" : "confirmed_rejected" } as const;
  return null;
}
export function reservationInterval(r: AvailabilityReservation, menus: Pick<Menu, "name" | "duration">[]) {
  const day = Date.parse(`${r.date}T00:00:00Z`) / 60000;
  if (!Number.isFinite(day)) return null;
  const minutes = (value?: string) => { const m = value?.match(/^([01]\d|2[0-3]):([0-5]\d)$/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const start = minutes(r.startTime), end = minutes(r.endTime);
  const durations = menus.filter(menu => r.menuItems.includes(menu.name)).map(menuDurationMinutes);
  const duration = durations.length ? Math.max(...durations) : 0;
  const uncertain = start === null || (end === null && !duration) || (start === end && !duration);
  const begin = day + (start ?? 0);
  const finish = end !== null && start !== end ? day + end + (end < (start ?? 0) ? 1440 : 0) : begin + (duration || 1440);
  return { start: begin, end: finish, uncertain };
}
export function reservationAvailability(target: AvailabilityReservation, reservations: AvailabilityReservation[], capacity: number | null, menus: Pick<Menu, "name" | "duration">[], blockedPeriods: AcceptanceBlock[] = []) {
  const range = reservationInterval(target, menus);
  const overlaps = reservations.flatMap(reservation => {
    const kind = reservationOccupancyKind(reservation), span = reservationInterval(reservation, menus);
    if (!range || !kind || !span || reservation.id === target.id || span.start >= range.end || span.end <= range.start) return [];
    return [{ id: reservation.id, customer: reservation.customer, date: reservation.date, startTime: reservation.startTime, endTime: reservation.endTime, people: seatedPeople(reservation), tcCount: reservation.tcCount ?? 0, status: reservation.status, kind, uncertain: span.uncertain, start: Math.max(range.start, span.start), end: Math.min(range.end, span.end) }];
  }).sort((a,b) => a.start - b.start || a.id.localeCompare(b.id));
  const points = [...new Set(range ? [range.start, ...overlaps.flatMap(r => [r.start, r.end])].filter(t => t < range.end) : [])].sort((a,b) => a-b);
  let bookedPeak = 0, combinedPeak = 0, pendingPeak = 0, atCombinedBooked = 0, atCombinedTemporary = 0;
  for (const point of points) {
    const active = overlaps.filter(r => r.start <= point && r.end > point);
    const total = (kind: Kind) => active.filter(r => r.kind === kind).reduce((n,r) => n+r.people, 0);
    const booked = total("booked"), temporary = total("temporary");
    bookedPeak = Math.max(bookedPeak, booked); pendingPeak = Math.max(pendingPeak, total("pending"));
    if (booked + temporary >= combinedPeak) { combinedPeak = booked + temporary; atCombinedBooked = booked; atCombinedTemporary = temporary; }
  }
  const blocked = blockedPeriods.filter(period => !range || (Date.parse(`${period.start}:00Z`) / 60000 < range.end && Date.parse(`${period.end}:00Z`) / 60000 > range.start));
  return { blockedPeriods: blocked, capacity, bookedPeak, combinedPeak, pendingPeak, current: seatedPeople(target), bookedAtPeak: atCombinedBooked, temporaryAtPeak: atCombinedTemporary,
    remaining: capacity === null ? null : capacity - bookedPeak - seatedPeople(target),
    combined: combinedPeak + seatedPeople(target), uncertain: !range || range.uncertain || overlaps.some(r => r.uncertain),
    overlaps: overlaps.map(({ start: _start, end: _end, ...row }) => { void _start; void _end; return row; }) };
}
export type ReservationAvailability = ReturnType<typeof reservationAvailability>;
export type AvailabilityResponse = { reservation: Reservation; availability: ReservationAvailability };

export function reservationApplicationDetails(r: Reservation) {
  const group = r.bookingType === "travel_agency_group";
  const values: [string, string | number | undefined | null][] = [
    ["予約ID", r.id], ["受付日時", r.received], ["申請区分", r.status.startsWith("temporary") ? "仮予約" : "本予約"],
    ["利用者区分", r.accountType ? r.accountType === "travel_agency" ? "旅行会社の担当者様" : "一般のお客様" : group ? "旅行会社の担当者様" : "未記録"],
    ["予約区分", group ? "旅行会社団体" : "一般"], ["予約者氏名・会社名", r.customer], ["会社・支店名", r.companyBranchName], ["担当者名", r.contactPersonName],
    ["メールアドレス", r.email], ["電話番号", r.phone], ["住所", r.address], ["利用日", r.date], ["開始時間", r.startTime], ["終了時間", r.endTime], ["人数", `${r.people}名`],
    ["メニュー", r.menuItems.join("、") || r.menu], ["予約担当者名", r.bookingContactName], ["当日連絡先氏名", r.dayContactName], ["当日連絡先電話番号", r.dayContactPhone],
    ["団体名", r.groupName], ["団体名フリガナ", r.groupNameKana], ["団体区分", r.groupType], ["団体区分（その他）", r.groupTypeOther],
    ["TC人数", r.tcCount], ["DG人数", r.dgCount], ["支払条件", r.paymentCondition ? paymentConditionLabel(r.paymentCondition) : undefined], ["備考", r.remarks],
    ["規約同意", r.policyAgreement ? `${r.policyAgreement.kind === "temporary" ? "仮予約" : "本予約"}規約に同意済み` : "未記録"], ["同意日時", r.policyAgreement?.acceptedAt],
  ];
  for (const [index, consent] of (r.policyConsents ?? []).entries()) values.push([`キャンセルポリシー同意記録 ${index + 1}`, policyConsentDetail(consent)]);
  return values.map(([label,value]) => ({ label, value: value === undefined || value === null || value === "" ? "—" : String(value) }));
}
