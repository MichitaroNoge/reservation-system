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
