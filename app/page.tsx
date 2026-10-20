"use client";
import { cancellationPolicyVersion, policyConsentDetail, type CancellationPolicyAgreementInput } from "@/lib/cancellation-policy-consent";
import { ReservationInquiryHistoryButton } from "@/components/inquiries/reservation-inquiry-history";
import { InquiryManagement } from "@/components/inquiries/inquiry-management";
import Link from "next/link";
import { PolicyConsentHistory } from "./reservations/components/policy-consent-history";
import { CancellationPolicyAgreement } from "./reservations/components/cancellation-policy-agreement";
import { cancellationFeeNotice, isFeeExemptPeopleOnlyChange } from "@/lib/cancellation-policy";
import { earliestReservationDate } from "@/lib/reservation-lead-time";
import { CustomerRequestSubmit } from "./reservations/components/customer-request-submit";
import { CustomerAuthLink } from "./reservations/components/customer-auth-link";
import { usePathname } from "next/navigation";
import { isAccountProfileComplete } from "@/lib/account-profile";
import { GoogleCustomerAuthProvider, GoogleCustomerButton, CustomerLoginMethods, useGoogleCustomer } from "./reservations/components/google-customer-auth";
import { ReservationCsvExport } from "./reservations/components/reservation-csv-export";
import { matchesReservation, compareReservations, type ReservationSearch } from "@/lib/reservation-search";
import { OtherSettingsManagement } from "./reservations/components/other-settings-management";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast as sonnerToast } from "sonner";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import {
  getAutomaticReservationStatus,
  getPendingVisitReadinessActions,
  isConfirmedReservation,
  defaultPaymentCondition,
  paymentConditionLabel,
  paymentConditions,
  duplicateAssignmentStores,
  reservationAssignments,
} from "@/lib/domain";
import { requestJson } from "./reservations/api-client";
import { applyAccountToReservationForm } from "./reservations/customer-form";
import { ReservationSubmission } from "./reservations/reservation-submission";
import { AdminAuthShell, AdminLogin } from "./reservations/components/auth";
import { Icon, InfoMetric, Task, TaskGrid } from "./reservations/components/common";
import { CustomerManagement } from "./reservations/components/customer-management";
import { EmailTemplateManagement } from "./reservations/components/email-template-management";
import { MenuManagement } from "./reservations/components/menu-management";
import { isReservationReminderTarget } from "@/lib/reservation-reminders";
import { ReservationSearchToolbar } from "./reservations/components/reservation-worklist";
import { ReservationCalendarPage } from "./reservations/components/reservation-calendar-page";
import { ReservationReminderPage } from "./reservations/components/reservation-reminder-page";
import { StoreAssignmentPage } from "./reservations/components/store-assignment-page";
import { StoreManagement } from "./reservations/components/store-management";
import { useReservationPolicy } from "./reservations/hooks/use-reservation-policy";
import { ReservationDetailsDialog } from "@/components/ui/reservation-details-dialog";
import { ReservationApprovalDialog } from "./reservations/components/reservation-approval-dialog";
import {
  DEFAULT_START_TIME,
  STATUS,
  VISIT_MENU_NAME,
  cancellationApprovalStatuses,
  reservationApprovalStatuses,
  statusClass,
  statusOptions,
} from "./reservations/constants";
import {
  assignmentLabel,
  bookingFormDateTimeLabel,
  bookingFormEndTime,
  dateHeadingLabel,
  dateTimeMinuteLabel,
  daysUntilVisit,
  fullDateHeadingLabel,
  isConfirmationContactDue,
  menuSelectionLabel,
  monthIso,
  policyAgreementLabel,
  reservationBookingTypeLabel,
  reservationBookingTypeShortLabel,
  reservationCustomerSubLabel,
  reservationDateTimeLabel,
  reservationDisplayLabel,
  reservationMenuLabel,
  reservationStartTime,
  selectedMenuTotal,
  statusLabel,
  todayIso,
} from "./reservations/formatters";
import { useAdminSession } from "./reservations/hooks/use-admin-session";
import {
  customerAuthErrorCode,
  useCustomerSession,
} from "./reservations/hooks/use-customer-session";
import type {
  BookingForm,
  AccountContactEmail,
  Customer,
  CustomerForm,
  Menu,
  MenuForm,
  Reservation,
  ReservationChangeRequest,
  ReservationFilter,
  ReservationSortKey,
  ReservationSubmitOptions,
  SortDirection,
  Status,
  Store,
  StoreAssignment,
  StoreForm,
  View,
} from "./reservations/types";

const sortByDisplayOrderThenName = <
  T extends { displayOrder?: number; name: string },
>(
  items: T[],
) =>
  [...items].sort(
    (a, b) =>
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
      a.name.localeCompare(b.name, "ja-JP", { numeric: true }),
  );

const isConfirmedReservationChangeRequest = (reservation: Reservation) =>
  reservation.status === STATUS.confirmedRequested &&
  reservation.requestType === "confirmed_from_temporary";

const customerPortalModeFromSearch = (
  value: string | null,
): CustomerPortalMode | null => {
  if (
    value === "home" ||
    value === "login" ||
    value === "register" ||
    value === "account" ||
    value === "reservation" ||
    value === "confirmedChange" ||
    value === "change" ||
    value === "cancellation"
  )
    return value;
  return null;
};

const groupTypeOptions = [
  "保育園・幼稚園",
  "小学校",
  "中学校",
  "高等学校",
  "専門学校",
  "大学・短期大学",
  "その他教育機関",
  "企業・法人",
  "社員旅行",
  "研修・視察",
  "自治体・行政",
  "自治会・町内会",
  "スポーツ団体",
  "文化・サークル",
  "福祉施設",
  "医療関係",
  "宗教団体",
  "その他団体",
  "その他",
];

const paymentConditionOptions = paymentConditions.map((value) => ({
  value,
  label: paymentConditionLabel(value),
}));

const isGroupBooking = (form: Pick<BookingForm, "bookingType">) =>
  form.bookingType === "travel_agency_group";
const isTravelAgencyAccount = (form: Pick<BookingForm, "accountType">) =>
  form.accountType === "travel_agency";

const emptyReservationForm = (status: Status): BookingForm => ({
  menuItems: [],
  date: "",
  startTime: "",
  people: 0,
  name: "",
  email: "",
  phone: "",
  address: "",
  accountType: "individual",
  bookingType: "individual",
  tcCount: 0,
  dgCount: 0,
  paymentCondition: defaultPaymentCondition,
  remarks: "",
  status,
});

