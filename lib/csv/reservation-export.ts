import { paymentConditionLabel, reservationAssignments } from "../domain";
import { reservationListStatus, type SearchReservation } from "../reservation-search";
import { csvLine } from "./encoding";

const japanDateTimeFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
export function japaneseDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = japanDateTimeFormat.formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}
export function exportFileName(now: Date) { return `reservations_${japaneseDateTime(now.toISOString()).replaceAll(/[-:]/g, "").replace(" ", "_")}.csv`; }
type Column = { header: string; value: (r: SearchReservation, today: string) => string | number };
export const reservationExportColumns: readonly Column[] = [
  { header: "予約ID", value: r => r.id }, { header: "受付日時", value: r => japaneseDateTime(r.received) },
  { header: "予約区分", value: r => r.bookingType === "travel_agency_group" ? "旅行会社団体" : "一般" },
  { header: "利用者区分", value: r => r.accountType === "travel_agency" ? "旅行会社担当者" : r.accountType === "individual" ? "一般のお客様" : "" },
  { header: "ステータス", value: (r, today) => reservationListStatus(r, today) },
  { header: "予約者名・会社名", value: r => r.customer }, { header: "会社・支店名", value: r => r.companyBranchName ?? "" },
  { header: "旅行会社担当者名", value: r => r.contactPersonName ?? "" }, { header: "団体名", value: r => r.groupName ?? "" },
  { header: "団体名フリガナ", value: r => r.groupNameKana ?? "" }, { header: "団体区分", value: r => r.groupType ?? "" },
  { header: "団体区分その他", value: r => r.groupTypeOther ?? "" }, { header: "利用日", value: r => r.date },
  { header: "開始時刻", value: r => r.startTime ?? "" }, { header: "終了時刻", value: r => r.endTime ?? "" },
  { header: "予約人数", value: r => r.people }, { header: "T/C人数", value: r => r.tcCount ?? 0 }, { header: "DG人数", value: r => r.dgCount ?? 0 },
  { header: "メニュー", value: r => (r.menuItems?.length ? r.menuItems : r.menu ? [r.menu] : []).join(" / ") },
  { header: "店舗割当", value: r => reservationAssignments(r).map(a => `${a.store}：${a.people}名`).join(" / ") },
  { header: "予約担当者名", value: r => r.bookingContactName ?? "" }, { header: "当日連絡先氏名", value: r => r.dayContactName ?? "" },
  { header: "当日連絡先電話番号", value: r => r.dayContactPhone ?? "" }, { header: "電話番号", value: r => r.phone },
  { header: "メールアドレス", value: r => r.email ?? "" }, { header: "住所", value: r => r.address ?? "" },
  { header: "備考", value: r => r.remarks ?? "" }, { header: "予約金額（円）", value: r => r.totalAmount ?? "" },
  { header: "支払条件", value: r => r.paymentCondition ? paymentConditionLabel(r.paymentCondition) : "" },
  { header: "確認連絡状況", value: r => r.confirmationContactedAt ? "連絡済み" : "未連絡" },
  { header: "確認連絡日時", value: r => japaneseDateTime(r.confirmationContactedAt) },
];
export function reservationCsvRow(r: SearchReservation, today: string) { return csvLine(reservationExportColumns.map(column => column.value(r, today))); }
export const reservationCsvHeader = () => "\uFEFF" + csvLine(reservationExportColumns.map(column => column.header));
