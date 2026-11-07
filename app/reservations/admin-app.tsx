"use client";
import { ReplyTemplateManagement } from "@/components/inquiries/reply-template-management";
import { InquiryManagement } from "@/components/inquiries/inquiry-management";
import { InquiryReplyDraftStore } from "@/components/inquiries/reply-drafts";
import { ReservationInquiryHistoryButton } from "@/components/inquiries/reservation-inquiry-history";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ManagementPage as ManagementLayout, ResultCount } from "@/components/ui/management-layout";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListSearchField } from "@/components/ui/list-search-field";
import { ReservationDetailsDialog } from "@/components/ui/reservation-details-dialog";
import { Toaster } from "@/components/ui/sonner";
import type { AdminScreenData,AdminSummary } from "@/lib/admin-read-model";
import { type CancellationPolicyAgreementInput } from "@/lib/cancellation-policy-consent";
import {
  defaultPaymentCondition,
  duplicateAssignmentStores,
  getAutomaticReservationStatus,
  isConfirmedReservation,
  paymentConditionLabel,
  reservationAssignments
} from "@/lib/domain";
import { isReservationReminderTarget } from "@/lib/reservation-reminders";
import { activeReservationStatuses, type ReservationSearch } from "@/lib/reservation-search";
import { CalendarDays, LogOut, Mail, Menu as MenuIcon, X } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction
} from "react";
import { toast as sonnerToast } from "sonner";
import { ApiRequestError,requestJson } from "./api-client";
import { AdminAuthShell,AdminLogin } from "./components/auth";
import { Icon,InfoMetric,Task,TaskGrid } from "./components/common";
import { CustomerManagement } from "./components/customer-management";
import { EmailTemplateManagement } from "./components/email-template-management";
import { MenuManagement } from "./components/menu-management";
import { GoogleCalendarSettings } from "./components/google-calendar-settings";
import { OtherSettingsManagement } from "./components/other-settings-management";
import { PolicyConsentHistory } from "./components/policy-consent-history";
import { ReservationApprovalDialog } from "./components/reservation-approval-dialog";
import { ReservationCalendarPage } from "./components/reservation-calendar-page";
import { ReservationChangeReviewDialog } from "./components/reservation-change-review-dialog";
import { ReservationCsvExport } from "./components/reservation-csv-export";
import { ReservationNotificationManagement } from "./components/reservation-notification-management";
import { ReservationReminderPage } from "./components/reservation-reminder-page";
import { ReservationSearchToolbar } from "./components/reservation-worklist";
import { StoreAssignmentPage } from "./components/store-assignment-page";
import { StoreAssignmentOptions } from "./components/store-assignment-options";
import { StoreManagement } from "./components/store-management";
import {
  cancellationApprovalStatuses,
  DEFAULT_START_TIME,
  reservationApprovalStatuses,
  STATUS,
  statusClass,
  statusOptions
} from "./constants";
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
} from "./formatters";
import { useAdminSession } from "./hooks/use-admin-session";
import { useReservationPage } from "./hooks/use-reservation-page";
import { emptyReservationForm,GroupReservationContactFields,GroupReservationFields,GroupReservationPeopleFields,isConfirmedReservationChangeRequest,isGroupBooking,MenuPicker,PaymentAndRemarksFields,type CustomerPortalMode } from "./reservation-shared";
import { ReservationSubmission } from "./reservation-submission";
import type {
BookingForm,
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
View
} from "./types";
const CustomerPortal = dynamic(()=>import("./customer-portal"),{loading:()=> <p role="status" className="p-5">画面を読み込み中…</p>});


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
  const inquiryReplyDrafts = useMemo(() => new InquiryReplyDraftStore(adminSession?.user.uid), [adminSession?.user.uid]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [formStep, setFormStep] = useState(1);
  const [view, setView] = useState<View>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const adminContent = useRef<HTMLDivElement>(null);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [view]);
  useEffect(() => { if (new URL(window.location.href).searchParams.has("googleCalendar")) setView("googleCalendarSettings"); }, []);
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
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null);
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

  const detailsOpen = Boolean(selected);
  const masterCache = useRef(new Map<string, number>());
  useEffect(() => {
    const controller = new AbortController();
    const needs = isNewReservationOpen || detailsOpen || ["reservationCalendar","storeAssignments","stores","menus"].includes(view) || (role === "customer" && customerEntryMode === "reservation");
    if (!needs) { setMasterLoading(false); return; }
    setMasterLoading(true);
    const load = async <T,>(key: string, url: string, apply: (data: T) => void) => {
      if (masterCache.current.get(url) === dataReloadVersion) return;
      try { const result = await requestJson<T>(url,{signal:controller.signal}); if(controller.signal.aborted)return;apply(result); masterCache.current.set(url,dataReloadVersion);setDataErrors(current=>({...current,[key]:""})); }
      catch(error){if(!controller.signal.aborted)setDataErrors(current=>({...current,[key]:error instanceof Error?error.message:"取得できませんでした。"}));}
    };
    void Promise.all([
      load<{menus:Menu[]}>("メニュー","/api/menus",data=>setMenuCatalog(sortByDisplayOrderThenName(data.menus))),
      load<{stores:Store[]}>("店舗","/api/stores",data=>setStores(sortByDisplayOrderThenName(data.stores))),
    ]).finally(()=>{if(!controller.signal.aborted)setMasterLoading(false);});
    return()=>controller.abort();
  },[dataReloadVersion,view,isNewReservationOpen,detailsOpen,role,customerEntryMode]);
  useEffect(() => {
    const controller=new AbortController();
    if(!adminSession){setReservations([]);setAdminSummary(null);setAdminDataLoading(false);return;}
    setAdminDataLoading(true);
    void (async()=>{try{
      const result=await requestJson<AdminScreenData>(`/api/admin/screen?view=${view}&windowDays=${confirmationContactWindowDays}`,{authToken:await adminSession.user.getIdToken(),signal:controller.signal,cache:"no-store"});
      if(controller.signal.aborted)return;
      setAdminSummary(result.summary); if(view!=="reservationCalendar"&&view!=="reservations")setReservations(result.reservations);setReservationChangeRequests(result.requests);setDataErrors(current=>({...current,"予約":""}));
    }catch(error){if(!controller.signal.aborted)setDataErrors(current=>({...current,"予約":error instanceof Error?error.message:"取得できませんでした。"}));}
    finally{if(!controller.signal.aborted)setAdminDataLoading(false);}})();
    return()=>controller.abort();
  },[adminSession,dataReloadVersion,view,confirmationContactWindowDays]);
  useEffect(()=>{
    if(!adminSession)return;const controller=new AbortController();
    const load=async<T,>(url:string,apply:(v:T)=>void)=>{try{const result=await requestJson<T>(url,{authToken:await adminSession.user.getIdToken(),signal:controller.signal});if(!controller.signal.aborted)apply(result);}catch(e){if(!controller.signal.aborted)setDataErrors(v=>({...v,"マスタ":e instanceof Error?e.message:"取得できませんでした。"}));}};
    if(view==="customers"||isNewReservationOpen)void load<{customers:Customer[]}>("/api/customers",r=>setCustomerList(r.customers));
    if(view==="customers")void load<{customers:Customer[]}>("/api/customers/inactive",r=>setInactiveCustomerList(r.customers));
    if(view==="stores")void load<{stores:Store[]}>("/api/stores/inactive",r=>setInactiveStoreList(r.stores));
    if(view==="menus")void load<{menus:Menu[]}>("/api/menus/inactive",r=>setInactiveMenuList(r.menus));
    return()=>controller.abort();
  },[adminSession,view,isNewReservationOpen,dataReloadVersion]);
  const customers = customerList;
  const taskCounts = useMemo(
    () => adminSummary?.tasks ?? ({
      unansweredInquiries: 0,
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
    [adminSummary, confirmationContactWindowDays, reservationChangeRequests, reservations],
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
    if(adminSummary)return {today:adminSummary.today,month:adminSummary.month};
    const today = todayIso();
    const currentMonth = monthIso(today);
    return {
      today: reservations.filter((reservation) => reservation.date === today)
        .length,
      month: reservations.filter(
        (reservation) => monthIso(reservation.date) === currentMonth,
      ).length,
    };
  }, [adminSummary,reservations]);
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
  const adminRequestJson = async <T,>(url: string, init?: RequestInit) => {
    const result=await requestJson<T>(url, { ...init, authToken: await getAdminToken() });
    if(init?.method && init.method!=="GET")setDataReloadVersion(v=>v+1);
    return result;
  };
  const [detailLoading,setDetailLoading]=useState(false);
  const detailBusy=useRef(false);
  const openReservationDetails=async(reservation:Reservation)=>{if(detailBusy.current)return;detailBusy.current=true;setDetailLoading(true);try{const data=await adminRequestJson<{reservation:Reservation}>(`/api/reservations/${encodeURIComponent(reservation.id)}`);setSelected(data.reservation);}catch(e){notify(e instanceof Error?e.message:"予約を取得できませんでした。","error");}finally{detailBusy.current=false;setDetailLoading(false);}};
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
    } catch (error) {
      notify(error instanceof ApiRequestError ? error.message : "ステータス更新の保存に失敗しました。", "error");
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
    } catch (error) {
      notify(error instanceof ApiRequestError ? error.message : "店舗割当の保存に失敗しました。", "error");
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
      ? await adminRequestJson<{ reservation: Reservation; receiptEmail?: { status: "not_requested" | "pending" | "sent" | "failed" } }>(
          "/api/reservations",
          { method: "POST", body: JSON.stringify(input), headers: { "Idempotency-Key": requestKey } },
        )
      : await requestJson<{ reservation: Reservation; receiptEmail?: { status: "not_requested" | "pending" | "sent" | "failed" } }>("/api/reservations", {
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
      cancellationFeeContext?: string | null;
      expectedRevision?: number;
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
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "予約変更承認の保存に失敗しました。時間をおいて再度お試しください。";
      notify(message, "error");
      return message;
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
  const updateReservation = async (id: string, input: BookingForm, expectedRevision: number) => {
    const { reservation } = await adminRequestJson<{
      reservation: Reservation;
    }>(`/api/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        expectedRevision,
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
          { ...deleted, active: false, lifecycleStatus: "disabled", reactivationBlockedReason: undefined },
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
        onModeChange={setCustomerEntryMode}
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
    `relative flex min-h-11 shrink-0 lg:min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${active ? "bg-background/15 text-background" : "text-background/80 hover:bg-background/10 hover:text-background"}`;

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <aside className="z-10 flex w-full flex-col bg-foreground px-4 py-4 text-background lg:fixed lg:inset-y-0 lg:left-0 lg:w-68 lg:px-5 lg:py-7 lg:overflow-y-auto">
        <div className="mb-4 flex items-center justify-between gap-3 lg:mb-8">
        <div className="flex items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-lg font-bold">
            R
          </span>
          <div>
            <strong className="block text-base">Reserve</strong>
            <small className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Operations
            </small>
          </div>
        </div>
          <Button type="button" variant="ghost" ref={mobileMenuButton} aria-controls="admin-navigation" aria-expanded={mobileMenuOpen} className="min-h-11 shrink-0 text-inherit hover:bg-background/10 hover:text-background lg:hidden" onClick={() => setMobileMenuOpen(open => !open)}>{mobileMenuOpen ? <X className="size-4" /> : <MenuIcon className="size-4" />}メニュー</Button>

        </div>
        <nav id="admin-navigation" aria-label="管理メニュー" className={`${mobileMenuOpen ? "grid" : "hidden"} gap-1 pb-1 lg:flex lg:flex-col`} onKeyDown={event => { if (event.key === "Escape" && mobileMenuOpen) { setMobileMenuOpen(false); mobileMenuButton.current?.focus(); } }} onClick={event => { if ((event.target as HTMLElement).closest("button")) { setMobileMenuOpen(false); requestAnimationFrame(() => adminContent.current?.querySelector<HTMLElement>("h1")?.focus()); } }}>
          <button
            className={adminNavClass(view === "dashboard")} aria-current={(view === "dashboard") ? "page" : undefined}
            onClick={() => setView("dashboard")}
          >
            <Icon name="grid" />
            ダッシュボード
          </button>
          <button
            className={adminNavClass(view === "reservations")} aria-current={(view === "reservations") ? "page" : undefined}
            onClick={() => openReservations("すべて")}
          >
            <Icon name="calendar" />
            予約一覧
          </button>
          <button className={adminNavClass(view === "inquiries")} aria-current={(view === "inquiries") ? "page" : undefined} onClick={()=>setView("inquiries")}><Mail className="size-4" />問い合わせ管理{taskCounts.unansweredInquiries > 0 && <i aria-label={`未回答 ${taskCounts.unansweredInquiries}件`} className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs not-italic text-white">{taskCounts.unansweredInquiries}</i>}</button>
          <button className={adminNavClass(view === "reservationCalendar")} aria-current={(view === "reservationCalendar") ? "page" : undefined} onClick={()=>setView("reservationCalendar")}><Icon name="calendar" />予約カレンダー</button>
          <button
            className={adminNavClass(view === "reservationApprovals")} aria-current={(view === "reservationApprovals") ? "page" : undefined}
            onClick={() => setView("reservationApprovals")}
          >
            <Icon name="check" />
            予約承認
            {taskCounts.reservationApprovals > 0 && (
              <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs not-italic text-white">
                {taskCounts.reservationApprovals}
              </i>
            )}
          </button>
          <button
            className={adminNavClass(view === "confirmedReservationRequests")} aria-current={(view === "confirmedReservationRequests") ? "page" : undefined}
            onClick={() => setView("confirmedReservationRequests")}
          >
            <Icon name="check" />
            本予約変更承認
            {taskCounts.confirmedReservationRequests > 0 && (
              <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs not-italic text-white">
                {taskCounts.confirmedReservationRequests}
              </i>
            )}
          </button>
          <button
            className={adminNavClass(view === "reservationChangeRequests")} aria-current={(view === "reservationChangeRequests") ? "page" : undefined}
            onClick={() => setView("reservationChangeRequests")}
          >
            <Icon name="check" />
            予約変更承認
            {taskCounts.changeRequests > 0 && (
              <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs not-italic text-white">
                {taskCounts.changeRequests}
              </i>
            )}
          </button>
          <button
            className={adminNavClass(view === "cancellationApprovals")} aria-current={(view === "cancellationApprovals") ? "page" : undefined}
            onClick={() => setView("cancellationApprovals")}
          >
            <Icon name="check" />
            キャンセル承認
            {taskCounts.cancellationApprovals > 0 && (
              <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs not-italic text-white">
                {taskCounts.cancellationApprovals}
              </i>
            )}
          </button>
          <button
            className={adminNavClass(view === "confirmationContacts")} aria-current={(view === "confirmationContacts") ? "page" : undefined}
            onClick={() => setView("confirmationContacts")}
          >
            <Icon name="check" />
            確認連絡
            {taskCounts.preContactDue > 0 && (
              <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs not-italic text-white">
                {taskCounts.preContactDue}
              </i>
            )}
          </button>
          <button className={adminNavClass(view === "storeAssignments")} aria-current={(view === "storeAssignments") ? "page" : undefined} onClick={() => setView("storeAssignments")}><Icon name="store" />店舗割当{taskCounts.storeUnassigned > 0 && <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs not-italic text-white">{taskCounts.storeUnassigned}</i>}</button>
          <button className={adminNavClass(view === "bookingReminders")} aria-current={(view === "bookingReminders") ? "page" : undefined} onClick={() => setView("bookingReminders")}>
            <Icon name="bell" />本予約の催促
            {taskCounts.temporaryExpired > 0 && <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs not-italic text-white">{taskCounts.temporaryExpired}</i>}
          </button>
          <button className={adminNavClass(view === "menuReminders")} aria-current={(view === "menuReminders") ? "page" : undefined} onClick={() => setView("menuReminders")}>
            <Icon name="bell" />メニュー確定の催促
            {taskCounts.menuUnselected > 0 && <i className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs not-italic text-white">{taskCounts.menuUnselected}</i>}
          </button>
          <button
            className={adminNavClass(
              view === "masters" ||
                view === "customers" ||
                view === "stores" ||
                view === "menus" ||
                view === "otherSettings" || view === "googleCalendarSettings" || view === "emailTemplates" || view === "inquiryReplyTemplates" || view === "reservationNotifications",
            )} aria-current={(view === "masters" ||
                view === "customers" ||
                view === "stores" ||
                view === "menus" ||
                view === "otherSettings" || view === "googleCalendarSettings" || view === "emailTemplates" || view === "inquiryReplyTemplates" || view === "reservationNotifications") ? "page" : undefined}
            onClick={() => setView("masters")}
          >
            <Icon name="settings" />
            マスタ管理
          </button>
        <Button type="button" variant="ghost" className="min-h-11 shrink-0 text-inherit hover:bg-accent hover:text-accent-foreground lg:hidden" onClick={signOutAdmin}><LogOut className="size-4" />ログアウト</Button></nav>
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
              <small className="text-xs text-slate-400">
                システム管理者
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div ref={adminContent} className="relative min-w-0 flex-1 lg:ml-68">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card/95 px-5 backdrop-blur lg:px-8">
          <h1 tabIndex={-1} className="text-lg font-semibold">
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
                reservationNotifications: "予約通知メール",
                bookingReminders: "本予約の催促",
                menuReminders: "メニュー確定の催促",
                masters: "マスタ管理",
                customers: "顧客管理",
                stores: "店舗管理",
                otherSettings: "その他",
                googleCalendarSettings: "Googleカレンダー連携",
                menus: "メニュー管理",
                emailTemplates: "メールテンプレート管理",
                inquiryReplyTemplates: "問い合わせ回答テンプレート",
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
          {(masterLoading || adminDataLoading) && <div role="status" className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-0.5 bg-primary/15"><span className="sr-only">データを読み込んでいます…</span><span aria-hidden="true" className="block h-full w-1/3 bg-primary motion-safe:animate-pulse" /></div>}
        </header>
        {Object.values(dataErrors).some(Boolean) && <Alert className="m-4 border-destructive/40 text-destructive"><p>一部のデータを読み込めませんでした。表示内容が最新でない可能性があります。</p><ul className="mt-2 list-inside list-disc text-xs">{Object.entries(dataErrors).filter(([, message]) => Boolean(message)).map(([key, message]) => <li key={key}>{message}</li>)}</ul><Button type="button" className="mt-3" variant="outline" disabled={masterLoading || adminDataLoading} onClick={() => setDataReloadVersion(value => value + 1)}>再読み込み</Button></Alert>}
        {view === "dashboard" ? (
          <ManagementLayout className="grid gap-6">
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
                <p className="mt-1 text-xs text-muted-foreground">「要対応」の項目から対応を進めてください。</p>
              </div>
              <div className="grid gap-5">
                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                    承認系
                  </h4>
                  <TaskGrid>
                    <Task
                      title="予約の承認"
                      count={taskCounts.reservationApprovals}
                      loading={adminDataLoading}
                      error={Boolean(dataErrors["予約"])}
                      text="仮予約・本予約の申請を確認しましょう"
                      onClick={() => setView("reservationApprovals")}
                    />
                    <Task
                      title="本予約変更承認"
                      count={taskCounts.confirmedReservationRequests}
                      loading={adminDataLoading}
                      error={Boolean(dataErrors["予約"])}
                      text="仮予約から本予約への変更依頼を確認しましょう"
                      onClick={() => setView("confirmedReservationRequests")}
                    />
                    <Task
                      title="予約変更承認"
                      count={taskCounts.changeRequests}
                      loading={adminDataLoading}
                      error={Boolean(dataErrors["予約"])}
                      text="予約内容の変更依頼を確認しましょう"
                      onClick={() => setView("reservationChangeRequests")}
                    />
                    <Task
                      title="キャンセルの承認"
                      count={taskCounts.cancellationApprovals}
                      loading={adminDataLoading}
                      error={Boolean(dataErrors["予約"])}
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
                      title="確認連絡"
                      count={taskCounts.preContactDue}
                      loading={adminDataLoading}
                      error={Boolean(dataErrors["予約"])}
                      text={
                        "食事日まで" +
                        confirmationContactWindowDays +
                        "日未満のお客様へ確認連絡を行いましょう"
                      }
                      onClick={() => setView("confirmationContacts")}
                    />
                    <Task
                      title="店舗割当"
                      count={taskCounts.storeUnassigned}
                      loading={adminDataLoading}
                      error={Boolean(dataErrors["予約"])}
                      text="店舗割当を行いましょう"
                      onClick={() =>
                        setView("storeAssignments")
                      }
                    />
                    <Task
                      title="問い合わせ対応"
                      count={taskCounts.unansweredInquiries}
                      loading={adminDataLoading}
                      error={Boolean(dataErrors["予約"])}
                      text="未回答の問い合わせを確認しましょう"
                      onClick={() => setView("inquiries")}
                    />
                  </TaskGrid>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                    催促系
                  </h4>
                  <TaskGrid>
                    <Task
                      title="本予約の催促"
                      count={taskCounts.temporaryExpired}
                      loading={adminDataLoading}
                      error={Boolean(dataErrors["予約"])}
                      text="本予約への変更が必要な仮予約を確認しましょう"
                      onClick={() => setView("bookingReminders")}
                    />
                    <Task
                      title="メニュー確定の催促"
                      count={taskCounts.menuUnselected}
                      loading={adminDataLoading}
                      error={Boolean(dataErrors["予約"])}
                      text="メニューが未確定のお客様を確認しましょう"
                      onClick={() =>
                        setView("menuReminders")
                      }
                    />
                  </TaskGrid>
                </div>
              </div>
            </section>
          </ManagementLayout>
        ) : view === "inquiries" ? (
          <InquiryManagement draftStore={inquiryReplyDrafts} getAdminToken={getAdminToken} onChanged={() => setDataReloadVersion(value => value + 1)} onOpenReservation={number=>{const reservation=reservations.find(r=>r.id===number);void openReservationDetails(reservation??({id:number} as Reservation));}} />
        ) : view === "reservationCalendar" ? (
          <ReservationCalendarPage reservations={reservations} stores={stores} menus={menuCatalog} loading={masterLoading || adminDataLoading} error={Boolean(dataErrors["予約"] || dataErrors["店舗"] || dataErrors["メニュー"])} detailOpen={Boolean(selected)} getAdminToken={getAdminToken} onReload={async(signal,range)=>{
            const result=await requestJson<{reservations:Reservation[];settings:import("@/lib/domain").SystemSettings}>(`/api/admin/calendar?from=${range.from}&to=${range.to}`,{authToken:await getAdminToken(),cache:"no-store",signal});
            if(!signal.aborted){setReservations(result.reservations);setDataErrors(current=>({...current,"予約":""}));}
            return result.settings;
          }} onSelect={reservation=>void openReservationDetails(reservation)} />
        ) : view === "bookingReminders" || view === "menuReminders" ? (
          <ReservationReminderPage key={view} kind={view === "bookingReminders" ? "booking" : "menu"} reservations={reservations} loading={adminDataLoading} error={Boolean(dataErrors["予約"])} onSelect={reservation=>void openReservationDetails(reservation)} />
        ) : view === "storeAssignments" ? (
          <StoreAssignmentPage reservations={reservations} stores={stores} loading={masterLoading || adminDataLoading} error={Boolean(dataErrors["予約"] || dataErrors["店舗"])} onAssign={assignStores} />
        ) : (
          <ManagementPage
            loading={masterLoading || adminDataLoading}
            view={view}
            onSelectMasterView={setView}
            getAdminToken={getAdminToken}
            refreshVersion={dataReloadVersion}
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
            reservationDateFromFilter={reservationDateFromFilter}
            setReservationDateFromFilter={setReservationDateFromFilter}
            reservationDateToFilter={reservationDateToFilter}
            setReservationDateToFilter={setReservationDateToFilter}
            reservationSearch={reservationSearch}
            setReservationSearch={setReservationSearch}
            onSelect={reservation=>void openReservationDetails(reservation)}
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
      {detailLoading&&<p role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-border bg-background px-4 py-3 shadow-sm">予約の詳細を読み込み中…</p>}
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
  loading,
  refreshVersion,
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
  loading?: boolean;
  refreshVersion: number;
  view: Exclude<View, "dashboard">;
  onSelectMasterView: (
    view: "masters" | "customers" | "stores" | "menus" | "emailTemplates" | "inquiryReplyTemplates" | "otherSettings" | "googleCalendarSettings" | "reservationNotifications",
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
  onApproveChangeRequest: (id: string) => Promise<string | undefined>;
  onRejectChangeRequest: (id: string) => Promise<void>;
}) {
  const [reservationSort, setReservationSort] = useState<{
    key: ReservationSortKey;
    direction: SortDirection;
  }>({ key: "date", direction: "asc" });
  const [reservationStatusFilters, setReservationStatusFilters] = useState<
    Status[]
  >(() => [...activeReservationStatuses]);
  const reservationQuery = useMemo<ReservationSearch>(() => ({ search: reservationSearch, dateFrom: reservationDateFromFilter, dateTo: reservationDateToFilter, statuses: reservationStatusFilters, filter: reservationFilter, sortKey: reservationSort.key, direction: reservationSort.direction }), [reservationSearch, reservationDateFromFilter, reservationDateToFilter, reservationStatusFilters, reservationFilter, reservationSort]);
  const reservationPage=useReservationPage(view==="reservations",reservationQuery,getAdminToken,refreshVersion);
  const filteredReservations=reservationPage.data?.reservations??[];
  const sortedReservations=filteredReservations;
  const reservationTotal=reservationPage.data?.total??0;
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
    view === "customers" || view === "stores" || view === "menus" || view === "otherSettings" || view === "googleCalendarSettings" || view === "emailTemplates" || view === "inquiryReplyTemplates" || view === "reservationNotifications";
  return (
    <ManagementLayout className="management">
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
          loading={loading}
          reservations={pendingReservationApprovalReservations}
          onSelect={onSelect}
          updateStatus={updateStatus}
        />
      )}
      {view === "cancellationApprovals" && (
        <CancellationApprovalPage
          loading={loading}
          reservations={pendingCancellationApprovalReservations}
          onSelect={onSelect}
          updateStatus={updateStatus}
        />
      )}
      {view === "confirmedReservationRequests" && (
        <ConfirmedReservationRequestPage
          loading={loading}
          reservations={pendingConfirmedReservationRequests}
          onSelect={onSelect}
          updateStatus={updateStatus}
        />
      )}
      {view === "reservationChangeRequests" && (
        <ReservationChangeRequestPage
          loading={loading}
          getAdminToken={getAdminToken}
          requests={pendingChangeRequests}
          reservations={reservations}
          onApproveChangeRequest={onApproveChangeRequest}
          onRejectChangeRequest={onRejectChangeRequest}
        />
      )}
      {view === "reservationNotifications" && <ReservationNotificationManagement getAdminToken={getAdminToken} />}
      {view === "otherSettings" && <OtherSettingsManagement getAdminToken={getAdminToken} />}
      {view === "googleCalendarSettings" && <GoogleCalendarSettings getAdminToken={getAdminToken} />}
      {view === "masters" && (
        <MasterManagementPage onSelectMasterView={onSelectMasterView} />
      )}
      {view === "reservations" && (
        <section className="panel management-panel reservation-list-panel">
          <div className="management-tools reservation-tools">
            <div className="reservation-search-row min-w-0 w-full !flex !flex-wrap [&>label]:!w-full sm:[&>label]:!w-80 [&>.reservation-date-range]:!w-full sm:[&>.reservation-date-range]:!w-[360px] [&>details]:w-full sm:[&>details]:w-[230px] [&>.result-count]:!ml-auto">
              <ListSearchField
                aria-label="予約ID・顧客名で検索"
                placeholder="予約ID・顧客名で検索"
                value={reservationSearch}
                onChange={(event) => setReservationSearch(event.target.value)}
              />
              <div className="reservation-date-range">
                <span>利用日</span>
                <input
                  type="date"
                  aria-label="利用日（開始）"
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
                  aria-label="利用日（終了）"
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
                          [...activeReservationStatuses],
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
                    : "clear-filter is-placeholder !hidden"
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
              <ResultCount count={reservationTotal} loading={reservationPage.loading} error={!!reservationPage.error} />
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
          <div className="border-b border-border px-4 py-3 sm:px-5"><ReservationCsvExport query={reservationQuery} count={reservationTotal} getAdminToken={getAdminToken} /></div>
          {reservationPage.error&&<Alert role="alert" className="m-4 text-destructive">{reservationPage.error}<Button variant="outline" onClick={reservationPage.reload}>再読み込み</Button></Alert>}
          <div className="table-wrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" role="region" aria-label="予約一覧。横にスクロールできます" tabIndex={0}>
            <table className="large-table min-w-[900px] [&_tr>th:first-child]:sticky [&_tr>th:first-child]:left-0 [&_tr>th:first-child]:z-20 [&_tr>th:first-child]:bg-muted [&_tr>td:first-child]:sticky [&_tr>td:first-child]:left-0 [&_tr>td:first-child]:z-10 [&_tr>td:first-child]:bg-card">
              <thead>
                <tr>
                  <th scope="col" aria-sort={reservationSort.key === "id" ? reservationSort.direction === "asc" ? "ascending" : "descending" : "none"}>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("id")}
                    >
                      予約ID / 受付日時<span>{sortLabel("id")}</span>
                    </button>
                  </th>
                  <th>予約区分</th>
                  <th scope="col" aria-sort={reservationSort.key === "status" ? reservationSort.direction === "asc" ? "ascending" : "descending" : "none"}>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("status")}
                    >
                      ステータス<span>{sortLabel("status")}</span>
                    </button>
                  </th>
                  <th scope="col" aria-sort={reservationSort.key === "customer" ? reservationSort.direction === "asc" ? "ascending" : "descending" : "none"}>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("customer")}
                    >
                      お客様<span>{sortLabel("customer")}</span>
                    </button>
                  </th>
                  <th scope="col" aria-sort={reservationSort.key === "date" ? reservationSort.direction === "asc" ? "ascending" : "descending" : "none"}>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("date")}
                    >
                      利用日時・人数<span>{sortLabel("date")}</span>
                    </button>
                  </th>
                  <th scope="col" aria-sort={reservationSort.key === "menu" ? reservationSort.direction === "asc" ? "ascending" : "descending" : "none"}>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("menu")}
                    >
                      メニュー<span>{sortLabel("menu")}</span>
                    </button>
                  </th>
                  <th scope="col" aria-sort={reservationSort.key === "store" ? reservationSort.direction === "asc" ? "ascending" : "descending" : "none"}>
                    <button
                      className="sort-header"
                      onClick={() => toggleReservationSort("store")}
                    >
                      担当店舗<span>{sortLabel("store")}</span>
                    </button>
                  </th>
                  <th scope="col" aria-sort={reservationSort.key === "contact" ? reservationSort.direction === "asc" ? "ascending" : "descending" : "none"}>
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
                  <tr key={r.id} className="cursor-pointer" onClick={() => { if (!window.getSelection()?.toString()) onSelect(r); }}>
                    <td>
                      <button type="button" className="min-h-8 rounded-sm text-left text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${r.id}の予約詳細を開く`} onClick={event=>{event.stopPropagation();onSelect(r);}}>{r.id}</button>
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
            {!reservationPage.loading && !reservationPage.error && !filteredReservations.length && (
              <div className="empty-table">
                選択した条件の予約はありません。
              </div>
            )}
          </div>
          <ListPagination page={reservationPage.page} pageSize={50} total={reservationTotal} loading={reservationPage.loading} error={!!reservationPage.error} onPageChange={reservationPage.setPage} />
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
      {view === "inquiryReplyTemplates" && <ReplyTemplateManagement getAdminToken={getAdminToken} />}
      {view === "emailTemplates" && (
        <EmailTemplateManagement getAdminToken={getAdminToken} notify={notify} />
      )}
    </ManagementLayout>
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
        <ResultCount count={reservations.length} />
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
                <tr key={reservation.id} className="cursor-pointer" onClick={() => { if (!window.getSelection()?.toString()) onSelect(reservation); }}>
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
  loading,
  getAdminToken,
  requests,
  reservations,
  onApproveChangeRequest,
  onRejectChangeRequest,
}: {
  loading?: boolean;
  getAdminToken: () => Promise<string>;
  requests: ReservationChangeRequest[];
  reservations: Reservation[];
  onApproveChangeRequest: (id: string) => Promise<string | undefined>;
  onRejectChangeRequest: (id: string) => Promise<void>;
}) {
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const approve = async (id: string) => {
    if (busyRef.current) return; busyRef.current = true; setBusyId(id); setActionError("");
    try { setActionError((await onApproveChangeRequest(id)) ?? ""); } finally { busyRef.current = false; setBusyId(null); }
  };
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detail,setDetail]=useState<Reservation>();
  const [detailLoading,setDetailLoading]=useState(false);
  const detailBusy=useRef(false);
  const openChange=async(request:ReservationChangeRequest)=>{if(detailBusy.current)return;detailBusy.current=true;setDetailLoading(true);setActionError("");try{const result=await requestJson<{reservation:Reservation}>(`/api/reservations/${encodeURIComponent(request.reservationId)}`,{authToken:await getAdminToken()});setDetail(result.reservation);setSelectedRequestId(request.id);}catch(e){setActionError(e instanceof Error?e.message:"予約の詳細を取得できませんでした。");}finally{detailBusy.current=false;setDetailLoading(false);}};
  const selectedRequest = requests.find((request) => request.id === selectedRequestId);
  const [search, setSearch] = useState("");
  const keyword = search.trim().toLocaleLowerCase();
  const filteredRows = requests.filter(row => [row.reservationId, row.customer].some(value => value.toLocaleLowerCase().includes(keyword)));
  return (
    <section className="panel management-panel change-request-screen">
      <ReservationSearchToolbar count={filteredRows.length} loading={loading} search={search} onSearch={setSearch} />
      {detailLoading&&<p role="status" className="px-5 py-3">予約の詳細を読み込み中…</p>}
      {actionError && <p role="alert" className="border-b border-destructive/30 px-5 py-4 text-sm text-destructive">{actionError}</p>}
      {loading ? <p role="status" className="p-5 text-sm text-muted-foreground">予約を読み込み中…</p> : filteredRows.length > 0 ? (
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
                    onClick={() => void openChange(request)}
                  >
                    <td>
                      <button type="button" className="font-semibold text-primary underline-offset-4 hover:underline" onClick={(event) => { event.stopPropagation(); void openChange(request); }} aria-label={`${request.reservationId}の変更内容を確認`}>{request.reservationId}</button>
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
                          disabled={!!busyId}
                          onClick={(event) => {
                            event.stopPropagation();
                            void approve(request.id);
                          }}
                        >
                          {busyId === request.id ? "処理中…" : "承認"}
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
        <ReservationChangeReviewDialog
          request={selectedRequest}
          reservation={detail}
          onClose={() => setSelectedRequestId(null)}
        />
      )}
    </section>
  );
}



function MasterManagementPage({
  onSelectMasterView,
}: {
  onSelectMasterView: (view: "customers" | "stores" | "menus" | "emailTemplates" | "inquiryReplyTemplates" | "otherSettings" | "googleCalendarSettings" | "reservationNotifications") => void;
}) {
  return (
    <section aria-label="マスタ管理">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button className="flex min-h-20 min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span]:min-w-0 [&>span]:flex-1 [&>span]:break-words" type="button" onClick={() => onSelectMasterView("otherSettings")}><Icon name="settings" /><span><strong>その他</strong></span><Icon name="arrow" /></button>
        <button className="flex min-h-20 min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span]:min-w-0 [&>span]:flex-1 [&>span]:break-words" type="button" onClick={() => onSelectMasterView("customers")}>
          <Icon name="users" />
          <span>
            <strong>顧客管理</strong>
          </span>
          <Icon name="arrow" />
        </button>
        <button className="flex min-h-20 min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span]:min-w-0 [&>span]:flex-1 [&>span]:break-words" type="button" onClick={() => onSelectMasterView("stores")}>
          <Icon name="store" />
          <span>
            <strong>店舗管理</strong>
          </span>
          <Icon name="arrow" />
        </button>
        <button className="flex min-h-20 min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span]:min-w-0 [&>span]:flex-1 [&>span]:break-words" type="button" onClick={() => onSelectMasterView("menus")}>
          <Icon name="menu" />
          <span>
            <strong>メニュー管理</strong>
          </span>
          <Icon name="arrow" />
        </button>
        <button className="flex min-h-20 min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span]:min-w-0 [&>span]:flex-1 [&>span]:break-words" type="button" onClick={() => onSelectMasterView("emailTemplates")}>
          <Mail />
          <span><strong>メールテンプレート管理</strong></span>
          <Icon name="arrow" />
        </button>
        <button className="flex min-h-20 min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span]:min-w-0 [&>span]:flex-1 [&>span]:break-words" type="button" onClick={() => onSelectMasterView("inquiryReplyTemplates")}><Mail /><span><strong>問い合わせ回答テンプレート</strong></span><Icon name="arrow" /></button>
        <button className="flex min-h-20 min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span]:min-w-0 [&>span]:flex-1 [&>span]:break-words" type="button" onClick={() => onSelectMasterView("reservationNotifications")}><Mail /><span><strong>予約通知メール</strong></span><Icon name="arrow" /></button>
        <button className="flex min-h-20 min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span]:min-w-0 [&>span]:flex-1 [&>span]:break-words" type="button" onClick={() => onSelectMasterView("googleCalendarSettings")}><CalendarDays /><span><strong>Googleカレンダー連携</strong></span><Icon name="arrow" /></button>
      </div>
    </section>
  );
}


function ConfirmedReservationRequestPage({
  loading,
  reservations,
  onSelect,
}: {
  loading?: boolean;
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
      <ReservationSearchToolbar count={filteredRows.length} loading={loading} search={search} onSearch={setSearch} />
      {loading ? <p role="status" className="p-5 text-sm text-muted-foreground">予約を読み込み中…</p> : filteredRows.length > 0 ? (
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
                <tr key={reservation.id} className="cursor-pointer" onClick={() => { if (!window.getSelection()?.toString()) onSelect(reservation); }}>
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
  loading,
  reservations,
  onSelect,
}: {
  loading?: boolean;
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
      <ReservationSearchToolbar count={filteredRows.length} loading={loading} search={search} onSearch={setSearch} />
      {loading ? <p role="status" className="p-5 text-sm text-muted-foreground">予約を読み込み中…</p> : filteredRows.length > 0 ? (
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
  loading,
  reservations,
  onSelect,
  updateStatus,
}: {
  loading?: boolean;
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
      <ReservationSearchToolbar count={filteredRows.length} loading={loading} search={search} onSearch={setSearch} />
      {loading ? <p role="status" className="p-5 text-sm text-muted-foreground">予約を読み込み中…</p> : filteredRows.length > 0 ? (
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
                <tr key={reservation.id} className="cursor-pointer" onClick={() => { if (!window.getSelection()?.toString()) onSelect(reservation); }}>
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
  updateReservation: (id: string, form: BookingForm, expectedRevision: number) => Promise<Reservation>;
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
  const editFormFactory = useRef(initialEditForm);
  editFormFactory.current = initialEditForm;
  const [isEditingReservation, setIsEditingReservation] = useState(false);
  const [editForm, setEditForm] = useState<BookingForm>(initialEditForm);
  const [isSavingReservation, setIsSavingReservation] = useState(false);
  const [editBaseRevision, setEditBaseRevision] = useState(r.revision ?? 0);
  const [editError, setEditError] = useState("");
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
    // Reset on reservation identity/status changes; a refreshed catalog must not discard a draft.
    setEditForm(editFormFactory.current());
    setEditError("");
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
    setEditError("");
    try {
      await updateReservation(r.id, editForm, editBaseRevision);
      setIsEditingReservation(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "保存できませんでした。入力内容を確認し、再度お試しください。");
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
              {editError && <p role="alert" className="text-sm text-destructive">{editError}</p>}
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
                  onClick={() => { setEditForm(initialEditForm()); setEditBaseRevision(r.revision ?? 0); setEditError(""); setIsEditingReservation(true); }}
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
                      <StoreAssignmentOptions stores={stores} assignments={assignmentDraft} index={index} />
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
