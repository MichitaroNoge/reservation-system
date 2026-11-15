import type { ApprovalEmailDelivery, Reservation, ReservationChangeRequest } from "./domain";

export const historyKinds = ["reservation", "confirmed_conversion", "change", "cancellation", "admin_edit", "manual_status"] as const;
export type HistoryKind = typeof historyKinds[number];
export const historyStatuses = ["requested", "approved", "rejected", "completed", "unknown"] as const;
export type HistoryStatus = typeof historyStatuses[number];
export type HistoryActor = { uid: string; label: string; role: "admin" | "customer" | "system" };
export type ReservationSnapshot = Partial<Pick<Reservation, typeof snapshotKeys[number]>> & { feeAcknowledgement?: ReservationChangeRequest["feeAcknowledgement"]; cancellationFeeAcknowledged?: boolean; cancellationFeeAcknowledgedAt?: string; cancellationFeeNotice?: string; notificationReference?: { deliveryKey: string; requestedAt: string } };
export type ReservationHistory = {
  id: string; eventKey: string; reservationCode: string; kind: HistoryKind; status: HistoryStatus;
  referenceId: string | null; requestedAt: string | null; requestedBy: HistoryActor | null;
  before: ReservationSnapshot | null; requested: ReservationSnapshot | null;
  processedAt: string | null; processedBy: HistoryActor | null;
  appliedBefore: ReservationSnapshot | null; after: ReservationSnapshot | null;
  reason: string | null; legacy: boolean;
  customerDisplay?: string; customerFromCurrent?: boolean;
  notification?: { state: "not_requested" | "pending" | "sent" | "failed" | "stopped" | "unknown"; sentAt: string | null; nextAttemptAt: string | null };
};
export type HistoryQuery = { reservationId?: string; kind?: HistoryKind; status?: HistoryStatus; keyword: string; from?: string; to?: string; page: number; pageSize: number };
export type HistoryPage = { items: ReservationHistory[]; total: number; page: number; pageSize: number; supported: boolean };
export const historyKindLabels: Record<HistoryKind, string> = { reservation: "予約申請", confirmed_conversion: "本予約への変更申請", change: "予約変更申請", cancellation: "キャンセル申請", admin_edit: "管理者による予約編集", manual_status: "手動ステータス変更" };
export function historyStatusLabel(entry: Pick<ReservationHistory, "kind" | "status">) {
  return entry.status === "approved" ? entry.kind === "cancellation" ? "キャンセル確定" : "承認済み" : entry.status === "completed" && !["admin_edit", "manual_status"].includes(entry.kind) ? "手動処理済み" : ({ requested: "未対応", rejected: "却下済み", completed: "変更済み", unknown: "処理結果不明" } as const)[entry.status];
}

/** Delivery is live related data, never part of the frozen application snapshot. */
export function historyNotification(entry: ReservationHistory, deliveries: ApprovalEmailDelivery[]): NonNullable<ReservationHistory["notification"]> {
  const empty = { sentAt: null, nextAttemptAt: null };
  if (entry.status === "requested") return { state: "not_requested", ...empty };
  if (entry.status === "rejected") return { state: entry.legacy ? "unknown" : "not_requested", ...empty };
  if (entry.status === "unknown") return { state: "unknown", ...empty };
  let type: ApprovalEmailDelivery["type"] | undefined;
  let reference: string | null = null;
  if (entry.status === "approved" || entry.status === "completed") {
    if (entry.kind === "change") { type = "reservation_change_approved"; reference = entry.referenceId; }
    else if (entry.kind === "confirmed_conversion" && (!entry.after || entry.after.status === "confirmed")) { type = "confirmed_change_approved"; reference = "confirmed"; }
    else if (entry.kind === "cancellation" && (!entry.after || entry.after.status === "cancelled")) { type = "cancellation_approved"; reference = "cancelled"; }
    else if (entry.kind === "reservation" && (!entry.after || ["temporary_confirmed", "confirmed"].includes(entry.after.status ?? ""))) { type = "reservation_approved"; reference = entry.after?.status ?? null; }
  }
  if (!type && !entry.after?.notificationReference) return { state: entry.legacy ? "unknown" : "not_requested", ...empty };
  const link = entry.after?.notificationReference;
  const delivery = link ? deliveries.find(row => row.reservationId === entry.reservationCode && row.deliveryKey === link.deliveryKey && Date.parse(row.requestedAt) === Date.parse(link.requestedAt)) : entry.legacy && entry.kind === "change" ? deliveries.find(row => row.reservationId === entry.reservationCode && row.type === type && row.referenceId === reference && !!entry.processedAt && Date.parse(row.requestedAt) >= Date.parse(entry.processedAt)) : undefined;
  if (!delivery) return { state: "unknown", ...empty };
  return { state: delivery.sentAt ? "sent" : delivery.stoppedAt ? "stopped" : delivery.lastError || delivery.retryCount >= 5 ? "failed" : "pending", sentAt: delivery.sentAt ?? null, nextAttemptAt: delivery.nextAttemptAt ?? null };
}
const snapshotKeys = ["id", "customer", "email", "phone", "address", "accountType", "companyBranchName", "contactPersonName", "bookingType", "bookingContactName", "dayContactName", "dayContactPhone", "groupName", "groupNameKana", "groupType", "groupTypeOther", "tcCount", "dgCount", "paymentCondition", "remarks", "date", "startTime", "endTime", "people", "initialConfirmedPeople", "menuItems", "totalAmount", "store", "storeAssignments", "status", "requestType", "policyAgreement", "policyConsents", "confirmationContactedAt", "revision"] as const;
export function reservationSnapshot(reservation: Reservation): ReservationSnapshot {
  return structuredClone(Object.fromEntries(snapshotKeys.filter(key => reservation[key] !== undefined).map(key => [key, reservation[key]])));
}
export function requestedChangeSnapshot(reservation: Reservation, request: Pick<ReservationChangeRequest, "requestedDate" | "requestedStartTime" | "requestedPeople" | "requestedMenuItems">): ReservationSnapshot {
  const result = { ...reservationSnapshot(reservation), date: request.requestedDate, startTime: request.requestedStartTime, people: request.requestedPeople, menuItems: [...request.requestedMenuItems] };
  if (request.requestedStartTime !== reservation.startTime || JSON.stringify(request.requestedMenuItems) !== JSON.stringify(reservation.menuItems)) delete result.endTime;
  if (JSON.stringify(request.requestedMenuItems) !== JSON.stringify(reservation.menuItems)) delete result.totalAmount;
  return result;
}
export function historyActor(user: { uid: string; name?: unknown; email?: unknown }, role: HistoryActor["role"]): HistoryActor {
  return { uid: user.uid, label: typeof user.name === "string" && user.name.trim() ? user.name : typeof user.email === "string" && user.email.trim() ? user.email : role === "admin" ? "管理者" : "お客様", role };
}
export function matchesHistory(row: ReservationHistory, query: HistoryQuery) {
  const date = row.processedAt ?? row.requestedAt;
  const japanDate = date ? new Date(Date.parse(date) + 9 * 3600000).toISOString().slice(0, 10) : null;
  return (query.reservationId || row.status !== "requested") && (!query.reservationId || row.reservationCode === query.reservationId) && (!query.kind || row.kind === query.kind) && (!query.status || row.status === query.status)
    && (!query.keyword || [row.reservationCode, row.requested?.customer, row.customerDisplay].some(value => value?.toLocaleLowerCase().includes(query.keyword.toLocaleLowerCase())))
    && (!query.from || !!japanDate && japanDate >= query.from) && (!query.to || !!japanDate && japanDate <= query.to);
}