export default function Home() {
  const pathname = usePathname();
  const directAuthMode = pathname === "/login" ? "login" : pathname === "/register" ? "register" : null;
  const [role, setRole] = useState<"admin" | "customer">(directAuthMode ? "customer" : "admin");
  const {
    adminSession,
    authError,
    authLoading,
    getAdminToken,
    loginAdmin,
    signOutAdmin,
  } = useAdminSession({ enabled: role === "admin" });
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [formStep, setFormStep] = useState(1);
  const [view, setView] = useState<View>("dashboard");
  const [reservationFilter, setReservationFilter] =
    useState<ReservationFilter>("すべて");
  const [reservationDateFromFilter, setReservationDateFromFilter] =
    useState("");
  const [reservationDateToFilter, setReservationDateToFilter] = useState("");
  const [reservationSearch, setReservationSearch] = useState("");
  const [menuCatalog, setMenuCatalog] = useState<Menu[]>([]);
  const [inactiveMenuList, setInactiveMenuList] = useState<Menu[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [dataErrors, setDataErrors] = useState<Record<string, string>>({});
  const [dataReloadVersion, setDataReloadVersion] = useState(0);
  const [masterLoading, setMasterLoading] = useState(true);
  const [adminDataLoading, setAdminDataLoading] = useState(false);
  const [inactiveStoreList, setInactiveStoreList] = useState<Store[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [inactiveCustomerList, setInactiveCustomerList] = useState<Customer[]>(
    [],
  );
  const [reservationChangeRequests, setReservationChangeRequests] = useState<
    ReservationChangeRequest[]
  >([]);
  const [form, setForm] = useState<BookingForm>(() =>
    emptyReservationForm(STATUS.confirmedRequested),
  );
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const reservationRequest = useRef(new ReservationSubmission());
  const [isBulkContacting, setIsBulkContacting] = useState(false);
  const [confirmationContactWindowDays, setConfirmationContactWindowDays] =
    useState(7);
  const [adminForm, setAdminForm] = useState<BookingForm>(() =>
    emptyReservationForm(STATUS.confirmed),
  );
  const [customerEntryMode, setCustomerEntryMode] =
    useState<CustomerPortalMode>(directAuthMode ?? "home");

  const openCustomerPortal = (mode: CustomerPortalMode = "home") => {
    setForm(emptyReservationForm(STATUS.confirmedRequested));
    setFormStep(1);
    const url = new URL(window.location.href);
    url.pathname = "/";
    url.searchParams.set("customerMode", mode);
    window.history.replaceState(null, "", url);
    setCustomerEntryMode(mode);
    setRole("customer");
  };

  const openAdmin = () => {
    const url = new URL(window.location.href);
    url.pathname = "/";
    url.searchParams.delete("customerMode");
    window.history.replaceState(null, "", url);
    setRole("admin");
  };

  useEffect(() => {
    const directMode = directAuthMode ?? customerPortalModeFromSearch(
      new URLSearchParams(window.location.search).get("customerMode"),
    );
    if (!directMode) return;
    setRole("customer");
    setCustomerEntryMode(directMode);
    if (directMode === "reservation") setFormStep(1);
  }, [directAuthMode, pathname]);

  useEffect(() => {
    let cancelled = false;
    setMasterLoading(true);
    const load = async <T,>(key: string, url: string, apply: (data: T) => void) => {
      try {
        const result = await requestJson<T>(url);
        if (cancelled) return;
        apply(result);
        setDataErrors(current => ({ ...current, [key]: "" }));
      } catch (error) {
        if (!cancelled) setDataErrors(current => ({ ...current, [key]: `${key}: ${error instanceof Error ? error.message : "読み込みに失敗しました"}` }));
      }
    };
    void Promise.all([
      load<{ menus: Menu[] }>("メニュー", "/api/menus", ({ menus }) => setMenuCatalog(sortByDisplayOrderThenName(menus))),
      load<{ stores: Store[] }>("店舗", "/api/stores", ({ stores }) => setStores(sortByDisplayOrderThenName(stores))),
    ]).finally(() => { if (!cancelled) setMasterLoading(false); });
    return () => { cancelled = true; };
  }, [dataReloadVersion]);

  useEffect(() => {
    let cancelled = false;
    if (!adminSession) { setReservations([]); setCustomerList([]); setInactiveCustomerList([]); setReservationChangeRequests([]); setSelected(null); setAdminDataLoading(false); return; }
    setAdminDataLoading(true);
    const load = async <T,>(key: string, url: string, apply: (data: T) => void) => {
      try {
        const result = await requestJson<T>(url, { authToken: await adminSession.user.getIdToken() });
        if (cancelled) return;
        apply(result);
        setDataErrors(current => ({ ...current, [key]: "" }));
      } catch (error) {
        if (!cancelled) setDataErrors(current => ({ ...current, [key]: `${key}: ${error instanceof Error ? error.message : "読み込みに失敗しました"}` }));
      }
    };
    void Promise.all([
      load<{ reservations: Reservation[] }>("予約", "/api/reservations", ({ reservations }) => setReservations(reservations)),
      load<{ requests: ReservationChangeRequest[] }>("予約変更", "/api/reservations/change-requests", ({ requests }) => setReservationChangeRequests(requests)),
      load<{ customers: Customer[] }>("アカウント", "/api/customers", ({ customers }) => setCustomerList(customers)),
      load<{ customers: Customer[] }>("無効アカウント", "/api/customers/inactive", ({ customers }) => setInactiveCustomerList(customers)),
      load<{ stores: Store[] }>("無効店舗", "/api/stores/inactive", ({ stores }) => setInactiveStoreList(sortByDisplayOrderThenName(stores))),
      load<{ menus: Menu[] }>("無効メニュー", "/api/menus/inactive", ({ menus }) => setInactiveMenuList(sortByDisplayOrderThenName(menus))),
    ]).finally(() => { if (!cancelled) setAdminDataLoading(false); });
    return () => { cancelled = true; };
  }, [adminSession, dataReloadVersion]);
  const customers = customerList;
  const taskCounts = useMemo(
    () => ({
      reservationApprovals: reservations.filter(
        (reservation) =>
          reservationApprovalStatuses.includes(reservation.status) &&
          !isConfirmedReservationChangeRequest(reservation),
      ).length,
      cancellationApprovals: reservations.filter((reservation) =>
        cancellationApprovalStatuses.includes(reservation.status),
      ).length,
      confirmedReservationRequests: reservations.filter(
        isConfirmedReservationChangeRequest,
      ).length,
      temporaryExpired: reservations.filter(r => isReservationReminderTarget(r, "booking", todayIso()))
        .length,
      storeUnassigned: reservations.filter(
        (reservation) =>
          isConfirmedReservation(reservation) &&
          !reservationAssignments(reservation).length,
      ).length,
      menuUnselected: reservations.filter(
        (reservation) =>
          isReservationReminderTarget(reservation, "menu", todayIso()),
      ).length,
      preContact: reservations.filter(
        (reservation) =>
          isConfirmedReservation(reservation) &&
          !reservation.confirmationContactedAt,
      ).length,
      preContactDue: reservations.filter((reservation) =>
        isConfirmationContactDue(reservation, confirmationContactWindowDays),
      ).length,
      changeRequests: reservationChangeRequests.filter(
        (request) => request.status === "requested",
      ).length,
    }),
    [confirmationContactWindowDays, reservationChangeRequests, reservations],
  );
  const confirmationContactTargets = useMemo(
    () =>
      reservations
        .filter((reservation) =>
          isConfirmationContactDue(reservation, confirmationContactWindowDays),
        )
        .sort((a, b) =>
          `${a.date}T${reservationStartTime(a)}`.localeCompare(
            `${b.date}T${reservationStartTime(b)}`,
            "ja-JP",
            { numeric: true },
          ),
        ),
    [confirmationContactWindowDays, reservations],
  );
  const dashboardCounts = useMemo(() => {
    const today = todayIso();
    const currentMonth = monthIso(today);
    return {
      today: reservations.filter((reservation) => reservation.date === today)
        .length,
      month: reservations.filter(
        (reservation) => monthIso(reservation.date) === currentMonth,
      ).length,
    };
  }, [reservations]);
  const todayReservations = useMemo(() => {
    const today = todayIso();
    return reservations
      .filter((reservation) => reservation.date === today)
      .slice()
      .sort((a, b) =>
        reservationStartTime(a).localeCompare(reservationStartTime(b)),
      );
  }, [reservations]);
  const notify = (message: string, variant?: "success" | "error" | "info") => {
    const resolvedVariant =
      variant ??
      (/失敗|できません|正しくありません|確認してください|入力してください|未完了|まだ完了/.test(
        message,
      )
        ? "error"
        : "success");
    sonnerToast[resolvedVariant](message);
  };
  const adminRequestJson = async <T,>(url: string, init?: RequestInit) =>
    requestJson<T>(url, { ...init, authToken: await getAdminToken() });
  const applyAutomaticStatus = async (reservation: Reservation) => {
    const nextStatus = getAutomaticReservationStatus(reservation);
    if (nextStatus === reservation.status) {
      setReservations((rs) =>
        rs.map((r) => (r.id === reservation.id ? reservation : r)),
      );
      setSelected((s) => (s?.id === reservation.id ? reservation : s));
      return reservation;
    }
    const { reservation: transitioned } = await adminRequestJson<{
      reservation: Reservation;
    }>(`/api/reservations/${reservation.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    setReservations((rs) =>
      rs.map((r) => (r.id === reservation.id ? transitioned : r)),
    );
    setSelected((s) => (s?.id === reservation.id ? transitioned : s));
    return transitioned;
  };
  const updateStatus = async (
    id: string,
    status: Status,
    options?: { manualReason?: string },
  ) => {
    try {
      const { reservation, approvalEmail } = await adminRequestJson<{
        reservation: Reservation;
        approvalEmail?: { status: string };
      }>(`/api/reservations/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, manualReason: options?.manualReason }),
      });
      setReservations((rs) => rs.map((r) => (r.id === id ? reservation : r)));
      setSelected((s) => (s?.id === id ? reservation : s));
      if (approvalEmail?.status === "failed") { notify("予約の更新は完了しましたが、承認メールを送信できませんでした。通知の再試行が必要です。", "error"); return true; }
      notify(`予約を「${statusLabel(status)}」へ更新しました`);
      return true;
    } catch {
      notify("ステータス更新の保存に失敗しました");
      return false;
    }
  };
  const assignStores = async (id: string, assignments: StoreAssignment[]) => {
    try {
      const { reservation } = await adminRequestJson<{
        reservation: Reservation;
      }>(`/api/reservations/${id}/store`, {
        method: "PATCH",
        body: JSON.stringify({ assignments }),
      });
      const transitioned = await applyAutomaticStatus(reservation);
      if (
        reservation.status === STATUS.confirmed &&
        transitioned.status === STATUS.waitingForVisit
      ) {
        notify(
          "メニュー・店舗割当・確認連絡が完了したため、来店待ちに更新しました",
        );
        return true;
      }
      if (
        reservation.status === STATUS.waitingForVisit &&
        transitioned.status === STATUS.confirmed
      ) {
        notify("店舗割当を未割当に戻したため、本予約確定に戻しました");
        return true;
      }
      notify(
        reservation.status === STATUS.confirmed
          ? "店舗割当を保存しました。メニュー選択と確認連絡後に来店待ちへ進みます"
          : "店舗割当を保存しました",
      );
      return true;
    } catch {
      notify("店舗割当の保存に失敗しました");
      return false;
    }
  };
  const createReservation = async (
    input: BookingForm,
    options?: ReservationSubmitOptions,
  ) => {
    const publicStatuses: readonly Status[] = [
      STATUS.temporaryRequested,
      STATUS.confirmedRequested,
    ];
    const needsAdmin =
      options?.forceAdmin ||
      Boolean(input.status && !publicStatuses.includes(input.status));
    const payload = JSON.stringify({ ...input, customerAccountMode: options?.customerAccountMode });
    const requestKey = reservationRequest.current.begin(`${Boolean(needsAdmin)}:${payload}`);
    const { reservation, receiptEmail } = needsAdmin
      ? await adminRequestJson<{ reservation: Reservation; receiptEmail?: { status: "not_requested" | "sent" | "failed" } }>(
          "/api/reservations",
          { method: "POST", body: JSON.stringify(input), headers: { "Idempotency-Key": requestKey } },
        )
      : await requestJson<{ reservation: Reservation; receiptEmail?: { status: "not_requested" | "sent" | "failed" } }>("/api/reservations", {
          method: "POST",
          headers: { "Idempotency-Key": requestKey },
          body: JSON.stringify({
            ...input,
            customerAccountMode: options?.customerAccountMode,
          }),
          authToken: options?.authToken,
        });
    reservationRequest.current.complete(requestKey);
    setReservations((rs) => [
      reservation,
      ...rs.filter((r) => r.id !== reservation.id),
    ]);
    return { ...reservation, receiptEmailStatus: receiptEmail?.status };
  };
  const requestCancellation = async (
    input: { reservationId: string; email?: string; phone?: string; cancellationPolicyAgreement?: CancellationPolicyAgreementInput; cancellationFeeAcknowledged?: boolean },
    options?: { authToken?: string },
  ) => {
    const { reservation } = await requestJson<{ reservation: Reservation }>(
      "/api/reservations/cancellation-request",
      {
        method: "POST",
        body: JSON.stringify(input),
        authToken: options?.authToken,
      },
    );
    setReservations((rs) =>
      rs.map((r) => (r.id === reservation.id ? reservation : r)),
    );
    setSelected((s) => (s?.id === reservation.id ? reservation : s));
    return reservation;
  };
  const requestConfirmedReservationChange = async (
    input: { reservationId: string; email?: string; phone?: string; cancellationPolicyAgreement?: CancellationPolicyAgreementInput; cancellationFeeAcknowledged?: boolean },
    options?: { authToken?: string },
  ) => {
    const { reservation } = await requestJson<{ reservation: Reservation }>(
      "/api/reservations/confirmed-request",
      {
        method: "POST",
        body: JSON.stringify(input),
        authToken: options?.authToken,
      },
    );
    setReservations((rs) =>
      rs.map((r) => (r.id === reservation.id ? reservation : r)),
    );
    setSelected((s) => (s?.id === reservation.id ? reservation : s));
    return reservation;
  };
  const requestReservationChange = async (
    input: {
      reservationId: string;
      email?: string;
      phone?: string;
      requestedDate: string;
      requestedStartTime: string;
      requestedPeople: number;
      requestedMenuItems: string[];
      reason?: string;
      cancellationFeeAcknowledged?: boolean;
    },
    options?: { authToken?: string },
  ) => {
    const { request } = await requestJson<{
      request: ReservationChangeRequest;
    }>("/api/reservations/change-requests", {
      method: "POST",
      body: JSON.stringify(input),
      authToken: options?.authToken,
    });
    setReservationChangeRequests((requests) => [
      request,
      ...requests.filter((item) => item.id !== request.id),
    ]);
    return request;
  };
  const approveReservationChangeRequest = async (id: string) => {
    try {
      const { request, reservation, approvalEmail } = await adminRequestJson<{
        request: ReservationChangeRequest;
        reservation: Reservation;
        approvalEmail?: { status: string };
      }>(`/api/reservations/change-requests/${id}/approve`, { method: "POST" });
      setReservationChangeRequests((requests) =>
        requests.map((item) => (item.id === id ? request : item)),
      );
      setReservations((rs) =>
        rs.map((r) => (r.id === reservation.id ? reservation : r)),
      );
      setSelected((s) => (s?.id === reservation.id ? reservation : s));
      if (approvalEmail?.status === "failed") { notify("予約変更の承認は完了しましたが、通知メールを送信できませんでした。通知の再試行が必要です。", "error"); return; }
      notify(`予約変更を承認しました（${reservation.id}）`);
    } catch {
      notify("予約変更承認の保存に失敗しました");
    }
  };
  const rejectReservationChangeRequest = async (id: string) => {
    try {
      const { request } = await adminRequestJson<{
        request: ReservationChangeRequest;
      }>(`/api/reservations/change-requests/${id}/reject`, { method: "POST" });
      setReservationChangeRequests((requests) =>
        requests.map((item) => (item.id === id ? request : item)),
      );
      notify("予約変更を却下しました");
    } catch {
      notify("予約変更却下の保存に失敗しました");
    }
  };
  const updateReservation = async (id: string, input: BookingForm) => {
    const { reservation } = await adminRequestJson<{
      reservation: Reservation;
    }>(`/api/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        people: input.people,
        menuItems: input.menuItems,
        customer: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        bookingType: input.bookingType,
        bookingContactName: input.bookingContactName,
        dayContactName: input.dayContactName,
        dayContactPhone: input.dayContactPhone,
        groupName: input.groupName,
        groupNameKana: input.groupNameKana,
        groupType: input.groupType,
        groupTypeOther: input.groupTypeOther,
        tcCount: input.tcCount,
        dgCount: input.dgCount,
        paymentCondition: input.paymentCondition,
        remarks: input.remarks,
      }),
    });
    setReservations((rs) => rs.map((r) => (r.id === id ? reservation : r)));
    setSelected((s) => (s?.id === id ? reservation : s));
    const transitioned = await applyAutomaticStatus(reservation);
    if (
      reservation.status === STATUS.confirmed &&
      transitioned.status === STATUS.waitingForVisit
    ) {
      notify(
        "メニュー・店舗割当・確認連絡が完了したため、来店待ちに更新しました",
      );
      return transitioned;
    }
    notify(`予約内容を更新しました（${id}）`);
    return transitioned;
  };
  const saveConfirmationContact = async (
    id: string,
    contactedAt: string | null,
    options?: { sendEmail?: boolean },
  ) => {
    const { reservation } = await adminRequestJson<{
      reservation: Reservation;
    }>(`/api/reservations/${id}/confirmation-contact`, {
      method: "PATCH",
      body: JSON.stringify({ contactedAt, sendEmail: options?.sendEmail }),
    });
    setReservations((rs) =>
      rs.map((r) => (r.id === id ? reservation : r)),
    );
    setSelected((s) => (s?.id === id ? reservation : s));
    return reservation;
  };
  const updateConfirmationContact = async (
    id: string,
    contactedAt: string | null,
    options?: { sendEmail?: boolean },
  ) => {
    try {
      const reservation = await saveConfirmationContact(
        id,
        contactedAt,
        options,
      );
      if (contactedAt && reservation.status === STATUS.waitingForVisit) {
        notify(
          "メニュー・店舗割当・確認連絡が完了したため、来店待ちに更新しました",
        );
        return;
      }
      if (!contactedAt && reservation.status === STATUS.confirmed) {
        notify("確認連絡を未実施に戻したため、本予約確定に戻しました");
        return;
      }
      notify(
        contactedAt
          ? options?.sendEmail === false
            ? "手動で確認連絡済みにしました"
            : "確認メールを送信しました"
          : "確認連絡を未実施に戻しました",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "確認連絡の更新に失敗しました";
      notify(message);
    }
  };
  const bulkUpdateConfirmationContacts = async () => {
    if (!confirmationContactTargets.length || isBulkContacting) return;
    const ok = window.confirm(
      `${confirmationContactTargets.length}件を確認連絡済みにします。よろしいですか？`,
    );
    if (!ok) return;
    setIsBulkContacting(true);
    try {
      const contactedAt = new Date().toISOString();
      const updated = await Promise.allSettled(
        confirmationContactTargets.map((reservation) =>
          saveConfirmationContact(reservation.id, contactedAt),
        ),
      );
      const sent = updated.filter(result => result.status === "fulfilled").length;
      const failed = updated.length - sent;
      notify(failed ? `${sent}件の確認連絡が完了し、${failed}件が失敗しました。時間をおいて未送信分を再実行してください。` : `${sent}件の確認メールを送信しました`, failed ? "error" : "success");
    } catch {
      notify("確認メールの一括送信に失敗しました");
    } finally {
      setIsBulkContacting(false);
    }
  };
  const saveMenu = async (input: MenuForm, originalName?: string) => {
    const url = originalName
      ? `/api/menus/${encodeURIComponent(originalName)}`
      : "/api/menus";
    const method = originalName ? "PATCH" : "POST";
    const { menu } = await adminRequestJson<{ menu: Menu }>(url, {
      method,
      body: JSON.stringify(input),
    });
    setInactiveMenuList((items) =>
      items.filter((item) => item.id !== menu.id && item.name !== menu.name),
    );
    setMenuCatalog((items) =>
      sortByDisplayOrderThenName(
        originalName
          ? items.map((item) => (item.name === originalName ? menu : item))
          : [...items, menu],
      ),
    );
    setReservations((rs) =>
      originalName && originalName !== menu.name
        ? rs.map((r) => ({
            ...r,
            menuItems: (r.menuItems ?? []).map((item) =>
              item === originalName ? menu.name : item,
            ),
          }))
        : rs,
    );
    notify(originalName ? "メニューを更新しました" : "メニューを追加しました");
  };
  const deleteMenu = async (name: string) => {
    await adminRequestJson<{ ok: boolean }>(
      `/api/menus/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
    setMenuCatalog((items) => {
      const deleted = items.find((item) => item.name === name);
      if (deleted)
        setInactiveMenuList((inactive) => [
          deleted,
          ...inactive.filter(
            (item) => item.id !== deleted.id && item.name !== deleted.name,
          ),
        ]);
      return items.filter((item) => item.name !== name);
    });
    notify(
      "メニューを新規選択肢から削除しました。既存予約の履歴は保持されます",
    );
  };
  const reactivateMenu = async (menu: Menu) => {
    if (!menu.id) throw new Error("復元対象のメニューIDがありません");
    const { menu: restored } = await adminRequestJson<{ menu: Menu }>(
      `/api/menus/${encodeURIComponent(menu.name)}/reactivate`,
      {
        method: "PATCH",
        body: JSON.stringify({ id: menu.id }),
      },
    );
    setInactiveMenuList((items) =>
      items.filter((item) => item.id !== restored.id),
    );
    setMenuCatalog((items) =>
      sortByDisplayOrderThenName([
        restored,
        ...items.filter(
          (item) => item.id !== restored.id && item.name !== restored.name,
        ),
      ]),
    );
    notify(`${restored.name}を有効にしました`);
  };
  const saveCustomer = async (originalName: string, input: CustomerForm) => {
    if (!input.id) throw new Error("対象アカウントのIDを確認できません。");
    const { account: customer } = await adminRequestJson<{ account: Customer }>(
      `/api/accounts/${encodeURIComponent(input.id)}`,
      { method: "PUT", body: JSON.stringify(input) },
    );
    setCustomerList((items) =>
      items.map((item) => item.id === customer.id ? customer : item),
    );
    notify(`${customer.name}様の顧客情報を更新しました`);
  };
  const createCustomer = async (input: CustomerForm) => {
    const { customer } = await adminRequestJson<{ customer: Customer }>(
      "/api/customers",
      { method: "POST", body: JSON.stringify(input) },
    );
    setInactiveCustomerList((items) =>
      items.filter(
        (item) => item.id !== customer.id && item.contact !== customer.contact,
      ),
    );
    setCustomerList((items) => [
      customer,
      ...items.filter(
        (item) => item.id !== customer.id && item.contact !== customer.contact,
      ),
    ]);
    notify(`${customer.name}様の顧客情報を登録しました`);
  };
  const deleteCustomer = async (id: string) => {
    const deleted = customerList.find((item) => item.id === id);
    if (!deleted) throw new Error("対象アカウントを確認できません。");
    await adminRequestJson<void>(
      `/api/accounts/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    setCustomerList((items) => {
      if (deleted) {
        setInactiveCustomerList((inactive) => [
          deleted,
          ...inactive.filter((item) => item.id !== deleted.id),
        ]);
      }
      return items.filter((item) => item.id !== id);
    });
    notify(`${deleted.name}様のアカウントを無効化しました`);
  };
  const reactivateCustomer = async (customer: Customer) => {
    if (!customer.id) throw new Error("復元対象の顧客IDがありません");
    const { customer: restored } = await adminRequestJson<{
      customer: Customer;
    }>(`/api/customers/${encodeURIComponent(customer.name)}/reactivate`, {
      method: "PATCH",
      body: JSON.stringify({ id: customer.id }),
    });
    setInactiveCustomerList((items) =>
      items.filter((item) => item.id !== restored.id),
    );
    setCustomerList((items) => [
      restored,
      ...items.filter((item) => item.id !== restored.id),
    ]);
    notify(`${restored.name}様を有効にしました`);
  };
  const createStore = async (input: StoreForm) => {
    const { store } = await adminRequestJson<{ store: Store }>("/api/stores", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setInactiveStoreList((items) =>
      items.filter((item) => item.id !== store.id && item.name !== store.name),
    );
    setStores((items) =>
      sortByDisplayOrderThenName([
        store,
        ...items.filter(
          (item) => item.id !== store.id && item.name !== store.name,
        ),
      ]),
    );
    notify(`${store.name}を登録しました`);
  };
  const saveStore = async (originalName: string, input: StoreForm) => {
    const { store } = await adminRequestJson<{ store: Store }>(
      `/api/stores/${encodeURIComponent(originalName)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
    setStores((items) =>
      sortByDisplayOrderThenName(
        items.map((item) => (item.name === originalName ? store : item)),
      ),
    );
    setReservations((rs) =>
      originalName !== store.name
        ? rs.map((r) => {
            const storeAssignments = reservationAssignments(r).map(
              (assignment) =>
                assignment.store === originalName
                  ? { ...assignment, store: store.name }
                  : assignment,
            );
            return {
              ...r,
              storeAssignments,
              store:
                storeAssignments.length === 1
                  ? storeAssignments[0].store
                  : storeAssignments.length > 1
                    ? "複数店舗"
                    : r.store === originalName
                      ? store.name
                      : r.store,
            };
          })
        : rs,
    );
    setSelected((s) =>
      s && originalName !== store.name
        ? (() => {
            const storeAssignments = reservationAssignments(s).map(
              (assignment) =>
                assignment.store === originalName
                  ? { ...assignment, store: store.name }
                  : assignment,
            );
            return {
              ...s,
              storeAssignments,
              store:
                storeAssignments.length === 1
                  ? storeAssignments[0].store
                  : storeAssignments.length > 1
                    ? "複数店舗"
                    : s.store === originalName
                      ? store.name
                      : s.store,
            };
          })()
        : s,
    );
    notify(`${store.name}を更新しました`);
  };
  const reactivateStore = async (store: Store) => {
    if (!store.id) throw new Error("復元対象の店舗IDがありません");
    const { store: restored } = await adminRequestJson<{ store: Store }>(
      `/api/stores/${encodeURIComponent(store.name)}/reactivate`,
      {
        method: "PATCH",
        body: JSON.stringify({ id: store.id }),
      },
    );
    setInactiveStoreList((items) =>
      items.filter((item) => item.id !== restored.id),
    );
    setStores((items) =>
      sortByDisplayOrderThenName([
        restored,
        ...items.filter((item) => item.id !== restored.id),
      ]),
    );
    notify(`${restored.name}を有効にしました`);
  };
  const deleteStore = async (name: string) => {
    await adminRequestJson<{ ok: boolean }>(
      `/api/stores/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
    setStores((items) => {
      const deleted = items.find((item) => item.name === name);
      if (deleted)
        setInactiveStoreList((inactive) => [
          deleted,
          ...inactive.filter((item) => item.id !== deleted.id),
        ]);
      return items.filter((item) => item.name !== name);
    });
    notify(`${name}を新規選択肢から削除しました。既存予約の履歴は保持されます`);
  };
  const submitAdminReservation = async () => {
    try {
      const reservation = await createReservation(
        {
          ...adminForm,
          endTime:
            adminForm.endTime ?? bookingFormEndTime(adminForm, menuCatalog),
        },
        { forceAdmin: true },
      );
      setAdminForm(emptyReservationForm(STATUS.confirmed));
      setIsNewReservationOpen(false);
      setReservationFilter("すべて");
      setReservationDateFromFilter("");
      setReservationDateToFilter("");
      setView("reservations");
      setSelected(reservation);
      notify(`予約を登録しました（${reservation.id}）`);
    } catch {
      notify("予約登録に失敗しました");
    }
  };

  const openReservations = (nextFilter: ReservationFilter, nextDate = "") => {
    setReservationFilter(nextFilter);
    setReservationDateFromFilter(nextDate);
    setReservationDateToFilter(nextDate);
    setView("reservations");
  };

  if (role === "customer")
    return (
      <>
      {(dataErrors["メニュー"] || dataErrors["店舗"]) && <Alert className="m-4 border-destructive/40 text-destructive"><p>予約に必要なデータを読み込めませんでした。</p><Button type="button" className="mt-2" variant="outline" disabled={masterLoading} onClick={() => setDataReloadVersion(value => value + 1)}>再読み込み</Button></Alert>}
      <CustomerPortal
        initialMode={customerEntryMode}
        form={form}
        setForm={setForm}
        step={formStep}
        setStep={setFormStep}
        onAdmin={openAdmin}
        notify={notify}
        onSubmitReservation={createReservation}
        onSubmitCancellation={requestCancellation}
        onSubmitConfirmedReservationChange={requestConfirmedReservationChange}
        onSubmitChangeRequest={requestReservationChange}
        menuCatalog={menuCatalog}
      />
      </>
    );
  if (authLoading)
    return (
      <AdminAuthShell
        title="ログイン状態を確認しています"
        text="管理画面を表示する準備をしています。"
      />
    );
  if (!adminSession)
    return (
      <AdminLogin
        onLogin={loginAdmin}
        onCustomer={() => openCustomerPortal()}
        error={authError}
      />
    );

  const adminNavClass = (active: boolean) =>
    `relative flex min-h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm transition-colors ${active ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/8 hover:text-white"}`;

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <aside className="z-10 flex w-full flex-col bg-[#14213d] px-4 py-4 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-68 lg:px-5 lg:py-7 lg:overflow-y-auto">
        <div className="mb-4 flex items-center gap-3 px-2 lg:mb-8">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-lg font-bold">
            R
          </span>
          <div>
            <strong className="block text-base">Reserve</strong>
            <small className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Operations
            </small>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          <button
            className={adminNavClass(view === "dashboard")}
            onClick={() => setView("dashboard")}
          >
            <Icon name="grid" />
            ダッシュボード
          </button>
          <button
            className={adminNavClass(view === "reservations")}
            onClick={() => openReservations("すべて")}
          >
            <Icon name="calendar" />
            予約一覧
          </button>
          <button className={adminNavClass(view === "inquiries")} onClick={()=>setView("inquiries")}><Mail className="size-4" />問い合わせ管理</button>
          <button className={adminNavClass(view === "reservationCalendar")} onClick={()=>setView("reservationCalendar")}><Icon name="calendar" />予約カレンダー</button>
          <button
            className={adminNavClass(view === "reservationApprovals")}
            onClick={() => setView("reservationApprovals")}
          >
            <Icon name="check" />
            予約承認
            {taskCounts.reservationApprovals > 0 && (
              <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] not-italic text-white">
                {taskCounts.reservationApprovals}
              </i>
            )}
          </button>
          <button
            className={adminNavClass(view === "confirmedReservationRequests")}
            onClick={() => setView("confirmedReservationRequests")}
          >
            <Icon name="check" />
            本予約変更承認
            {taskCounts.confirmedReservationRequests > 0 && (
              <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] not-italic text-white">
                {taskCounts.confirmedReservationRequests}
              </i>
            )}
          </button>
          <button
            className={adminNavClass(view === "reservationChangeRequests")}
            onClick={() => setView("reservationChangeRequests")}
          >
            <Icon name="check" />
            予約変更承認
            {taskCounts.changeRequests > 0 && (
              <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] not-italic text-white">
                {taskCounts.changeRequests}
              </i>
            )}
          </button>
          <button
            className={adminNavClass(view === "cancellationApprovals")}
            onClick={() => setView("cancellationApprovals")}
          >
            <Icon name="check" />
            キャンセル承認
            {taskCounts.cancellationApprovals > 0 && (
              <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] not-italic text-white">
                {taskCounts.cancellationApprovals}
              </i>
            )}
          </button>
          <button
            className={adminNavClass(view === "confirmationContacts")}
            onClick={() => setView("confirmationContacts")}
          >
            <Icon name="check" />
            確認連絡
            {taskCounts.preContactDue > 0 && (
              <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] not-italic text-white">
                {taskCounts.preContactDue}
              </i>
            )}
          </button>
          <button className={adminNavClass(view === "storeAssignments")} onClick={() => setView("storeAssignments")}><Icon name="store" />店舗割当{taskCounts.storeUnassigned > 0 && <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] not-italic text-white">{taskCounts.storeUnassigned}</i>}</button>
          <button className={adminNavClass(view === "bookingReminders")} onClick={() => setView("bookingReminders")}>
            <Icon name="bell" />本予約の催促
            {taskCounts.temporaryExpired > 0 && <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] not-italic text-white">{taskCounts.temporaryExpired}</i>}
          </button>
          <button className={adminNavClass(view === "menuReminders")} onClick={() => setView("menuReminders")}>
            <Icon name="bell" />メニュー確定の催促
            {taskCounts.menuUnselected > 0 && <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] not-italic text-white">{taskCounts.menuUnselected}</i>}
          </button>
          <button
            className={adminNavClass(
              view === "masters" ||
                view === "customers" ||
                view === "stores" ||
                view === "menus" ||
                view === "otherSettings" || view === "emailTemplates",
            )}
            onClick={() => setView("masters")}
          >
            <Icon name="settings" />
            マスタ管理
          </button>
        </nav>
        <div className="mt-auto hidden border-t border-white/10 pt-5 lg:grid lg:gap-2">
          <Button
            variant="ghost"
            className="justify-between text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => openCustomerPortal()}
          >
            顧客画面を表示 <Icon name="arrow" />
          </Button>
          <Button
            variant="ghost"
            className="justify-start text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={signOutAdmin}
          >
            ログアウト
          </Button>
          <div className="mt-2 flex items-center gap-3 px-2">
            <span className="grid size-9 place-items-center rounded-full bg-white/10 text-xs">
              {(adminSession.email ?? "AD").slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <strong className="block truncate text-xs">
                {adminSession.email ?? "管理者"}
              </strong>
              <small className="text-[10px] text-slate-400">
                システム管理者
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 lg:ml-68">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card/95 px-5 backdrop-blur lg:px-8">
          <h1 className="text-lg font-semibold">
            {
              {
                dashboard: "ダッシュボード",
                reservations: "予約一覧",
                reservationApprovals: "予約承認",
                cancellationApprovals: "キャンセル承認",
                confirmedReservationRequests: "本予約変更承認",
                reservationChangeRequests: "予約変更承認",
                confirmationContacts: "確認連絡",
                reservationCalendar: "予約カレンダー",
                storeAssignments: "店舗割当",
                inquiries: "問い合わせ管理",
                bookingReminders: "本予約の催促",
                menuReminders: "メニュー確定の催促",
                masters: "マスタ管理",
                customers: "顧客管理",
                stores: "店舗管理",
                otherSettings: "その他",
                menus: "メニュー管理",
                emailTemplates: "メールテンプレート管理",
              }[view]
            }
          </h1>
          <div className="topbar-meta">
            <div className="text-right">
              <span className="hidden text-xs text-muted-foreground sm:block">
                管理画面
              </span>
              <strong className="text-xs font-medium text-muted-foreground">
                {fullDateHeadingLabel(todayIso())}
              </strong>
            </div>
          </div>
        </header>
        {(masterLoading || adminDataLoading) && <p role="status" className="px-5 py-3 text-sm text-muted-foreground">データを読み込んでいます…</p>}
        {Object.values(dataErrors).some(Boolean) && <Alert className="m-4 border-destructive/40 text-destructive"><p>一部のデータを読み込めませんでした。表示内容が最新でない可能性があります。</p><ul className="mt-2 list-inside list-disc text-xs">{Object.entries(dataErrors).filter(([, message]) => Boolean(message)).map(([key, message]) => <li key={key}>{message}</li>)}</ul><Button type="button" className="mt-3" variant="outline" disabled={masterLoading || adminDataLoading} onClick={() => setDataReloadVersion(value => value + 1)}>再読み込み</Button></Alert>}
        {view === "dashboard" ? (
          <main className="mx-auto grid w-full max-w-[1600px] gap-6 p-4 sm:p-6 lg:p-8">
            <Card className="overflow-hidden">
              <div className="grid min-h-56 lg:grid-cols-[340px_1fr]">
                <div className="grid content-center divide-y px-6 py-3">
                  <InfoMetric
                    label="本日の予約"
                    value={String(dashboardCounts.today)}
                    color="blue"
                  />
                  <InfoMetric
                    label="今月の予約"
                    value={String(dashboardCounts.month)}
                    color="green"
                  />
                </div>
                <div className="border-t p-5 lg:border-l lg:border-t-0">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">本日の予約</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dateHeadingLabel(todayIso())}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openReservations("すべて", todayIso())}
                    >
                      予約一覧で見る <Icon name="arrow" />
                    </Button>
                  </div>
                  {todayReservations.length ? (
                    <div className="timeline">
                      {todayReservations.map((reservation, index) => (
                        <Fragment key={reservation.id}>
                          <span>{reservationStartTime(reservation)}</span>
                          <i
                            className={["blue", "green", "violet"][index % 3]}
                          />
                          <div>
                            <strong>{reservation.customer} 様</strong>
                            <small>
                              {reservation.groupName
                                ? `${reservation.groupName}・`
                                : ""}
                              {assignmentLabel(reservation) || "店舗未割当"}・
                              {reservationMenuLabel(reservation)}
                            </small>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="grid min-h-32 place-items-center text-sm text-muted-foreground">
                      本日の予約はありません。
                    </div>
                  )}
                </div>
              </div>
            </Card>
            <section>
              <div className="mb-3">
                <h3 className="text-base font-semibold">タスク</h3>
              </div>
              <div className="grid gap-5">
                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                    承認系
                  </h4>
                  <TaskGrid>
                    <Task
                      color="amber"
                      title="予約の承認"
                      count={taskCounts.reservationApprovals}
                      text="仮予約・本予約の申請を確認しましょう"
                      onClick={() => setView("reservationApprovals")}
                    />
                    <Task
                      color="amber"
                      title="本予約変更承認"
                      count={taskCounts.confirmedReservationRequests}
                      text="仮予約から本予約への変更依頼を確認しましょう"
                      onClick={() => setView("confirmedReservationRequests")}
                    />
                    <Task
                      color="violet"
                      title="予約変更承認"
                      count={taskCounts.changeRequests}
                      text="予約内容の変更依頼を確認しましょう"
                      onClick={() => setView("reservationChangeRequests")}
                    />
                    <Task
                      color="red"
                      title="キャンセルの承認"
                      count={taskCounts.cancellationApprovals}
                      text="キャンセル申請を確認しましょう"
                      onClick={() => setView("cancellationApprovals")}
                    />
                  </TaskGrid>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                    内部業務系
                  </h4>
                  <TaskGrid>
                    <Task
                      color="blue"
                      title="確認連絡"
                      count={taskCounts.preContactDue}
                      text={
                        "食事日まで" +
                        confirmationContactWindowDays +
                        "日未満のお客様へ確認連絡を行いましょう"
                      }
                      onClick={() => setView("confirmationContacts")}
                    />
                    <Task
                      color="violet"
                      title="店舗割当"
                      count={taskCounts.storeUnassigned}
                      text="店舗割当を行いましょう"
                      onClick={() =>
                        setView("storeAssignments")
                      }
                    />
                  </TaskGrid>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                    催促系
                  </h4>
                  <TaskGrid>
                    <Task
                      color="amber"
                      title="本予約の催促"
                      count={taskCounts.temporaryExpired}
                      text="本予約への変更が必要な仮予約を確認しましょう"
                      onClick={() => setView("bookingReminders")}
                    />
                    <Task
                      color="green"
                      title="メニュー確定の催促"
                      count={taskCounts.menuUnselected}
                      text="メニューが未確定のお客様を確認しましょう"
                      onClick={() =>
                        setView("menuReminders")
                      }
                    />
                  </TaskGrid>
                </div>
              </div>
            </section>
          </main>
        ) : view === "inquiries" ? (
          <InquiryManagement getAdminToken={getAdminToken} onOpenReservation={number=>{const reservation=reservations.find(r=>r.id===number);if(reservation)setSelected(reservation);else notify("予約が見つかりません。予約データを再読み込みしてください。");}} />
        ) : view === "reservationCalendar" ? (
          <ReservationCalendarPage reservations={reservations} stores={stores} menus={menuCatalog} loading={masterLoading || adminDataLoading} error={Boolean(dataErrors["予約"] || dataErrors["店舗"] || dataErrors["メニュー"])} detailOpen={Boolean(selected)} getAdminToken={getAdminToken} onReload={async(signal)=>{
            const authToken=await getAdminToken();
            const [reservationData,storeData,menuData]=await Promise.all([
              requestJson<{reservations:Reservation[]}>("/api/reservations",{authToken,cache:"no-store",signal}),
              requestJson<{stores:Store[]}>("/api/stores",{authToken,cache:"no-store",signal}),
              requestJson<{menus:Menu[]}>("/api/menus",{authToken,cache:"no-store",signal}),
            ]);
            if(signal.aborted)return;
            setReservations(reservationData.reservations);
            setStores(sortByDisplayOrderThenName(storeData.stores));
            setMenuCatalog(sortByDisplayOrderThenName(menuData.menus));
            setDataErrors(current=>({...current,"予約":"","店舗":"","メニュー":""}));
          }} onSelect={setSelected} />
        ) : view === "bookingReminders" || view === "menuReminders" ? (
          <ReservationReminderPage key={view} kind={view === "bookingReminders" ? "booking" : "menu"} reservations={reservations} loading={adminDataLoading} error={Boolean(dataErrors["予約"])} onSelect={setSelected} />
        ) : view === "storeAssignments" ? (
          <StoreAssignmentPage reservations={reservations} stores={stores} loading={masterLoading || adminDataLoading} error={Boolean(dataErrors["予約"] || dataErrors["店舗"])} onAssign={assignStores} />
        ) : (
          <ManagementPage
            view={view}
            onSelectMasterView={setView}
            getAdminToken={getAdminToken}
            reservations={reservations}
            reservationChangeRequests={reservationChangeRequests}
            confirmationContactTargets={confirmationContactTargets}
            confirmationContactWindowDays={confirmationContactWindowDays}
            setConfirmationContactWindowDays={setConfirmationContactWindowDays}
            isBulkContacting={isBulkContacting}
            onBulkConfirmationContact={bulkUpdateConfirmationContacts}
            customers={customers}
            inactiveCustomers={inactiveCustomerList}
            stores={stores}
            inactiveStores={inactiveStoreList}
            menus={menuCatalog}
            inactiveMenus={inactiveMenuList}
            reservationFilter={reservationFilter}
            setReservationFilter={setReservationFilter}
            reservationDateFromFilter={reservationDateFromFilter}
            setReservationDateFromFilter={setReservationDateFromFilter}
            reservationDateToFilter={reservationDateToFilter}
            setReservationDateToFilter={setReservationDateToFilter}
            reservationSearch={reservationSearch}
            setReservationSearch={setReservationSearch}
            onSelect={setSelected}
            updateStatus={updateStatus}
            notify={notify}
            onSaveMenu={saveMenu}
            onDeleteMenu={deleteMenu}
            onReactivateMenu={reactivateMenu}
            onCreateCustomer={createCustomer}
            onSaveCustomer={saveCustomer}
            onDeleteCustomer={deleteCustomer}
            onReactivateCustomer={reactivateCustomer}
            onCreateStore={createStore}
            onSaveStore={saveStore}
            onDeleteStore={deleteStore}
            onReactivateStore={reactivateStore}
            onOpenNewReservation={() => setIsNewReservationOpen(true)}
            onApproveChangeRequest={approveReservationChangeRequest}
            onRejectChangeRequest={rejectReservationChangeRequest}
          />
        )}
      </div>
      {isNewReservationOpen && (
        <NewReservationDrawer
          form={adminForm}
          setForm={setAdminForm}
          onClose={() => setIsNewReservationOpen(false)}
          onSubmit={submitAdminReservation}
          menuCatalog={menuCatalog}
        />
      )}
      {selected && (selected.status === STATUS.temporaryRequested || selected.status === STATUS.confirmedRequested) ? (
        <ReservationApprovalDialog key={selected.id} reservation={selected} getAdminToken={getAdminToken} onClose={() => setSelected(null)} onDecision={updateStatus} />
      ) : selected && (
        <ReservationDrawer
          getAdminToken={getAdminToken}
          reservation={selected}
          onClose={() => setSelected(null)}
          updateStatus={updateStatus}
          updateConfirmationContact={updateConfirmationContact}
          assignStores={assignStores}
          updateReservation={updateReservation}
          menuCatalog={menuCatalog}
          stores={stores}
        />
      )}
      <Toaster />
    </div>
  );
}

function ManagementPage({
  view,
  onSelectMasterView,
  getAdminToken,
  reservations,
  reservationChangeRequests,
  confirmationContactTargets,
  confirmationContactWindowDays,
  setConfirmationContactWindowDays,
  isBulkContacting,
  onBulkConfirmationContact,
  customers,
  inactiveCustomers,
  stores,
  inactiveStores,
  menus,
  inactiveMenus,
  reservationFilter,
  setReservationFilter,
  reservationDateFromFilter,
  setReservationDateFromFilter,
  reservationDateToFilter,
  setReservationDateToFilter,
  reservationSearch,
  setReservationSearch,
  onSelect,
  updateStatus,
  notify,
  onSaveMenu,
  onDeleteMenu,
  onReactivateMenu,
  onCreateCustomer,
  onSaveCustomer,
  onDeleteCustomer,
  onReactivateCustomer,
  onCreateStore,
  onSaveStore,
  onDeleteStore,
  onReactivateStore,
  onOpenNewReservation,
  onApproveChangeRequest,
  onRejectChangeRequest,
}: {
  view: Exclude<View, "dashboard">;
  onSelectMasterView: (
    view: "masters" | "customers" | "stores" | "menus" | "emailTemplates" | "otherSettings",
  ) => void;
  getAdminToken: () => Promise<string>;
  reservations: Reservation[];
  reservationChangeRequests: ReservationChangeRequest[];
  confirmationContactTargets: Reservation[];
  confirmationContactWindowDays: number;
  setConfirmationContactWindowDays: (days: number) => void;
  isBulkContacting: boolean;
  onBulkConfirmationContact: () => Promise<void>;
  customers: Customer[];
  inactiveCustomers: Customer[];
  stores: Store[];
  inactiveStores: Store[];
  menus: Menu[];
  inactiveMenus: Menu[];
  reservationFilter: ReservationFilter;
  setReservationFilter: (filter: ReservationFilter) => void;
  reservationDateFromFilter: string;
  setReservationDateFromFilter: (date: string) => void;
  reservationDateToFilter: string;
  setReservationDateToFilter: (date: string) => void;
  reservationSearch: string;
  setReservationSearch: (search: string) => void;
  onSelect: (r: Reservation) => void;
  updateStatus: (
    id: string,
    status: Status,
    options?: { manualReason?: string },
  ) => void;
  notify: (s: string) => void;
  onSaveMenu: (input: MenuForm, originalName?: string) => Promise<void>;
  onDeleteMenu: (name: string) => Promise<void>;
  onReactivateMenu: (menu: Menu) => Promise<void>;
  onCreateCustomer: (input: CustomerForm) => Promise<void>;
  onSaveCustomer: (originalName: string, input: CustomerForm) => Promise<void>;
  onDeleteCustomer: (name: string) => Promise<void>;
  onReactivateCustomer: (customer: Customer) => Promise<void>;
  onCreateStore: (input: StoreForm) => Promise<void>;
  onSaveStore: (originalName: string, input: StoreForm) => Promise<void>;
  onDeleteStore: (name: string) => Promise<void>;
  onReactivateStore: (store: Store) => Promise<void>;
  onOpenNewReservation: () => void;
  onApproveChangeRequest: (id: string) => Promise<void>;
  onRejectChangeRequest: (id: string) => Promise<void>;
}) {
  const [reservationSort, setReservationSort] = useState<{
    key: ReservationSortKey;
    direction: SortDirection;
  }>({ key: "date", direction: "asc" });
  const [reservationStatusFilters, setReservationStatusFilters] = useState<
    Status[]
  >(() =>
    statusOptions.filter(
      (status) => status !== STATUS.cancelled && status !== STATUS.visited &&
      status !== STATUS.temporaryRejected && status !== STATUS.confirmedRejected,
    ),
  );
  const reservationQuery = useMemo<ReservationSearch>(() => ({ search: reservationSearch, dateFrom: reservationDateFromFilter, dateTo: reservationDateToFilter, statuses: reservationStatusFilters, filter: reservationFilter, sortKey: reservationSort.key, direction: reservationSort.direction }), [reservationSearch, reservationDateFromFilter, reservationDateToFilter, reservationStatusFilters, reservationFilter, reservationSort]);
  const filteredReservations = useMemo(() => reservations.filter(reservation => matchesReservation(reservation, reservationQuery, todayIso())), [reservations, reservationQuery]);
  const sortedReservations = useMemo(() => [...filteredReservations].sort((a,b) => compareReservations(a,b,reservationQuery,todayIso())), [filteredReservations,reservationQuery]);
  const pendingChangeRequests = useMemo(
    () =>
      reservationChangeRequests.filter(
        (request) => request.status === "requested",
      ),
    [reservationChangeRequests],
  );
  const pendingConfirmedReservationRequests = useMemo(
    () => reservations.filter(isConfirmedReservationChangeRequest),
    [reservations],
  );
  const pendingReservationApprovalReservations = useMemo(
    () =>
      reservations.filter(
        (reservation) =>
          reservationApprovalStatuses.includes(reservation.status) &&
          !isConfirmedReservationChangeRequest(reservation),
      ),
    [reservations],
  );
  const pendingCancellationApprovalReservations = useMemo(
    () =>
      reservations.filter((reservation) =>
        cancellationApprovalStatuses.includes(reservation.status),
      ),
    [reservations],
  );
  const toggleReservationSort = (key: ReservationSortKey) => {
    setReservationSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };
  const sortLabel = (key: ReservationSortKey) =>
    reservationSort.key === key
      ? reservationSort.direction === "asc"
        ? "↑"
        : "↓"
      : "↕";
  const hasReservationDateFilter = Boolean(
    reservationDateFromFilter || reservationDateToFilter,
  );
  const statusFilterLabel =
    reservationStatusFilters.length === statusOptions.length
      ? "すべて"
      : reservationStatusFilters.length === 0
        ? "未選択（すべて）"
        : `${reservationStatusFilters.length}件選択`;
  const toggleStatusFilter = (status: Status) => {
    setReservationStatusFilters((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  };
  const isMasterChildView =
    view === "customers" || view === "stores" || view === "menus" || view === "otherSettings" || view === "emailTemplates";
  return (
    <main className="management">
      {isMasterChildView && (
        <button
          type="button"
          className="breadcrumb-back"
          onClick={() => onSelectMasterView("masters")}
        >
          ← マスタ管理
        </button>
      )}
      {view === "confirmationContacts" && (
        <ConfirmationContactPage
          reservations={confirmationContactTargets}
          windowDays={confirmationContactWindowDays}
          setWindowDays={setConfirmationContactWindowDays}
          isBulkContacting={isBulkContacting}
          onBulkConfirmationContact={onBulkConfirmationContact}
          onSelect={onSelect}
        />
      )}
      {view === "reservationApprovals" && (
        <ReservationApprovalPage
          reservations={pendingReservationApprovalReservations}
          onSelect={onSelect}
          updateStatus={updateStatus}
        />
      )}
      {view === "cancellationApprovals" && (
        <CancellationApprovalPage
          reservations={pendingCancellationApprovalReservations}
          onSelect={onSelect}
          updateStatus={updateStatus}
        />
      )}
      {view === "confirmedReservationRequests" && (
        <ConfirmedReservationRequestPage
          reservations={pendingConfirmedReservationRequests}
          onSelect={onSelect}
          updateStatus={updateStatus}
        />
      )}
      {view === "reservationChangeRequests" && (
        <ReservationChangeRequestPage
          requests={pendingChangeRequests}
          reservations={reservations}
          onApproveChangeRequest={onApproveChangeRequest}
          onRejectChangeRequest={onRejectChangeRequest}
        />
      )}
      {view === "otherSettings" && <OtherSettingsManagement getAdminToken={getAdminToken} />}
      {view === "masters" && (
        <MasterManagementPage onSelectMasterView={onSelectMasterView} />
      )}
      {view === "reservations" && (
        <section className="panel management-panel reservation-list-panel">
          <div className="management-tools reservation-tools">
            <div className="reservation-search-row">
              <label className="reservation-search">
                <div>
                  <Icon name="search" />
                  <input
                    placeholder="予約ID・顧客名で検索"
                    value={reservationSearch}
                    onChange={(event) =>
                      setReservationSearch(event.target.value)
                    }
                  />
                </div>
              </label>
              <div className="reservation-date-range">
                <span>予約日</span>
                <input
                  type="date"
                  value={reservationDateFromFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    setReservationDateFromFilter(value);
                    if (value && !reservationDateToFilter)
                      setReservationDateToFilter(value);
                  }}
                />
                <em>〜</em>
                <input
                  type="date"
                  value={reservationDateToFilter}
                  onChange={(event) =>
                    setReservationDateToFilter(event.target.value)
                  }
                />
              </div>
              <details className="reservation-status-dropdown">
                <summary>
                  <span>ステータス</span>
                  <strong>{statusFilterLabel}</strong>
                </summary>
                <div className="reservation-status-menu">
                  <div className="status-menu-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setReservationStatusFilters(
                          statusOptions.filter(
                            (status) =>
                              status !== STATUS.cancelled &&
                              status !== STATUS.visited,
                          ),
                        )
                      }
                    >
                      有効分のみ
                    </button>
                    <button
                      type="button"
                      onClick={() => setReservationStatusFilters([])}
                    >
                      解除
                    </button>
                    <button
                      type="button"
                      onClick={(event) =>
                        event.currentTarget
                          .closest("details")
                          ?.removeAttribute("open")
                      }
                    >
                      閉じる
                    </button>
                  </div>
                  {statusOptions.map((status) => (
                    <label key={status}>
                      <input
                        type="checkbox"
                        checked={reservationStatusFilters.includes(status)}
                        onChange={() => toggleStatusFilter(status)}
                      />
                      <span>{statusLabel(status)}</span>
                    </label>
                  ))}
                </div>
              </details>
              <button
                className={
                  hasReservationDateFilter
                    ? "clear-filter"
                    : "clear-filter is-placeholder"
                }
                disabled={!hasReservationDateFilter}
                aria-hidden={!hasReservationDateFilter}
                tabIndex={hasReservationDateFilter ? 0 : -1}
                onClick={() => {
                  setReservationDateFromFilter("");
                  setReservationDateToFilter("");
                }}
              >
                日付クリア
              </button>
              <div className="result-count">
                <span>該当</span>
                <strong>{filteredReservations.length}</strong>
                <span>件</span>
              </div>
              <button
                type="button"
                className="reservation-new-button"
                onClick={onOpenNewReservation}
              >
                <Icon name="plus" />
                新規登録
              </button>
            </div>
          </div>
          <div className="border-b border-border px-4 py-3 sm:px-5"><ReservationCsvExport query={reservationQuery} count={filteredReservations.length} getAdminToken={getAdminToken} /></div>
          <div className="table-wrap">
            <table className="large-table">
              <thead>
                <tr>
                  <th>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("id")}
                    >
                      予約ID / 受付日時<span>{sortLabel("id")}</span>
                    </button>
                  </th>
                  <th>予約区分</th>
                  <th>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("status")}
                    >
                      ステータス<span>{sortLabel("status")}</span>
                    </button>
                  </th>
                  <th>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("customer")}
                    >
                      お客様<span>{sortLabel("customer")}</span>
                    </button>
                  </th>
                  <th>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("date")}
                    >
                      利用日時・人数<span>{sortLabel("date")}</span>
                    </button>
                  </th>
                  <th>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("menu")}
                    >
                      メニュー<span>{sortLabel("menu")}</span>
                    </button>
                  </th>
                  <th>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("store")}
                    >
                      担当店舗<span>{sortLabel("store")}</span>
                    </button>
                  </th>
                  <th>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("contact")}
                    >
                      確認連絡<span>{sortLabel("contact")}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedReservations.map((r) => (
                  <tr key={r.id} onClick={() => onSelect(r)}>
                    <td>
                      <strong>{r.id}</strong>
                      <small>{dateTimeMinuteLabel(r.received)}</small>
                    </td>
                    <td>
                      <ReservationBookingTypeCell reservation={r} />
                    </td>
                    <td>
                      <span className={"badge " + statusClass[r.status]}>
                        <i />
                        {reservationDisplayLabel(r)}
                      </span>
                    </td>
                    <td>
                      <strong>{r.customer}</strong>
                      {reservationCustomerSubLabel(r) ? (
                        <small>{reservationCustomerSubLabel(r)}</small>
                      ) : null}
                    </td>
                    <td>
                      <strong>{reservationDateTimeLabel(r)}</strong>
                      <strong>{r.people}名</strong>
                    </td>
                    <td>{reservationMenuLabel(r)}</td>
                    <td>
                      {assignmentLabel(r) ? (
                        <strong>{assignmentLabel(r)}</strong>
                      ) : (
                        <span className="unassigned">未割当</span>
                      )}
                    </td>
                    <td>
                      {r.confirmationContactedAt ? (
                        <>
                          <strong>連絡済</strong>
                          <small>
                            {new Date(
                              r.confirmationContactedAt,
                            ).toLocaleDateString("ja-JP")}
                          </small>
                        </>
                      ) : (
                        <span className="unassigned">未連絡</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredReservations.length && (
              <div className="empty-table">
                選択した条件の予約はありません。
              </div>
            )}
          </div>
        </section>
      )}
      {view === "customers" && (
        <CustomerManagement
          customers={customers}
          inactiveCustomers={inactiveCustomers}
          onCreateCustomer={onCreateCustomer}
          onSaveCustomer={onSaveCustomer}
          onDeleteCustomer={onDeleteCustomer}
          onReactivateCustomer={onReactivateCustomer}
          notify={notify}
        />
      )}
      {view === "stores" && (
        <StoreManagement
          stores={stores}
          inactiveStores={inactiveStores}
          onCreateStore={onCreateStore}
          onSaveStore={onSaveStore}
          onDeleteStore={onDeleteStore}
          onReactivateStore={onReactivateStore}
          notify={notify}
        />
      )}
      {view === "menus" && (
        <MenuManagement
          menus={menus}
          inactiveMenus={inactiveMenus}
          onSaveMenu={onSaveMenu}
          onDeleteMenu={onDeleteMenu}
          onReactivateMenu={onReactivateMenu}
          notify={notify}
        />
      )}
      {view === "emailTemplates" && (
        <EmailTemplateManagement getAdminToken={getAdminToken} notify={notify} />
      )}
    </main>
  );
}

