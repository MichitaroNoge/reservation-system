export type ReservationStatus =
  | "temporary_requested"
  | "temporary_confirmed"
  | "confirmed_requested"
  | "confirmed"
  | "waiting_for_visit"
  | "visited"
  | "cancellation_requested"
  | "cancelled";

export const reservationStatuses = [
  "temporary_requested",
  "temporary_confirmed",
  "confirmed_requested",
  "confirmed",
  "waiting_for_visit",
  "visited",
  "cancellation_requested",
  "cancelled",
] as const satisfies readonly ReservationStatus[];

export const defaultReservationStatus: ReservationStatus = "temporary_requested";

export const reservationStatusCodes = {
  temporaryRequested: "temporary_requested",
  temporaryConfirmed: "temporary_confirmed",
  confirmedRequested: "confirmed_requested",
  confirmed: "confirmed",
  waitingForVisit: "waiting_for_visit",
  visited: "visited",
  cancellationRequested: "cancellation_requested",
  cancelled: "cancelled",
} as const satisfies Record<string, ReservationStatus>;

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  temporary_requested: "仮予約申請中",
  temporary_confirmed: "仮予約確定",
  confirmed_requested: "本予約申請中",
  confirmed: "本予約確定",
  waiting_for_visit: "来店待ち",
  visited: "来店済",
  cancellation_requested: "キャンセル申請中",
  cancelled: "キャンセル確定",
};

export type ReservationStatusTransitionReason =
  | "approve_temporary"
  | "approve_confirmed"
  | "ready_for_visit"
  | "readiness_incomplete"
  | "record_visit"
  | "confirm_cancellation";

export type ReservationStatusTransition = {
  from: ReservationStatus;
  to: ReservationStatus;
  reason: ReservationStatusTransitionReason;
  label: string;
  automatic?: boolean;
};

export const reservationStatusTransitions = [
  { from: "temporary_requested", to: "temporary_confirmed", reason: "approve_temporary", label: "仮予約を承認する" },
  { from: "confirmed_requested", to: "confirmed", reason: "approve_confirmed", label: "本予約を承認する" },
  { from: "confirmed", to: "waiting_for_visit", reason: "ready_for_visit", label: "来店待ちに進める", automatic: true },
  { from: "waiting_for_visit", to: "confirmed", reason: "readiness_incomplete", label: "本予約確定に戻す", automatic: true },
  { from: "waiting_for_visit", to: "visited", reason: "record_visit", label: "来店済みにする" },
  { from: "cancellation_requested", to: "cancelled", reason: "confirm_cancellation", label: "キャンセルを確定する" },
] as const satisfies readonly ReservationStatusTransition[];

export type DataConnectReservationStatus =
  | "TEMPORARY_REQUESTED"
  | "TEMPORARY_CONFIRMED"
  | "CONFIRMED_REQUESTED"
  | "CONFIRMED"
  | "WAITING_FOR_VISIT"
  | "VISITED"
  | "CANCELLATION_REQUESTED"
  | "CANCELLED";

export const dataConnectReservationStatusMap: Record<ReservationStatus, DataConnectReservationStatus> = {
  temporary_requested: "TEMPORARY_REQUESTED",
  temporary_confirmed: "TEMPORARY_CONFIRMED",
  confirmed_requested: "CONFIRMED_REQUESTED",
  confirmed: "CONFIRMED",
  waiting_for_visit: "WAITING_FOR_VISIT",
  visited: "VISITED",
  cancellation_requested: "CANCELLATION_REQUESTED",
  cancelled: "CANCELLED",
};

const reservationStatusByDataConnectStatus: Record<DataConnectReservationStatus, ReservationStatus> = {
  TEMPORARY_REQUESTED: "temporary_requested",
  TEMPORARY_CONFIRMED: "temporary_confirmed",
  CONFIRMED_REQUESTED: "confirmed_requested",
  CONFIRMED: "confirmed",
  WAITING_FOR_VISIT: "waiting_for_visit",
  VISITED: "visited",
  CANCELLATION_REQUESTED: "cancellation_requested",
  CANCELLED: "cancelled",
};

const legacyReservationStatusMap: Record<string, ReservationStatus> = {
  "仮予約申請中": "temporary_requested",
  "仮予約確定": "temporary_confirmed",
  "本予約申請中": "confirmed_requested",
  "本予約確定": "confirmed",
  "来店待ち": "waiting_for_visit",
  "来店済": "visited",
  "キャンセル申請中": "cancellation_requested",
  "キャンセル確定": "cancelled",
};

export function normalizeReservationStatus(status: unknown): ReservationStatus {
  if (typeof status !== "string") return defaultReservationStatus;
  if (reservationStatuses.includes(status as ReservationStatus)) return status as ReservationStatus;
  if (status in reservationStatusByDataConnectStatus) return reservationStatusByDataConnectStatus[status as DataConnectReservationStatus];
  return legacyReservationStatusMap[status] ?? defaultReservationStatus;
}

export function toDataConnectReservationStatus(status: ReservationStatus): DataConnectReservationStatus {
  return dataConnectReservationStatusMap[status];
}

export function reservationStatusLabel(status: ReservationStatus) {
  return reservationStatusLabels[status] ?? status;
}

export function getReservationStatusTransitions(from: ReservationStatus) {
  return reservationStatusTransitions.filter((transition) => transition.from === from);
}

