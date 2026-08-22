import type { User } from "firebase/auth";
import type { AccountType, PaymentCondition, ReservationBookingType, ReservationChangeRequest as DomainReservationChangeRequest, ReservationRequestType, ReservationStatus } from "@/lib/domain";

export type Status = ReservationStatus;
export type StoreAssignment = { store: string; people: number };
export type PolicyAgreement = { kind: "temporary" | "confirmed"; acceptedAt: string };
export type Reservation = {
  id: string;
  accountId?: string | null;
  customer: string;
  email?: string;
  address?: string;
  bookingType?: ReservationBookingType;
  bookingContactName?: string;
  dayContactName?: string;
  dayContactPhone?: string;
  groupName?: string;
  groupNameKana?: string;
  groupType?: string;
  groupTypeOther?: string;
  tcCount?: number;
  dgCount?: number;
  paymentCondition?: PaymentCondition;
  remarks?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  people: number;
  menu?: string;
  menuItems?: string[];
  totalAmount?: number;
  store: string | null;
  storeAssignments?: StoreAssignment[];
  status: Status;
  requestType?: ReservationRequestType | null;
  policyAgreement?: PolicyAgreement;
  confirmationContactedAt?: string | null;
  received: string;
  phone: string;
};
export type ReservationChangeRequest = DomainReservationChangeRequest;
export type Menu = { id?: string; name: string; description: string; price: number; duration: string; displayOrder: number; active?: boolean };

// Compatibility name used by the existing admin page. These records now represent login Accounts,
// not every person whose contact information appears on a Reservation.
export type Customer = {
  id?: string;
  firebaseUid?: string;
  name: string;
  contact: string;
  phone?: string;
  address?: string;
  accountType?: AccountType;
  companyBranchName?: string;
  contactPersonName?: string;
  active?: boolean;
  count?: number;
  last?: string;
};

export type Store = { id?: string; name: string; displayOrder: number };
export type BookingForm = { menuItems: string[]; date: string; startTime: string; endTime?: string; people: number; name: string; email: string; phone: string; address: string; accountType?: AccountType; companyBranchName?: string; contactPersonName?: string; bookingType?: ReservationBookingType; bookingContactName?: string; dayContactName?: string; dayContactPhone?: string; groupName?: string; groupNameKana?: string; groupType?: string; groupTypeOther?: string; tcCount?: number; dgCount?: number; paymentCondition?: PaymentCondition; remarks?: string; status?: Status; policyAgreement?: PolicyAgreement };
export type MenuForm = Menu;
export type CustomerForm = { id?: string; name: string; contact: string; phone?: string; address?: string; accountType?: AccountType; companyBranchName?: string; contactPersonName?: string; originalContact?: string };
export type StoreForm = Store;
export type AdminSession = { user: User; email: string | null };
export type ApiRequestInit = RequestInit & { authToken?: string };
export type ReservationSubmitOptions = { authToken?: string; forceAdmin?: boolean; customerAccountMode?: "account" | "guest" };
export type View = "dashboard" | "reservations" | "reservationApprovals" | "cancellationApprovals" | "confirmedReservationRequests" | "reservationChangeRequests" | "confirmationContacts" | "masters" | "customers" | "stores" | "menus" | "billing";
export type ReservationFilter = "すべて" | "承認待ち" | "仮予約確定" | "仮予約確定（期限切れ）" | "本予約確定" | "本予約確定（メニュー未確定）" | "本予約確定（店舗未割当）" | "本予約確定（未確認連絡）" | "本予約確定（来店待ち）";
export type ReservationSortKey = "status" | "id" | "customer" | "date" | "menu" | "store" | "contact";
export type SortDirection = "asc" | "desc";