function CustomerPortalHome({
  customerEmail,
  isLoggedIn,
  authError,
  accountEmail,
  accountPassword,
  accountSubmitting,
  customerAuthLoading,
  bookingMode,
  registrationForm,
  onBookingModeChange,
  onRegistrationFormChange,
  onAccountEmailChange,
  onAccountPasswordChange,
  onLogin,
  onSubmitAccount,
  onResetPassword,
  onLogout,
  onDeleteAccount,
  emailChangeMessage,
  onRequestEmailChange,
  contactVerificationStatus,
  customerAccount,
  accountLoadError,
  onRetryAccount,
  onUpdateAccount,
  contactEmails,
  onAddContactEmail,
  onRemoveContactEmail,
  onOpenAccount,
  onOpenReservation,
}: {
  customerEmail: string;
  isLoggedIn: boolean;
  authError: string;
  accountEmail: string;
  accountPassword: string;
  accountSubmitting: boolean;
  customerAuthLoading: boolean;
  bookingMode: "login" | "register";
  registrationForm: BookingForm;
  onBookingModeChange: (mode: "login" | "register") => void;
  onRegistrationFormChange: Dispatch<SetStateAction<BookingForm>>;
  onAccountEmailChange: (value: string) => void;
  onAccountPasswordChange: (value: string) => void;
  onLogin: (email?: string, password?: string) => void;
  onSubmitAccount: (email?: string, password?: string, profile?: RegisterAuthFields) => void;
  onResetPassword: (email: string) => void;
  onLogout: () => void;
  onDeleteAccount: (password: string) => Promise<void>;
  emailChangeMessage: string;
  onRequestEmailChange: (email: string) => Promise<void>;
  contactVerificationStatus: "verified" | "invalid" | null;
  customerAccount: Customer | null;
  accountLoadError: string;
  onRetryAccount: () => void;
  onUpdateAccount: (values: AccountProfileFields) => Promise<void>;
  contactEmails: AccountContactEmail[];
  onAddContactEmail: (email: string) => Promise<void>;
  onRemoveContactEmail: (id: string) => Promise<void>;
  onOpenAccount: () => void;
  onOpenReservation: () => void;
}) {
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [emailChangeSubmitting, setEmailChangeSubmitting] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState("");
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactEmailError, setContactEmailError] = useState("");
  const [showAccountDeletion, setShowAccountDeletion] = useState(false);
  const googleCustomer = useGoogleCustomer();
  const hasGoogleLogin = Boolean(googleCustomer?.user?.providerData.some(p => p.providerId === "google.com"));
  const [deletionPassword, setDeletionPassword] = useState("");
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [deletionError, setDeletionError] = useState("");
  const submitAccountDeletion = async () => {
    if (deletionSubmitting || accountSubmitting) return;
    if (!deletionPassword && !hasGoogleLogin) { setDeletionError("本人確認を行ってください。"); return; }
    setDeletionSubmitting(true); setDeletionError("");
    try { if (hasGoogleLogin) await googleCustomer!.reauthenticate(""); await onDeleteAccount(deletionPassword); setShowAccountDeletion(false); }
    catch (error) { setDeletionError(error instanceof Error ? error.message : "アカウントを削除できませんでした。"); }
    finally { setDeletionPassword(""); setDeletionSubmitting(false); }
  };
  const submitEmailChange = async () => {
    if (!newEmail || newEmail !== confirmEmail) { setEmailChangeError("新しいメールアドレスが一致しません。"); return; }
    setEmailChangeSubmitting(true); setEmailChangeError("");
    try { if (hasGoogleLogin) await googleCustomer!.reauthenticate(""); await onRequestEmailChange(newEmail); setShowEmailChange(false); setNewEmail(""); setConfirmEmail(""); }
    catch (error) { setEmailChangeError(customerAuthErrorCode(error) === "auth/requires-recent-login" ? "安全のため再ログインしてからお試しください。" : error instanceof Error ? error.message : "確認メールを送信できませんでした。"); }
    finally { setEmailChangeSubmitting(false); }
  };
  return (
    <div className={isLoggedIn ? "form-body narrow portal-entry" : "portal-entry mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10"}>
      <p className="form-kicker">REQUEST</p>
      <h2 className="my-2 text-[22px]">{isLoggedIn && !customerAuthLoading && !accountLoadError && !isAccountProfileComplete(customerAccount) ? "お客様情報登録" : "お手続きを選択"}</h2>
      <section className="customer-account-panel portal-account-panel">
        {isLoggedIn ? (
          <div className="customer-account-current">
            <span>ログイン中</span>
            <strong>{customerEmail}</strong>
            <button type="button" onClick={onLogout}>
              ログアウト
            </button>
            <button type="button" onClick={() => setShowEmailChange((value) => !value)}>メールアドレス変更</button>
            <button
              type="button"
              className="account-delete-button"
              onClick={() => { setShowAccountDeletion((value) => !value); setDeletionPassword(""); setDeletionError(""); }}
              disabled={accountSubmitting}
            >
              アカウント削除
            </button>
          </div>
        ) : (
          <CustomerAccountAccessPanel
            authError={authError}
            accountEmail={accountEmail}
            accountPassword={accountPassword}
            accountSubmitting={accountSubmitting}
            customerAuthLoading={customerAuthLoading}
            bookingMode={bookingMode}
            registrationForm={registrationForm}
            onBookingModeChange={onBookingModeChange}
            onRegistrationFormChange={onRegistrationFormChange}
            onAccountEmailChange={onAccountEmailChange}
            onAccountPasswordChange={onAccountPasswordChange}
            onLogin={onLogin}
            onSubmitAccount={onSubmitAccount}
            onResetPassword={onResetPassword}
          />
        )}
      </section>
      {contactVerificationStatus && <Alert className={contactVerificationStatus === "verified" ? "border-success/40" : "border-destructive/40 text-destructive"}>{contactVerificationStatus === "verified" ? "追加の連絡先メールアドレスを確認しました。今後の予約案内をこのアドレスにも送信します。" : "確認URLが無効か、有効期限が切れています。追加連絡先を削除して、もう一度登録してください。"}</Alert>}
      {isLoggedIn && customerAccount && <AccountProfileEditor key={`${customerAccount.id}-${customerAccount.accountType}-${customerAccount.name}-${customerAccount.phone}-${customerAccount.address}`} account={customerAccount} onSave={onUpdateAccount} />}
      {isLoggedIn && accountLoadError && <Alert className="border-destructive/40 text-destructive"><p>{accountLoadError}</p><Button type="button" className="mt-3" variant="outline" disabled={customerAuthLoading} onClick={onRetryAccount}>再読み込み</Button></Alert>}
      {isLoggedIn && !customerAccount && !customerAuthLoading && !accountLoadError && (
        <div className="grid gap-3">
          <Alert>アカウント情報の保存が完了していません。プロフィールを保存すると登録が完了します。</Alert>
          <AccountProfileEditor account={{ name: googleCustomer?.user?.displayName ?? "", contactPersonName: googleCustomer?.user?.displayName ?? "", contact: customerEmail, phone: "" }} onSave={onUpdateAccount} />
        </div>
      )}
      {isLoggedIn && showAccountDeletion && !showEmailChange && (
        <form className="mt-4 grid gap-3 rounded-md border border-destructive/40 p-4" onSubmit={(event) => { event.preventDefault(); void submitAccountDeletion(); }}>
          <p className="text-sm">アカウント削除の前に、本人確認を行います。削除するとログインできなくなります。</p>
          {!hasGoogleLogin && <>
          <div className="grid gap-2">
            <Label htmlFor="account-deletion-password">現在のパスワード</Label>
            <Input id="account-deletion-password" type="password" autoComplete="current-password" required value={deletionPassword} disabled={deletionSubmitting || accountSubmitting} aria-invalid={Boolean(deletionError)} aria-describedby={deletionError ? "account-deletion-error" : undefined} onChange={(event) => { setDeletionPassword(event.target.value); setDeletionError(""); }} />
          </div>
          </>}
          {deletionError && <p id="account-deletion-error" role="alert" className="text-sm text-destructive">{deletionError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" disabled={(!deletionPassword && !hasGoogleLogin) || deletionSubmitting || accountSubmitting}>{deletionSubmitting ? "本人確認・削除中…" : "本人確認して削除する"}</Button>
            <Button type="button" variant="outline" disabled={deletionSubmitting || accountSubmitting} onClick={() => { setShowAccountDeletion(false); setDeletionPassword(""); setDeletionError(""); }}>キャンセル</Button>
          </div>
        </form>
      )}
      {isLoggedIn && (showEmailChange || emailChangeMessage) && (
        <Card className="p-5">
          <h3 className="font-semibold">メールアドレス変更</h3>
          <p className="mt-2 text-sm text-muted-foreground">現在のメールアドレス: {customerEmail}</p>
          {showEmailChange && <div className="mt-4 grid gap-4"><div><Label htmlFor="new-account-email">新しいメールアドレス</Label><Input id="new-account-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} /></div><div><Label htmlFor="confirm-account-email">新しいメールアドレス（確認）</Label><Input id="confirm-account-email" type="email" value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} /></div>{emailChangeError && <Alert className="border-destructive/40 text-destructive">{emailChangeError}</Alert>}<Button type="button" onClick={submitEmailChange} disabled={emailChangeSubmitting}>{emailChangeSubmitting ? "送信中" : "確認メールを送信"}</Button></div>}
          {emailChangeMessage && <Alert className="mt-4 border-success/40">{emailChangeMessage}</Alert>}
        </Card>
      )}
      {isLoggedIn && isAccountProfileComplete(customerAccount) && !showAccountDeletion && !showEmailChange && <CustomerLoginMethods />}
      {isLoggedIn && isAccountProfileComplete(customerAccount) && (
        <Card className="p-5">
          <h3 className="font-semibold">追加の連絡先メールアドレス</h3>
          <p className="mt-1 text-sm text-muted-foreground">確認済みのアドレスにも予約に関する案内を送信します。最大5件まで登録できます。</p>
          <div className="mt-4 grid gap-2">{contactEmails.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"><span className="min-w-0 truncate">{item.email}</span><div className="flex items-center gap-2"><Badge variant={item.verifiedAt ? "success" : "secondary"}>{item.verifiedAt ? "確認済み" : "確認待ち"}</Badge><Button type="button" size="sm" variant="outline" disabled={contactSubmitting} onClick={async () => { setContactSubmitting(true); setContactEmailError(""); try { await onRemoveContactEmail(item.id); } catch (error) { setContactEmailError(error instanceof Error ? error.message : "追加連絡先を削除できませんでした。"); } finally { setContactSubmitting(false); } }}>削除</Button></div></div>)}</div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input type="email" aria-label="追加するメールアドレス" placeholder="追加するメールアドレス" value={additionalEmail} onChange={(event) => { setAdditionalEmail(event.target.value); setContactEmailError(""); }} /><Button type="button" disabled={!additionalEmail || contactSubmitting || contactEmails.length >= 5} onClick={async () => { setContactSubmitting(true); setContactEmailError(""); try { await onAddContactEmail(additionalEmail); setAdditionalEmail(""); } catch (error) { setContactEmailError(error instanceof Error ? error.message : "確認メールを送信できませんでした。"); } finally { setContactSubmitting(false); } }}>{contactSubmitting ? "送信中" : "確認メールを送信"}</Button></div>
          {contactEmailError && <Alert className="mt-3 border-destructive/40 text-destructive">{contactEmailError}</Alert>}
        </Card>
      )}
      {isLoggedIn && isAccountProfileComplete(customerAccount) ? (
        <div className="portal-entry-grid">
          <button type="button" onClick={onOpenReservation}>
            <strong>予約申請</strong>
            <small>仮予約または本予約を申し込みます</small>
          </button>
          <button type="button" onClick={onOpenAccount}>
            <strong>予約確認・変更・キャンセル</strong>
            <small>予約の確認、変更申請、キャンセル申請を行います</small>
          </button>
        </div>
      ) : null}
    </div>
  );
}

const loginAuthSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "メールアドレスを入力してください")
    .email("正しいメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});
const registerAuthSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "メールアドレスを入力してください")
      .email("正しいメールアドレスを入力してください"),
    password: z.string().min(6, "パスワードは6文字以上で入力してください"),
    accountType: z.enum(["individual", "travel_agency"]),
    name: z.string(),
    companyBranchName: z.string(),
    contactPersonName: z.string(),
    phone: z
      .string()
      .trim()
      .min(1, "電話番号を入力してください")
      .regex(/^[0-9+()\-\s]+$/, "電話番号の形式を確認してください"),
    address: z.string(),
  })
  .superRefine((value, context) => {
    if (value.accountType === "travel_agency") {
      if (!value.companyBranchName.trim())
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["companyBranchName"],
          message: "会社・支店名を入力してください",
        });
      if (!value.contactPersonName.trim())
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contactPersonName"],
          message: "担当者名を入力してください",
        });
    } else if (!value.name.trim())
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "お名前を入力してください",
      });
  });

type LoginAuthFields = z.infer<typeof loginAuthSchema>;
type RegisterAuthFields = z.infer<typeof registerAuthSchema>;

const accountProfileSchema = z
  .object({
    accountType: z.enum(["individual", "travel_agency"]),
    name: z.string(),
    companyBranchName: z.string(),
    contactPersonName: z.string(),
    phone: z.string().trim().min(1, "電話番号を入力してください").regex(/^[0-9+()\-\s]+$/, "電話番号の形式を確認してください"),
    address: z.string(),
  })
  .superRefine((value, context) => {
    if (value.accountType === "travel_agency") {
      if (!value.companyBranchName.trim()) context.addIssue({ code: z.ZodIssueCode.custom, path: ["companyBranchName"], message: "会社・支店名を入力してください" });
      if (!value.contactPersonName.trim()) context.addIssue({ code: z.ZodIssueCode.custom, path: ["contactPersonName"], message: "担当者名を入力してください" });
    } else if (!value.name.trim()) context.addIssue({ code: z.ZodIssueCode.custom, path: ["name"], message: "お名前を入力してください" });
  });

type AccountProfileFields = z.infer<typeof accountProfileSchema>;

function AccountProfileEditor({ account, onSave }: { account: Customer; onSave: (values: AccountProfileFields) => Promise<void> }) {
  const [editing, setEditing] = useState(!isAccountProfileComplete(account));
  const [submitError, setSubmitError] = useState("");
  const profileForm = useForm<AccountProfileFields>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: {
      accountType: account.accountType === "travel_agency" ? "travel_agency" : "individual",
      name: account.accountType === "travel_agency" ? "" : account.name,
      companyBranchName: account.companyBranchName ?? (account.accountType === "travel_agency" ? account.name : ""),
      contactPersonName: account.contactPersonName ?? "",
      phone: account.phone ?? "",
      address: account.address ?? "",
    },
    mode: "onTouched",
  });
  const accountType = profileForm.watch("accountType");
  const submit = profileForm.handleSubmit(async (values) => {
    setSubmitError("");
    try { await onSave(values); setEditing(false); }
    catch (error) { setSubmitError(error instanceof Error ? error.message : "アカウント情報を更新できませんでした。"); }
  });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{account.id ? "お客様情報" : "お客様情報登録"}</h3>{!editing && <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>変更</Button>}</div>
      {!editing ? (
        <dl className="mt-4 grid gap-3 text-sm">
          <div><dt className="text-muted-foreground">利用者区分</dt><dd className="mt-1 font-medium">{account.accountType === "travel_agency" ? "旅行会社の担当者様" : "一般のお客様"}</dd></div>
          <div><dt className="text-muted-foreground">{account.accountType === "travel_agency" ? "会社・支店名" : "氏名"}</dt><dd className="mt-1 font-medium">{account.accountType === "travel_agency" ? account.companyBranchName || account.name : account.name}</dd></div>
          {account.accountType === "travel_agency" && <div><dt className="text-muted-foreground">担当者名</dt><dd className="mt-1 font-medium">{account.contactPersonName || "未登録"}</dd></div>}
          <div><dt className="text-muted-foreground">電話番号</dt><dd className="mt-1 font-medium">{account.phone || "未登録"}</dd></div>
          <div><dt className="text-muted-foreground">住所</dt><dd className="mt-1 whitespace-pre-wrap font-medium">{account.address || "未登録"}</dd></div>
        </dl>
      ) : (
        <form className="mt-4 grid gap-4" onSubmit={submit} noValidate>
          <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="mb-1 text-sm font-medium sm:col-span-2">利用者区分 <span className="ml-2 text-xs text-primary">必須</span></legend><Button type="button" variant="outline" aria-pressed={accountType === "individual"} className={accountType === "individual" ? "border-primary bg-primary/5 text-primary" : ""} onClick={() => profileForm.setValue("accountType", "individual", { shouldValidate: true })}>一般のお客様</Button><Button type="button" variant="outline" aria-pressed={accountType === "travel_agency"} className={accountType === "travel_agency" ? "border-primary bg-primary/5 text-primary" : ""} onClick={() => profileForm.setValue("accountType", "travel_agency", { shouldValidate: true })}>旅行会社の担当者様</Button></fieldset>
          {accountType === "travel_agency" ? <><AuthField label="会社・支店名" required error={profileForm.formState.errors.companyBranchName?.message}><Input {...profileForm.register("companyBranchName")} /></AuthField><AuthField label="担当者名" required error={profileForm.formState.errors.contactPersonName?.message}><Input autoComplete="name" {...profileForm.register("contactPersonName")} /></AuthField></> : <AuthField label="氏名" required error={profileForm.formState.errors.name?.message}><Input autoComplete="name" {...profileForm.register("name")} /></AuthField>}
          <AuthField label="電話番号" required error={profileForm.formState.errors.phone?.message}><Input type="tel" inputMode="tel" autoComplete="tel" {...profileForm.register("phone")} /></AuthField>
          <AuthField label="住所" error={profileForm.formState.errors.address?.message}><Input autoComplete="street-address" {...profileForm.register("address")} /></AuthField>
          {submitError && <Alert className="border-destructive/40 text-destructive">{submitError}</Alert>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={profileForm.formState.isSubmitting} onClick={() => { profileForm.reset(); setSubmitError(""); setEditing(false); }}>キャンセル</Button><Button type="submit" disabled={profileForm.formState.isSubmitting}>{profileForm.formState.isSubmitting ? "保存中" : "保存"}</Button></div>
        </form>
      )}
    </Card>
  );
}