export function canTransitionReservationStatus(from: ReservationStatus, to: ReservationStatus, options?: { manual?: boolean }) {
  if (from === to) return true;
  if (options?.manual) return reservationStatuses.includes(to);
  return reservationStatusTransitions.some((transition) => transition.from === from && transition.to === to);
}

export function assertReservationStatusTransition(from: ReservationStatus, to: ReservationStatus, options?: { manual?: boolean }) {
  if (canTransitionReservationStatus(from, to, options)) return;
  throw new Error(`Invalid reservation status transition: ${reservationStatusLabel(from)} -> ${reservationStatusLabel(to)}`);
}

export type Reservation = {
  id: string;
  customer: string;
  email?: string;
  date: string;
  startTime?: string;
  people: number;
  menu?: string;
  menuItems: string[];
  totalAmount: number;
  store: string | null;
  storeAssignments?: StoreAssignment[];
  status: ReservationStatus;
  policyAgreement?: PolicyAgreement;
  confirmationContactedAt?: string | null;
  received: string;
  phone: string;
};

export type PolicyAgreement = {
  kind: "temporary" | "confirmed";
  acceptedAt: string;
};

export type StoreAssignment = {
  store: string;
  people: number;
};

export type Customer = {
  name: string;
  contact: string;
  phone: string;
  count: number;
  last: string;
};

export type SaveCustomerInput = {
  name: string;
  contact: string;
  phone: string;
};

export type Store = {
  name: string;
  area: string;
  today: number;
  month: number;
  state: string;
};

export type SaveStoreInput = Store;

export type Menu = {
  name: string;
  description: string;
  price: number;
  duration: string;
};

export type CreateReservationInput = {
  menu?: string;
  menuItems?: string[];
  status?: ReservationStatus;
  policyAgreement?: PolicyAgreement;
  date: string;
  startTime?: string;
  people: number;
  name: string;
  email: string;
  phone: string;
};

export type UpdateReservationInput = Partial<Pick<Reservation, "date" | "startTime" | "people" | "menuItems" | "customer" | "email" | "phone">>;

export type UpdateStoreAssignmentsInput = {
  assignments: StoreAssignment[];
};

export type SaveMenuInput = Menu;

type ReservationReadinessInput = Pick<Reservation, "status" | "store" | "storeAssignments" | "people" | "confirmationContactedAt"> & {
  menuItems?: string[];
};

export function reservationAssignments(reservation: Pick<Reservation, "store" | "storeAssignments" | "people">): StoreAssignment[] {
  return reservation.storeAssignments?.length
    ? reservation.storeAssignments
    : reservation.store
      ? [{ store: reservation.store, people: reservation.people }]
      : [];
}

export function isConfirmedReservationStatus(status: ReservationStatus) {
  return status === "confirmed" || status === "waiting_for_visit";
}

export function isConfirmedReservation(reservation: Pick<Reservation, "status">) {
  return isConfirmedReservationStatus(reservation.status);
}

export function isVisitReadyReservation(reservation: ReservationReadinessInput) {
  return isConfirmedReservation(reservation)
    && Boolean(reservation.menuItems?.length)
    && Boolean(reservationAssignments(reservation).length)
    && Boolean(reservation.confirmationContactedAt);
}

export function getPendingVisitReadinessActions(reservation: Omit<ReservationReadinessInput, "status">) {
  return [
    !reservation.menuItems?.length && "メニュー確定",
    !reservationAssignments(reservation).length && "店舗割当",
    !reservation.confirmationContactedAt && "確認連絡",
  ].filter(Boolean) as string[];
}

export function getAutomaticReservationStatus(reservation: ReservationReadinessInput): ReservationStatus {
  if (reservation.status === "confirmed" && isVisitReadyReservation(reservation)) return "waiting_for_visit";
  if (reservation.status === "waiting_for_visit" && !isVisitReadyReservation(reservation)) return "confirmed";
  return reservation.status;
}

export function daysUntilVisit(date: string, todayIso: string) {
  const visitDate = new Date(`${date}T00:00:00`);
  const today = new Date(`${todayIso}T00:00:00`);
  if (Number.isNaN(visitDate.getTime()) || Number.isNaN(today.getTime())) return Number.POSITIVE_INFINITY;
  return Math.ceil((visitDate.getTime() - today.getTime()) / 86400000);
}

export function isConfirmationContactDue(reservation: Pick<Reservation, "status" | "date" | "confirmationContactedAt">, windowDays: number, todayIso: string) {
  const days = daysUntilVisit(reservation.date, todayIso);
  return reservation.status === "confirmed" && !reservation.confirmationContactedAt && days >= 0 && days < windowDays;
}

function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function isTemporaryReservationExpired(reservation: Pick<Reservation, "status" | "date">, todayIso: string) {
  if (reservation.status !== "temporary_confirmed") return false;
  const visitDate = new Date(`${reservation.date}T00:00:00`);
  if (Number.isNaN(visitDate.getTime())) return false;
  return visitDate < addCalendarMonths(new Date(`${todayIso}T00:00:00`), 1);
}

export function reservationDisplayStatusLabel(reservation: ReservationReadinessInput & Pick<Reservation, "date">, todayIso: string) {
  if (isTemporaryReservationExpired(reservation, todayIso)) return "仮予約確定（期限切れ）";
  return isVisitReadyReservation(reservation) ? "本予約確定（来店待ち）" : reservationStatusLabel(reservation.status);
}