function CustomerAuthEntryLinks() {
  return <div className="grid gap-5 p-5 sm:p-6">
    <p className="text-sm leading-6 text-muted-foreground">ログイン済みのお客様のみ手続きできます。アカウントがないお客様は先にアカウント登録してください。</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <Button asChild size="lg"><CustomerAuthLink href="/login">ログイン</CustomerAuthLink></Button>
      <Button asChild size="lg" variant="outline"><CustomerAuthLink href="/register">新規登録</CustomerAuthLink></Button>
    </div>
  </div>;
}

function CustomerAccountAccessPanel({
  standalone = false,
  authError,
  accountEmail,
  accountPassword,
  accountSubmitting,
  customerAuthLoading,
  bookingMode,
  registrationForm,
  onRegistrationFormChange,
  onAccountEmailChange,
  onAccountPasswordChange,
  onLogin,
  onSubmitAccount,
  onResetPassword,
}: {
  standalone?: boolean;
  authError: string;
  accountEmail: string;
  accountPassword: string;
  accountSubmitting: boolean;
  customerAuthLoading: boolean;
  bookingMode: "login" | "register";
  registrationForm: BookingForm;
  onBookingModeChange: (mode: "login" | "register") => void;
  onRegistrationFormChange: Dispatch<SetStateAction<BookingForm>>;
  onAccountEmailChange: (value: string) => void;
  onAccountPasswordChange: (value: string) => void;
  onLogin: (email?: string, password?: string) => void;
  onSubmitAccount: (email?: string, password?: string, profile?: RegisterAuthFields) => void;
  onResetPassword: (email: string) => void;
}) {
  const travelAgency = isTravelAgencyAccount(registrationForm);
  const [showPassword, setShowPassword] = useState(false);
  const loginForm = useForm<LoginAuthFields>({
    resolver: zodResolver(loginAuthSchema),
    values: { email: accountEmail, password: accountPassword },
    mode: "onTouched",
  });
  const registerForm = useForm<RegisterAuthFields>({
    resolver: zodResolver(registerAuthSchema),
    values: {
      email: accountEmail,
      password: accountPassword,
      accountType: travelAgency ? "travel_agency" : "individual",
      name: registrationForm.name,
      companyBranchName: registrationForm.companyBranchName ?? "",
      contactPersonName: registrationForm.contactPersonName ?? "",
      phone: registrationForm.phone,
      address: registrationForm.address,
    },
    mode: "onTouched",
  });
  const busy = accountSubmitting || customerAuthLoading;
  const selectAccountType = (
    accountType: NonNullable<BookingForm["accountType"]>,
  ) => {
    onRegistrationFormChange((current) => ({
      ...current,
      accountType,
      bookingType:
        accountType === "travel_agency" ? "travel_agency_group" : "individual",
      companyBranchName:
        accountType === "travel_agency"
          ? current.companyBranchName || current.name
          : "",
      contactPersonName:
        accountType === "travel_agency" ? current.contactPersonName : "",
    }));
  };
  if (!standalone) return <CustomerAuthEntryLinks />;
  return (
    <section className="@container overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm" aria-label={bookingMode === "login" ? "ログイン方法" : "新規登録方法"}>
      <p className="px-5 pb-3 pt-4 text-sm leading-6 text-muted-foreground">
        {bookingMode === "login" ? "メールアドレスまたはGoogleアカウントでログインしてください。" : "メールアドレスまたはGoogleアカウントで新規登録できます。"}
      </p>
      <div className="grid border-t @min-[640px]:grid-cols-2">
      <div className="min-w-0 @min-[640px]:border-r">
      {bookingMode === "login" && <div>
        <form
          className="grid gap-5 p-5 sm:p-6"
          onSubmit={loginForm.handleSubmit((values) => {
            onAccountEmailChange(values.email);
            onAccountPasswordChange(values.password);
            onLogin(values.email, values.password);
          })}
          noValidate
        >
          <h3 className="text-base font-semibold">メールアドレスでログイン</h3>
          <AuthField
            label="メールアドレス"
            error={loginForm.formState.errors.email?.message}
            icon={<Mail aria-hidden="true" />}
          >
            <Input
              type="email"
              autoComplete="email"
              {...loginForm.register("email", {
                onChange: (event) => onAccountEmailChange(event.target.value),
              })}
            />
          </AuthField>
          <AuthField
            label="パスワード"
            error={loginForm.formState.errors.password?.message}
            icon={<LockKeyhole aria-hidden="true" />}
          >
            <div className="relative">
              <Input
                className="pr-12"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...loginForm.register("password", {
                  onChange: (event) => onAccountPasswordChange(event.target.value),
                })}
              />
              <Button
                className="absolute right-1 top-1 size-9"
                type="button"
                variant="ghost"
                size="icon"
                title={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </AuthField>
          {authError ? <Alert>{authError}</Alert> : null}
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="link"
              className="justify-start px-0 text-xs"
              disabled={busy}
              onClick={async () => {
                if (!(await loginForm.trigger("email", { shouldFocus: true }))) return;
                loginForm.clearErrors("password");
                onResetPassword(loginForm.getValues("email"));
              }}
            >
              パスワードをお忘れですか？
            </Button>
            <Button type="submit" className="sm:min-w-36" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" />}
              {busy ? "確認中" : "ログイン"}
            </Button>
          </div>
        </form>
      </div>}
      {bookingMode === "register" && <div>
        <form
          className="grid gap-4 p-5 sm:p-6"
          onSubmit={registerForm.handleSubmit((values) => {
            onAccountEmailChange(values.email);
            onAccountPasswordChange(values.password);
            onSubmitAccount(values.email, values.password, values);
          })}
          noValidate
        >
          <h3 className="text-base font-semibold">メールアドレスで登録</h3>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-medium sm:col-span-2">
              利用者区分
              <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                必須
              </span>
            </legend>
            <Button
              type="button"
              variant="outline"
              aria-pressed={!travelAgency}
              className={
                !travelAgency
                  ? "h-12 border-primary bg-primary/5 text-primary"
                  : "h-12"
              }
              onClick={() => selectAccountType("individual")}
            >
              <span>
                <strong>一般のお客様</strong>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-pressed={travelAgency}
              className={
                travelAgency
                  ? "h-12 border-primary bg-primary/5 text-primary"
                  : "h-12"
              }
              onClick={() => selectAccountType("travel_agency")}
            >
              <span>
                <strong>旅行会社の担当者様</strong>
              </span>
            </Button>
          </fieldset>
          <AuthField
            label="メールアドレス"
            required
            error={registerForm.formState.errors.email?.message}
          >
            <Input
              type="email"
              autoComplete="email"
              {...registerForm.register("email", {
                onChange: (event) => onAccountEmailChange(event.target.value),
              })}
            />
          </AuthField>
          <AuthField
            label="パスワード"
            required
            error={registerForm.formState.errors.password?.message}
          >
            <div className="relative">
              <Input
                className="pr-12"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...registerForm.register("password", {
                  onChange: (event) => onAccountPasswordChange(event.target.value),
                })}
              />
              <Button
                className="absolute right-1 top-1 size-9"
                type="button"
                variant="ghost"
                size="icon"
                title={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </AuthField>
          {travelAgency ? (
            <>
              <AuthField
                label="会社・支店名"
                required
                error={registerForm.formState.errors.companyBranchName?.message}
              >
                <Input
                  {...registerForm.register("companyBranchName", {
                    onChange: (event) =>
                      onRegistrationFormChange((current) => ({
                        ...current,
                        name: event.target.value,
                        companyBranchName: event.target.value,
                      })),
                  })}
                />
              </AuthField>
              <AuthField
                label="担当者名"
                required
                error={registerForm.formState.errors.contactPersonName?.message}
              >
                <Input
                  {...registerForm.register("contactPersonName", {
                    onChange: (event) =>
                      onRegistrationFormChange((current) => ({
                        ...current,
                        contactPersonName: event.target.value,
                        bookingContactName: event.target.value,
                      })),
                  })}
                />
              </AuthField>
            </>
          ) : (
            <AuthField
              label="お名前"
              required
              error={registerForm.formState.errors.name?.message}
            >
              <Input
                autoComplete="name"
                {...registerForm.register("name", {
                  onChange: (event) =>
                    onRegistrationFormChange((current) => ({
                      ...current,
                      name: event.target.value,
                    })),
                })}
              />
            </AuthField>
          )}
          <AuthField
            label="電話番号"
            required
            error={registerForm.formState.errors.phone?.message}
          >
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              {...registerForm.register("phone", {
                onChange: (event) =>
                  onRegistrationFormChange((current) => ({
                    ...current,
                    phone: event.target.value,
                  })),
              })}
            />
          </AuthField>
          <AuthField
            label="住所"
            error={registerForm.formState.errors.address?.message}
          >
            <Input
              autoComplete="street-address"
              {...registerForm.register("address", {
                onChange: (event) =>
                  onRegistrationFormChange((current) => ({
                    ...current,
                    address: event.target.value,
                  })),
              })}
            />
          </AuthField>
          {authError ? <Alert>{authError}</Alert> : null}
          <Button type="submit" className="mt-1 w-full" disabled={busy}>
            {busy && <LoaderCircle className="animate-spin" />}
            {busy ? "登録中" : "アカウントを登録"}
          </Button>
        </form>
      </div>}
      </div>
      <section className="order-first grid min-w-0 content-start gap-4 border-b p-5 sm:p-6 @min-[640px]:order-last @min-[640px]:border-b-0" aria-label={bookingMode === "login" ? "Googleアカウントでログイン" : "Googleアカウントで登録"}>
        <h3 className="text-base font-semibold">{bookingMode === "login" ? "Googleアカウントでログイン" : "Googleアカウントで登録"}</h3>
        <GoogleCustomerButton registration={bookingMode === "register"} />
        <p className="text-sm leading-6 text-muted-foreground">{bookingMode === "login" ? "Googleアカウントを選択してログインできます。" : "Googleで認証した後、お客様情報を登録します。パスワードの入力は不要です。"}</p>
      </section>
      </div>
      <div className="border-t p-5 text-sm sm:p-6">
        {bookingMode === "login" ? <p>アカウントをお持ちでない方は、<CustomerAuthLink href="/register" className="font-semibold text-primary underline underline-offset-4">新規登録へ</CustomerAuthLink></p> : <p>すでにアカウントをお持ちの方は、<CustomerAuthLink href="/login" className="font-semibold text-primary underline underline-offset-4">ログインへ</CustomerAuthLink></p>}
      </div>
    </section>
  );
}

function AuthField({
  label,
  required,
  error,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Label className="grid gap-2">
      <span className="flex items-center gap-2">
        {label}
        {required ? (
          <em className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold not-italic text-primary">
            必須
          </em>
        ) : null}
      </span>
      <div
        className={`relative [&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-1/2 [&>svg]:size-4 [&>svg]:-translate-y-1/2 [&>svg]:text-muted-foreground [&>svg+input]:pl-10 ${error ? "[&_input]:border-destructive" : ""}`}
      >
        {icon}
        {children}
      </div>
      {error ? (
        <small className="text-xs font-normal text-destructive" role="alert">
          {error}
        </small>
      ) : null}
    </Label>
  );
}

function CustomerReservationDashboard({
  getCustomerToken,
  customerIdentity,
  customerEmail,
  isLoggedIn,
  authError,
  accountEmail,
  accountPassword,
  accountSubmitting,
  customerAuthLoading,
  bookingMode,
  registrationForm,
  reservations,
  changeRequests,
  isLoading,
  reservationError,
  canRequestConfirmedChange,
  canRequestChange,
  canRequestCancellation,
  onBack,
  onBookingModeChange,
  onRegistrationFormChange,
  onAccountEmailChange,
  onAccountPasswordChange,
  onLogin,
  onSubmitAccount,
  onResetPassword,
  onLogout,
  onConfirmedChange,
  onChange,
  onCancellation,
}: {
  getCustomerToken: () => Promise<string>;
  customerIdentity: string;
  customerEmail: string;
  isLoggedIn: boolean;
  authError: string;
  accountEmail: string;
  accountPassword: string;
  accountSubmitting: boolean;
  customerAuthLoading: boolean;
  bookingMode: "login" | "register";
  registrationForm: BookingForm;
  reservations: Reservation[];
  changeRequests: ReservationChangeRequest[];
  isLoading: boolean;
  reservationError: string;
  canRequestConfirmedChange: (reservation: Reservation) => boolean;
  canRequestChange: (reservation: Reservation) => boolean;
  canRequestCancellation: (reservation: Reservation) => boolean;
  onBack: () => void;
  onBookingModeChange: (mode: "login" | "register") => void;
  onRegistrationFormChange: Dispatch<SetStateAction<BookingForm>>;
  onAccountEmailChange: (value: string) => void;
  onAccountPasswordChange: (value: string) => void;
  onLogin: (email?: string, password?: string) => void;
  onSubmitAccount: (email?: string, password?: string, profile?: RegisterAuthFields) => void;
  onResetPassword: (email: string) => void;
  onLogout: () => void;
  onConfirmedChange: (reservation: Reservation) => void;
  onChange: (reservation: Reservation) => void;
  onCancellation: (reservation: Reservation) => void;
}) {
  return (
    <>
      <button className="portal-back-button" type="button" onClick={onBack}>
        手続き選択へ戻る
      </button>
      <div className="form-body narrow customer-reservation-dashboard">
        <p className="form-kicker">MY RESERVATIONS</p>
        <h2>予約確認</h2>
        {isLoggedIn ? (
          <div className="customer-account-current reservation-account-head">
            <span>ログイン中</span>
            <strong>{customerEmail}</strong>
            <button type="button" onClick={onLogout}>
              ログアウト
            </button>
          </div>
        ) : (
          <section className="customer-account-panel">
            <CustomerAccountAccessPanel
              authError={authError}
              accountEmail={accountEmail}
              accountPassword={accountPassword}
              accountSubmitting={accountSubmitting}
              customerAuthLoading={customerAuthLoading}
              bookingMode={bookingMode}
              registrationForm={registrationForm}
              onBookingModeChange={onBookingModeChange}
              onRegistrationFormChange={onRegistrationFormChange}
              onAccountEmailChange={onAccountEmailChange}
              onAccountPasswordChange={onAccountPasswordChange}
              onLogin={onLogin}
              onSubmitAccount={onSubmitAccount}
              onResetPassword={onResetPassword}
            />
          </section>
        )}
        {isLoggedIn &&
          (isLoading ? (
            <div className="empty-table compact">
              予約情報を読み込んでいます。
            </div>
          ) : reservationError ? (
            <div className="auth-error">{reservationError}</div>
          ) : reservations.length ? (
            <div className="customer-reservation-list">
              {reservations.map((reservation) => (
                <article
                  key={reservation.id}
                  className="customer-reservation-item"
                >
                  <div>
                    <span
                      className={"badge " + statusClass[reservation.status]}
                    >
                      <i />
                      {reservationDisplayLabel(reservation)}
                    </span>
                    <strong>{reservationDateTimeLabel(reservation)}</strong>
                    <small>
                      {reservationBookingTypeShortLabel(reservation)}・
                      {reservation.bookingType === "travel_agency_group" &&
                      reservation.groupName
                        ? `${reservation.groupName}・`
                        : ""}
                      {reservation.people}名・
                      {reservationMenuLabel(reservation)}
                    </small>
                  </div>
                  <dl>
                    <div>
                      <dt>予約ID</dt>
                      <dd>{reservation.id}</dd>
                    </div>
                    <div>
                      <dt>担当店舗</dt>
                      <dd>{assignmentLabel(reservation) || "未割当"}</dd>
                    </div>
                    <div>
                      <dt>確認連絡</dt>
                      <dd>
                        {reservation.confirmationContactedAt
                          ? "連絡済"
                          : "未連絡"}
                      </dd>
                    </div>
                  </dl>
                  <CustomerReservationRequestStatus
                    reservation={reservation}
                    changeRequests={changeRequests.filter(
                      (request) => request.reservationId === reservation.id,
                    )}
                  />
                  <div className="col-span-full"><ReservationInquiryHistoryButton key={`${customerIdentity}:${reservation.id}`} reservationNumber={reservation.id} audience="customer" getToken={getCustomerToken} /></div>
                  <ReservationActionButtons
                    reservation={reservation}
                    canRequestConfirmedChange={canRequestConfirmedChange}
                    canRequestChange={canRequestChange}
                    canRequestCancellation={canRequestCancellation}
                    onConfirmedChange={onConfirmedChange}
                    onChange={onChange}
                    onCancellation={onCancellation}
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-table compact">
              表示できる予約はありません。
            </div>
          ))}
      </div>
    </>
  );
}

function CustomerReservationRequestStatus({
  reservation,
  changeRequests,
}: {
  reservation: Reservation;
  changeRequests: ReservationChangeRequest[];
}) {
  const items: { label: string; status: string; detail?: string }[] = [
    ...(isConfirmedReservationChangeRequest(reservation)
      ? [{ label: "本予約への変更申請", status: "承認待ち" }]
      : []),
    ...(reservation.status === STATUS.cancellationRequested
      ? [{ label: "キャンセル申請", status: "承認待ち" }]
      : []),
    ...(reservation.status === STATUS.cancelled
      ? [{ label: "キャンセル申請", status: "承認済み" }]
      : []),
    ...changeRequests.map((request) => ({
      label: "予約内容変更申請",
      status: changeRequestStatusLabel(request.status),
      detail: `${request.requestedDate} ${request.requestedStartTime}・${request.requestedPeople}名`,
    })),
  ];
  if (!items.length) return null;
  return (
    <div className="customer-request-status-list">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          <span>{item.label}</span>
          <strong>{item.status}</strong>
          {item.detail ? <small>{item.detail}</small> : null}
        </div>
      ))}
    </div>
  );
}

function changeRequestStatusLabel(status: ReservationChangeRequest["status"]) {
  if (status === "approved") return "承認済み";
  if (status === "rejected") return "却下済み";
  return "承認待ち";
}

function ReservationActionButtons({
  reservation,
  canRequestConfirmedChange,
  canRequestChange,
  canRequestCancellation,
  onConfirmedChange,
  onChange,
  onCancellation,
}: {
  reservation: Reservation;
  canRequestConfirmedChange: (reservation: Reservation) => boolean;
  canRequestChange: (reservation: Reservation) => boolean;
  canRequestCancellation: (reservation: Reservation) => boolean;
  onConfirmedChange: (reservation: Reservation) => void;
  onChange: (reservation: Reservation) => void;
  onCancellation: (reservation: Reservation) => void;
}) {
  return (
    <div className="customer-reservation-actions flex-wrap [&_button]:min-h-11">
      <Button asChild variant="outline"><Link href={`/contact?reservation=${encodeURIComponent(reservation.id)}`}>この予約について問い合わせる</Link></Button>
      <button
        type="button"
        disabled={!canRequestConfirmedChange(reservation)}
        onClick={() => onConfirmedChange(reservation)}
      >
        本予約への変更申請
      </button>
      <button
        type="button"
        disabled={!canRequestChange(reservation)}
        onClick={() => onChange(reservation)}
      >
        予約内容変更申請
      </button>
      <button
        type="button"
        disabled={!canRequestCancellation(reservation)}
        onClick={() => onCancellation(reservation)}
      >
        キャンセル申請
      </button>
    </div>
  );
}

function CustomerRequestForms({
  mode,
  confirmedChangeForm,
  changeRequestForm,
  changeReservation,
  cancellationReservation,
  confirmedChangeSubmitted,
  changeRequestSubmitted,
  cancellationSubmitted,
  isSubmittingConfirmedChange,
  isSubmittingChangeRequest,
  isSubmittingCancellation,
  canSubmitConfirmedChange,
  canSubmitChangeRequest,
  canSubmitCancellation,
  menuCatalog,
  onBack,
  onConfirmedChangeFormChange,
  onChangeRequestFormChange,
  onSubmitConfirmedChange,
  onSubmitChangeRequest,
  onSubmitCancellation,
}: {
  mode: CustomerPortalMode;
  confirmedChangeForm: CustomerContactRequestForm;
  changeRequestForm: CustomerReservationChangeRequestForm;
  changeReservation?: Reservation;
  cancellationReservation?: Reservation;
  confirmedChangeSubmitted: boolean;
  changeRequestSubmitted: boolean;
  cancellationSubmitted: boolean;
  isSubmittingConfirmedChange: boolean;
  isSubmittingChangeRequest: boolean;
  isSubmittingCancellation: boolean;
  canSubmitConfirmedChange: boolean;
  canSubmitChangeRequest: boolean;
  canSubmitCancellation: boolean;
  menuCatalog: Menu[];
  onBack: () => void;
  onConfirmedChangeFormChange: Dispatch<
    SetStateAction<CustomerContactRequestForm>
  >;
  onChangeRequestFormChange: Dispatch<
    SetStateAction<CustomerReservationChangeRequestForm>
  >;
  onSubmitConfirmedChange: (agreement: CancellationPolicyAgreementInput) => void | Promise<void>;
  onSubmitChangeRequest: (acknowledged?: boolean) => void | Promise<void>;
  onSubmitCancellation: (acknowledged?: boolean) => void | Promise<void>;
}) {
  if (mode === "confirmedChange")
    return (
      <CustomerConfirmedChangeForm
        form={confirmedChangeForm}
        submitted={confirmedChangeSubmitted}
        isSubmitting={isSubmittingConfirmedChange}
        canSubmit={canSubmitConfirmedChange}
        onBack={onBack}
        onFormChange={onConfirmedChangeFormChange}
        onSubmit={onSubmitConfirmedChange}
      />
    );
  if (mode === "change")
    return (
      <CustomerChangeRequestForm
        form={changeRequestForm}
        reservation={changeReservation}
        submitted={changeRequestSubmitted}
        isSubmitting={isSubmittingChangeRequest}
        canSubmit={canSubmitChangeRequest}
        menuCatalog={menuCatalog}
        onBack={onBack}
        onFormChange={onChangeRequestFormChange}
        onSubmit={onSubmitChangeRequest}
      />
    );
  if (mode === "cancellation")
    return (
      <CustomerCancellationForm
        reservation={cancellationReservation}
        submitted={cancellationSubmitted}
        isSubmitting={isSubmittingCancellation}
        canSubmit={canSubmitCancellation}
        onBack={onBack}
        onSubmit={onSubmitCancellation}
      />
    );
  return null;
}

function CustomerConfirmedChangeForm({
  form,
  submitted,
  isSubmitting,
  canSubmit,
  onBack,
  onFormChange,
  onSubmit,
}: {
  form: CustomerContactRequestForm;
  submitted: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  onBack: () => void;
  onFormChange: Dispatch<SetStateAction<CustomerContactRequestForm>>;
  onSubmit: (agreement: CancellationPolicyAgreementInput) => void | Promise<void>;
}) {
  const [accepted, setAccepted] = useState(false);
  useEffect(() => setAccepted(false), [form.reservationId]);
  return (
    <>
      <button className="portal-back-button" type="button" onClick={onBack}>
        手続き選択へ戻る
      </button>
      {submitted ? (
        <CustomerRequestComplete
          title="本予約への変更申請を受け付けました"
          message="内容を確認後、本予約への変更可否をご連絡します。"
          onBack={onBack}
        />
      ) : (
        <div className="form-body narrow cancellation-form">
          <p className="form-kicker">CONFIRMED REQUEST</p>
          <h2>本予約への変更申請</h2>
          <CustomerContactRequestFields
            form={form}
            onFormChange={onFormChange}
          />
          <p className="customer-mode-note">
            ログイン中のアカウントに紐づく、仮予約確定済みの予約だけ申請できます。
          </p>
          <CancellationPolicyAgreement checked={accepted} onChange={setAccepted} disabled={isSubmitting} />
          <div className="form-nav">
            <button onClick={onBack}>戻る</button>
            <button className="next" disabled={!canSubmit || !accepted || isSubmitting} onClick={() => { if (accepted) void onSubmit({ accepted: true, version: cancellationPolicyVersion }); }}>
              {isSubmitting ? "送信中" : "本予約への変更を申請する"}{" "}
              <Icon name="arrow" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CustomerChangeRequestForm({
  form,
  reservation,
  submitted,
  isSubmitting,
  canSubmit,
  menuCatalog,
  onBack,
  onFormChange,
  onSubmit,
}: {
  form: CustomerReservationChangeRequestForm;
  reservation?: Reservation;
  submitted: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  menuCatalog: Menu[];
  onBack: () => void;
  onFormChange: Dispatch<SetStateAction<CustomerReservationChangeRequestForm>>;
  onSubmit: (acknowledged?: boolean) => void | Promise<void>;
}) {
  const {policy,error:policyError}=useReservationPolicy();
  const notice = reservation ? cancellationFeeNotice(reservation, form.requestedPeople) : null;
  const peopleOnly = reservation ? isFeeExemptPeopleOnlyChange({ ...reservation, menuItems: reservation.menuItems ?? [] }, form) : false;
  const minimumDate = peopleOnly ? earliestReservationDate(1) : policy?.minimumDate;
  const dateBlocked = !policy || !reservation || !minimumDate || !form.requestedDate || form.requestedDate < minimumDate || reservation.date < minimumDate;
  return (
    <>
      <button className="portal-back-button" type="button" onClick={onBack}>
        手続き選択へ戻る
      </button>
      {submitted ? (
        <CustomerRequestComplete
          title="予約内容変更申請を受け付けました"
          message="内容を確認後、変更可否をご連絡します。"
          onBack={onBack}
        />
      ) : (
        <div className="form-body narrow cancellation-form">
          <p className="form-kicker">CHANGE REQUEST</p>
          <h2>予約内容変更申請</h2>
          <CustomerContactRequestFields
            form={form}
            onFormChange={onFormChange}
          />
          {policyError && <p role="alert" className="text-sm text-destructive">{policyError}</p>}
          {policy && <p className="text-sm text-muted-foreground">キャンセル料の対象外で、人数だけを変更する場合は前日まで申請できます。その他の変更は、変更前・変更後とも利用日の{policy.days}日前までに申請してください。</p>}
          {!reservation && <p role="alert" className="text-sm text-destructive">変更対象の予約を確認できません。予約IDを確認してください。</p>}
          {reservation && form.requestedDate && minimumDate && dateBlocked && <p role="alert" className="text-sm text-destructive">この変更は変更前・変更後とも利用日が{minimumDate}以降の場合に申請できます。</p>}
          <div className="form-fields reservation-date-fields">
            <label>
              変更希望日
              <input
                type="date"
                min={minimumDate}
                aria-invalid={Boolean(form.requestedDate && dateBlocked)}
                value={form.requestedDate}
                onChange={(event) =>
                  onFormChange({ ...form, requestedDate: event.target.value })
                }
              />
            </label>
            <label>
              開始時間
              <input
                type="time"
                value={form.requestedStartTime}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    requestedStartTime: event.target.value,
                  })
                }
              />
            </label>
            <label>
              人数
              <Input type="number" min={1} max={999} step={1} inputMode="numeric" value={form.requestedPeople || ""} aria-invalid={!Number.isInteger(form.requestedPeople) || form.requestedPeople < 1 || form.requestedPeople > 999} onChange={event => onFormChange({ ...form, requestedPeople: Number(event.target.value) })} />
              {(!Number.isInteger(form.requestedPeople) || form.requestedPeople < 1 || form.requestedPeople > 999) && <span role="alert" className="text-sm text-destructive">人数は1〜999名の整数で入力してください。</span>}
            </label>
          </div>
          <MenuPicker
            menuCatalog={menuCatalog}
            selected={form.requestedMenuItems}
            onChange={(requestedMenuItems) =>
              onFormChange({ ...form, requestedMenuItems })
            }
          />
          <div className="form-fields single">
            <label>
              変更理由
              <textarea
                value={form.reason}
                onChange={(event) =>
                  onFormChange({ ...form, reason: event.target.value })
                }
              />
            </label>
          </div>
          <p className="customer-mode-note">
            ログイン中のアカウントに紐づく予約だけ申請できます。
          </p>
          <div className="form-nav">
            <button onClick={onBack}>戻る</button>
          </div>
          <CustomerRequestSubmit key={JSON.stringify(form)} notice={notice} disabled={!canSubmit || dateBlocked || !Number.isInteger(form.requestedPeople) || form.requestedPeople < 1 || form.requestedPeople > 999} isSubmitting={isSubmitting} onSubmit={onSubmit} />
        </div>
      )}
    </>
  );
}

function CustomerCancellationForm({
  reservation,
  submitted,
  isSubmitting,
  canSubmit,
  onBack,
  onSubmit,
}: {
  reservation?: Reservation;
  submitted: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  onBack: () => void;
  onSubmit: (acknowledged?: boolean) => void | Promise<void>;
}) {
  return (
    <>
      <button className="portal-back-button" type="button" onClick={onBack}>
        手続き選択へ戻る
      </button>
      {submitted ? (
        <CustomerRequestComplete
          title="キャンセル申請を受け付けました"
          message="内容を確認後、キャンセル可否をご連絡します。"
          onBack={onBack}
        />
      ) : (
        <div className="form-body narrow cancellation-form">
          <p className="form-kicker">CANCEL REQUEST</p>
          <h2>キャンセル申請</h2>
          {reservation ? (
            <section className="mt-6" aria-label="キャンセル対象の予約">
              <h3 className="text-base font-semibold">キャンセル対象の予約</h3>
              <dl className="mt-3 divide-y divide-border rounded-md border border-border px-4">
                {[
                  ["予約ID", reservation.id],
                  ["予約区分", reservationBookingTypeLabel(reservation)],
                  ["お客様名", reservation.customer],
                  ["利用日時", reservationDateTimeLabel(reservation)],
                  ["予定人数", `${reservation.people}名`],
                  ["メニュー", reservationMenuLabel(reservation)],
                  ["予約状況", reservationDisplayLabel(reservation)],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3 text-sm">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="break-words font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm">上記の予約についてキャンセルを申請します。対象の予約に間違いがないかご確認ください。</p>
            </section>
          ) : (
            <p role="alert" className="mt-6 text-sm text-destructive">キャンセル対象の予約を確認できません。予約一覧から対象の予約を選び直してください。</p>
          )}
          <p className="customer-mode-note">
            ログイン中のアカウントに紐づく予約だけ申請できます。
          </p>
          <div className="form-nav">
            <button onClick={onBack}>戻る</button>
          </div>
          <CustomerRequestSubmit key={reservation?.id} cancellation notice={reservation ? cancellationFeeNotice(reservation) : null} disabled={!canSubmit || !reservation || isSubmitting} isSubmitting={isSubmitting} onSubmit={onSubmit} />
        </div>
      )}
    </>
  );
}

function CustomerContactRequestFields<T extends CustomerContactRequestForm>({
  form,
  onFormChange,
}: {
  form: T;
  onFormChange: Dispatch<SetStateAction<T>>;
}) {
  return (
    <div className="form-fields single">
      <label>
        予約ID
        <input
          value={form.reservationId}
          placeholder="例: RSV-1047"
          onChange={(event) =>
            onFormChange({ ...form, reservationId: event.target.value })
          }
        />
      </label>
    </div>
  );
}

function CustomerRequestComplete({
  title,
  message,
  onBack,
}: {
  title: string;
  message: string;
  onBack: () => void;
}) {
  return (
    <div className="form-body complete">
      <span>
        <Icon name="check" />
      </span>
      <p className="form-kicker">REQUEST RECEIVED</p>
      <h2>{title}</h2>
      <p>{message}</p>
      <button className="next" onClick={onBack}>
        トップに戻る
      </button>
    </div>
  );
}

function ReservationBookingTypeCell({
  reservation,
}: {
  reservation: Reservation;
}) {
  return (
    <>
      <strong>{reservationBookingTypeShortLabel(reservation)}</strong>
      {reservation.bookingType === "travel_agency_group" &&
      reservation.bookingContactName ? (
        <small>担当: {reservation.bookingContactName}</small>
      ) : null}
    </>
  );
}

function CustomerEmailVerificationPanel({
  email,
  isSubmitting,
  onRefresh,
  onResend,
  onLogout,
}: {
  email: string;
  isSubmitting: boolean;
  onRefresh: () => void;
  onResend: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="form-body narrow email-verification-panel">
      <p className="form-kicker">EMAIL VERIFICATION</p>
      <h2>メールアドレスを確認してください</h2>
      <p>
        <strong>{email}</strong>{" "}
        に確認メールを送信しました。メール内のリンクを開いて認証を完了してください。
      </p>
      <div className="email-verification-actions">
        <button type="button" onClick={onResend} disabled={isSubmitting}>
          確認メールを再送
        </button>
        <button
          type="button"
          className="next"
          onClick={onRefresh}
          disabled={isSubmitting}
        >
          {isSubmitting ? "確認中" : "認証を確認"}
        </button>
      </div>
      <button
        type="button"
        className="email-verification-logout"
        onClick={onLogout}
      >
        別のアカウントでログイン
      </button>
    </div>
  );
}

function ConfirmationContactPage({
  reservations,
  windowDays,
  setWindowDays,
  isBulkContacting,
  onBulkConfirmationContact,
  onSelect,
}: {
  reservations: Reservation[];
  windowDays: number;
  setWindowDays: (days: number) => void;
  isBulkContacting: boolean;
  onBulkConfirmationContact: () => Promise<void>;
  onSelect: (r: Reservation) => void;
}) {
  const changeWindowDays = (days: number) =>
    setWindowDays(Math.max(1, Math.min(60, days)));
  return (
    <section className="panel management-panel confirmation-panel">
      <div className="management-tools confirmation-tools">
        <div className="confirmation-window-control">
          <label>
            食事日まで
            <input
              type="number"
              min="1"
              max="60"
              value={windowDays}
              onChange={(event) =>
                changeWindowDays(Number(event.target.value) || 1)
              }
            />
            <span>日未満</span>
          </label>
        </div>
        <div className="segmented confirmation-presets">
          <button
            className={windowDays === 7 ? "active" : ""}
            onClick={() => changeWindowDays(7)}
          >
            初期値
          </button>
          <button
            className={windowDays === 15 ? "active" : ""}
            onClick={() => changeWindowDays(15)}
          >
            15日未満
          </button>
          <button
            className={windowDays === 30 ? "active" : ""}
            onClick={() => changeWindowDays(30)}
          >
            30日未満
          </button>
        </div>
        <div className="result-count">
          <span>該当</span>
          <strong>{reservations.length}</strong>
          <span>件</span>
        </div>
        <button
          className="confirmation-bulk-button"
          disabled={!reservations.length || isBulkContacting}
          onClick={onBulkConfirmationContact}
        >
          <Icon name="check" />
          {isBulkContacting ? "送信中" : "確認メール一括送信"}
        </button>
      </div>
      <div className="table-wrap">
        <table className="large-table">
          <thead>
            <tr>
              <th>食事日</th>
              <th>予約ID / お客様</th>
              <th>予約区分</th>
              <th>連絡先</th>
              <th>人数</th>
              <th>メニュー</th>
              <th>担当店舗</th>
              <th>期限</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => {
              const days = daysUntilVisit(reservation.date);
              return (
                <tr key={reservation.id} onClick={() => onSelect(reservation)}>
                  <td>
                    <strong>{reservationDateTimeLabel(reservation)}</strong>
                    <small>{days === 0 ? "本日" : String(days) + "日後"}</small>
                  </td>
                  <td>
                    <strong>{reservation.id}</strong>
                    <small>
                      {reservation.groupName
                        ? `${reservation.customer} 様・${reservation.groupName}`
                        : `${reservation.customer} 様`}
                    </small>
                  </td>
                  <td>
                    <ReservationBookingTypeCell reservation={reservation} />
                  </td>
                  <td>
                    <strong>{reservation.phone}</strong>
                    <small>{reservation.email ?? "customer@example.jp"}</small>
                  </td>
                  <td>
                    <strong>{reservation.people}名</strong>
                  </td>
                  <td>{reservationMenuLabel(reservation)}</td>
                  <td>
                    {assignmentLabel(reservation) ? (
                      <strong>{assignmentLabel(reservation)}</strong>
                    ) : (
                      <span className="unassigned">未割当</span>
                    )}
                  </td>
                  <td>
                    <span className="badge amber">
                      <i />
                      {windowDays}日未満
                    </span>
                  </td>
                  <td>
                    <Icon name="arrow" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!reservations.length && (
          <div className="empty-table">確認連絡が必要な予約はありません。</div>
        )}
      </div>
    </section>
  );
}

function ReservationChangeRequestPage({
  requests,
  reservations,
  onApproveChangeRequest,
  onRejectChangeRequest,
}: {
  requests: ReservationChangeRequest[];
  reservations: Reservation[];
  onApproveChangeRequest: (id: string) => Promise<void>;
  onRejectChangeRequest: (id: string) => Promise<void>;
}) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const selectedRequest = requests.find((request) => request.id === selectedRequestId);
  const [search, setSearch] = useState("");
  const keyword = search.trim().toLocaleLowerCase();
  const filteredRows = requests.filter(row => [row.reservationId, row.customer].some(value => value.toLocaleLowerCase().includes(keyword)));
  return (
    <section className="panel management-panel change-request-screen">
      <ReservationSearchToolbar count={filteredRows.length} search={search} onSearch={setSearch} />
      {filteredRows.length > 0 ? (
        <div className="table-wrap">
          <table className="large-table change-request-table">
            <thead>
              <tr>
                <th>予約ID / 申請日時</th>
                <th>予約区分</th>
                <th>お客様</th>
                <th>現在の内容</th>
                <th>希望内容</th>
                <th>理由</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((request) => {
                const reservation = reservations.find(
                  (item) => item.id === request.reservationId,
                );
                return (
                  <tr
                    key={request.id}
                    onClick={() => setSelectedRequestId(request.id)}
                  >
                    <td>
                      <button type="button" className="font-semibold text-primary underline-offset-4 hover:underline" onClick={(event) => { event.stopPropagation(); setSelectedRequestId(request.id); }} aria-label={`${request.reservationId}の変更内容を確認`}>{request.reservationId}</button>
                      <small>{dateTimeMinuteLabel(request.requestedAt)}</small>
                    </td>
                    <td>
                      {reservation ? (
                        <ReservationBookingTypeCell reservation={reservation} />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <strong>{request.customer}</strong>
                      <small>{request.phone}</small>
                    </td>
                    <td>
                      <strong>
                        {request.currentDate.replaceAll("-", "/")}{" "}
                        {request.currentStartTime}
                      </strong>
                      <small>
                        {request.currentPeople}名・
                        {request.currentMenuItems.length
                          ? request.currentMenuItems.join("、")
                          : "メニュー未選択"}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {request.requestedDate.replaceAll("-", "/")}{" "}
                        {request.requestedStartTime}
                      </strong>
                      <small>
                        {request.requestedPeople}名・
                        {request.requestedMenuItems.length
                          ? request.requestedMenuItems.join("、")
                          : "メニュー未選択"}
                      </small>
                    </td>
                    <td>{request.reason || "-"}</td>
                    <td>
                      <div className="row-actions compact">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRejectChangeRequest(request.id);
                          }}
                        >
                          却下
                        </button>
                        <button
                          type="button"
                          className="primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            onApproveChangeRequest(request.id);
                          }}
                        >
                          承認
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-table compact">
          {keyword ? "検索に一致する予約はありません。" : "未対応の予約変更承認はありません。"}
        </div>
      )}
      {selectedRequest && (
        <ReservationChangeReviewDrawer
          request={selectedRequest}
          reservation={reservations.find((item) => item.id === selectedRequest.reservationId)}
          onClose={() => setSelectedRequestId(null)}
        />
      )}
    </section>
  );
}

function ReservationChangeReviewDrawer({ request, reservation: r, onClose }: {
  request: ReservationChangeRequest;
  reservation?: Reservation;
  onClose: () => void;
}) {
  const menuLabel = (items: string[]) => items.length ? items.join("、") : "メニュー未選択";
  const rows = [
    { label: "利用日", before: request.currentDate.replaceAll("-", "/"), after: request.requestedDate.replaceAll("-", "/"), changed: request.currentDate !== request.requestedDate },
    { label: "開始時間", before: request.currentStartTime, after: request.requestedStartTime, changed: request.currentStartTime !== request.requestedStartTime },
    { label: "予定人数", before: `${request.currentPeople}名`, after: `${request.requestedPeople}名`, changed: request.currentPeople !== request.requestedPeople },
    { label: "メニュー", before: menuLabel(request.currentMenuItems), after: menuLabel(request.requestedMenuItems), changed: JSON.stringify([...request.currentMenuItems].sort()) !== JSON.stringify([...request.requestedMenuItems].sort()) },
  ];
  const details = r ? [
    ["予約区分", reservationBookingTypeLabel(r)], ["お客様 / 会社・支店名", r.customer],
    ["電話番号", r.phone], ["メールアドレス", r.email], ["住所", r.address],
    ["現在の利用日時", reservationDateTimeLabel(r)], ["支払条件", paymentConditionLabel(r.paymentCondition)],
    ["担当店舗", assignmentLabel(r) || "未割当"], ["確認連絡", r.confirmationContactedAt ? "連絡済み" : "未連絡"],
    ...(r.bookingType === "travel_agency_group" ? [
      ["予約担当者名", r.bookingContactName], ["当日責任者名", r.dayContactName], ["当日責任者携帯番号", r.dayContactPhone],
      ["団体名", r.groupName], ["団体ふりがな", r.groupNameKana], ["団体種別", r.groupType === "その他" ? r.groupTypeOther || r.groupType : r.groupType],
      ["T/C", `${r.tcCount ?? 0}名`], ["D/G", `${r.dgCount ?? 0}名`],
    ] : []), ["備考", r.remarks],
    ...(r.policyConsents ?? []).map((consent, index) => [`キャンセルポリシー同意記録 ${index + 1}`, policyConsentDetail(consent)]),
  ] : [["お客様名", request.customer], ["電話番号", request.phone], ["メールアドレス", request.email]];
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const previousFocus = document.activeElement as HTMLElement | null;
    document.getElementById("change-review-close")?.focus();
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previousFocus?.focus(); };
  }, [onClose]);
  return (
    <>
      <div className="drawer-shade" onClick={onClose} />
      <aside role="dialog" aria-label="予約変更内容の確認" className="fixed inset-y-0 right-0 z-[21] flex w-full max-w-[640px] flex-col border-l border-border bg-background text-foreground shadow-lg">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div><p className="text-sm text-muted-foreground">予約変更内容の確認 · 閲覧のみ</p><h2 className="text-xl font-semibold">{request.reservationId}</h2>{r && <p className="mt-1 text-sm">{reservationDisplayLabel(r)}</p>}</div>
          <Button id="change-review-close" type="button" variant="ghost" size="icon" aria-label="閉じる" onClick={onClose}><Icon name="close" /></Button>
        </header>
        <div className="overflow-y-auto p-5">
          <section aria-labelledby="change-review-heading">
            <h3 id="change-review-heading" className="font-semibold">変更前・変更後 <span className="text-sm text-primary">{rows.filter((row) => row.changed).length}項目の変更</span></h3>
            <p className="mt-1 text-sm text-muted-foreground">申請日時：{dateTimeMinuteLabel(request.requestedAt)}</p>
            <div className="mt-4 overflow-x-auto rounded-md border border-border">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-muted"><tr><th className="w-24 p-3">項目</th><th className="p-3">変更前</th><th className="p-3">変更後（希望）</th></tr></thead>
                <tbody>{rows.map((row) => <tr key={row.label} className={row.changed ? "border-t border-border bg-accent/40" : "border-t border-border"}><th className="p-3 align-top font-medium">{row.label}<span className={row.changed ? "mt-1 block text-xs text-primary" : "mt-1 block text-xs text-muted-foreground"}>{row.changed ? "変更あり" : "変更なし"}</span></th><td className="break-words p-3 align-top">{row.before}</td><td className={"break-words p-3 align-top " + (row.changed ? "font-semibold text-primary" : "")}>{row.after}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="mt-4"><h4 className="text-sm font-medium">変更理由</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm">{request.reason || "記載なし"}</p></div>
          </section>
          <section className="mt-6 border-t border-border pt-5"><h3 className="font-semibold">予約の基本情報（現在）</h3>
            {!r && <p role="status" className="mt-2 text-sm text-muted-foreground">予約の基本情報を取得できません。申請時の顧客情報を表示しています。</p>}
            <dl className="mt-3">{details.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 border-b border-border py-3 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap break-words">{value || "-"}</dd></div>)}</dl>
          </section>
        </div>
      </aside>
    </>
  );
}

function MasterManagementPage({
  onSelectMasterView,
}: {
  onSelectMasterView: (view: "customers" | "stores" | "menus" | "emailTemplates" | "otherSettings") => void;
}) {
  return (
    <section className="master-management-page">
      <div className="master-link-grid">
        <button type="button" onClick={() => onSelectMasterView("otherSettings")}><Icon name="settings" /><span><strong>その他</strong></span><Icon name="arrow" /></button>
        <button type="button" onClick={() => onSelectMasterView("customers")}>
          <Icon name="users" />
          <span>
            <strong>顧客管理</strong>
          </span>
          <Icon name="arrow" />
        </button>
        <button type="button" onClick={() => onSelectMasterView("stores")}>
          <Icon name="store" />
          <span>
            <strong>店舗管理</strong>
          </span>
          <Icon name="arrow" />
        </button>
        <button type="button" onClick={() => onSelectMasterView("menus")}>
          <Icon name="menu" />
          <span>
            <strong>メニュー管理</strong>
          </span>
          <Icon name="arrow" />
        </button>
        <button type="button" onClick={() => onSelectMasterView("emailTemplates")}>
          <Mail />
          <span><strong>メールテンプレート管理</strong></span>
          <Icon name="arrow" />
        </button>
      </div>
    </section>
  );
}

function ConfirmedReservationRequestPage({
  reservations,
  onSelect,
}: {
  reservations: Reservation[];
  onSelect: (reservation: Reservation) => void;
  updateStatus: (
    id: string,
    status: Status,
    options?: { manualReason?: string },
  ) => void;
}) {
  const [search, setSearch] = useState("");
  const keyword = search.trim().toLocaleLowerCase();
  const filteredRows = reservations.filter(row => [row.id, row.customer].some(value => value.toLocaleLowerCase().includes(keyword)));
  return (
    <section className="panel management-panel change-request-screen">
      <ReservationSearchToolbar count={filteredRows.length} search={search} onSearch={setSearch} />
      {filteredRows.length > 0 ? (
        <div className="table-wrap">
          <table className="large-table change-request-table">
            <thead>
              <tr>
                <th>予約ID / 受付日時</th>
                <th>予約区分</th>
                <th>お客様</th>
                <th>現在のステータス</th>
                <th>利用日時・人数</th>
                <th>メニュー</th>
                <th>担当店舗</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((reservation) => (
                <tr key={reservation.id} onClick={() => onSelect(reservation)}>
                  <td>
                    <strong>{reservation.id}</strong>
                    <small>{dateTimeMinuteLabel(reservation.received)}</small>
                  </td>
                  <td>
                    <ReservationBookingTypeCell reservation={reservation} />
                  </td>
                  <td>
                    <strong>{reservation.customer}</strong>
                    {reservationCustomerSubLabel(reservation) ? (
                      <small>{reservationCustomerSubLabel(reservation)}</small>
                    ) : null}
                  </td>
                  <td>
                    <span
                      className={"badge " + statusClass[reservation.status]}
                    >
                      <i />
                      {reservationDisplayLabel(reservation)}
                    </span>
                    <small>{policyAgreementLabel(reservation)}</small>
                  </td>
                  <td>
                    <strong>{reservationDateTimeLabel(reservation)}</strong>
                    <small>{reservation.people}名</small>
                  </td>
                  <td>{reservationMenuLabel(reservation)}</td>
                  <td>
                    {assignmentLabel(reservation) ? (
                      <strong>{assignmentLabel(reservation)}</strong>
                    ) : (
                      <span className="unassigned">未割当</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions compact">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(reservation);
                        }}
                      >
                        却下
                      </button>
                      <button
                        type="button"
                        className="primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(reservation);
                        }}
                      >
                        承認
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-table compact">
          {keyword ? "検索に一致する予約はありません。" : "未対応の本予約変更承認はありません。"}
        </div>
      )}
    </section>
  );
}

function ReservationApprovalPage({
  reservations,
  onSelect,
}: {
  reservations: Reservation[];
  onSelect: (reservation: Reservation) => void;
  updateStatus: (
    id: string,
    status: Status,
    options?: { manualReason?: string },
  ) => void;
}) {
  const approveStatus = (reservation: Reservation): Status | null =>
    reservation.status === STATUS.temporaryRequested
      ? STATUS.temporaryConfirmed
      : reservation.status === STATUS.confirmedRequested
        ? STATUS.confirmed
        : null;
  const rejectStatus = (reservation: Reservation): Status | null =>
    reservation.status === STATUS.temporaryRequested
      ? STATUS.temporaryRejected
      : reservation.status === STATUS.confirmedRequested
        ? isConfirmedReservationChangeRequest(reservation)
          ? STATUS.temporaryConfirmed
          : STATUS.confirmedRejected
        : null;
  const [search, setSearch] = useState("");
  const keyword = search.trim().toLocaleLowerCase();
  const filteredRows = reservations.filter(row => [row.id, row.customer].some(value => value.toLocaleLowerCase().includes(keyword)));
  return (
    <section className="panel management-panel change-request-screen">
      <ReservationSearchToolbar count={filteredRows.length} search={search} onSearch={setSearch} />
      {filteredRows.length > 0 ? (
        <div className="table-wrap">
          <table className="large-table change-request-table">
            <thead>
              <tr>
                <th>予約ID / 受付日時</th>
                <th>予約区分</th>
                <th>ステータス</th>
                <th>お客様</th>
                <th>利用日時・人数</th>
                <th>メニュー</th>
                <th>担当店舗</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((reservation) => {
                const nextApprovalStatus = approveStatus(reservation);
                const nextRejectStatus = rejectStatus(reservation);
                return (
                  <tr
                    key={reservation.id}
                    onClick={() => onSelect(reservation)}
                  >
                    <td>
                      <strong>{reservation.id}</strong>
                      <small>{dateTimeMinuteLabel(reservation.received)}</small>
                    </td>
                    <td>
                      <ReservationBookingTypeCell reservation={reservation} />
                    </td>
                    <td>
                      <span
                        className={"badge " + statusClass[reservation.status]}
                      >
                        <i />
                        {reservationDisplayLabel(reservation)}
                      </span>
                    </td>
                    <td>
                      <strong>{reservation.customer}</strong>
                      {reservationCustomerSubLabel(reservation) ? (
                        <small>
                          {reservationCustomerSubLabel(reservation)}
                        </small>
                      ) : null}
                    </td>
                    <td>
                      <strong>{reservationDateTimeLabel(reservation)}</strong>
                      <small>{reservation.people}名</small>
                    </td>
                    <td>{reservationMenuLabel(reservation)}</td>
                    <td>
                      {assignmentLabel(reservation) ? (
                        <strong>{assignmentLabel(reservation)}</strong>
                      ) : (
                        <span className="unassigned">未割当</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions compact">
                        {nextRejectStatus && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelect(reservation);
                            }}
                          >
                            却下
                          </button>
                        )}
                        {nextApprovalStatus && (
                          <button
                            type="button"
                            className="primary"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelect(reservation);
                            }}
                          >
                            承認
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-table compact">
          {keyword ? "検索に一致する予約はありません。" : "未対応の予約承認はありません。"}
        </div>
      )}
    </section>
  );
}

function CancellationApprovalPage({
  reservations,
  onSelect,
  updateStatus,
}: {
  reservations: Reservation[];
  onSelect: (reservation: Reservation) => void;
  updateStatus: (
    id: string,
    status: Status,
    options?: { manualReason?: string },
  ) => void;
}) {
  const [search, setSearch] = useState("");
  const keyword = search.trim().toLocaleLowerCase();
  const filteredRows = reservations.filter(row => [row.id, row.customer].some(value => value.toLocaleLowerCase().includes(keyword)));
  return (
    <section className="panel management-panel change-request-screen">
      <ReservationSearchToolbar count={filteredRows.length} search={search} onSearch={setSearch} />
      {filteredRows.length > 0 ? (
        <div className="table-wrap">
          <table className="large-table change-request-table">
            <thead>
              <tr>
                <th>予約ID / 受付日時</th>
                <th>予約区分</th>
                <th>ステータス</th>
                <th>お客様</th>
                <th>利用日時・人数</th>
                <th>メニュー</th>
                <th>担当店舗</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((reservation) => (
                <tr key={reservation.id} onClick={() => onSelect(reservation)}>
                  <td>
                    <strong>{reservation.id}</strong>
                    <small>{dateTimeMinuteLabel(reservation.received)}</small>
                  </td>
                  <td>
                    <ReservationBookingTypeCell reservation={reservation} />
                  </td>
                  <td>
                    <span
                      className={"badge " + statusClass[reservation.status]}
                    >
                      <i />
                      {reservationDisplayLabel(reservation)}
                    </span>
                  </td>
                  <td>
                    <strong>{reservation.customer}</strong>
                    {reservationCustomerSubLabel(reservation) ? (
                      <small>{reservationCustomerSubLabel(reservation)}</small>
                    ) : null}
                  </td>
                  <td>
                    <strong>{reservationDateTimeLabel(reservation)}</strong>
                    <small>{reservation.people}名</small>
                  </td>
                  <td>{reservationMenuLabel(reservation)}</td>
                  <td>
                    {assignmentLabel(reservation) ? (
                      <strong>{assignmentLabel(reservation)}</strong>
                    ) : (
                      <span className="unassigned">未割当</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions compact">
                      <button
                        type="button"
                        className="primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          updateStatus(reservation.id, STATUS.cancelled);
                        }}
                      >
                        キャンセル確定
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-table compact">
          {keyword ? "検索に一致する予約はありません。" : "未対応のキャンセル承認はありません。"}
        </div>
      )}
    </section>
  );
}

function MenuPicker({
  menuCatalog,
  selected,
  onChange,
}: {
  menuCatalog: Menu[];
  selected: string[];
  onChange: (items: string[]) => void;
}) {
  const toggle = (name: string) => {
    if (name === VISIT_MENU_NAME) {
      onChange(selected.includes(name) ? [] : [name]);
      return;
    }
    const withoutVisitMenu = selected.filter(
      (item) => item !== VISIT_MENU_NAME,
    );
    onChange(
      selected.includes(name)
        ? withoutVisitMenu.filter((item) => item !== name)
        : [...withoutVisitMenu, name],
    );
  };
  return (
    <div className="menu-check-grid">
      {menuCatalog.map((menu) => (
        <button
          type="button"
          key={menu.name}
          className={selected.includes(menu.name) ? "selected" : ""}
          onClick={() => toggle(menu.name)}
        >
          <span>{selected.includes(menu.name) && <Icon name="check" />}</span>
          <h3>{menu.name}</h3>
          <p>{menu.description}</p>
          <div>
            <strong>
              {"¥"}
              {menu.price.toLocaleString()}
            </strong>
          </div>
        </button>
      ))}
    </div>
  );
}

function ReservationDrawer({
  getAdminToken,
  reservation: r,
  onClose,
  updateStatus,
  updateConfirmationContact,
  assignStores,
  updateReservation,
  menuCatalog,
  stores,
}: {
  getAdminToken: () => Promise<string>;
  reservation: Reservation;
  onClose: () => void;
  updateStatus: (
    id: string,
    status: Status,
    options?: { manualReason?: string },
  ) => void;
  updateConfirmationContact: (
    id: string,
    contactedAt: string | null,
    options?: { sendEmail?: boolean },
  ) => Promise<void>;
  assignStores: (id: string, assignments: StoreAssignment[]) => void;
  updateReservation: (id: string, form: BookingForm) => Promise<Reservation>;
  menuCatalog: Menu[];
  stores: Store[];
}) {
  const initialEditForm = (): BookingForm => ({
    menuItems: r.menuItems ?? (r.menu ? [r.menu] : []),
    date: r.date,
    startTime: r.startTime ?? DEFAULT_START_TIME,
    endTime:
      r.endTime ??
      bookingFormEndTime(
        {
          startTime: r.startTime ?? DEFAULT_START_TIME,
          menuItems: r.menuItems ?? (r.menu ? [r.menu] : []),
        },
        menuCatalog,
      ),
    people: r.people,
    name: r.customer,
    email: r.email ?? "",
    phone: r.phone,
    address: r.address ?? "",
    bookingType: r.bookingType ?? "individual",
    bookingContactName: r.bookingContactName ?? "",
    dayContactName: r.dayContactName ?? "",
    dayContactPhone: r.dayContactPhone ?? "",
    groupName: r.groupName ?? "",
    groupNameKana: r.groupNameKana ?? "",
    groupType: r.groupType ?? "",
    groupTypeOther: r.groupTypeOther ?? "",
    tcCount: r.tcCount ?? 0,
    dgCount: r.dgCount ?? 0,
    paymentCondition: r.paymentCondition ?? defaultPaymentCondition,
    remarks: r.remarks ?? "",
    status: r.status,
  });
  const [isEditingReservation, setIsEditingReservation] = useState(false);
  const [editForm, setEditForm] = useState<BookingForm>(initialEditForm);
  const [isSavingReservation, setIsSavingReservation] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isManualStatusOpen, setIsManualStatusOpen] = useState(false);
  const [isConfirmingConfirmationEmail, setIsConfirmingConfirmationEmail] =
    useState(false);
  const [isSendingConfirmationEmail, setIsSendingConfirmationEmail] =
    useState(false);
  const [manualStatus, setManualStatus] = useState<Status>(r.status);
  const [manualStatusReason, setManualStatusReason] = useState("");
  const [assignmentDraft, setAssignmentDraft] = useState<StoreAssignment[]>(
    reservationAssignments(r).length
      ? reservationAssignments(r)
      : [{ store: "", people: r.people }],
  );
  const assignedPeople = assignmentDraft.reduce(
    (total, assignment) => total + Number(assignment.people || 0),
    0,
  );
  const duplicateStores = duplicateAssignmentStores(assignmentDraft);
  const allAssignmentStoresUsed = stores.every(store=>assignmentDraft.some(a=>a.store===store.name));
  const canSaveAssignments =
    assignmentDraft.length === 0 ||
    (duplicateStores.length === 0 && assignedPeople === r.people &&
      assignmentDraft.every(
        (assignment) => assignment.store && assignment.people > 0,
      ));
  const canSaveReservation =
    Boolean(
      editForm.name &&
      editForm.email &&
      editForm.phone &&
      editForm.date &&
      editForm.startTime &&
      editForm.people,
    ) && !isSavingReservation;
  const canSaveManualStatus =
    manualStatus !== r.status && manualStatusReason.trim().length > 0;
  const canUpdateConfirmationContact =
    r.status === STATUS.confirmed ||
    r.status === STATUS.waitingForVisit ||
    r.status === STATUS.visited;
  const nextActionComments = isConfirmedReservation(r)
    ? ([
        !r.menuItems?.length && {
          title: "メニュー未確定",
          text: "予約内容を編集してメニューを確定してください。",
        },
        !reservationAssignments(r).length && {
          title: "店舗未割当",
          text: "店舗割当を編集して担当店舗を割り当ててください。",
        },
        !r.confirmationContactedAt && {
          title: "未確認連絡",
          text: "お客様へ確認連絡を行い、連絡済みにしてください。",
        },
      ].filter(Boolean) as { title: string; text: string }[])
    : [];
  useEffect(() => {
    setEditForm(initialEditForm());
    setIsEditingReservation(false);
    setIsAssigning(false);
    setIsManualStatusOpen(false);
    setIsConfirmingConfirmationEmail(false);
    setIsSendingConfirmationEmail(false);
    setManualStatus(r.status);
    setManualStatusReason("");
  }, [r.id, r.status]);
  const updateAssignment = (index: number, patch: Partial<StoreAssignment>) =>
    setAssignmentDraft((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const removeAssignment = (index: number) =>
    setAssignmentDraft((items) =>
      items.filter((_, itemIndex) => itemIndex !== index),
    );
  const addAssignment = () =>
    setAssignmentDraft((items) => [
      ...items,
      { store: "", people: Math.max(r.people - assignedPeople, 1) },
    ]);
  const cancelReservationEdit = () => {
    setEditForm(initialEditForm());
    setIsEditingReservation(false);
  };
  const saveReservationEdit = async () => {
    if (!canSaveReservation) return;
    setIsSavingReservation(true);
    try {
      await updateReservation(r.id, editForm);
      setIsEditingReservation(false);
    } finally {
      setIsSavingReservation(false);
    }
  };
  const saveAssignments = () => {
    if (!canSaveAssignments) return;
    assignStores(r.id, assignmentDraft);
    setIsAssigning(false);
  };
  const saveManualStatus = () => {
    if (!canSaveManualStatus) return;
    updateStatus(r.id, manualStatus, {
      manualReason: manualStatusReason.trim(),
    });
    setIsManualStatusOpen(false);
    setManualStatusReason("");
  };
  const sendConfirmationEmail = async () => {
    if (isSendingConfirmationEmail) return;
    setIsSendingConfirmationEmail(true);
    try {
      await updateConfirmationContact(r.id, new Date().toISOString());
      setIsConfirmingConfirmationEmail(false);
    } finally {
      setIsSendingConfirmationEmail(false);
    }
  };
  const markConfirmationContactManually = () =>
    updateConfirmationContact(r.id, new Date().toISOString(), {
      sendEmail: false,
    });

  return (
    <ReservationDetailsDialog title={`予約詳細 ${r.id}`} busy={isSavingReservation} onClose={onClose}>
        <header>
          <div>
            <span className={"badge " + statusClass[r.status]}>
              <i />
              {reservationDisplayLabel(r)}
            </span>
            <h2>{r.id}</h2>
          </div>
          <button type="button" aria-label="閉じる" disabled={isSavingReservation} onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="drawer-body">
          <section className="border-b border-border pb-4"><ReservationInquiryHistoryButton reservationNumber={r.id} audience="admin" getToken={getAdminToken} /></section>
          {isEditingReservation ? (
            <section className="drawer-primary-action">
              <p className="section-label">予約内容を編集</p>
              <div className="drawer-form single">
                <label>
                  予約区分
                  <select
                    value={editForm.bookingType ?? "individual"}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        bookingType: event.target
                          .value as BookingForm["bookingType"],
                        accountType:
                          event.target.value === "travel_agency_group"
                            ? "travel_agency"
                            : "individual",
                        tcCount:
                          event.target.value === "travel_agency_group"
                            ? (editForm.tcCount ?? 0)
                            : 0,
                        dgCount:
                          event.target.value === "travel_agency_group"
                            ? (editForm.dgCount ?? 0)
                            : 0,
                      })
                    }
                  >
                    <option value="individual">一般予約</option>
                    <option value="travel_agency_group">
                      旅行会社様専用 団体予約
                    </option>
                  </select>
                </label>
                <label>
                  {isGroupBooking(editForm) ? "会社・支店名" : "お名前"}
                  <input
                    value={editForm.name}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        name: event.target.value,
                        companyBranchName: isGroupBooking(editForm)
                          ? event.target.value
                          : editForm.companyBranchName,
                      })
                    }
                  />
                </label>
                <label>
                  電話番号
                  <input
                    value={editForm.phone}
                    onChange={(event) =>
                      setEditForm({ ...editForm, phone: event.target.value })
                    }
                  />
                </label>
                <label>
                  メールアドレス
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(event) =>
                      setEditForm({ ...editForm, email: event.target.value })
                    }
                  />
                </label>
                <label>
                  住所
                  <input
                    value={editForm.address}
                    onChange={(event) =>
                      setEditForm({ ...editForm, address: event.target.value })
                    }
                  />
                </label>
              </div>
              {isGroupBooking(editForm) && (
                <GroupReservationContactFields
                  form={editForm}
                  setForm={setEditForm}
                />
              )}
              <div className="drawer-form">
                <label>
                  利用日
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(event) =>
                      setEditForm({ ...editForm, date: event.target.value })
                    }
                  />
                </label>
                <label>
                  開始時間
                  <input
                    type="time"
                    value={editForm.startTime}
                    onChange={(event) => {
                      const startTime = event.target.value;
                      setEditForm({
                        ...editForm,
                        startTime,
                        endTime: bookingFormEndTime(
                          { ...editForm, startTime, endTime: undefined },
                          menuCatalog,
                        ),
                      });
                    }}
                  />
                </label>
                <label>
                  終了時間
                  <input
                    type="time"
                    value={
                      editForm.endTime ??
                      bookingFormEndTime(editForm, menuCatalog)
                    }
                    onChange={(event) =>
                      setEditForm({ ...editForm, endTime: event.target.value })
                    }
                  />
                </label>
                <label>
                  人数
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={editForm.people}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        people: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              {isGroupBooking(editForm) && (
                <GroupReservationPeopleFields
                  form={editForm}
                  setForm={setEditForm}
                />
              )}
              <MenuPicker
                menuCatalog={menuCatalog}
                selected={editForm.menuItems}
                onChange={(menuItems) =>
                  setEditForm({
                    ...editForm,
                    menuItems,
                    endTime: bookingFormEndTime(
                      { ...editForm, menuItems, endTime: undefined },
                      menuCatalog,
                    ),
                  })
                }
              />
              <PaymentAndRemarksFields form={editForm} setForm={setEditForm} />
              {isGroupBooking(editForm) && (
                <GroupReservationFields form={editForm} setForm={setEditForm} />
              )}
              <div className="reservation-summary">
                <strong>{menuSelectionLabel(editForm.menuItems)}</strong>
                <span>
                  {bookingFormDateTimeLabel({
                    ...editForm,
                    endTime:
                      editForm.endTime ??
                      bookingFormEndTime(editForm, menuCatalog),
                  })}
                  ・{editForm.people}名
                </span>
                <small>
                  {"¥"}
                  {selectedMenuTotal(
                    editForm.menuItems,
                    menuCatalog,
                  ).toLocaleString()}
                </small>
              </div>
              <div className="drawer-actions">
                <button
                  onClick={cancelReservationEdit}
                  disabled={isSavingReservation}
                >
                  キャンセル
                </button>
                <button
                  className="approve"
                  disabled={!canSaveReservation}
                  onClick={saveReservationEdit}
                >
                  <Icon name="check" />
                  {isSavingReservation ? "保存中" : "保存する"}
                </button>
              </div>
            </section>
          ) : !isAssigning ? (
            <>
              <section className="drawer-next-action">
                <p className="section-label">次のアクション</p>
                {r.status === STATUS.temporaryRequested && (
                  <button
                    className="full-action"
                    onClick={() =>
                      updateStatus(r.id, STATUS.temporaryConfirmed)
                    }
                  >
                    <Icon name="check" />
                    仮予約を承認する
                  </button>
                )}
                {r.status === STATUS.temporaryRequested && (
                  <button
                    className="full-action danger"
                    onClick={() => updateStatus(r.id, STATUS.temporaryRejected)}
                  >
                    <Icon name="close" />
                    仮予約を却下する
                  </button>
                )}
                {r.status === STATUS.confirmedRequested && (
                  <button
                    className="full-action"
                    onClick={() => updateStatus(r.id, STATUS.confirmed)}
                  >
                    <Icon name="check" />
                    本予約を承認する
                  </button>
                )}
                {r.status === STATUS.confirmedRequested && (
                  <button
                    className="full-action danger"
                    onClick={() =>
                      updateStatus(
                        r.id,
                        isConfirmedReservationChangeRequest(r)
                          ? STATUS.temporaryConfirmed
                          : STATUS.confirmedRejected,
                      )
                    }
                  >
                    <Icon name="close" />
                    {isConfirmedReservationChangeRequest(r)
                      ? "本予約変更を却下する"
                      : "本予約を却下する"}
                  </button>
                )}
                {r.status === STATUS.waitingForVisit && (
                  <button
                    className="full-action"
                    onClick={() => updateStatus(r.id, STATUS.visited)}
                  >
                    <Icon name="check" />
                    来店済みにする
                  </button>
                )}
                {r.status === STATUS.cancellationRequested && (
                  <button
                    className="full-action danger"
                    onClick={() => {
                      updateStatus(r.id, STATUS.cancelled);
                      onClose();
                    }}
                  >
                    キャンセルを確定する
                  </button>
                )}
                {nextActionComments.length > 0 && (
                  <div className="next-action-notes">
                    {nextActionComments.map((comment) => (
                      <div className="next-action-note" key={comment.title}>
                        <strong>{comment.title}</strong>
                        <span>{comment.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <section>
                <p className="section-label">予約内容</p>
                <dl>
                  <div>
                    <dt>予約区分</dt>
                    <dd>{reservationBookingTypeLabel(r)}</dd>
                  </div>
                  <div>
                    <dt>
                      {r.bookingType === "travel_agency_group"
                        ? "会社・支店名"
                        : "お客様名"}
                    </dt>
                    <dd>{r.customer}</dd>
                  </div>
                  <div>
                    <dt>電話番号</dt>
                    <dd>{r.phone}</dd>
                  </div>
                  <div>
                    <dt>メールアドレス</dt>
                    <dd>{r.email ?? "customer@example.jp"}</dd>
                  </div>
                  {r.address ? (
                    <div>
                      <dt>住所</dt>
                      <dd>{r.address}</dd>
                    </div>
                  ) : null}
                  {r.bookingType === "travel_agency_group" ? (
                    <>
                      <div>
                        <dt>予約担当者名</dt>
                        <dd>{r.bookingContactName || "-"}</dd>
                      </div>
                      <div>
                        <dt>当日責任者名</dt>
                        <dd>{r.dayContactName || "-"}</dd>
                      </div>
                      <div>
                        <dt>当日責任者携帯番号</dt>
                        <dd>{r.dayContactPhone || "-"}</dd>
                      </div>
                    </>
                  ) : null}
                  <div>
                    <dt>利用日時</dt>
                    <dd>{reservationDateTimeLabel(r)}</dd>
                  </div>
                  <div>
                    <dt>予定人数</dt>
                    <dd>{r.people}名</dd>
                  </div>
                  {r.bookingType === "travel_agency_group" ? (
                    <>
                      <div>
                        <dt>T/C</dt>
                        <dd>{r.tcCount ?? 0}名</dd>
                      </div>
                      <div>
                        <dt>D/G</dt>
                        <dd>{r.dgCount ?? 0}名</dd>
                      </div>
                    </>
                  ) : null}
                  <div>
                    <dt>メニュー</dt>
                    <dd>{reservationMenuLabel(r)}</dd>
                  </div>
                  <div>
                    <dt>支払条件</dt>
                    <dd>{paymentConditionLabel(r.paymentCondition)}</dd>
                  </div>
                  {r.remarks ? (
                    <div>
                      <dt>備考</dt>
                      <dd>{r.remarks}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
              {r.bookingType === "travel_agency_group" && (
                <section>
                  <p className="section-label">団体情報</p>
                  <dl>
                    <div>
                      <dt>団体名</dt>
                      <dd>{r.groupName || "-"}</dd>
                    </div>
                    <div>
                      <dt>団体ふりがな</dt>
                      <dd>{r.groupNameKana || "-"}</dd>
                    </div>
                    <div>
                      <dt>団体種別</dt>
                      <dd>
                        {r.groupType === "その他" && r.groupTypeOther
                          ? r.groupTypeOther
                          : r.groupType || "-"}
                      </dd>
                    </div>
                  </dl>
                </section>
              )}
              <PolicyConsentHistory consents={r.policyConsents ?? []} />
              <section>
                <button
                  className="edit-reservation-button"
                  onClick={() => setIsEditingReservation(true)}
                >
                  予約内容を編集
                </button>
              </section>
              <section>
                <p className="section-label">店舗割当</p>
                <dl>
                  <div>
                    <dt>割当状況</dt>
                    <dd>{assignmentLabel(r) || "未割当"}</dd>
                  </div>
                  <div>
                    <dt>割当人数</dt>
                    <dd>
                      {reservationAssignments(r).reduce(
                        (total, assignment) => total + assignment.people,
                        0,
                      )}
                      名 / {r.people}名
                    </dd>
                  </div>
                </dl>
                <button
                  className="edit-reservation-button"
                  onClick={() => setIsAssigning(true)}
                >
                  店舗割当を編集
                </button>
              </section>
              {canUpdateConfirmationContact && (
                <section>
                  <p className="section-label">確認連絡</p>
                  <dl>
                    <div>
                      <dt>連絡状況</dt>
                      <dd>
                        {r.confirmationContactedAt ? "連絡済み" : "未連絡"}
                      </dd>
                    </div>
                  </dl>
                  {r.confirmationContactedAt ? (
                    <button
                      className="edit-reservation-button"
                      onClick={() => updateConfirmationContact(r.id, null)}
                    >
                      未連絡に戻す
                    </button>
                  ) : isConfirmingConfirmationEmail ? (
                    <div className="confirmation-send-confirm">
                      <strong>確認メールを送信しますか？</strong>
                      <div>
                        <button
                          type="button"
                          disabled={isSendingConfirmationEmail}
                          onClick={() =>
                            setIsConfirmingConfirmationEmail(false)
                          }
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                          className="approve"
                          disabled={isSendingConfirmationEmail || !r.email}
                          onClick={sendConfirmationEmail}
                        >
                          <Icon name="check" />
                          {isSendingConfirmationEmail ? "送信中" : "送信する"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="confirmation-contact-actions">
                      <button
                        className="full-action"
                        onClick={() => setIsConfirmingConfirmationEmail(true)}
                      >
                        <Icon name="check" />
                        確認メール送信
                      </button>
                      <button
                        className="edit-reservation-button"
                        onClick={markConfirmationContactManually}
                      >
                        手動で確認済みにする
                      </button>
                    </div>
                  )}
                </section>
              )}
              <section>
                <p className="section-label">例外操作</p>
                <button
                  className="exception-toggle"
                  type="button"
                  onClick={() => setIsManualStatusOpen((current) => !current)}
                >
                  <span>
                    <strong>任意のステータスに変更</strong>
                  </span>
                  <Icon name="arrow" />
                </button>
                {isManualStatusOpen && (
                  <div className="manual-status-panel drawer-form">
                    <label>
                      変更先ステータス
                      <select
                        value={manualStatus}
                        onChange={(event) =>
                          setManualStatus(event.target.value as Status)
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      変更理由
                      <textarea
                        value={manualStatusReason}
                        onChange={(event) =>
                          setManualStatusReason(event.target.value)
                        }
                        placeholder="例: お客様から電話で変更依頼があったため"
                      />
                    </label>
                    <button
                      className="full-action manual-status-submit"
                      disabled={!canSaveManualStatus}
                      onClick={saveManualStatus}
                    >
                      <Icon name="check" />
                      ステータスを変更する
                    </button>
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="drawer-primary-action">
              <p className="section-label">店舗割当を編集</p>
              <div className="assignment-editor">
                {assignmentDraft.map((assignment, index) => (
                  <div className="assignment-row" key={index}>
                    <select
                      value={assignment.store}
                      onChange={(event) =>
                        updateAssignment(index, { store: event.target.value })
                      }
                    >
                      <option value="">店舗を選択</option>
                      {stores.map((store) => (
                        <option key={store.name} value={store.name} disabled={assignmentDraft.some((a,i)=>i!==index&&a.store===store.name)&&assignment.store!==store.name}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      max={r.people}
                      value={assignment.people || ""}
                      onChange={(event) =>
                        updateAssignment(index, {
                          people: Number(event.target.value),
                        })
                      }
                    />
                    <span>名</span>
                    <button onClick={() => removeAssignment(index)}>
                      削除
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="edit-reservation-button"
                disabled={allAssignmentStoresUsed}
                onClick={addAssignment}
              >
                割当行を追加
              </button>
              <div
                className={
                  assignmentDraft.length === 0 || assignedPeople === r.people
                    ? "assignment-total ok"
                    : "assignment-total warn"
                }
              >
                {assignmentDraft.length === 0 ? (
                  "未割当として保存できます"
                ) : (
                  <>
                    割当合計 {assignedPeople}名 / 予約人数 {r.people}名
                  </>
                )}
              </div>
              {duplicateStores.length>0&&isAssigning&&<p role="alert" className="text-sm text-destructive">同じ店舗は複数行に割り当てられません：{duplicateStores.join("、")}</p>}
              <div className="drawer-actions">
                <button onClick={() => setIsAssigning(false)}>
                  キャンセル
                </button>
                <button
                  className="approve"
                  disabled={!canSaveAssignments}
                  onClick={saveAssignments}
                >
                  <Icon name="check" />
                  保存する
                </button>
              </div>
            </section>
          )}
        </div>
    </ReservationDetailsDialog>
  );
}

function GroupReservationContactFields({
  form,
  setForm,
}: {
  form: BookingForm;
  setForm: Dispatch<SetStateAction<BookingForm>>;
}) {
  return (
    <div className="drawer-form single">
      <label>
        予約担当者名
        <input
          value={form.bookingContactName ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              bookingContactName: event.target.value,
              contactPersonName: event.target.value,
            }))
          }
        />
      </label>
      <label>
        当日責任者名
        <input
          value={form.dayContactName ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              dayContactName: event.target.value,
            }))
          }
        />
      </label>
      <label>
        当日責任者携帯番号
        <input
          value={form.dayContactPhone ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              dayContactPhone: event.target.value,
            }))
          }
        />
      </label>
    </div>
  );
}

function GroupReservationPeopleFields({
  form,
  setForm,
}: {
  form: BookingForm;
  setForm: Dispatch<SetStateAction<BookingForm>>;
}) {
  return (
    <div className="drawer-form single">
      <label>
        T/C
        <input
          type="number"
          min="0"
          max="999"
          value={form.tcCount ?? 0}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              tcCount: Number(event.target.value),
            }))
          }
        />
        <small>
          添乗員・通訳ガイド様の現地でのお食事。（同食、同額となります。）
        </small>
      </label>
      <label>
        D/G
        <input
          type="number"
          min="0"
          max="999"
          value={form.dgCount ?? 0}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              dgCount: Number(event.target.value),
            }))
          }
        />
        <small>
          ドライバー・ガイド様の持ち帰り弁当1,000円（税込）（店舗にとりに来ていただくようになります。）
        </small>
      </label>
    </div>
  );
}

function GroupReservationFields({
  form,
  setForm,
}: {
  form: BookingForm;
  setForm: Dispatch<SetStateAction<BookingForm>>;
}) {
  return (
    <div className="group-reservation-fields">
      <p className="section-label">団体情報</p>
      <div className="drawer-form single">
        <label>
          団体名
          <input
            value={form.groupName ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                groupName: event.target.value,
              }))
            }
          />
        </label>
        <label>
          団体ふりがな
          <input
            value={form.groupNameKana ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                groupNameKana: event.target.value,
              }))
            }
          />
        </label>
        <label>
          団体種別
          <select
            value={form.groupType ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                groupType: event.target.value,
              }))
            }
          >
            <option value="">選択してください</option>
            {groupTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {form.groupType === "その他" && (
          <label>
            団体種別 その他
            <input
              value={form.groupTypeOther ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  groupTypeOther: event.target.value,
                }))
              }
            />
          </label>
        )}
      </div>
    </div>
  );
}

function PaymentAndRemarksFields({
  form,
  setForm,
}: {
  form: BookingForm;
  setForm: Dispatch<SetStateAction<BookingForm>>;
}) {
  return (
    <div className="drawer-form single">
      <label>
        支払条件
        <select
          value={form.paymentCondition ?? defaultPaymentCondition}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              paymentCondition: event.target
                .value as BookingForm["paymentCondition"],
            }))
          }
        >
          {paymentConditionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        備考
        <textarea
          value={form.remarks ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, remarks: event.target.value }))
          }
        />
      </label>
    </div>
  );
}

function NewReservationDrawer({
  form,
  setForm,
  onClose,
  onSubmit,
  menuCatalog,
}: {
  form: BookingForm;
  setForm: Dispatch<SetStateAction<BookingForm>>;
  onClose: () => void;
  onSubmit: () => void;
  menuCatalog: Menu[];
}) {
  const groupReady =
    !isGroupBooking(form) ||
    Boolean(
      form.bookingContactName &&
      form.dayContactName &&
      form.dayContactPhone &&
      form.groupName &&
      form.groupType,
    );
  const canSubmit = Boolean(
    form.name &&
    form.email &&
    form.phone &&
    form.date &&
    form.startTime &&
    form.people &&
    groupReady,
  );
  const total = selectedMenuTotal(form.menuItems, menuCatalog);

  return (
    <>
      <div className="drawer-shade" onClick={onClose} />
      <aside className="drawer new-reservation-drawer">
        <header>
          <div>
            <span className="badge blue">
              <i />
              新規登録
            </span>
            <h2>新規予約</h2>
          </div>
          <button onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="drawer-body">
          <section>
            <p className="section-label">予約内容</p>
            <div className="drawer-form">
              <label>
                登録時ステータス
                <select
                  value={form.status ?? STATUS.temporaryRequested}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value as Status })
                  }
                >
                  <option value={STATUS.confirmed}>
                    {statusLabel(STATUS.confirmed)}
                  </option>
                  <option value={STATUS.temporaryRequested}>
                    {statusLabel(STATUS.temporaryRequested)}
                  </option>
                  <option value={STATUS.temporaryConfirmed}>
                    {statusLabel(STATUS.temporaryConfirmed)}
                  </option>
                  <option value={STATUS.confirmedRequested}>
                    {statusLabel(STATUS.confirmedRequested)}
                  </option>
                </select>
              </label>
              <label>
                予約区分
                <select
                  value={form.bookingType ?? "individual"}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      bookingType: event.target
                        .value as BookingForm["bookingType"],
                      accountType:
                        event.target.value === "travel_agency_group"
                          ? "travel_agency"
                          : "individual",
                      tcCount:
                        event.target.value === "travel_agency_group"
                          ? (form.tcCount ?? 0)
                          : 0,
                      dgCount:
                        event.target.value === "travel_agency_group"
                          ? (form.dgCount ?? 0)
                          : 0,
                    })
                  }
                >
                  <option value="individual">一般予約</option>
                  <option value="travel_agency_group">
                    旅行会社様専用 団体予約
                  </option>
                </select>
              </label>
              <label>
                利用日
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                />
              </label>
              <label>
                開始時間
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => {
                    const startTime = event.target.value;
                    setForm({
                      ...form,
                      startTime,
                      endTime: bookingFormEndTime(
                        { ...form, startTime, endTime: undefined },
                        menuCatalog,
                      ),
                    });
                  }}
                />
              </label>
              <label>
                終了時間
                <input
                  type="time"
                  value={form.endTime ?? bookingFormEndTime(form, menuCatalog)}
                  onChange={(event) =>
                    setForm({ ...form, endTime: event.target.value })
                  }
                />
              </label>
              <label>
                人数
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={form.people || ""}
                  onChange={(event) =>
                    setForm({ ...form, people: Number(event.target.value) })
                  }
                />
              </label>
            </div>
          </section>
          <section>
            <p className="section-label">お客様情報</p>
            <div className="drawer-form single">
              <label>
                {isGroupBooking(form) ? "会社・支店名" : "お名前"}
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                      companyBranchName: isGroupBooking(form)
                        ? event.target.value
                        : form.companyBranchName,
                    })
                  }
                />
              </label>
              <label>
                メールアドレス
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </label>
              <label>
                電話番号
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </label>
              <label>
                住所
                <input
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                />
              </label>
            </div>
          </section>
          {isGroupBooking(form) && (
            <section>
              <p className="section-label">予約担当者</p>
              <GroupReservationContactFields form={form} setForm={setForm} />
            </section>
          )}
          {isGroupBooking(form) && (
            <section>
              <GroupReservationFields form={form} setForm={setForm} />
            </section>
          )}
          <section className="drawer-primary-action">
            <p className="section-label">任意メニュー</p>
            {isGroupBooking(form) && (
              <GroupReservationPeopleFields form={form} setForm={setForm} />
            )}
            <MenuPicker
              menuCatalog={menuCatalog}
              selected={form.menuItems}
              onChange={(menuItems) =>
                setForm({
                  ...form,
                  menuItems,
                  endTime: bookingFormEndTime(
                    { ...form, menuItems, endTime: undefined },
                    menuCatalog,
                  ),
                })
              }
            />
            <PaymentAndRemarksFields form={form} setForm={setForm} />
            <div className="reservation-summary">
              <strong>{menuSelectionLabel(form.menuItems)}</strong>
              <span>
                {form.date && form.startTime && form.people
                  ? `${bookingFormDateTimeLabel({ ...form, endTime: form.endTime ?? bookingFormEndTime(form, menuCatalog) })}・${form.people}名`
                  : "日時・人数を入力してください"}
              </span>
              <small>
                {"¥"}
                {total.toLocaleString()}
              </small>
            </div>
            <button
              className="full-action"
              disabled={!canSubmit}
              onClick={onSubmit}
            >
              <Icon name="check" />
              予約を登録する
            </button>
          </section>
        </div>
      </aside>
    </>
  );
}

type CustomerPortalMode =
  | "home"
  | "login"
  | "register"
  | "account"
  | "reservation"
  | "confirmedChange"
  | "change"
  | "cancellation";
type CustomerContactRequestForm = {
  reservationId: string;
  email: string;
  phone: string;
};
type CustomerReservationChangeRequestForm = CustomerContactRequestForm & {
  requestedDate: string;
  requestedStartTime: string;
  requestedPeople: number;
  requestedMenuItems: string[];
  reason: string;
};

function CustomerPortal({
  initialMode,
  form,
  setForm,
  step,
  setStep,
  onAdmin,
  notify,
  onSubmitReservation,
  onSubmitCancellation,
  onSubmitConfirmedReservationChange,
  onSubmitChangeRequest,
  menuCatalog,
}: {
  initialMode: CustomerPortalMode;
  form: BookingForm;
  setForm: Dispatch<SetStateAction<BookingForm>>;
  step: number;
  setStep: (n: number) => void;
  onAdmin: () => void;
  notify: (s: string, variant?: "success" | "error" | "info") => void;
  onSubmitReservation: (
    form: BookingForm,
    options?: ReservationSubmitOptions,
  ) => Promise<Reservation>;
  onSubmitCancellation: (
    input: { reservationId: string; email?: string; phone?: string; cancellationPolicyAgreement?: CancellationPolicyAgreementInput; cancellationFeeAcknowledged?: boolean },
    options?: { authToken?: string },
  ) => Promise<Reservation>;
  onSubmitConfirmedReservationChange: (
    input: { reservationId: string; email?: string; phone?: string; cancellationPolicyAgreement?: CancellationPolicyAgreementInput; cancellationFeeAcknowledged?: boolean },
    options?: { authToken?: string },
  ) => Promise<Reservation>;
  onSubmitChangeRequest: (
    input: {
      reservationId: string;
      email?: string;
      phone?: string;
      requestedDate: string;
      requestedStartTime: string;
      requestedPeople: number;
      requestedMenuItems: string[];
      reason?: string;
      cancellationFeeAcknowledged?: boolean;
    },
    options?: { authToken?: string },
  ) => Promise<ReservationChangeRequest>;
  menuCatalog: Menu[];
}) {
  const {policy,error:policyError}=useReservationPolicy();
  const dateBlocked=!policy || !form.date || form.date < policy.minimumDate;
  const {
    customerUser,
    customerAuthLoading,
    customerAuthError,
    loginCustomer,
    registerCustomer,
    resendVerificationEmail,
    refreshEmailVerification,
    resetCustomerPassword,
    requestCustomerEmailChange,
    reauthenticateCustomer,
    signOutCustomer,
  } = useCustomerSession();
  const [portalMode, setPortalMode] = useState<CustomerPortalMode>(initialMode);
  const [bookingMode, setBookingMode] = useState<"login" | "register">(initialMode === "register" ? "register" : "login");
  const [accountEmail, setAccountEmail] = useState(form.email);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const [submittedReservation, setSubmittedReservation] = useState<Reservation | null>(null);
  const activeCustomerUid = useRef(customerUser?.uid);
  activeCustomerUid.current = customerUser?.uid;
  const reservationSubmission = useRef(false);
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const [emailChangeMessage, setEmailChangeMessage] = useState("");
  const [contactVerificationStatus, setContactVerificationStatus] = useState<"verified" | "invalid" | null>(null);
  const [customerAccount, setCustomerAccount] = useState<Customer | null>(null);
  const [customerAccountLoading, setCustomerAccountLoading] = useState(true);
  const [accountLoadError, setAccountLoadError] = useState("");
  const [accountReloadVersion, setAccountReloadVersion] = useState(0);
  const [contactEmails, setContactEmails] = useState<AccountContactEmail[]>([]);
  const [cancellationForm, setCancellationForm] = useState({
    reservationId: "",
    email: "",
    phone: "",
  });
  const [isSubmittingCancellation, setIsSubmittingCancellation] =
    useState(false);
  const [cancellationSubmitted, setCancellationSubmitted] = useState(false);
  const [confirmedChangeForm, setConfirmedChangeForm] = useState({
    reservationId: "",
    email: "",
    phone: "",
  });
  const [isSubmittingConfirmedChange, setIsSubmittingConfirmedChange] =
    useState(false);
  const [confirmedChangeSubmitted, setConfirmedChangeSubmitted] =
    useState(false);
  const [changeRequestForm, setChangeRequestForm] = useState({
    reservationId: "",
    email: "",
    phone: "",
    requestedDate: form.date,
    requestedStartTime: form.startTime,
    requestedPeople: form.people,
    requestedMenuItems: form.menuItems,
    reason: "",
  });
  const [isSubmittingChangeRequest, setIsSubmittingChangeRequest] =
    useState(false);
  const [changeRequestSubmitted, setChangeRequestSubmitted] = useState(false);
  const [accountReservations, setAccountReservations] = useState<Reservation[]>(
    [],
  );
  const [accountChangeRequests, setAccountChangeRequests] = useState<
    ReservationChangeRequest[]
  >([]);
  const [isLoadingAccountReservations, setIsLoadingAccountReservations] =
    useState(false);
  const [accountReservationError, setAccountReservationError] = useState("");
  const previousCustomerUid = useRef<string | null>(null);
  useEffect(() => {
    if (customerAuthLoading) return;
    const uid = customerUser?.uid ?? null;
    if (previousCustomerUid.current !== uid) {
      if (previousCustomerUid.current) {
        setForm(emptyReservationForm(STATUS.temporaryRequested));
        setStep(1);
        setAccountEmail("");
        setAccountPassword("");
        setEmailChangeMessage("");
        setSubmittedReservation(null);
        setCancellationForm({ reservationId: "", email: "", phone: "" });
        setConfirmedChangeForm({ reservationId: "", email: "", phone: "" });
        setChangeRequestForm({ reservationId: "", email: "", phone: "", requestedDate: "", requestedStartTime: "", requestedPeople: 0, requestedMenuItems: [], reason: "" });
        setCancellationSubmitted(false);
        setConfirmedChangeSubmitted(false);
        setChangeRequestSubmitted(false);
      }
      setAccountReservations([]);
      setAccountChangeRequests([]);
      setCustomerAccount(null);
      setContactEmails([]);
      setIsLoadingAccountReservations(false);
      previousCustomerUid.current = uid;
    }
  }, [customerUser?.uid, customerAuthLoading, setForm, setStep]);
  const consentMenuKey = form.menuItems.join("\u0000");
  useEffect(() => {
    setForm(current => current.cancellationPolicyAgreement ? { ...current, cancellationPolicyAgreement: undefined } : current);
  }, [form.date, form.startTime, form.people, form.status, consentMenuKey, customerUser?.uid, setForm]);
  const total = selectedMenuTotal(form.menuItems, menuCatalog);
  const groupReady =
    !isGroupBooking(form) ||
    Boolean(
      form.companyBranchName &&
      form.bookingContactName &&
      form.dayContactName &&
      form.dayContactPhone &&
      form.groupName &&
      form.groupType,
    );
  const requiresConfirmedPolicy = form.status === STATUS.confirmedRequested;
  const confirmedPolicyReady = !requiresConfirmedPolicy || (form.cancellationPolicyAgreement?.accepted === true && form.cancellationPolicyAgreement.version === cancellationPolicyVersion);
  const canSubmit = !dateBlocked && !isSubmittingReservation && Boolean(
    form.name &&
    form.email &&
    form.phone &&
    form.date &&
    form.startTime &&
    form.people &&
    groupReady,
  );
  const canSubmitCancellation =
    Boolean(customerUser && accountReservations.some((reservation) => reservation.id === cancellationForm.reservationId)) &&
    !isSubmittingCancellation;
  const canSubmitConfirmedChange =
    Boolean(customerUser && confirmedChangeForm.reservationId.trim()) &&
    !isSubmittingConfirmedChange;
  const canSubmitChangeRequest =
    Boolean(
      customerUser &&
      changeRequestForm.reservationId.trim() &&
      changeRequestForm.requestedDate &&
      changeRequestForm.requestedStartTime &&
      changeRequestForm.requestedPeople,
    ) && !isSubmittingChangeRequest;

  useEffect(() => {
    setPortalMode(initialMode);
    if (initialMode === "login" || initialMode === "register") setBookingMode(initialMode);
    if (initialMode === "reservation") setStep(1);
  }, [initialMode, setStep]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (portalMode === "login" || portalMode === "register") {
      url.pathname = `/${portalMode}`;
      url.searchParams.delete("customerMode");
    } else {
      url.pathname = "/";
      url.searchParams.set("customerMode", portalMode);
    }
    window.history.replaceState(null, "", url);
  }, [portalMode]);

  useEffect(() => {
    if (!customerAuthLoading && customerUser && (portalMode === "login" || portalMode === "register")) setPortalMode("home");
  }, [customerAuthLoading, customerUser, portalMode]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("contactEmail");
    if (status !== "verified" && status !== "invalid") return;
    setContactVerificationStatus(status);
    url.searchParams.delete("contactEmail");
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAccountLoadError("");
    if (!customerUser?.emailVerified) { setCustomerAccount(null); setContactEmails([]); setCustomerAccountLoading(false); return; }
    setCustomerAccountLoading(true);
    const loadAccount = async () => {
      const token = await customerUser.getIdToken();
      const { account } = await requestJson<{ account: Customer | null }>(
        "/api/accounts/me",
        { authToken: token },
      );
      if (cancelled) return;
      setCustomerAccount(account);
      setCustomerAccountLoading(false);
      if (!isAccountProfileComplete(account)) setPortalMode("home");
      setForm((current) => account
        ? applyAccountToReservationForm(current, account)
        : { ...current, email: customerUser.email || current.email });
      setAccountEmail(account?.contact || customerUser.email || "");
      const contacts = await requestJson<{ contactEmails: AccountContactEmail[] }>("/api/accounts/me/contact-emails", { authToken: token });
      if (!cancelled) setContactEmails(contacts.contactEmails);
    };
    void loadAccount().catch((error) => {
      if (!cancelled) setAccountLoadError(error instanceof Error ? error.message : "ログイン済みのお客様情報を取得できませんでした");
    }).finally(() => { if (!cancelled) setCustomerAccountLoading(false); });
    return () => { cancelled = true; };
  }, [customerUser, setForm, accountReloadVersion]);

  useEffect(() => {
    if (!customerUser || new URLSearchParams(window.location.search).get("emailChange") !== "complete") return;
    let cancelled = false;
    void (async () => {
      try {
        await customerUser.reload();
        const token = await customerUser.getIdToken(true);
        const result = await requestJson<{ changed: boolean; account: Customer; notification?: { status: "sent" | "failed" } }>("/api/accounts/me/email", { method: "PATCH", authToken: token });
        if (cancelled) return;
        setCustomerAccount(result.account);
        setAccountEmail(result.account.contact);
        setForm((current) => ({ ...current, email: result.account.contact }));
        setEmailChangeMessage(result.notification?.status === "failed" ? "メールアドレスを変更しました。旧メールアドレスへの変更通知は送信できませんでした。" : result.changed ? "メールアドレスを変更しました。" : "メールアドレスは変更済みです。");
        window.history.replaceState(null, "", "/?customerMode=home");
      } catch (error) {
        if (!cancelled) setEmailChangeMessage(error instanceof Error ? error.message : "メールアドレス変更を完了できませんでした。");
      }
    })();
    return () => { cancelled = true; };
  }, [customerUser, setForm]);

  const beginEmailChange = async (newEmail: string) => {
    await requestCustomerEmailChange(newEmail);
    setEmailChangeMessage("新しいメールアドレスに確認メールを送信しました。メール内のリンクから変更を完了してください。");
  };
  const updateCustomerAccount = async (values: AccountProfileFields) => {
    if (!customerUser) return;
    const uid = customerUser.uid;
    const result = await requestJson<{ account: Customer }>("/api/accounts/me", {
      method: customerAccount ? "PATCH" : "POST",
      authToken: await customerUser.getIdToken(),
      body: JSON.stringify({
        ...values,
        contact: customerUser.email,
        name: values.accountType === "travel_agency" ? values.companyBranchName : values.name,
      }),
    });
    if (activeCustomerUid.current !== uid) return;
    setCustomerAccount(result.account);
    setForm((current) => applyAccountToReservationForm(current, result.account));
    if (!isAccountProfileComplete(customerAccount)) setPortalMode("home");
    notify("アカウント情報を更新しました。");
  };
  const addContactEmail = async (email: string) => {
    if (!customerUser) return;
    const uid = customerUser.uid;
    const result = await requestJson<{ contactEmail: AccountContactEmail }>("/api/accounts/me/contact-emails", { method: "POST", authToken: await customerUser.getIdToken(), body: JSON.stringify({ email }) });
    if (activeCustomerUid.current !== uid) return;
    setContactEmails((items) => [...items, result.contactEmail]);
    notify("追加メールアドレスへ確認メールを送信しました。");
  };
  const removeContactEmail = async (id: string) => {
    if (!customerUser) return;
    const uid = customerUser.uid;
    await requestJson(`/api/accounts/me/contact-emails?id=${encodeURIComponent(id)}`, { method: "DELETE", authToken: await customerUser.getIdToken() });
    if (activeCustomerUid.current !== uid) return;
    setContactEmails((items) => items.filter((item) => item.id !== id));
  };

  useEffect(() => {
    let cancelled = false;
    if (!customerUser) { setAccountReservations([]); setAccountChangeRequests([]); return; }
    if (portalMode !== "account" || !customerUser?.emailVerified) return;
    const loadReservations = async () => {
      setIsLoadingAccountReservations(true);
      setAccountReservationError("");
      try {
        const token = await customerUser.getIdToken();
        const { reservations, changeRequests } = await requestJson<{
          reservations: Reservation[];
          changeRequests: ReservationChangeRequest[];
        }>("/api/accounts/me/reservations", { authToken: token });
        if (cancelled) return;
        setAccountReservations(reservations);
        setAccountChangeRequests(changeRequests);
      } catch {
        if (cancelled) return;
        setAccountReservationError(
          "予約情報を取得できませんでした。時間をおいて再度お試しください。",
        );
      } finally {
        if (!cancelled) setIsLoadingAccountReservations(false);
      }
    };
    loadReservations();
    return () => { cancelled = true; };
  }, [customerUser, portalMode]);

  const selectBookingMode = (mode: "login" | "register") => {
    setBookingMode(mode);
    setAccountEmail((current) => current || form.email);
  };

  const saveCurrentAccountProfile = async (authToken: string, email = accountEmail, profile?: RegisterAuthFields) => {
    const source = profile ?? form;
    const travelAgency = isTravelAgencyAccount(source);
    const name = travelAgency ? source.companyBranchName || source.name : source.name;
    const { account } = await requestJson<{ account: Customer }>("/api/accounts/me", {
      method: "POST",
      authToken,
      body: JSON.stringify({
        name,
        contact: email,
        phone: source.phone,
        address: source.address,
        accountType: travelAgency ? "travel_agency" : "individual",
        companyBranchName: travelAgency
          ? source.companyBranchName || name
          : undefined,
        contactPersonName: travelAgency ? source.contactPersonName : undefined,
      }),
    });
    setCustomerAccount(account);
  };

  const accountProfileReady = () => {
    if (bookingMode !== "register") return true;
    if (!form.phone) return false;
    return isTravelAgencyAccount(form)
      ? Boolean(form.companyBranchName || form.name) &&
          Boolean(form.contactPersonName)
      : Boolean(form.name);
  };

  const submitAccount = async (
    submittedEmail = accountEmail,
    submittedPassword = accountPassword,
    profile?: RegisterAuthFields,
  ) => {
    if (!submittedEmail || !submittedPassword || accountSubmitting) return;
    if (!profile && !accountProfileReady()) {
      notify(
        isTravelAgencyAccount(form)
          ? "会社・支店名、担当者名、電話番号を入力してください"
          : "お名前と電話番号を入力してください",
      );
      return;
    }
    setAccountSubmitting(true);
    try {
      if (bookingMode === "register") {
        try {
          await registerCustomer(
            submittedEmail,
            submittedPassword,
            async (user) => {
              await saveCurrentAccountProfile(await user.getIdToken(), submittedEmail, profile);
            },
          );
          notify("確認メールを送信しました");
        } catch (error) {
          if (customerAuthErrorCode(error) === "auth/email-already-in-use") {
            setBookingMode("login");
            setPortalMode("login");
            notify(
              "このメールアドレスはアカウント登録済みです。ログインしてください",
            );
            return;
          } else {
            throw error;
          }
        }
      } else {
        await loginCustomer(submittedEmail, submittedPassword);
        notify("ログインしました");
      }
      setAccountEmail(submittedEmail);
      setAccountPassword(submittedPassword);
      setForm((current) => ({ ...current, email: submittedEmail }));
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : bookingMode === "register"
            ? "アカウント登録に失敗しました"
            : "ログインに失敗しました",
      );
    } finally {
      setAccountSubmitting(false);
    }
  };

  const resendCustomerVerification = async () => {
    if (verificationSubmitting) return;
    setVerificationSubmitting(true);
    try {
      await resendVerificationEmail();
      notify("確認メールを再送しました");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "確認メールを再送できませんでした",
      );
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const confirmCustomerVerification = async () => {
    if (verificationSubmitting) return;
    setVerificationSubmitting(true);
    try {
      const verifiedUser = await refreshEmailVerification();
      if (!verifiedUser?.emailVerified) {
        notify("メール認証がまだ完了していません");
        return;
      }
      const token = await verifiedUser.getIdToken(true);
      const { account } = await requestJson<{ account: Customer | null }>("/api/accounts/me", { authToken: token });
      setCustomerAccount(account);
      setAccountEmail(verifiedUser.email ?? "");
      if (account) setForm(current => applyAccountToReservationForm(current, account));
      setAccountReloadVersion(value => value + 1);
      notify("メールアドレスを確認しました");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "メール認証を確認できませんでした",
      );
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const loginForAccountReservations = async (
    submittedEmail = accountEmail,
    submittedPassword = accountPassword,
  ) => {
    if (!submittedEmail || !submittedPassword || accountSubmitting) return;
    setAccountSubmitting(true);
    try {
      await loginCustomer(submittedEmail, submittedPassword);
      setAccountEmail(submittedEmail);
      setAccountPassword("");
      notify("ログインしました");
    } catch {
      notify("ログインに失敗しました");
    } finally {
      setAccountSubmitting(false);
    }
  };

  const sendCustomerPasswordReset = async (email: string) => {
    if (accountSubmitting) return;
    setAccountSubmitting(true);
    try {
      await resetCustomerPassword(email);
      notify("登録済みのメールアドレス宛てに再設定メールを送信します。迷惑メールフォルダもご確認ください。");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "パスワード再設定メールを送信できませんでした",
      );
    } finally {
      setAccountSubmitting(false);
    }
  };

  const deleteCustomerAccount = async (password: string) => {
    if (!customerUser || accountSubmitting) return;
    if (!window.confirm("アカウントを削除するとログインできなくなります。過去の予約情報については、サービス運営上必要な範囲で保持される場合があります。\n\nアカウントを削除しますか？この操作は取り消せません。"))
      return;
    const finishAccountDeletion = async () => {
      setAccountReservations([]);
      setAccountChangeRequests([]);
      setCustomerAccount(null);
      setContactEmails([]);
      await signOutCustomer();
      notify("アカウントを削除しました");
    };
    setAccountSubmitting(true);
    try {
      const authToken = await reauthenticateCustomer(password);
      await requestJson<{ deleted: true }>("/api/accounts/me", {
        method: "DELETE",
        authToken,
      });
      await finishAccountDeletion();
    } catch (error) {
      if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
        try {
          await customerUser.reload();
        } catch (reloadError) {
          const code = customerAuthErrorCode(reloadError);
          if (code === "auth/user-not-found" || code === "auth/user-token-expired" || code === "auth/invalid-user-token") {
            await finishAccountDeletion();
            return;
          }
        }
      }
      notify(
        error instanceof TypeError && /failed to fetch/i.test(error.message)
          ? "削除結果を確認できませんでした。通信状態を確認して、もう一度お試しください。"
          : error instanceof Error
          ? error.message
          : "アカウントを削除できませんでした",
      );
      throw error;
    } finally {
      setAccountSubmitting(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || !confirmedPolicyReady || reservationSubmission.current) return;
    const uid = customerUser?.uid;
    reservationSubmission.current = true;
    setIsSubmittingReservation(true);
    try {
      if (!customerUser) {
        notify("ログインまたはアカウント登録を完了してください");
        return;
      }
      const options: ReservationSubmitOptions = {
        customerAccountMode: "account",
        authToken: await customerUser.getIdToken(),
      };
      const submitForm: BookingForm = isGroupBooking(form)
        ? {
            ...form,
            name: form.companyBranchName || form.name,
            accountType: "travel_agency",
            contactPersonName:
              form.contactPersonName || form.bookingContactName,
          }
        : {
            ...form,
            accountType: "individual",
            bookingType: "individual",
            tcCount: 0,
            dgCount: 0,
          };
      const reservation = await onSubmitReservation(submitForm, options);
      if (activeCustomerUid.current !== uid) return;
      setSubmittedReservation(reservation);
      notify(reservation.receiptEmailStatus === "failed" ? `予約申請は保存済みです（${reservation.id}）。受付メールを送信できませんでした。予約確認画面でご確認ください。` : "予約申請を受け付けました（" + reservation.id + "）", reservation.receiptEmailStatus === "failed" ? "error" : "success");
      setStep(5);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "予約申請の保存に失敗しました",
      );
    } finally {
      reservationSubmission.current = false;
      setIsSubmittingReservation(false);
    }
  };
  const submitCancellation = async (cancellationFeeAcknowledged = false) => {
    if (!canSubmitCancellation) return;
    setIsSubmittingCancellation(true);
    try {
      if (!customerUser) {
        notify("ログインしてください");
        return;
      }
      const authToken = await customerUser.getIdToken();
      const reservation = await onSubmitCancellation(
        {
          reservationId: cancellationForm.reservationId.trim(),
          cancellationFeeAcknowledged,
          email: cancellationForm.email.trim() || undefined,
          phone: cancellationForm.phone.trim() || undefined,
        },
        { authToken },
      );
      notify("キャンセル申請を受け付けました（" + reservation.id + "）");
      setCancellationSubmitted(true);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "キャンセル申請の保存に失敗しました",
      );
    } finally {
      setIsSubmittingCancellation(false);
    }
  };
  const submitConfirmedChange = async (cancellationPolicyAgreement: CancellationPolicyAgreementInput) => {
    if (!canSubmitConfirmedChange) return;
    setIsSubmittingConfirmedChange(true);
    try {
      if (!customerUser) {
        notify("ログインしてください");
        return;
      }
      const authToken = await customerUser.getIdToken();
      const reservation = await onSubmitConfirmedReservationChange(
        {
          reservationId: confirmedChangeForm.reservationId.trim(),
          cancellationPolicyAgreement,
          email: confirmedChangeForm.email.trim() || undefined,
          phone: confirmedChangeForm.phone.trim() || undefined,
        },
        { authToken },
      );
      notify("本予約への変更申請を受け付けました（" + reservation.id + "）");
      setConfirmedChangeSubmitted(true);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "本予約への変更申請の保存に失敗しました",
      );
    } finally {
      setIsSubmittingConfirmedChange(false);
    }
  };
  const submitChangeRequest = async (cancellationFeeAcknowledged = false) => {
    if (!canSubmitChangeRequest) return;
    setIsSubmittingChangeRequest(true);
    try {
      if (!customerUser) {
        notify("ログインしてください");
        return;
      }
      const authToken = await customerUser.getIdToken();
      const request = await onSubmitChangeRequest(
        {
          reservationId: changeRequestForm.reservationId.trim(),
          cancellationFeeAcknowledged,
          email: changeRequestForm.email.trim() || undefined,
          phone: changeRequestForm.phone.trim() || undefined,
          requestedDate: changeRequestForm.requestedDate,
          requestedStartTime: changeRequestForm.requestedStartTime,
          requestedPeople: changeRequestForm.requestedPeople,
          requestedMenuItems: changeRequestForm.requestedMenuItems,
          reason: changeRequestForm.reason.trim() || undefined,
        },
        { authToken },
      );
      notify(
        "予約内容変更申請を受け付けました（" + request.reservationId + "）",
      );
      setChangeRequestSubmitted(true);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "予約内容変更申請の保存に失敗しました",
      );
    } finally {
      setIsSubmittingChangeRequest(false);
    }
  };
  const startConfirmedChangeFromReservation = (reservation: Reservation) => {
    setConfirmedChangeForm({
      reservationId: reservation.id,
      email: reservation.email ?? customerUser?.email ?? "",
      phone: reservation.phone,
    });
    setConfirmedChangeSubmitted(false);
    setPortalMode("confirmedChange");
  };
  const startReservationChangeFromReservation = (reservation: Reservation) => {
    setChangeRequestForm({
      reservationId: reservation.id,
      email: reservation.email ?? customerUser?.email ?? "",
      phone: reservation.phone,
      requestedDate: reservation.date,
      requestedStartTime: reservation.startTime ?? DEFAULT_START_TIME,
      requestedPeople: reservation.people,
      requestedMenuItems: reservation.menuItems ?? [],
      reason: "",
    });
    setChangeRequestSubmitted(false);
    setPortalMode("change");
  };
  const startCancellationFromReservation = (reservation: Reservation) => {
    setCancellationForm({
      reservationId: reservation.id,
      email: reservation.email ?? customerUser?.email ?? "",
      phone: reservation.phone,
    });
    setCancellationSubmitted(false);
    setPortalMode("cancellation");
  };
  const customerRequestableStatuses: readonly Status[] = [
    STATUS.temporaryRequested,
    STATUS.temporaryConfirmed,
    STATUS.confirmedRequested,
    STATUS.confirmed,
    STATUS.waitingForVisit,
  ];
  const canRequestConfirmedChangeFromReservation = (reservation: Reservation) =>
    reservation.status === STATUS.temporaryConfirmed;
  const canRequestChangeFromReservation = (reservation: Reservation) =>
    customerRequestableStatuses.includes(reservation.status);
  const canRequestCancellationFromReservation = (reservation: Reservation) =>
    customerRequestableStatuses.includes(reservation.status);
  const backToPortalHome = () => {
    setPortalMode("home");
    setStep(1);
    setCancellationSubmitted(false);
    setConfirmedChangeSubmitted(false);
    setChangeRequestSubmitted(false);
  };

  return (
    <GoogleCustomerAuthProvider user={customerUser} reauthenticate={reauthenticateCustomer} notify={notify} signOut={async () => { await signOutCustomer(); setAccountReservations([]); setCustomerAccount(null); setPortalMode("home"); }} onAuthenticated={(_user, mode, notification) => {
      setAccountPassword("");
      if (mode === "login") { setPortalMode("home"); setCustomerAccountLoading(true); }
      if (mode !== "reauth") setAccountReloadVersion(value => value + 1);
      if (mode === "login") notify("Googleでログインしました。");
      if (mode === "link") notify(notification === "failed" ? "Googleアカウントを連携しました。変更通知を送信できませんでした。" : "Googleアカウントを連携しました。");
    }}>
    <main className="min-h-screen bg-background">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
            R
          </span>
          <strong className="text-base">Reserve</strong>
        </div>
        <nav className="flex flex-wrap items-center gap-3">
          <Link href="/contact" className="text-sm text-primary">お問い合わせ</Link>
          {customerUser && <Link href="/contact/history" className="text-sm text-primary">問い合わせ履歴</Link>}
          <Button variant="outline" size="sm" onClick={onAdmin}>
            管理画面
          </Button>
        </nav>
      </header>
      <section className="bg-[#14213d] px-5 pb-16 pt-8 text-white sm:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-[10px] uppercase tracking-[0.22em] text-blue-200">
            Restaurant reservation
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            {portalMode === "login"
              ? "ログイン"
              : portalMode === "register"
                ? "新規登録"
                : portalMode === "home"
              ? "お手続き"
              : portalMode === "account"
                ? "予約確認"
                : portalMode === "cancellation"
                  ? "キャンセル申請"
                  : portalMode === "confirmedChange"
                    ? "本予約への変更申請"
                    : portalMode === "change"
                      ? "予約内容変更申請"
                      : "予約フォーム"}
          </h1>
        </div>
      </section>
      <section className="relative mx-auto -mt-9 mb-10 w-[calc(100%-2rem)] max-w-5xl rounded-lg border bg-card shadow-sm">
        {customerUser && !customerUser.emailVerified && (
          <CustomerEmailVerificationPanel
            email={customerUser.email ?? ""}
            isSubmitting={verificationSubmitting}
            onRefresh={confirmCustomerVerification}
            onResend={resendCustomerVerification}
            onLogout={() => signOutCustomer()}
          />
        )}
        {(!customerUser || customerUser.emailVerified) && (
          <>
            {(portalMode === "login" || portalMode === "register") && (
              <div className="p-4 sm:p-8">
                <CustomerAccountAccessPanel
                  standalone
                  authError={customerAuthError}
                  accountEmail={accountEmail}
                  accountPassword={accountPassword}
                  accountSubmitting={accountSubmitting}
                  customerAuthLoading={customerAuthLoading}
                  bookingMode={portalMode}
                  registrationForm={form}
                  onBookingModeChange={selectBookingMode}
                  onRegistrationFormChange={setForm}
                  onAccountEmailChange={setAccountEmail}
                  onAccountPasswordChange={setAccountPassword}
                  onLogin={loginForAccountReservations}
                  onSubmitAccount={submitAccount}
                  onResetPassword={sendCustomerPasswordReset}
                />
              </div>
            )}
            {portalMode === "home" && (
              <CustomerPortalHome
                customerEmail={customerUser?.email ?? ""}
                isLoggedIn={Boolean(customerUser)}
                authError={customerAuthError}
                accountEmail={accountEmail}
                accountPassword={accountPassword}
                accountSubmitting={accountSubmitting}
                customerAuthLoading={customerAuthLoading || customerAccountLoading}
                bookingMode={bookingMode}
                registrationForm={form}
                onBookingModeChange={selectBookingMode}
                onRegistrationFormChange={setForm}
                onAccountEmailChange={setAccountEmail}
                onAccountPasswordChange={setAccountPassword}
                onLogin={loginForAccountReservations}
                onSubmitAccount={submitAccount}
                onResetPassword={sendCustomerPasswordReset}
                onLogout={() => {
                  setAccountReservations([]);
                  setAccountChangeRequests([]);
                  setCustomerAccount(null);
                  signOutCustomer();
                }}
                onDeleteAccount={deleteCustomerAccount}
                emailChangeMessage={emailChangeMessage}
                onRequestEmailChange={beginEmailChange}
                contactVerificationStatus={contactVerificationStatus}
                customerAccount={customerAccount}
                accountLoadError={accountLoadError}
                onRetryAccount={() => setAccountReloadVersion(value => value + 1)}
                onUpdateAccount={updateCustomerAccount}
                contactEmails={contactEmails}
                onAddContactEmail={addContactEmail}
                onRemoveContactEmail={removeContactEmail}
                onOpenAccount={() => {
                  setPortalMode("account");
                  setAccountReservationError("");
                }}
                onOpenReservation={() => {
                  if (!isAccountProfileComplete(customerAccount)) { notify("お客様情報の登録を完了してください。"); return; }
                  if (customerAccount) setForm((current) => applyAccountToReservationForm(current, customerAccount));
                  setPortalMode("reservation");
                  setStep(1);
                }}
              />
            )}
            {portalMode === "account" && (
              <CustomerReservationDashboard
                customerIdentity={customerUser?.uid ?? ""}
                getCustomerToken={async () => { if (!customerUser) throw new Error("ログインしてください。"); return customerUser.getIdToken(); }}
                customerEmail={customerUser?.email ?? ""}
                isLoggedIn={Boolean(customerUser)}
                authError={customerAuthError}
                accountEmail={accountEmail}
                accountPassword={accountPassword}
                accountSubmitting={accountSubmitting}
                customerAuthLoading={customerAuthLoading}
                bookingMode={bookingMode}
                registrationForm={form}
                reservations={accountReservations}
                changeRequests={accountChangeRequests}
                isLoading={isLoadingAccountReservations}
                reservationError={accountReservationError}
                canRequestConfirmedChange={
                  canRequestConfirmedChangeFromReservation
                }
                canRequestChange={canRequestChangeFromReservation}
                canRequestCancellation={canRequestCancellationFromReservation}
                onBack={backToPortalHome}
                onBookingModeChange={selectBookingMode}
                onRegistrationFormChange={setForm}
                onAccountEmailChange={setAccountEmail}
                onAccountPasswordChange={setAccountPassword}
                onLogin={loginForAccountReservations}
                onSubmitAccount={submitAccount}
                onResetPassword={sendCustomerPasswordReset}
                onLogout={() => {
                  setAccountReservations([]);
                  setAccountChangeRequests([]);
                  setCustomerAccount(null);
                  signOutCustomer();
                }}
                onConfirmedChange={startConfirmedChangeFromReservation}
                onChange={startReservationChangeFromReservation}
                onCancellation={startCancellationFromReservation}
              />
            )}
            {portalMode === "reservation" && !customerUser && (
              <CustomerRequestLoginPanel
                authError={customerAuthError}
                accountEmail={accountEmail}
                accountPassword={accountPassword}
                accountSubmitting={accountSubmitting}
                customerAuthLoading={customerAuthLoading}
                bookingMode={bookingMode}
                registrationForm={form}
                onBack={backToPortalHome}
                onBookingModeChange={selectBookingMode}
                onRegistrationFormChange={setForm}
                onAccountEmailChange={setAccountEmail}
                onAccountPasswordChange={setAccountPassword}
                onLogin={loginForAccountReservations}
                onSubmitAccount={submitAccount}
                onResetPassword={sendCustomerPasswordReset}
              />
            )}
            {portalMode === "reservation" && customerUser && (
              <>
                <button
                  className="portal-back-button"
                  type="button"
                  onClick={backToPortalHome}
                >
                  手続き選択へ戻る
                </button>
                <div className="stepper">
                  {[
                    "利用者区分",
                    "予約種別",
                    "日時・人数",
                    "お客様情報",
                    "受付完了",
                  ].map((label, index) => (
                    <div
                      key={label}
                      className={step >= index + 1 ? "active" : ""}
                    >
                      <span>
                        {step > index + 1 ? <Icon name="check" /> : index + 1}
                      </span>
                      <small>{label}</small>
                      {index < 4 && <i />}
                    </div>
                  ))}
                </div>
                {step === 1 && (
                  <div className="form-body narrow reservation-type-step">
                    <p className="form-kicker">STEP 1</p>
                    <h2>利用者区分を選択</h2>
                    <fieldset className="reservation-type-options">
                      <legend>利用者区分</legend>
                      <button
                        type="button"
                        className={
                          (form.bookingType ?? "individual") === "individual"
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setForm({
                            ...form,
                            bookingType: "individual",
                            accountType: "individual",
                            tcCount: 0,
                            dgCount: 0,
                          })
                        }
                      >
                        <span className="radio-mark" aria-hidden="true" />
                        <span>
                          <strong>一般予約</strong>
                          <small>
                            学校・企業・各種団体・個人のお客様はこちら
                          </small>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={
                          form.bookingType === "travel_agency_group"
                            ? "selected"
                            : ""
                        }
                        onClick={() => {
                          setBookingMode("register");
                          setForm({
                            ...form,
                            bookingType: "travel_agency_group",
                            accountType: "travel_agency",
                            companyBranchName:
                              form.companyBranchName || form.name,
                            bookingContactName:
                              form.bookingContactName ||
                              form.contactPersonName ||
                              "",
                          });
                        }}
                      >
                        <span className="radio-mark" aria-hidden="true" />
                        <span>
                          <strong>旅行会社様専用 団体予約</strong>
                          <small>旅行会社・旅行代理店の方はこちら</small>
                        </span>
                      </button>
                    </fieldset>
                    <div className="form-nav">
                      <span />
                      <button className="next" onClick={() => setStep(2)}>
                        予約種別へ <Icon name="arrow" />
                      </button>
                    </div>
                  </div>
                )}
                {step === 2 && (
                  <div className="form-body narrow reservation-type-step">
                    <p className="form-kicker">STEP 2</p>
                    <h2>予約種別を選択</h2>
                    <fieldset className="reservation-type-options">
                      <legend>予約種別</legend>
                      <button
                        type="button"
                        className={
                          form.status === STATUS.confirmedRequested
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setForm({
                            ...form,
                            status: STATUS.confirmedRequested,
                          })
                        }
                      >
                        <span className="radio-mark" aria-hidden="true" />
                        <span>
                          <strong>本予約を申し込む</strong>
                          <small>正式な予約として申請します</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={
                          form.status === STATUS.temporaryRequested
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setForm({
                            ...form,
                            status: STATUS.temporaryRequested,
                          })
                        }
                      >
                        <span className="radio-mark" aria-hidden="true" />
                        <span>
                          <strong>仮予約として相談する</strong>
                          <small>日程を仮押さえして相談します</small>
                        </span>
                      </button>
                    </fieldset>
                    <div className="form-nav">
                      <button onClick={() => setStep(1)}>戻る</button>
                      <button className="next" onClick={() => setStep(3)}>
                        日時へ <Icon name="arrow" />
                      </button>
                    </div>
                  </div>
                )}
                {step === 3 && (
                  <div className="form-body narrow">
                    <p className="form-kicker">STEP 3</p>
                    <h2>日時と人数</h2>
                    {policyError && <p role="alert" className="text-sm text-destructive">{policyError}</p>}
                    {!policy && !policyError && <p role="status" className="text-sm text-muted-foreground">受付期限を確認しています…</p>}
                    {policy && <p className="text-sm text-muted-foreground">利用日の{policy.days}日前までに申請してください。{policy.minimumDate}以降を選択できます。</p>}
                    {form.date && policy && dateBlocked && <p role="alert" className="text-sm text-destructive">利用日は{policy.minimumDate}以降を指定してください。</p>}
                    <div className="form-fields reservation-date-fields">
                      <label>
                        利用日
                        <input
                          type="date"
                          min={policy?.minimumDate}
                          aria-invalid={Boolean(form.date && dateBlocked)}
                          value={form.date}
                          onChange={(event) =>
                            setForm({ ...form, date: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        開始時間
                        <input
                          type="time"
                          value={form.startTime}
                          onChange={(event) =>
                            setForm({ ...form, startTime: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        人数
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={form.people || ""}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              people: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <MenuPicker
                      menuCatalog={menuCatalog}
                      selected={form.menuItems}
                      onChange={(menuItems) => setForm({ ...form, menuItems })}
                    />
                    <div className="reservation-summary">
                      <strong>
                        終了予定{" "}
                        {bookingFormEndTime(form, menuCatalog) || "未入力"}
                      </strong>
                      <span>
                        {form.date && form.startTime && form.people
                          ? `${bookingFormDateTimeLabel({ ...form, endTime: bookingFormEndTime(form, menuCatalog) })}・${form.people}名`
                          : "日時・人数を入力してください"}
                      </span>
                    </div>
                    <div className="form-nav">
                      <button onClick={() => setStep(2)}>戻る</button>
                      <button
                        className="next"
                        disabled={dateBlocked || !form.date || !form.startTime || !form.people}
                        onClick={() => setStep(4)}
                      >
                        お客様情報へ <Icon name="arrow" />
                      </button>
                    </div>
                  </div>
                )}
                {step === 4 && (
                  <div className="form-body narrow">
                    <p className="form-kicker">STEP 4</p>
                    <h2>お客様情報</h2>
                    <section className="customer-account-panel">
                      {customerUser ? (
                        <div className="customer-account-current">
                          <span>
                            {customerAuthLoading ? "確認中" : "ログイン中"}
                          </span>
                          <strong>{customerUser.email}</strong>
                          <button
                            type="button"
                            onClick={() => signOutCustomer()}
                          >
                            ログアウト
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="customer-booking-mode-grid">
                            <button
                              type="button"
                              className={`customer-booking-mode-card ${bookingMode === "login" ? "selected" : ""}`}
                              onClick={() => selectBookingMode("login")}
                            >
                              <strong>ログイン</strong>
                              <small>登録済みのお客様情報を使います</small>
                            </button>
                            <button
                              type="button"
                              className={`customer-booking-mode-card ${bookingMode === "register" ? "selected" : ""}`}
                              onClick={() => selectBookingMode("register")}
                            >
                              <strong>アカウント登録</strong>
                              <small>次回から入力を省けます</small>
                            </button>
                          </div>
                          <div className="customer-account-form">
                            <input
                              type="email"
                              placeholder="メールアドレス"
                              value={accountEmail}
                              onChange={(event) =>
                                setAccountEmail(event.target.value)
                              }
                            />
                            <input
                              type="password"
                              placeholder="パスワード"
                              value={accountPassword}
                              onChange={(event) =>
                                setAccountPassword(event.target.value)
                              }
                            />
                            <button
                              type="button"
                              disabled={
                                !accountEmail ||
                                !accountPassword ||
                                accountSubmitting
                              }
                              onClick={() => submitAccount()}
                            >
                              {accountSubmitting
                                ? "確認中"
                                : bookingMode === "register"
                                  ? "登録"
                                  : "ログイン"}
                            </button>
                          </div>
                        </>
                      )}
                      {customerAuthError ? (
                        <div className="auth-error">{customerAuthError}</div>
                      ) : null}
                    </section>
                    <div className="form-fields single">
                      <label>
                        {isGroupBooking(form) ? "会社・支店名" : "お名前"}
                        <input
                          value={
                            isGroupBooking(form)
                              ? (form.companyBranchName ?? form.name)
                              : form.name
                          }
                          onChange={(event) =>
                            setForm({
                              ...form,
                              name: isGroupBooking(form)
                                ? event.target.value
                                : event.target.value,
                              companyBranchName: isGroupBooking(form)
                                ? event.target.value
                                : form.companyBranchName,
                            })
                          }
                        />
                      </label>
                      <label>
                        電話番号
                        <input
                          value={form.phone}
                          onChange={(event) =>
                            setForm({ ...form, phone: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        メールアドレス
                        <input
                          type="email"
                          value={form.email}
                          onChange={(event) => {
                            setForm({ ...form, email: event.target.value });
                            setAccountEmail(event.target.value);
                          }}
                        />
                      </label>
                      <label>
                        住所
                        <input
                          value={form.address}
                          onChange={(event) =>
                            setForm({ ...form, address: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    {isGroupBooking(form) && (
                      <GroupReservationContactFields
                        form={form}
                        setForm={setForm}
                      />
                    )}
                    {isGroupBooking(form) && (
                      <GroupReservationPeopleFields
                        form={form}
                        setForm={setForm}
                      />
                    )}
                    <PaymentAndRemarksFields form={form} setForm={setForm} />
                    {isGroupBooking(form) && (
                      <GroupReservationFields form={form} setForm={setForm} />
                    )}
                    <div className="confirm-box">
                      <span>
                        {bookingFormDateTimeLabel({
                          ...form,
                          endTime: bookingFormEndTime(form, menuCatalog),
                        })}
                        ・{form.people}名
                      </span>
                      <strong>
                        {isGroupBooking(form)
                          ? form.groupName || "団体名未入力"
                          : menuSelectionLabel(form.menuItems)}
                      </strong>
                      <small>
                        {statusLabel(form.status ?? STATUS.confirmedRequested)}
                        ・{"¥"}
                        {total.toLocaleString()}
                      </small>
                    </div>
                    {requiresConfirmedPolicy && <CancellationPolicyAgreement checked={confirmedPolicyReady} disabled={isSubmittingReservation} onChange={checked => setForm(current => ({ ...current, cancellationPolicyAgreement: checked ? { accepted: true, version: cancellationPolicyVersion } : undefined }))} />}
                    <div className="form-nav">
                      <button onClick={() => setStep(3)}>戻る</button>
                      <button
                        className="next"
                        disabled={!canSubmit || !confirmedPolicyReady || !customerUser}
                        onClick={submit}
                      >
                        {isSubmittingReservation ? "申請中…" : "この内容で申請する"} <Icon name="arrow" />
                      </button>
                    </div>
                  </div>
                )}
                {step === 5 && (
                  <div className="form-body complete">
                    <span>
                      <Icon name="check" />
                    </span>
                    <p className="form-kicker">REQUEST RECEIVED</p>
                    <h2>予約申請を受け付けました</h2>
                    {submittedReservation && <p className="font-semibold">予約ID：{submittedReservation.id}</p>}
                    <p>内容を確認後、予約可否をご連絡します。</p>
                    {submittedReservation?.receiptEmailStatus === "failed" && <Alert className="border-warning/40 text-warning"><p>予約申請は保存されていますが、受付メールを送信できませんでした。予約確認画面で申請状況をご確認ください。再申請は不要です。</p></Alert>}
                    <button className="next" onClick={backToPortalHome}>
                      トップに戻る
                    </button>
                  </div>
                )}
              </>
            )}
            {isCustomerRequestMode(portalMode) && !customerUser && (
              <CustomerRequestLoginPanel
                authError={customerAuthError}
                accountEmail={accountEmail}
                accountPassword={accountPassword}
                accountSubmitting={accountSubmitting}
                customerAuthLoading={customerAuthLoading}
                bookingMode={bookingMode}
                registrationForm={form}
                onBack={backToPortalHome}
                onBookingModeChange={selectBookingMode}
                onRegistrationFormChange={setForm}
                onAccountEmailChange={setAccountEmail}
                onAccountPasswordChange={setAccountPassword}
                onLogin={loginForAccountReservations}
                onSubmitAccount={submitAccount}
                onResetPassword={sendCustomerPasswordReset}
              />
            )}
            {isCustomerRequestMode(portalMode) && customerUser && (
              <CustomerRequestForms
                mode={portalMode}
                confirmedChangeForm={confirmedChangeForm}
                changeRequestForm={changeRequestForm}
                changeReservation={accountReservations.find(reservation => reservation.id === changeRequestForm.reservationId.trim().toUpperCase())}
                cancellationReservation={accountReservations.find((reservation) => reservation.id === cancellationForm.reservationId)}
                confirmedChangeSubmitted={confirmedChangeSubmitted}
                changeRequestSubmitted={changeRequestSubmitted}
                cancellationSubmitted={cancellationSubmitted}
                isSubmittingConfirmedChange={isSubmittingConfirmedChange}
                isSubmittingChangeRequest={isSubmittingChangeRequest}
                isSubmittingCancellation={isSubmittingCancellation}
                canSubmitConfirmedChange={canSubmitConfirmedChange}
                canSubmitChangeRequest={canSubmitChangeRequest}
                canSubmitCancellation={canSubmitCancellation}
                menuCatalog={menuCatalog}
                onBack={backToPortalHome}
                onConfirmedChangeFormChange={setConfirmedChangeForm}
                onChangeRequestFormChange={setChangeRequestForm}
                onSubmitConfirmedChange={submitConfirmedChange}
                onSubmitChangeRequest={submitChangeRequest}
                onSubmitCancellation={submitCancellation}
              />
            )}
          </>
        )}
      </section>
      <Toaster />
    </main>
    </GoogleCustomerAuthProvider>
  );
}

function isCustomerRequestMode(mode: CustomerPortalMode) {
  return (
    mode === "confirmedChange" || mode === "change" || mode === "cancellation"
  );
}

function CustomerRequestLoginPanel({
  authError,
  accountEmail,
  accountPassword,
  accountSubmitting,
  customerAuthLoading,
  bookingMode,
  registrationForm,
  onBack,
  onBookingModeChange,
  onRegistrationFormChange,
  onAccountEmailChange,
  onAccountPasswordChange,
  onLogin,
  onSubmitAccount,
  onResetPassword,
}: {
  authError: string;
  accountEmail: string;
  accountPassword: string;
  accountSubmitting: boolean;
  customerAuthLoading: boolean;
  bookingMode: "login" | "register";
  registrationForm: BookingForm;
  onBack: () => void;
  onBookingModeChange: (mode: "login" | "register") => void;
  onRegistrationFormChange: Dispatch<SetStateAction<BookingForm>>;
  onAccountEmailChange: (value: string) => void;
  onAccountPasswordChange: (value: string) => void;
  onLogin: (email?: string, password?: string) => void;
  onSubmitAccount: (email?: string, password?: string, profile?: RegisterAuthFields) => void;
  onResetPassword: (email: string) => void;
}) {
  return (
    <>
      <button className="portal-back-button" type="button" onClick={onBack}>
        手続き選択へ戻る
      </button>
      <div className="form-body narrow cancellation-form">
        <p className="form-kicker">LOGIN REQUIRED</p>
        <h2>ログインまたはアカウント登録</h2>
        <section className="customer-account-panel">
          <CustomerAccountAccessPanel
            authError={authError}
            accountEmail={accountEmail}
            accountPassword={accountPassword}
            accountSubmitting={accountSubmitting}
            customerAuthLoading={customerAuthLoading}
            bookingMode={bookingMode}
            registrationForm={registrationForm}
            onBookingModeChange={onBookingModeChange}
            onRegistrationFormChange={onRegistrationFormChange}
            onAccountEmailChange={onAccountEmailChange}
            onAccountPasswordChange={onAccountPasswordChange}
            onLogin={onLogin}
            onSubmitAccount={onSubmitAccount}
            onResetPassword={onResetPassword}
          />
        </section>
      </div>
    </>
  );
}
