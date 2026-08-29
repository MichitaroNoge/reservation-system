"use client";

import { Fragment, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  getAutomaticReservationStatus,
  getPendingVisitReadinessActions,
  isConfirmedReservation,
  isVisitReadyReservation,
  defaultPaymentCondition,
  paymentConditionLabel,
  paymentConditions,
  reservationAssignments,
} from "@/lib/domain";
import { requestJson } from "./reservations/api-client";
import { AdminAuthShell, AdminLogin } from "./reservations/components/auth";
import { Icon, InfoMetric, Stat, Task } from "./reservations/components/common";
import { CustomerManagement } from "./reservations/components/customer-management";
import { MenuManagement } from "./reservations/components/menu-management";
import { StoreManagement } from "./reservations/components/store-management";
import { DEFAULT_START_TIME, STATUS, VISIT_MENU_NAME, approvalStatuses, cancellationApprovalStatuses, defaultMenus, defaultStores, initialReservations, reservationApprovalStatuses, statusClass, statusOptions } from "./reservations/constants";
import { assignmentLabel, bookingFormDateTimeLabel, bookingFormEndTime, buildCustomers, dateHeadingLabel, daysUntilVisit, fullDateHeadingLabel, isConfirmationContactDue, isTemporaryReservationExpired, menuSelectionLabel, monthIso, policyAgreementLabel, reservationCustomerSubLabel, reservationDateTimeLabel, reservationDisplayLabel, reservationMenuLabel, reservationStartTime, selectedMenuTotal, statusLabel, todayIso } from "./reservations/formatters";
import { useAdminSession } from "./reservations/hooks/use-admin-session";
import { customerAuthErrorCode, useCustomerSession } from "./reservations/hooks/use-customer-session";
import type { BookingForm, Customer, CustomerForm, Menu, MenuForm, Reservation, ReservationChangeRequest, ReservationFilter, ReservationSortKey, ReservationSubmitOptions, SortDirection, Status, Store, StoreAssignment, StoreForm, View } from "./reservations/types";

const sortByDisplayOrderThenName = <T extends { displayOrder?: number; name: string }>(items: T[]) =>
  [...items].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name, "ja-JP", { numeric: true }));

const isConfirmedReservationChangeRequest = (reservation: Reservation) =>
  reservation.status === STATUS.confirmedRequested && reservation.requestType === "confirmed_from_temporary";

const customerPortalModeFromSearch = (value: string | null): CustomerPortalMode | null => {
  if (value === "home" || value === "account" || value === "reservation" || value === "confirmedChange" || value === "change" || value === "cancellation") return value;
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

const paymentConditionOptions = paymentConditions.map((value) => ({ value, label: paymentConditionLabel(value) }));

const isGroupBooking = (form: Pick<BookingForm, "bookingType">) => form.bookingType === "travel_agency_group";

export default function Home() {
  const [role, setRole] = useState<"admin" | "customer">("admin");
  const { adminSession, authError, authLoading, getAdminToken, loginAdmin, signOutAdmin } = useAdminSession({ enabled: role === "admin" });
  const [reservations, setReservations] = useState(initialReservations);
  const [filter, setFilter] = useState("すべて");
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [toast, setToast] = useState("");
  const [formStep, setFormStep] = useState(1);
  const [view, setView] = useState<View>("dashboard");
  const [reservationFilter, setReservationFilter] = useState<ReservationFilter>("すべて");
  const [reservationDateFromFilter, setReservationDateFromFilter] = useState("");
  const [reservationDateToFilter, setReservationDateToFilter] = useState("");
  const [reservationSearch, setReservationSearch] = useState("");
  const [menuCatalog, setMenuCatalog] = useState<Menu[]>(defaultMenus);
  const [inactiveMenuList, setInactiveMenuList] = useState<Menu[]>([]);
  const [stores, setStores] = useState<Store[]>(defaultStores);
  const [inactiveStoreList, setInactiveStoreList] = useState<Store[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [inactiveCustomerList, setInactiveCustomerList] = useState<Customer[]>([]);
  const [reservationChangeRequests, setReservationChangeRequests] = useState<ReservationChangeRequest[]>([]);
  const [form, setForm] = useState<BookingForm>({ menuItems: [], date: "2026-07-12", startTime: DEFAULT_START_TIME, people: 2, name: "", email: "", phone: "", address: "", accountType: "individual", bookingType: "individual", tcCount: 0, dgCount: 0, paymentCondition: defaultPaymentCondition, remarks: "", status: STATUS.confirmedRequested });
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [isBulkContacting, setIsBulkContacting] = useState(false);
  const [confirmationContactWindowDays, setConfirmationContactWindowDays] = useState(7);
  const [adminForm, setAdminForm] = useState<BookingForm>({ menuItems: [], date: "2026-07-12", startTime: DEFAULT_START_TIME, people: 2, name: "", email: "", phone: "", address: "", accountType: "individual", bookingType: "individual", tcCount: 0, dgCount: 0, paymentCondition: defaultPaymentCondition, remarks: "", status: STATUS.confirmed });
  const [customerEntryMode, setCustomerEntryMode] = useState<CustomerPortalMode>("home");

  useEffect(() => {
    const directMode = customerPortalModeFromSearch(new URLSearchParams(window.location.search).get("customerMode"));
    if (!directMode) return;
    setRole("customer");
    setCustomerEntryMode(directMode);
    if (directMode === "reservation") setFormStep(1);
  }, []);

  useEffect(() => {
    requestJson<{ menus: Menu[] }>("/api/menus")
      .then(({ menus }) => setMenuCatalog(sortByDisplayOrderThenName(menus)))
      .catch(() => notify("メニューデータの読み込みに失敗しました"));
    requestJson<{ stores: Store[] }>("/api/stores")
      .then(({ stores }) => setStores(sortByDisplayOrderThenName(stores)))
      .catch(() => notify("店舗データの読み込みに失敗しました"));
  }, []);

  useEffect(() => {
    if (!adminSession) return;
    adminRequestJson<{ reservations: Reservation[] }>("/api/reservations")
      .then(({ reservations }) => setReservations(reservations))
      .catch(() => notify("予約データの読み込みに失敗しました"));
    adminRequestJson<{ requests: ReservationChangeRequest[] }>("/api/reservations/change-requests")
      .then(({ requests }) => setReservationChangeRequests(requests))
      .catch(() => notify("予約変更承認の読み込みに失敗しました"));
    adminRequestJson<{ customers: Customer[] }>("/api/customers")
      .then(({ customers }) => setCustomerList(customers))
      .catch(() => notify("顧客データの読み込みに失敗しました"));
    adminRequestJson<{ customers: Customer[] }>("/api/customers/inactive")
      .then(({ customers }) => setInactiveCustomerList(customers))
      .catch(() => notify("削除済み顧客データの読み込みに失敗しました"));
    adminRequestJson<{ stores: Store[] }>("/api/stores/inactive")
      .then(({ stores }) => setInactiveStoreList(sortByDisplayOrderThenName(stores)))
      .catch(() => notify("削除済み店舗データの読み込みに失敗しました"));
    adminRequestJson<{ menus: Menu[] }>("/api/menus/inactive")
      .then(({ menus }) => setInactiveMenuList(sortByDisplayOrderThenName(menus)))
      .catch(() => notify("削除済みメニューデータの読み込みに失敗しました"));
  }, [adminSession]);

  const visible = useMemo(() => filter === "すべて" ? reservations : reservations.filter(r => r.status.includes(filter)), [filter, reservations]);
  const reservationCustomers = useMemo(() => buildCustomers(reservations), [reservations]);
  const customers = customerList.length ? customerList : reservationCustomers;
  const taskCounts = useMemo(() => ({
    reservationApprovals: reservations.filter(reservation => reservationApprovalStatuses.includes(reservation.status) && !isConfirmedReservationChangeRequest(reservation)).length,
    cancellationApprovals: reservations.filter(reservation => cancellationApprovalStatuses.includes(reservation.status)).length,
    confirmedReservationRequests: reservations.filter(isConfirmedReservationChangeRequest).length,
    temporaryExpired: reservations.filter(isTemporaryReservationExpired).length,
    storeUnassigned: reservations.filter(reservation => isConfirmedReservation(reservation) && !reservationAssignments(reservation).length).length,
    menuUnselected: reservations.filter(reservation => isConfirmedReservation(reservation) && !(reservation.menuItems?.length)).length,
    preContact: reservations.filter(reservation => isConfirmedReservation(reservation) && !reservation.confirmationContactedAt).length,
    preContactDue: reservations.filter(reservation => isConfirmationContactDue(reservation, confirmationContactWindowDays)).length,
    changeRequests: reservationChangeRequests.filter(request => request.status === "requested").length,
  }), [confirmationContactWindowDays, reservationChangeRequests, reservations]);
  const confirmationContactTargets = useMemo(() => reservations
    .filter(reservation => isConfirmationContactDue(reservation, confirmationContactWindowDays))
    .sort((a, b) => `${a.date}T${reservationStartTime(a)}`.localeCompare(`${b.date}T${reservationStartTime(b)}`, "ja-JP", { numeric: true })),
  [confirmationContactWindowDays, reservations]);
  const dashboardCounts = useMemo(() => {
    const today = todayIso();
    const currentMonth = monthIso(today);
    return {
      today: reservations.filter(reservation => reservation.date === today).length,
      month: reservations.filter(reservation => monthIso(reservation.date) === currentMonth).length,
    };
  }, [reservations]);
  const todayReservations = useMemo(() => {
    const today = todayIso();
    return reservations
      .filter(reservation => reservation.date === today)
      .slice()
      .sort((a, b) => reservationStartTime(a).localeCompare(reservationStartTime(b)));
  }, [reservations]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2500); };
  const adminRequestJson = async <T,>(url: string, init?: RequestInit) => requestJson<T>(url, { ...init, authToken: await getAdminToken() });
  const applyAutomaticStatus = async (reservation: Reservation) => {
    const nextStatus = getAutomaticReservationStatus(reservation);
    if (nextStatus === reservation.status) {
      setReservations(rs => rs.map(r => r.id === reservation.id ? reservation : r));
      setSelected(s => s?.id === reservation.id ? reservation : s);
      return reservation;
    }
    const { reservation: transitioned } = await adminRequestJson<{ reservation: Reservation }>(`/api/reservations/${reservation.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    setReservations(rs => rs.map(r => r.id === reservation.id ? transitioned : r));
    setSelected(s => s?.id === reservation.id ? transitioned : s);
    return transitioned;
  };
  const updateStatus = async (id: string, status: Status, options?: { manualReason?: string }) => {
    setReservations(rs => rs.map(r => r.id === id ? { ...r, status } : r));
    setSelected(s => s?.id === id ? { ...s, status } : s);
    try {
      const { reservation } = await adminRequestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, manualReason: options?.manualReason }) });
      setReservations(rs => rs.map(r => r.id === id ? reservation : r));
      setSelected(s => s?.id === id ? reservation : s);
      notify(`予約を「${statusLabel(status)}」へ更新しました`);
    } catch {
      notify("ステータス更新の保存に失敗しました");
    }
  };
  const assignStores = async (id: string, assignments: StoreAssignment[]) => {
    const store = assignments.length === 1 ? assignments[0].store : assignments.length > 1 ? "複数店舗" : null;
    setReservations(rs => rs.map(r => r.id === id ? { ...r, store, storeAssignments: assignments } : r));
    setSelected(s => s?.id === id ? { ...s, store, storeAssignments: assignments } : s);
    try {
      const { reservation } = await adminRequestJson<{ reservation: Reservation }>(`/api/reservations/${id}/store`, { method: "PATCH", body: JSON.stringify({ assignments }) });
      const transitioned = await applyAutomaticStatus(reservation);
      if (reservation.status === STATUS.confirmed && transitioned.status === STATUS.waitingForVisit) {
        notify("メニュー・店舗割当・確認連絡が完了したため、来店待ちに更新しました");
        return;
      }
      if (reservation.status === STATUS.waitingForVisit && transitioned.status === STATUS.confirmed) {
        notify("店舗割当を未割当に戻したため、本予約確定に戻しました");
        return;
      }
      notify(reservation.status === STATUS.confirmed ? "店舗割当を保存しました。メニュー選択と確認連絡後に来店待ちへ進みます" : "店舗割当を保存しました");
    } catch {
      notify("店舗割当の保存に失敗しました");
    }
  };
  const createReservation = async (input: BookingForm, options?: ReservationSubmitOptions) => {
    const publicStatuses: readonly Status[] = [STATUS.temporaryRequested, STATUS.confirmedRequested];
    const needsAdmin = options?.forceAdmin || Boolean(input.status && !publicStatuses.includes(input.status));
    const { reservation } = needsAdmin
      ? await adminRequestJson<{ reservation: Reservation }>("/api/reservations", { method: "POST", body: JSON.stringify(input) })
      : await requestJson<{ reservation: Reservation }>("/api/reservations", { method: "POST", body: JSON.stringify({ ...input, customerAccountMode: options?.customerAccountMode }), authToken: options?.authToken });
    setReservations(rs => [reservation, ...rs.filter(r => r.id !== reservation.id)]);
    return reservation;
  };
  const requestCancellation = async (input: { reservationId: string; email?: string; phone?: string }, options?: { authToken?: string }) => {
    const { reservation } = await requestJson<{ reservation: Reservation }>("/api/reservations/cancellation-request", { method: "POST", body: JSON.stringify(input), authToken: options?.authToken });
    setReservations(rs => rs.map(r => r.id === reservation.id ? reservation : r));
    setSelected(s => s?.id === reservation.id ? reservation : s);
    return reservation;
  };
  const requestConfirmedReservationChange = async (input: { reservationId: string; email?: string; phone?: string }, options?: { authToken?: string }) => {
    const { reservation } = await requestJson<{ reservation: Reservation }>("/api/reservations/confirmed-request", { method: "POST", body: JSON.stringify(input), authToken: options?.authToken });
    setReservations(rs => rs.map(r => r.id === reservation.id ? reservation : r));
    setSelected(s => s?.id === reservation.id ? reservation : s);
    return reservation;
  };
  const requestReservationChange = async (input: { reservationId: string; email?: string; phone?: string; requestedDate: string; requestedStartTime: string; requestedPeople: number; requestedMenuItems: string[]; reason?: string }, options?: { authToken?: string }) => {
    const { request } = await requestJson<{ request: ReservationChangeRequest }>("/api/reservations/change-requests", { method: "POST", body: JSON.stringify(input), authToken: options?.authToken });
    setReservationChangeRequests(requests => [request, ...requests.filter(item => item.id !== request.id)]);
    return request;
  };
  const approveReservationChangeRequest = async (id: string) => {
    try {
      const { request, reservation } = await adminRequestJson<{ request: ReservationChangeRequest; reservation: Reservation }>(`/api/reservations/change-requests/${id}/approve`, { method: "POST" });
      setReservationChangeRequests(requests => requests.map(item => item.id === id ? request : item));
      setReservations(rs => rs.map(r => r.id === reservation.id ? reservation : r));
      setSelected(s => s?.id === reservation.id ? reservation : s);
      notify(`予約変更を承認しました（${reservation.id}）`);
    } catch {
      notify("予約変更承認の保存に失敗しました");
    }
  };
  const rejectReservationChangeRequest = async (id: string) => {
    try {
      const { request } = await adminRequestJson<{ request: ReservationChangeRequest }>(`/api/reservations/change-requests/${id}/reject`, { method: "POST" });
      setReservationChangeRequests(requests => requests.map(item => item.id === id ? request : item));
      notify("予約変更を却下しました");
    } catch {
      notify("予約変更却下の保存に失敗しました");
    }
  };
  const updateReservation = async (id: string, input: BookingForm) => {
    const { reservation } = await adminRequestJson<{ reservation: Reservation }>(`/api/reservations/${id}`, {
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
    setReservations(rs => rs.map(r => r.id === id ? reservation : r));
    setSelected(s => s?.id === id ? reservation : s);
    const transitioned = await applyAutomaticStatus(reservation);
    if (reservation.status === STATUS.confirmed && transitioned.status === STATUS.waitingForVisit) {
      notify("メニュー・店舗割当・確認連絡が完了したため、来店待ちに更新しました");
      return transitioned;
    }
    notify(`予約内容を更新しました（${id}）`);
    return transitioned;
  };
  const saveConfirmationContact = async (id: string, contactedAt: string | null, options?: { sendEmail?: boolean }) => {
    const { reservation } = await adminRequestJson<{ reservation: Reservation }>(`/api/reservations/${id}/confirmation-contact`, {
      method: "PATCH",
      body: JSON.stringify({ contactedAt, sendEmail: options?.sendEmail }),
    });
    const current = reservations.find(r => r.id === id) ?? selected;
    const normalizedReservation = !contactedAt && current?.status === STATUS.waitingForVisit
      ? { ...reservation, status: STATUS.confirmed }
      : reservation;
    setReservations(rs => rs.map(r => r.id === id ? normalizedReservation : r));
    setSelected(s => s?.id === id ? normalizedReservation : s);
    return normalizedReservation;
  };
  const updateConfirmationContact = async (id: string, contactedAt: string | null, options?: { sendEmail?: boolean }) => {
    try {
      const reservation = await saveConfirmationContact(id, contactedAt, options);
      if (contactedAt && reservation.status === STATUS.waitingForVisit) {
        notify("メニュー・店舗割当・確認連絡が完了したため、来店待ちに更新しました");
        return;
      }
      if (!contactedAt && reservation.status === STATUS.confirmed) {
        notify("確認連絡を未実施に戻したため、本予約確定に戻しました");
        return;
      }
      notify(contactedAt ? options?.sendEmail === false ? "手動で確認連絡済みにしました" : "確認メールを送信しました" : "確認連絡を未実施に戻しました");
    } catch (error) {
      const message = error instanceof Error ? error.message : "確認連絡の更新に失敗しました";
      notify(message);
    }
  };
  const bulkUpdateConfirmationContacts = async () => {
    if (!confirmationContactTargets.length || isBulkContacting) return;
    const ok = window.confirm(`${confirmationContactTargets.length}件を確認連絡済みにします。よろしいですか？`);
    if (!ok) return;
    setIsBulkContacting(true);
    try {
      const contactedAt = new Date().toISOString();
      const updated = await Promise.all(confirmationContactTargets.map(reservation => saveConfirmationContact(reservation.id, contactedAt)));
      notify(`${updated.length}件の確認メールを送信しました`);
    } catch {
      notify("確認メールの一括送信に失敗しました");
    } finally {
      setIsBulkContacting(false);
    }
  };
  const saveMenu = async (input: MenuForm, originalName?: string) => {
    const url = originalName ? `/api/menus/${encodeURIComponent(originalName)}` : "/api/menus";
    const method = originalName ? "PATCH" : "POST";
    const { menu } = await adminRequestJson<{ menu: Menu }>(url, { method, body: JSON.stringify(input) });
    setInactiveMenuList(items => items.filter(item => item.id !== menu.id && item.name !== menu.name));
    setMenuCatalog(items => sortByDisplayOrderThenName(originalName ? items.map(item => item.name === originalName ? menu : item) : [...items, menu]));
    setReservations(rs => originalName && originalName !== menu.name ? rs.map(r => ({ ...r, menuItems: (r.menuItems ?? []).map(item => item === originalName ? menu.name : item) })) : rs);
    notify(originalName ? "メニューを更新しました" : "メニューを追加しました");
  };
  const deleteMenu = async (name: string) => {
    await adminRequestJson<{ ok: boolean }>(`/api/menus/${encodeURIComponent(name)}`, { method: "DELETE" });
    setMenuCatalog(items => {
      const deleted = items.find(item => item.name === name);
      if (deleted) setInactiveMenuList(inactive => [deleted, ...inactive.filter(item => item.id !== deleted.id && item.name !== deleted.name)]);
      return items.filter(item => item.name !== name);
    });
    notify("メニューを新規選択肢から削除しました。既存予約の履歴は保持されます");
  };
  const reactivateMenu = async (menu: Menu) => {
    if (!menu.id) throw new Error("復元対象のメニューIDがありません");
    const { menu: restored } = await adminRequestJson<{ menu: Menu }>(`/api/menus/${encodeURIComponent(menu.name)}/reactivate`, {
      method: "PATCH",
      body: JSON.stringify({ id: menu.id }),
    });
    setInactiveMenuList(items => items.filter(item => item.id !== restored.id));
    setMenuCatalog(items => sortByDisplayOrderThenName([restored, ...items.filter(item => item.id !== restored.id && item.name !== restored.name)]));
    notify(`${restored.name}を有効にしました`);
  };
  const saveCustomer = async (originalName: string, input: CustomerForm) => {
    const { customer } = await adminRequestJson<{ customer: Customer }>(`/api/customers/${encodeURIComponent(originalName)}`, { method: "PATCH", body: JSON.stringify(input) });
    const reservationSnapshot = { customer: customer.name, email: customer.contact, phone: customer.phone ?? "", address: customer.address };
    setCustomerList(items => items.map(item => item.id && customer.id && item.id === customer.id ? customer : item.name === originalName || item.contact === input.originalContact ? customer : item));
    setReservations(rs => rs.map(r => r.customer === originalName || r.email === input.originalContact ? { ...r, ...reservationSnapshot } : r));
    setSelected(s => s && (s.customer === originalName || s.email === input.originalContact) ? { ...s, ...reservationSnapshot } : s);
    notify(`${customer.name}様の顧客情報を更新しました`);
  };
  const createCustomer = async (input: CustomerForm) => {
    const { customer } = await adminRequestJson<{ customer: Customer }>("/api/customers", { method: "POST", body: JSON.stringify(input) });
    setInactiveCustomerList(items => items.filter(item => item.id !== customer.id && item.contact !== customer.contact));
    setCustomerList(items => [customer, ...items.filter(item => item.id !== customer.id && item.contact !== customer.contact)]);
    notify(`${customer.name}様の顧客情報を登録しました`);
  };
  const deleteCustomer = async (name: string) => {
    await adminRequestJson<{ ok: boolean }>(`/api/customers/${encodeURIComponent(name)}`, { method: "DELETE" });
    setCustomerList(items => {
      const deleted = items.find(item => item.name === name);
      if (deleted) {
        setInactiveCustomerList(inactive => [deleted, ...inactive.filter(item => item.id !== deleted.id)]);
      }
      return items.filter(item => item.name !== name);
    });
    setSelected(s => s?.customer === name ? null : s);
    notify(`${name}様の顧客情報を削除しました`);
  };
  const reactivateCustomer = async (customer: Customer) => {
    if (!customer.id) throw new Error("復元対象の顧客IDがありません");
    const { customer: restored } = await adminRequestJson<{ customer: Customer }>(`/api/customers/${encodeURIComponent(customer.name)}/reactivate`, {
      method: "PATCH",
      body: JSON.stringify({ id: customer.id }),
    });
    setInactiveCustomerList(items => items.filter(item => item.id !== restored.id));
    setCustomerList(items => [restored, ...items.filter(item => item.id !== restored.id)]);
    notify(`${restored.name}様を有効にしました`);
  };
  const createStore = async (input: StoreForm) => {
    const { store } = await adminRequestJson<{ store: Store }>("/api/stores", { method: "POST", body: JSON.stringify(input) });
    setInactiveStoreList(items => items.filter(item => item.id !== store.id && item.name !== store.name));
    setStores(items => sortByDisplayOrderThenName([store, ...items.filter(item => item.id !== store.id && item.name !== store.name)]));
    notify(`${store.name}を登録しました`);
  };
  const saveStore = async (originalName: string, input: StoreForm) => {
    const { store } = await adminRequestJson<{ store: Store }>(`/api/stores/${encodeURIComponent(originalName)}`, { method: "PATCH", body: JSON.stringify(input) });
    setStores(items => sortByDisplayOrderThenName(items.map(item => item.name === originalName ? store : item)));
    setReservations(rs => originalName !== store.name ? rs.map(r => {
      const storeAssignments = reservationAssignments(r).map(assignment => assignment.store === originalName ? { ...assignment, store: store.name } : assignment);
      return { ...r, storeAssignments, store: storeAssignments.length === 1 ? storeAssignments[0].store : storeAssignments.length > 1 ? "複数店舗" : r.store === originalName ? store.name : r.store };
    }) : rs);
    setSelected(s => s && originalName !== store.name ? (() => {
      const storeAssignments = reservationAssignments(s).map(assignment => assignment.store === originalName ? { ...assignment, store: store.name } : assignment);
      return { ...s, storeAssignments, store: storeAssignments.length === 1 ? storeAssignments[0].store : storeAssignments.length > 1 ? "複数店舗" : s.store === originalName ? store.name : s.store };
    })() : s);
    notify(`${store.name}を更新しました`);
  };
  const reactivateStore = async (store: Store) => {
    if (!store.id) throw new Error("復元対象の店舗IDがありません");
    const { store: restored } = await adminRequestJson<{ store: Store }>(`/api/stores/${encodeURIComponent(store.name)}/reactivate`, {
      method: "PATCH",
      body: JSON.stringify({ id: store.id }),
    });
    setInactiveStoreList(items => items.filter(item => item.id !== restored.id));
    setStores(items => sortByDisplayOrderThenName([restored, ...items.filter(item => item.id !== restored.id)]));
    notify(`${restored.name}を有効にしました`);
  };
  const deleteStore = async (name: string) => {
    await adminRequestJson<{ ok: boolean }>(`/api/stores/${encodeURIComponent(name)}`, { method: "DELETE" });
    setStores(items => {
      const deleted = items.find(item => item.name === name);
      if (deleted) setInactiveStoreList(inactive => [deleted, ...inactive.filter(item => item.id !== deleted.id)]);
      return items.filter(item => item.name !== name);
    });
    notify(`${name}を新規選択肢から削除しました。既存予約の履歴は保持されます`);
  };
  const submitAdminReservation = async () => {
    try {
      const reservation = await createReservation({ ...adminForm, endTime: adminForm.endTime ?? bookingFormEndTime(adminForm, menuCatalog) }, { forceAdmin: true });
      setAdminForm({ menuItems: [], date: "2026-07-12", startTime: DEFAULT_START_TIME, people: 2, name: "", email: "", phone: "", address: "", accountType: "individual", bookingType: "individual", tcCount: 0, dgCount: 0, paymentCondition: defaultPaymentCondition, remarks: "", status: STATUS.confirmed });
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

  if (role === "customer") return <CustomerPortal initialMode={customerEntryMode} form={form} setForm={setForm} step={formStep} setStep={setFormStep} onAdmin={() => setRole("admin")} notify={notify} toast={toast} onSubmitReservation={createReservation} onSubmitCancellation={requestCancellation} onSubmitConfirmedReservationChange={requestConfirmedReservationChange} onSubmitChangeRequest={requestReservationChange} menuCatalog={menuCatalog} />;
  if (authLoading) return <AdminAuthShell title="ログイン状態を確認しています" text="管理画面を表示する準備をしています。" />;
  if (!adminSession) return <AdminLogin onLogin={loginAdmin} onCustomer={() => setRole("customer")} error={authError} />;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="logo"><span>R</span><strong>Reserve</strong><small>Operations</small></div>
      <nav><button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><Icon name="grid"/>ダッシュボード</button><button className={view === "reservations" ? "active" : ""} onClick={() => openReservations("すべて")}><Icon name="calendar"/>予約一覧</button><button className={view === "reservationApprovals" ? "active" : ""} onClick={() => setView("reservationApprovals")}><Icon name="check"/>予約承認{taskCounts.reservationApprovals > 0 && <i>{taskCounts.reservationApprovals}</i>}</button><button className={view === "confirmedReservationRequests" ? "active" : ""} onClick={() => setView("confirmedReservationRequests")}><Icon name="check"/>本予約変更承認{taskCounts.confirmedReservationRequests > 0 && <i>{taskCounts.confirmedReservationRequests}</i>}</button><button className={view === "reservationChangeRequests" ? "active" : ""} onClick={() => setView("reservationChangeRequests")}><Icon name="check"/>予約変更承認{taskCounts.changeRequests > 0 && <i>{taskCounts.changeRequests}</i>}</button><button className={view === "cancellationApprovals" ? "active" : ""} onClick={() => setView("cancellationApprovals")}><Icon name="check"/>キャンセル承認{taskCounts.cancellationApprovals > 0 && <i>{taskCounts.cancellationApprovals}</i>}</button><button className={view === "confirmationContacts" ? "active" : ""} onClick={() => setView("confirmationContacts")}><Icon name="check"/>確認連絡{taskCounts.preContactDue > 0 && <i>{taskCounts.preContactDue}</i>}</button><button className={view === "masters" || view === "customers" || view === "stores" || view === "menus" ? "active" : ""} onClick={() => setView("masters")}><Icon name="settings"/>マスタ管理</button><button className={view === "billing" ? "active" : ""} onClick={() => setView("billing")}><Icon name="chart"/>利用実績・請求</button></nav>
      <div className="sidebar-bottom"><button onClick={() => setRole("customer")}>顧客画面を表示 <Icon name="arrow"/></button><button className="logout-button" onClick={signOutAdmin}>ログアウト</button><div className="profile"><span>{(adminSession.email ?? "AD").slice(0, 2).toUpperCase()}</span><div><strong>{adminSession.email ?? "管理者"}</strong><small>システム管理者</small></div></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><h1>{{dashboard:"ダッシュボード",reservations:"予約一覧",reservationApprovals:"予約承認",cancellationApprovals:"キャンセル承認",confirmedReservationRequests:"本予約変更承認",reservationChangeRequests:"予約変更承認",confirmationContacts:"確認連絡",masters:"マスタ管理",customers:"顧客管理",stores:"店舗管理",menus:"メニュー管理",billing:"利用実績・請求"}[view]}</h1><div className="topbar-meta"><span>管理画面</span><strong>{fullDateHeadingLabel(todayIso())}</strong></div></header>
      {view === "dashboard" ? <main className="dashboard">
        <section className="dashboard-block dashboard-info-block"><div className="info-dashboard-grid"><div className="info-summary-list">
          <InfoMetric label="本日の予約" value={String(dashboardCounts.today)} color="blue" />
          <InfoMetric label="今月の予約" value={String(dashboardCounts.month)} color="green" />
        </div><div className="today-reservation-list"><div className="today-reservation-head"><div><h3>本日の予約</h3><p>{dateHeadingLabel(todayIso())}</p></div><button onClick={() => openReservations("すべて", todayIso())}>予約一覧で見る <Icon name="arrow"/></button></div>{todayReservations.length ? <div className="timeline">{todayReservations.map((reservation, index)=><Fragment key={reservation.id}><span>{reservationStartTime(reservation)}</span><i className={["blue","green","violet"][index % 3]}/><div><strong>{reservation.customer} 様</strong><small>{reservation.groupName ? `${reservation.groupName}・` : ""}{assignmentLabel(reservation) || "店舗未割当"}・{reservationMenuLabel(reservation)}</small></div></Fragment>)}</div> : <div className="empty-panel"><p>本日の予約はありません。</p></div>}</div></div></section>
        <section className="dashboard-block"><div className="dashboard-block-head"><h3>タスク</h3></div><div className="task-group-list">
          <div className="task-group"><h4>承認系</h4><div className="task-card-grid">
            <Task color="amber" title="予約の承認" count={taskCounts.reservationApprovals} text="仮予約・本予約の申請を確認しましょう" onClick={() => setView("reservationApprovals")} />
            <Task color="amber" title="本予約変更承認" count={taskCounts.confirmedReservationRequests} text="仮予約から本予約への変更依頼を確認しましょう" onClick={() => setView("confirmedReservationRequests")} />
            <Task color="violet" title="予約変更承認" count={taskCounts.changeRequests} text="予約内容の変更依頼を確認しましょう" onClick={() => setView("reservationChangeRequests")} />
            <Task color="red" title="キャンセルの承認" count={taskCounts.cancellationApprovals} text="キャンセル申請を確認しましょう" onClick={() => setView("cancellationApprovals")} />
          </div></div>
          <div className="task-group"><h4>内部業務系</h4><div className="task-card-grid">
            <Task color="blue" title="確認連絡" count={taskCounts.preContactDue} text={"食事日まで" + confirmationContactWindowDays + "日未満のお客様へ確認連絡を行いましょう"} onClick={() => setView("confirmationContacts")} />
            <Task color="violet" title="店舗割当" count={taskCounts.storeUnassigned} text="店舗割当を行いましょう" onClick={() => openReservations("本予約確定（店舗未割当）")} />
          </div></div>
          <div className="task-group"><h4>催促系</h4><div className="task-card-grid">
            <Task color="amber" title="本予約の催促" count={taskCounts.temporaryExpired} text="期限切れの仮予約へ本予約への変更を依頼しましょう" onClick={() => openReservations("仮予約確定（期限切れ）")} />
            <Task color="green" title="メニュー確定の催促" count={taskCounts.menuUnselected} text="メニューが未確定のお客様を確認しましょう" onClick={() => openReservations("本予約確定（メニュー未確定）")} />
          </div></div>
        </div></section>
      </main> : <ManagementPage view={view} onSelectMasterView={setView} reservations={reservations} reservationChangeRequests={reservationChangeRequests} confirmationContactTargets={confirmationContactTargets} confirmationContactWindowDays={confirmationContactWindowDays} setConfirmationContactWindowDays={setConfirmationContactWindowDays} isBulkContacting={isBulkContacting} onBulkConfirmationContact={bulkUpdateConfirmationContacts} customers={customers} inactiveCustomers={inactiveCustomerList} stores={stores} inactiveStores={inactiveStoreList} menus={menuCatalog} inactiveMenus={inactiveMenuList} reservationFilter={reservationFilter} setReservationFilter={setReservationFilter} reservationDateFromFilter={reservationDateFromFilter} setReservationDateFromFilter={setReservationDateFromFilter} reservationDateToFilter={reservationDateToFilter} setReservationDateToFilter={setReservationDateToFilter} reservationSearch={reservationSearch} setReservationSearch={setReservationSearch} onSelect={setSelected} updateStatus={updateStatus} notify={notify} onSaveMenu={saveMenu} onDeleteMenu={deleteMenu} onReactivateMenu={reactivateMenu} onCreateCustomer={createCustomer} onSaveCustomer={saveCustomer} onDeleteCustomer={deleteCustomer} onReactivateCustomer={reactivateCustomer} onCreateStore={createStore} onSaveStore={saveStore} onDeleteStore={deleteStore} onReactivateStore={reactivateStore} onOpenNewReservation={() => setIsNewReservationOpen(true)} onApproveChangeRequest={approveReservationChangeRequest} onRejectChangeRequest={rejectReservationChangeRequest} />}
    </div>
    {isNewReservationOpen && <NewReservationDrawer form={adminForm} setForm={setAdminForm} onClose={() => setIsNewReservationOpen(false)} onSubmit={submitAdminReservation} menuCatalog={menuCatalog} />}
    {selected && <ReservationDrawer reservation={selected} onClose={() => setSelected(null)} updateStatus={updateStatus} updateConfirmationContact={updateConfirmationContact} assignStores={assignStores} updateReservation={updateReservation} menuCatalog={menuCatalog} stores={stores} />}
    {toast && <div className="toast"><Icon name="check"/>{toast}</div>}
  </div>;
}

function ManagementPage({ view, onSelectMasterView, reservations, reservationChangeRequests, confirmationContactTargets, confirmationContactWindowDays, setConfirmationContactWindowDays, isBulkContacting, onBulkConfirmationContact, customers, inactiveCustomers, stores, inactiveStores, menus, inactiveMenus, reservationFilter, setReservationFilter, reservationDateFromFilter, setReservationDateFromFilter, reservationDateToFilter, setReservationDateToFilter, reservationSearch, setReservationSearch, onSelect, updateStatus, notify, onSaveMenu, onDeleteMenu, onReactivateMenu, onCreateCustomer, onSaveCustomer, onDeleteCustomer, onReactivateCustomer, onCreateStore, onSaveStore, onDeleteStore, onReactivateStore, onOpenNewReservation, onApproveChangeRequest, onRejectChangeRequest }: { view: Exclude<View,"dashboard">; onSelectMasterView: (view: "masters" | "customers" | "stores" | "menus") => void; reservations: Reservation[]; reservationChangeRequests: ReservationChangeRequest[]; confirmationContactTargets: Reservation[]; confirmationContactWindowDays: number; setConfirmationContactWindowDays: (days: number) => void; isBulkContacting: boolean; onBulkConfirmationContact: () => Promise<void>; customers: Customer[]; inactiveCustomers: Customer[]; stores: Store[]; inactiveStores: Store[]; menus: Menu[]; inactiveMenus: Menu[]; reservationFilter: ReservationFilter; setReservationFilter: (filter: ReservationFilter) => void; reservationDateFromFilter: string; setReservationDateFromFilter: (date: string) => void; reservationDateToFilter: string; setReservationDateToFilter: (date: string) => void; reservationSearch: string; setReservationSearch: (search: string) => void; onSelect: (r: Reservation) => void; updateStatus: (id: string, status: Status, options?: { manualReason?: string }) => void; notify: (s:string) => void; onSaveMenu: (input: MenuForm, originalName?: string) => Promise<void>; onDeleteMenu: (name: string) => Promise<void>; onReactivateMenu: (menu: Menu) => Promise<void>; onCreateCustomer: (input: CustomerForm) => Promise<void>; onSaveCustomer: (originalName: string, input: CustomerForm) => Promise<void>; onDeleteCustomer: (name: string) => Promise<void>; onReactivateCustomer: (customer: Customer) => Promise<void>; onCreateStore: (input: StoreForm) => Promise<void>; onSaveStore: (originalName: string, input: StoreForm) => Promise<void>; onDeleteStore: (name: string) => Promise<void>; onReactivateStore: (store: Store) => Promise<void>; onOpenNewReservation: () => void; onApproveChangeRequest: (id: string) => Promise<void>; onRejectChangeRequest: (id: string) => Promise<void> }) {
  const [reservationSort, setReservationSort] = useState<{ key: ReservationSortKey; direction: SortDirection }>({ key: "date", direction: "asc" });
  const [reservationStatusFilter, setReservationStatusFilter] = useState<Status | "">("");
  const [includeVisitedReservations, setIncludeVisitedReservations] = useState(false);
  const filteredReservations = useMemo(() => reservations.filter((reservation) => {
    const effectiveDateFrom = reservationDateFromFilter && reservationDateToFilter && reservationDateFromFilter > reservationDateToFilter ? reservationDateToFilter : reservationDateFromFilter;
    const effectiveDateTo = reservationDateFromFilter && reservationDateToFilter && reservationDateFromFilter > reservationDateToFilter ? reservationDateFromFilter : reservationDateToFilter;
    const matchesDateFrom = !effectiveDateFrom || reservation.date >= effectiveDateFrom;
    const matchesDateTo = !effectiveDateTo || reservation.date <= effectiveDateTo;
    const matchesDate = matchesDateFrom && matchesDateTo;
    if (!matchesDate) return false;
    const keyword = reservationSearch.trim().toLowerCase();
    const matchesSearch = !keyword || [reservation.id, reservation.customer, reservation.groupName ?? "", reservation.phone, reservation.email ?? ""].some(value => value.toLowerCase().includes(keyword));
    if (!matchesSearch) return false;
    if (reservationStatusFilter && reservation.status !== reservationStatusFilter) return false;
    if (!reservationStatusFilter && !includeVisitedReservations && reservation.status === STATUS.visited) return false;
    if (reservationFilter === "すべて") return true;
    if (reservationFilter === "承認待ち") return approvalStatuses.includes(reservation.status);
    if (reservationFilter === "仮予約確定（期限切れ）") return isTemporaryReservationExpired(reservation);
    if (reservationFilter === "本予約確定") return isConfirmedReservation(reservation);
    if (reservationFilter === "本予約確定（メニュー未確定）") return isConfirmedReservation(reservation) && !(reservation.menuItems?.length);
    if (reservationFilter === "本予約確定（店舗未割当）") return isConfirmedReservation(reservation) && !reservationAssignments(reservation).length;
    if (reservationFilter === "本予約確定（未確認連絡）") return isConfirmedReservation(reservation) && !reservation.confirmationContactedAt;
    if (reservationFilter === "本予約確定（来店待ち）") return isVisitReadyReservation(reservation);
    return statusLabel(reservation.status) === reservationFilter;
  }), [includeVisitedReservations, reservationDateFromFilter, reservationDateToFilter, reservationFilter, reservationSearch, reservationStatusFilter, reservations]);
  const sortedReservations = useMemo(() => {
    const valueFor = (reservation: Reservation, key: ReservationSortKey): string | number => {
      if (key === "status") return reservationDisplayLabel(reservation);
      if (key === "id") return Number(reservation.id.replace(/\D/g, "")) || reservation.id;
      if (key === "customer") return reservation.customer;
      if (key === "date") return reservation.date + "T" + reservationStartTime(reservation);
      if (key === "menu") return reservationMenuLabel(reservation);
      if (key === "store") return assignmentLabel(reservation) || "未割当";
      return reservation.confirmationContactedAt ? "連絡済み" + reservation.confirmationContactedAt : "未連絡";
    };
    return [...filteredReservations].sort((a, b) => {
      const aValue = valueFor(a, reservationSort.key);
      const bValue = valueFor(b, reservationSort.key);
      const result = typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue), "ja-JP", { numeric: true });
      return reservationSort.direction === "asc" ? result : -result;
    });
  }, [filteredReservations, reservationSort]);
  const pendingChangeRequests = useMemo(
    () => reservationChangeRequests.filter((request) => request.status === "requested"),
    [reservationChangeRequests],
  );
  const pendingConfirmedReservationRequests = useMemo(
    () => reservations.filter(isConfirmedReservationChangeRequest),
    [reservations],
  );
  const pendingReservationApprovalReservations = useMemo(
    () => reservations.filter((reservation) => reservationApprovalStatuses.includes(reservation.status) && !isConfirmedReservationChangeRequest(reservation)),
    [reservations],
  );
  const pendingCancellationApprovalReservations = useMemo(
    () => reservations.filter((reservation) => cancellationApprovalStatuses.includes(reservation.status)),
    [reservations],
  );
  const toggleReservationSort = (key: ReservationSortKey) => {
    setReservationSort(current => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
  };
  const sortLabel = (key: ReservationSortKey) => reservationSort.key === key ? (reservationSort.direction === "asc" ? "↑" : "↓") : "↕";
  const hasReservationDateFilter = Boolean(reservationDateFromFilter || reservationDateToFilter);
  const quickFilters: ReservationFilter[] = ["すべて", "承認待ち", "仮予約確定", "仮予約確定（期限切れ）", "本予約確定", "本予約確定（メニュー未確定）", "本予約確定（店舗未割当）", "本予約確定（未確認連絡）", "本予約確定（来店待ち）"];
  const pageDescriptions: Record<Exclude<View, "dashboard">, string> = {
    reservations: "",
    reservationApprovals: "",
    cancellationApprovals: "",
    confirmedReservationRequests: "",
    reservationChangeRequests: "",
    confirmationContacts: "",
    masters: "",
    customers: "予約者の連絡先を確認できます。",
    stores: "店舗ごとの割当状況を確認できます。",
    menus: "予約フォームで選択できる料理・コースを管理します。",
    billing: "来店実績、売上、請求書の発行状況を管理します。",
  };
  const isMasterChildView = view === "customers" || view === "stores" || view === "menus";
  return <main className="management">
    {isMasterChildView && <button type="button" className="breadcrumb-back" onClick={() => onSelectMasterView("masters")}>← マスタ管理</button>}
    {view !== "reservations" && view !== "reservationApprovals" && view !== "cancellationApprovals" && view !== "confirmedReservationRequests" && view !== "reservationChangeRequests" && view !== "confirmationContacts" && view !== "masters" && view !== "customers" && view !== "stores" && view !== "menus" && <section className="page-title compact"><span>{pageDescriptions[view]}</span><button onClick={() => notify(view === "billing" ? "請求データをCSV出力しました" : "新規登録画面を準備しました")}><Icon name={view === "billing" ? "chart" : "plus"}/>{view === "billing" ? "CSV出力" : "新規登録"}</button></section>}
    {view === "confirmationContacts" && <ConfirmationContactPage reservations={confirmationContactTargets} windowDays={confirmationContactWindowDays} setWindowDays={setConfirmationContactWindowDays} isBulkContacting={isBulkContacting} onBulkConfirmationContact={onBulkConfirmationContact} onSelect={onSelect} />}
    {view === "reservationApprovals" && <ReservationApprovalPage reservations={pendingReservationApprovalReservations} onSelect={onSelect} updateStatus={updateStatus} />}
    {view === "cancellationApprovals" && <CancellationApprovalPage reservations={pendingCancellationApprovalReservations} onSelect={onSelect} updateStatus={updateStatus} />}
    {view === "confirmedReservationRequests" && <ConfirmedReservationRequestPage reservations={pendingConfirmedReservationRequests} onSelect={onSelect} updateStatus={updateStatus} />}
    {view === "reservationChangeRequests" && <ReservationChangeRequestPage requests={pendingChangeRequests} reservations={reservations} onSelect={onSelect} onApproveChangeRequest={onApproveChangeRequest} onRejectChangeRequest={onRejectChangeRequest} />}
    {view === "masters" && <MasterManagementPage onSelectMasterView={onSelectMasterView} />}
    {view === "reservations" && <section className="panel management-panel">
      <div className="management-tools reservation-tools">
        <div className="reservation-search-row">
          <label className="reservation-search"><div><Icon name="search"/><input placeholder="予約ID・顧客名で検索" value={reservationSearch} onChange={(event) => setReservationSearch(event.target.value)}/></div></label>
          <div className="reservation-date-range"><span>予約日</span><input type="date" value={reservationDateFromFilter} onChange={(event) => { const value = event.target.value; setReservationDateFromFilter(value); if (value && !reservationDateToFilter) setReservationDateToFilter(value); }}/><em>〜</em><input type="date" value={reservationDateToFilter} onChange={(event) => setReservationDateToFilter(event.target.value)}/></div>
          <label className="reservation-status-filter"><span>ステータス</span><select value={reservationStatusFilter} onChange={(event) => setReservationStatusFilter(event.target.value as Status | "")}><option value="">すべて</option>{statusOptions.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
          <div className="visited-filter"><span>来店済</span><div className="segmented"><button type="button" className={!includeVisitedReservations ? "active" : ""} onClick={() => setIncludeVisitedReservations(false)}>除外</button><button type="button" className={includeVisitedReservations ? "active" : ""} onClick={() => setIncludeVisitedReservations(true)}>含む</button></div></div>
          <button className={hasReservationDateFilter ? "clear-filter" : "clear-filter is-placeholder"} disabled={!hasReservationDateFilter} aria-hidden={!hasReservationDateFilter} tabIndex={hasReservationDateFilter ? 0 : -1} onClick={() => { setReservationDateFromFilter(""); setReservationDateToFilter(""); }}>日付クリア</button>
          <div className="result-count"><span>該当</span><strong>{filteredReservations.length}</strong><span>件</span></div>
          <button type="button" className="reservation-new-button" onClick={onOpenNewReservation}><Icon name="plus"/>新規登録</button>
        </div>
        <div className="reservation-filter-row"><div className="segmented">{quickFilters.map(filter => <button key={filter} className={reservationFilter === filter ? "active" : ""} onClick={() => setReservationFilter(filter)}>{filter}</button>)}</div></div>
      </div>
      <div className="table-wrap"><table className="large-table">
        <thead><tr><th><button className="sort-header" onClick={() => toggleReservationSort("id")}>予約ID<span>{sortLabel("id")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("status")}>ステータス<span>{sortLabel("status")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("customer")}>お客様<span>{sortLabel("customer")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("date")}>利用日時・人数<span>{sortLabel("date")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("menu")}>メニュー<span>{sortLabel("menu")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("store")}>担当店舗<span>{sortLabel("store")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("contact")}>確認連絡<span>{sortLabel("contact")}</span></button></th></tr></thead>
        <tbody>{sortedReservations.map(r => <tr key={r.id} onClick={() => onSelect(r)}><td><strong>{r.id}</strong><small>{r.received}</small></td><td><span className={"badge " + statusClass[r.status]}><i/>{reservationDisplayLabel(r)}</span></td><td><strong>{r.customer}</strong>{reservationCustomerSubLabel(r) ? <small>{reservationCustomerSubLabel(r)}</small> : null}</td><td><strong>{reservationDateTimeLabel(r)}</strong><strong>{r.people}名</strong></td><td>{reservationMenuLabel(r)}</td><td>{assignmentLabel(r) ? <strong>{assignmentLabel(r)}</strong> : <span className="unassigned">未割当</span>}</td><td>{r.confirmationContactedAt ? <><strong>連絡済</strong><small>{new Date(r.confirmationContactedAt).toLocaleDateString("ja-JP")}</small></> : <span className="unassigned">未連絡</span>}</td></tr>)}</tbody>
      </table>{!filteredReservations.length && <div className="empty-table">選択した条件の予約はありません。</div>}</div>
    </section>}
    {view === "customers" && <CustomerManagement customers={customers} inactiveCustomers={inactiveCustomers} onCreateCustomer={onCreateCustomer} onSaveCustomer={onSaveCustomer} onDeleteCustomer={onDeleteCustomer} onReactivateCustomer={onReactivateCustomer} notify={notify} />}
    {view === "stores" && <StoreManagement stores={stores} inactiveStores={inactiveStores} onCreateStore={onCreateStore} onSaveStore={onSaveStore} onDeleteStore={onDeleteStore} onReactivateStore={onReactivateStore} notify={notify} />}
    {view === "menus" && <MenuManagement menus={menus} inactiveMenus={inactiveMenus} onSaveMenu={onSaveMenu} onDeleteMenu={onDeleteMenu} onReactivateMenu={onReactivateMenu} notify={notify} />}
    {view === "billing" && <>
      <section className="stats billing-stats">
        <Stat icon="chart" label="今月の売上" value="682,400" note="先月比 +8.2%" color="green"/>
        <Stat icon="calendar" label="利用完了" value="96" note="予約24件中" color="blue"/>
        <Stat icon="users" label="未請求" value="4" note="対応が必要です" color="amber"/>
        <Stat icon="chart" label="請求書発行" value="18" note="今月の発行数" color="violet"/>
      </section>
      <section className="panel management-panel">
        <div className="panel-head"><div><h3>最近の利用実績</h3><p>来店受付後に登録された実績と請求状況です。</p></div></div>
        <div className="table-wrap"><table className="large-table"><thead><tr><th>利用日</th><th>予約ID / お客様</th><th>店舗</th><th>利用内容</th><th>金額</th><th>請求状況</th><th/></tr></thead><tbody>
          <tr><td>2026/07/08</td><td><strong>RSV-1044</strong><small>伊藤 結衣 様</small></td><td>横浜店</td><td>パーソナル診断 x 1</td><td><strong>¥8,800</strong></td><td><span className="badge green"><i/>請求済</span></td><td><Icon name="arrow"/></td></tr>
          <tr><td>2026/07/07</td><td><strong>RSV-1042</strong><small>小林 優 様</small></td><td>渋谷店</td><td>スタンダード x 2</td><td><strong>¥11,000</strong></td><td><span className="badge amber"><i/>未請求</span></td><td><Icon name="arrow"/></td></tr>
        </tbody></table></div>
      </section>
    </>}
  </main>;
}

function CustomerReservationDashboard({ customerEmail, isLoggedIn, authError, accountEmail, accountPassword, accountSubmitting, customerAuthLoading, reservations, isLoading, reservationError, canRequestConfirmedChange, canRequestChange, canRequestCancellation, onBack, onAccountEmailChange, onAccountPasswordChange, onLogin, onLogout, onConfirmedChange, onChange, onCancellation }: { customerEmail: string; isLoggedIn: boolean; authError: string; accountEmail: string; accountPassword: string; accountSubmitting: boolean; customerAuthLoading: boolean; reservations: Reservation[]; isLoading: boolean; reservationError: string; canRequestConfirmedChange: (reservation: Reservation) => boolean; canRequestChange: (reservation: Reservation) => boolean; canRequestCancellation: (reservation: Reservation) => boolean; onBack: () => void; onAccountEmailChange: (value: string) => void; onAccountPasswordChange: (value: string) => void; onLogin: () => void; onLogout: () => void; onConfirmedChange: (reservation: Reservation) => void; onChange: (reservation: Reservation) => void; onCancellation: (reservation: Reservation) => void }) {
  return <>
    <button className="portal-back-button" type="button" onClick={onBack}>手続き選択へ戻る</button>
    <div className="form-body narrow customer-reservation-dashboard">
      <p className="form-kicker">MY RESERVATIONS</p>
      <h2>予約確認</h2>
      {isLoggedIn ? (
        <div className="customer-account-current reservation-account-head"><span>ログイン中</span><strong>{customerEmail}</strong><button type="button" onClick={onLogout}>ログアウト</button></div>
      ) : (
        <section className="customer-account-panel">
          <p>アカウント登録済みのお客様はログインすると予約を確認できます。</p>
          <div className="customer-account-form">
            <input type="email" placeholder="メールアドレス" value={accountEmail} onChange={event => onAccountEmailChange(event.target.value)} />
            <input type="password" placeholder="パスワード" value={accountPassword} onChange={event => onAccountPasswordChange(event.target.value)} />
            <button type="button" disabled={accountSubmitting || customerAuthLoading} onClick={onLogin}>{accountSubmitting ? "確認中" : "ログイン"}</button>
          </div>
          {authError ? <div className="auth-error">{authError}</div> : null}
        </section>
      )}
      {isLoggedIn && (isLoading ? <div className="empty-table compact">予約情報を読み込んでいます。</div> : reservationError ? <div className="auth-error">{reservationError}</div> : reservations.length ? (
        <div className="customer-reservation-list">{reservations.map(reservation => <article key={reservation.id} className="customer-reservation-item">
          <div><span className={"badge " + statusClass[reservation.status]}><i/>{reservationDisplayLabel(reservation)}</span><strong>{reservationDateTimeLabel(reservation)}</strong><small>{reservation.groupName ? `${reservation.groupName}・` : ""}{reservation.people}名・{reservationMenuLabel(reservation)}</small></div>
          <dl><div><dt>予約ID</dt><dd>{reservation.id}</dd></div><div><dt>担当店舗</dt><dd>{assignmentLabel(reservation) || "未割当"}</dd></div><div><dt>確認連絡</dt><dd>{reservation.confirmationContactedAt ? "連絡済" : "未連絡"}</dd></div></dl>
          <ReservationActionButtons reservation={reservation} canRequestConfirmedChange={canRequestConfirmedChange} canRequestChange={canRequestChange} canRequestCancellation={canRequestCancellation} onConfirmedChange={onConfirmedChange} onChange={onChange} onCancellation={onCancellation} />
        </article>)}</div>
      ) : <div className="empty-table compact">表示できる予約はありません。</div>)}
    </div>
  </>;
}

function ReservationActionButtons({ reservation, canRequestConfirmedChange, canRequestChange, canRequestCancellation, onConfirmedChange, onChange, onCancellation }: { reservation: Reservation; canRequestConfirmedChange: (reservation: Reservation) => boolean; canRequestChange: (reservation: Reservation) => boolean; canRequestCancellation: (reservation: Reservation) => boolean; onConfirmedChange: (reservation: Reservation) => void; onChange: (reservation: Reservation) => void; onCancellation: (reservation: Reservation) => void }) {
  return <div className="customer-reservation-actions">
    <button type="button" disabled={!canRequestConfirmedChange(reservation)} onClick={() => onConfirmedChange(reservation)}>本予約への変更申請</button>
    <button type="button" disabled={!canRequestChange(reservation)} onClick={() => onChange(reservation)}>予約内容変更申請</button>
    <button type="button" disabled={!canRequestCancellation(reservation)} onClick={() => onCancellation(reservation)}>キャンセル申請</button>
  </div>;
}

function CustomerRequestForms({ mode, confirmedChangeForm, changeRequestForm, cancellationForm, confirmedChangeSubmitted, changeRequestSubmitted, cancellationSubmitted, isSubmittingConfirmedChange, isSubmittingChangeRequest, isSubmittingCancellation, canSubmitConfirmedChange, canSubmitChangeRequest, canSubmitCancellation, menuCatalog, onBack, onConfirmedChangeFormChange, onChangeRequestFormChange, onCancellationFormChange, onSubmitConfirmedChange, onSubmitChangeRequest, onSubmitCancellation }: { mode: CustomerPortalMode; confirmedChangeForm: CustomerContactRequestForm; changeRequestForm: CustomerReservationChangeRequestForm; cancellationForm: CustomerContactRequestForm; confirmedChangeSubmitted: boolean; changeRequestSubmitted: boolean; cancellationSubmitted: boolean; isSubmittingConfirmedChange: boolean; isSubmittingChangeRequest: boolean; isSubmittingCancellation: boolean; canSubmitConfirmedChange: boolean; canSubmitChangeRequest: boolean; canSubmitCancellation: boolean; menuCatalog: Menu[]; onBack: () => void; onConfirmedChangeFormChange: Dispatch<SetStateAction<CustomerContactRequestForm>>; onChangeRequestFormChange: Dispatch<SetStateAction<CustomerReservationChangeRequestForm>>; onCancellationFormChange: Dispatch<SetStateAction<CustomerContactRequestForm>>; onSubmitConfirmedChange: () => void; onSubmitChangeRequest: () => void; onSubmitCancellation: () => void }) {
  if (mode === "confirmedChange") return <CustomerConfirmedChangeForm form={confirmedChangeForm} submitted={confirmedChangeSubmitted} isSubmitting={isSubmittingConfirmedChange} canSubmit={canSubmitConfirmedChange} onBack={onBack} onFormChange={onConfirmedChangeFormChange} onSubmit={onSubmitConfirmedChange} />;
  if (mode === "change") return <CustomerChangeRequestForm form={changeRequestForm} submitted={changeRequestSubmitted} isSubmitting={isSubmittingChangeRequest} canSubmit={canSubmitChangeRequest} menuCatalog={menuCatalog} onBack={onBack} onFormChange={onChangeRequestFormChange} onSubmit={onSubmitChangeRequest} />;
  if (mode === "cancellation") return <CustomerCancellationForm form={cancellationForm} submitted={cancellationSubmitted} isSubmitting={isSubmittingCancellation} canSubmit={canSubmitCancellation} onBack={onBack} onFormChange={onCancellationFormChange} onSubmit={onSubmitCancellation} />;
  return null;
}

function CustomerConfirmedChangeForm({ form, submitted, isSubmitting, canSubmit, onBack, onFormChange, onSubmit }: { form: CustomerContactRequestForm; submitted: boolean; isSubmitting: boolean; canSubmit: boolean; onBack: () => void; onFormChange: Dispatch<SetStateAction<CustomerContactRequestForm>>; onSubmit: () => void }) {
  return <><button className="portal-back-button" type="button" onClick={onBack}>手続き選択へ戻る</button>{submitted ? <CustomerRequestComplete title="本予約への変更申請を受け付けました" message="内容を確認後、本予約への変更可否をご連絡します。" onBack={onBack} /> : <div className="form-body narrow cancellation-form"><p className="form-kicker">CONFIRMED REQUEST</p><h2>本予約への変更申請</h2><CustomerContactRequestFields form={form} onFormChange={onFormChange} /><p className="customer-mode-note">ログイン中のアカウントに紐づく、仮予約確定済みの予約だけ申請できます。</p><div className="form-nav"><button onClick={onBack}>戻る</button><button className="next" disabled={!canSubmit} onClick={onSubmit}>{isSubmitting ? "送信中" : "本予約への変更を申請する"} <Icon name="arrow"/></button></div></div>}</>;
}

function CustomerChangeRequestForm({ form, submitted, isSubmitting, canSubmit, menuCatalog, onBack, onFormChange, onSubmit }: { form: CustomerReservationChangeRequestForm; submitted: boolean; isSubmitting: boolean; canSubmit: boolean; menuCatalog: Menu[]; onBack: () => void; onFormChange: Dispatch<SetStateAction<CustomerReservationChangeRequestForm>>; onSubmit: () => void }) {
  return <><button className="portal-back-button" type="button" onClick={onBack}>手続き選択へ戻る</button>{submitted ? <CustomerRequestComplete title="予約内容変更申請を受け付けました" message="内容を確認後、変更可否をご連絡します。" onBack={onBack} /> : <div className="form-body narrow cancellation-form"><p className="form-kicker">CHANGE REQUEST</p><h2>予約内容変更申請</h2><CustomerContactRequestFields form={form} onFormChange={onFormChange} /><div className="form-fields reservation-date-fields"><label>変更希望日<input type="date" value={form.requestedDate} onChange={event => onFormChange({ ...form, requestedDate: event.target.value })}/></label><label>開始時間<input type="time" value={form.requestedStartTime} onChange={event => onFormChange({ ...form, requestedStartTime: event.target.value })}/></label><label>人数<select value={form.requestedPeople} onChange={event => onFormChange({ ...form, requestedPeople: Number(event.target.value) })}>{[1,2,3,4,5,6].map(value => <option key={value}>{value}</option>)}</select></label></div><MenuPicker menuCatalog={menuCatalog} selected={form.requestedMenuItems} onChange={requestedMenuItems => onFormChange({ ...form, requestedMenuItems })}/><div className="form-fields single"><label>変更理由<textarea value={form.reason} onChange={event => onFormChange({ ...form, reason: event.target.value })}/></label></div><p className="customer-mode-note">ログイン中のアカウントに紐づく予約だけ申請できます。</p><div className="form-nav"><button onClick={onBack}>戻る</button><button className="next" disabled={!canSubmit} onClick={onSubmit}>{isSubmitting ? "送信中" : "変更を申請する"} <Icon name="arrow"/></button></div></div>}</>;
}

function CustomerCancellationForm({ form, submitted, isSubmitting, canSubmit, onBack, onFormChange, onSubmit }: { form: CustomerContactRequestForm; submitted: boolean; isSubmitting: boolean; canSubmit: boolean; onBack: () => void; onFormChange: Dispatch<SetStateAction<CustomerContactRequestForm>>; onSubmit: () => void }) {
  return <><button className="portal-back-button" type="button" onClick={onBack}>手続き選択へ戻る</button>{submitted ? <CustomerRequestComplete title="キャンセル申請を受け付けました" message="内容を確認後、キャンセル可否をご連絡します。" onBack={onBack} /> : <div className="form-body narrow cancellation-form"><p className="form-kicker">CANCEL REQUEST</p><h2>キャンセル申請</h2><CustomerContactRequestFields form={form} onFormChange={onFormChange} /><p className="customer-mode-note">ログイン中のアカウントに紐づく予約だけ申請できます。</p><div className="form-nav"><button onClick={onBack}>戻る</button><button className="next" disabled={!canSubmit} onClick={onSubmit}>{isSubmitting ? "送信中" : "キャンセルを申請する"} <Icon name="arrow"/></button></div></div>}</>;
}

function CustomerContactRequestFields<T extends CustomerContactRequestForm>({ form, onFormChange }: { form: T; onFormChange: Dispatch<SetStateAction<T>> }) {
  return <div className="form-fields single"><label>予約ID<input value={form.reservationId} placeholder="例: RSV-1047" onChange={event => onFormChange({ ...form, reservationId: event.target.value })}/></label></div>;
}

function CustomerRequestComplete({ title, message, onBack }: { title: string; message: string; onBack: () => void }) {
  return <div className="form-body complete"><span><Icon name="check"/></span><p className="form-kicker">REQUEST RECEIVED</p><h2>{title}</h2><p>{message}</p><button className="next" onClick={onBack}>トップに戻る</button></div>;
}

function ConfirmationContactPage({ reservations, windowDays, setWindowDays, isBulkContacting, onBulkConfirmationContact, onSelect }: { reservations: Reservation[]; windowDays: number; setWindowDays: (days: number) => void; isBulkContacting: boolean; onBulkConfirmationContact: () => Promise<void>; onSelect: (r: Reservation) => void }) {
  const changeWindowDays = (days: number) => setWindowDays(Math.max(1, Math.min(60, days)));
  return <section className="panel management-panel confirmation-panel">
    <div className="management-tools confirmation-tools">
      <div className="confirmation-window-control">
        <label>食事日まで<input type="number" min="1" max="60" value={windowDays} onChange={event => changeWindowDays(Number(event.target.value) || 1)}/><span>日未満</span></label>
      </div>
      <div className="segmented confirmation-presets"><button className={windowDays === 7 ? "active" : ""} onClick={() => changeWindowDays(7)}>初期値</button><button className={windowDays === 15 ? "active" : ""} onClick={() => changeWindowDays(15)}>15日未満</button><button className={windowDays === 30 ? "active" : ""} onClick={() => changeWindowDays(30)}>30日未満</button></div>
      <div className="result-count"><span>該当</span><strong>{reservations.length}</strong><span>件</span></div>
      <button className="confirmation-bulk-button" disabled={!reservations.length || isBulkContacting} onClick={onBulkConfirmationContact}><Icon name="check"/>{isBulkContacting ? "送信中" : "確認メール一括送信"}</button>
    </div>
    <div className="table-wrap"><table className="large-table"><thead><tr><th>食事日</th><th>予約ID / お客様</th><th>連絡先</th><th>人数</th><th>メニュー</th><th>担当店舗</th><th>期限</th><th/></tr></thead><tbody>{reservations.map(reservation => {
      const days = daysUntilVisit(reservation.date);
      return <tr key={reservation.id} onClick={() => onSelect(reservation)}><td><strong>{reservationDateTimeLabel(reservation)}</strong><small>{days === 0 ? "本日" : String(days) + "日後"}</small></td><td><strong>{reservation.id}</strong><small>{reservation.groupName ? `${reservation.customer} 様・${reservation.groupName}` : `${reservation.customer} 様`}</small></td><td><strong>{reservation.phone}</strong><small>{reservation.email ?? "customer@example.jp"}</small></td><td><strong>{reservation.people}名</strong></td><td>{reservationMenuLabel(reservation)}</td><td>{assignmentLabel(reservation) ? <strong>{assignmentLabel(reservation)}</strong> : <span className="unassigned">未割当</span>}</td><td><span className="badge amber"><i/>{windowDays}日未満</span></td><td><Icon name="arrow"/></td></tr>;
    })}</tbody></table>{!reservations.length && <div className="empty-table">確認連絡が必要な予約はありません。</div>}</div></section>;
}

function ReservationChangeRequestPage({ requests, reservations, onSelect, onApproveChangeRequest, onRejectChangeRequest }: { requests: ReservationChangeRequest[]; reservations: Reservation[]; onSelect: (reservation: Reservation) => void; onApproveChangeRequest: (id: string) => Promise<void>; onRejectChangeRequest: (id: string) => Promise<void> }) {
  return <section className="panel management-panel change-request-screen"><div className="change-request-head"><div className="result-count"><span>該当</span><strong>{requests.length}</strong><span>件</span></div></div>{requests.length > 0 ? <div className="table-wrap"><table className="large-table change-request-table"><thead><tr><th>予約ID</th><th>お客様</th><th>現在の内容</th><th>希望内容</th><th>理由</th><th/></tr></thead><tbody>{requests.map(request => {
    const reservation = reservations.find(item => item.id === request.reservationId);
    return <tr key={request.id} onClick={() => reservation && onSelect(reservation)}><td><strong>{request.reservationId}</strong><small>{new Date(request.requestedAt).toLocaleString("ja-JP")}</small></td><td><strong>{request.customer}</strong><small>{request.phone}</small></td><td><strong>{request.currentDate.replaceAll("-", "/")} {request.currentStartTime}</strong><small>{request.currentPeople}名・{request.currentMenuItems.length ? request.currentMenuItems.join("、") : "メニュー未選択"}</small></td><td><strong>{request.requestedDate.replaceAll("-", "/")} {request.requestedStartTime}</strong><small>{request.requestedPeople}名・{request.requestedMenuItems.length ? request.requestedMenuItems.join("、") : "メニュー未選択"}</small></td><td>{request.reason || "-"}</td><td><div className="row-actions compact"><button type="button" onClick={event => { event.stopPropagation(); onRejectChangeRequest(request.id); }}>却下</button><button type="button" className="primary" onClick={event => { event.stopPropagation(); onApproveChangeRequest(request.id); }}>承認</button></div></td></tr>;
  })}</tbody></table></div> : <div className="empty-table compact">未対応の予約変更承認はありません。</div>}</section>;
}

function MasterManagementPage({ onSelectMasterView }: { onSelectMasterView: (view: "customers" | "stores" | "menus") => void }) {
  return <section className="master-management-page"><div className="master-link-grid"><button type="button" onClick={() => onSelectMasterView("customers")}><Icon name="users"/><span><strong>顧客管理</strong></span><Icon name="arrow"/></button><button type="button" onClick={() => onSelectMasterView("stores")}><Icon name="store"/><span><strong>店舗管理</strong></span><Icon name="arrow"/></button><button type="button" onClick={() => onSelectMasterView("menus")}><Icon name="menu"/><span><strong>メニュー管理</strong></span><Icon name="arrow"/></button></div></section>;
}

function ConfirmedReservationRequestPage({ reservations, onSelect, updateStatus }: { reservations: Reservation[]; onSelect: (reservation: Reservation) => void; updateStatus: (id: string, status: Status, options?: { manualReason?: string }) => void }) {
  return <section className="panel management-panel change-request-screen"><div className="change-request-head"><div className="result-count"><span>該当</span><strong>{reservations.length}</strong><span>件</span></div></div>{reservations.length > 0 ? <div className="table-wrap"><table className="large-table change-request-table"><thead><tr><th>予約ID</th><th>お客様</th><th>現在のステータス</th><th>利用日時・人数</th><th>メニュー</th><th>担当店舗</th><th/></tr></thead><tbody>{reservations.map(reservation => <tr key={reservation.id} onClick={() => onSelect(reservation)}><td><strong>{reservation.id}</strong><small>{reservation.received}</small></td><td><strong>{reservation.customer}</strong>{reservationCustomerSubLabel(reservation) ? <small>{reservationCustomerSubLabel(reservation)}</small> : null}</td><td><span className={"badge " + statusClass[reservation.status]}><i/>{reservationDisplayLabel(reservation)}</span><small>{policyAgreementLabel(reservation)}</small></td><td><strong>{reservationDateTimeLabel(reservation)}</strong><small>{reservation.people}名</small></td><td>{reservationMenuLabel(reservation)}</td><td>{assignmentLabel(reservation) ? <strong>{assignmentLabel(reservation)}</strong> : <span className="unassigned">未割当</span>}</td><td><div className="row-actions compact"><button type="button" onClick={event => { event.stopPropagation(); updateStatus(reservation.id, STATUS.temporaryConfirmed); }}>却下</button><button type="button" className="primary" onClick={event => { event.stopPropagation(); updateStatus(reservation.id, STATUS.confirmed); }}>承認</button></div></td></tr>)}</tbody></table></div> : <div className="empty-table compact">未対応の本予約変更承認はありません。</div>}</section>;
}

function ReservationApprovalPage({ reservations, onSelect, updateStatus }: { reservations: Reservation[]; onSelect: (reservation: Reservation) => void; updateStatus: (id: string, status: Status, options?: { manualReason?: string }) => void }) {
  const approveStatus = (reservation: Reservation): Status | null => reservation.status === STATUS.temporaryRequested ? STATUS.temporaryConfirmed : reservation.status === STATUS.confirmedRequested ? STATUS.confirmed : null;
  const rejectStatus = (reservation: Reservation): Status | null => reservation.status === STATUS.temporaryRequested ? STATUS.temporaryRejected : reservation.status === STATUS.confirmedRequested ? isConfirmedReservationChangeRequest(reservation) ? STATUS.temporaryConfirmed : STATUS.confirmedRejected : null;
  return <section className="panel management-panel change-request-screen"><div className="change-request-head"><div className="result-count"><span>該当</span><strong>{reservations.length}</strong><span>件</span></div></div>{reservations.length > 0 ? <div className="table-wrap"><table className="large-table change-request-table"><thead><tr><th>予約ID</th><th>ステータス</th><th>お客様</th><th>利用日時・人数</th><th>メニュー</th><th>担当店舗</th><th/></tr></thead><tbody>{reservations.map(reservation => {
    const nextApprovalStatus = approveStatus(reservation);
    const nextRejectStatus = rejectStatus(reservation);
    return <tr key={reservation.id} onClick={() => onSelect(reservation)}><td><strong>{reservation.id}</strong><small>{reservation.received}</small></td><td><span className={"badge " + statusClass[reservation.status]}><i/>{reservationDisplayLabel(reservation)}</span></td><td><strong>{reservation.customer}</strong>{reservationCustomerSubLabel(reservation) ? <small>{reservationCustomerSubLabel(reservation)}</small> : null}</td><td><strong>{reservationDateTimeLabel(reservation)}</strong><small>{reservation.people}名</small></td><td>{reservationMenuLabel(reservation)}</td><td>{assignmentLabel(reservation) ? <strong>{assignmentLabel(reservation)}</strong> : <span className="unassigned">未割当</span>}</td><td><div className="row-actions compact">{nextRejectStatus && <button type="button" onClick={event => { event.stopPropagation(); updateStatus(reservation.id, nextRejectStatus); }}>却下</button>}{nextApprovalStatus && <button type="button" className="primary" onClick={event => { event.stopPropagation(); updateStatus(reservation.id, nextApprovalStatus); }}>承認</button>}</div></td></tr>;
  })}</tbody></table></div> : <div className="empty-table compact">未対応の予約承認はありません。</div>}</section>;
}

function CancellationApprovalPage({ reservations, onSelect, updateStatus }: { reservations: Reservation[]; onSelect: (reservation: Reservation) => void; updateStatus: (id: string, status: Status, options?: { manualReason?: string }) => void }) {
  return <section className="panel management-panel change-request-screen"><div className="change-request-head"><div className="result-count"><span>該当</span><strong>{reservations.length}</strong><span>件</span></div></div>{reservations.length > 0 ? <div className="table-wrap"><table className="large-table change-request-table"><thead><tr><th>予約ID</th><th>ステータス</th><th>お客様</th><th>利用日時・人数</th><th>メニュー</th><th>担当店舗</th><th/></tr></thead><tbody>{reservations.map(reservation => <tr key={reservation.id} onClick={() => onSelect(reservation)}><td><strong>{reservation.id}</strong><small>{reservation.received}</small></td><td><span className={"badge " + statusClass[reservation.status]}><i/>{reservationDisplayLabel(reservation)}</span></td><td><strong>{reservation.customer}</strong>{reservationCustomerSubLabel(reservation) ? <small>{reservationCustomerSubLabel(reservation)}</small> : null}</td><td><strong>{reservationDateTimeLabel(reservation)}</strong><small>{reservation.people}名</small></td><td>{reservationMenuLabel(reservation)}</td><td>{assignmentLabel(reservation) ? <strong>{assignmentLabel(reservation)}</strong> : <span className="unassigned">未割当</span>}</td><td><div className="row-actions compact"><button type="button" className="primary" onClick={event => { event.stopPropagation(); updateStatus(reservation.id, STATUS.cancelled); }}>キャンセル確定</button></div></td></tr>)}</tbody></table></div> : <div className="empty-table compact">未対応のキャンセル承認はありません。</div>}</section>;
}

function MenuPicker({ menuCatalog, selected, onChange }: { menuCatalog: Menu[]; selected: string[]; onChange: (items: string[]) => void }) {
  const toggle = (name: string) => {
    if (name === VISIT_MENU_NAME) {
      onChange(selected.includes(name) ? [] : [name]);
      return;
    }
    const withoutVisitMenu = selected.filter(item => item !== VISIT_MENU_NAME);
    onChange(selected.includes(name) ? withoutVisitMenu.filter(item => item !== name) : [...withoutVisitMenu, name]);
  };
  return <div className="menu-check-grid">{menuCatalog.map(menu => <button type="button" key={menu.name} className={selected.includes(menu.name) ? "selected" : ""} onClick={() => toggle(menu.name)}><span>{selected.includes(menu.name) && <Icon name="check"/>}</span><h3>{menu.name}</h3><p>{menu.description}</p><div><strong>{"¥"}{menu.price.toLocaleString()}</strong></div></button>)}</div>;
}

function ReservationDrawer({ reservation: r, onClose, updateStatus, updateConfirmationContact, assignStores, updateReservation, menuCatalog, stores }: { reservation: Reservation; onClose: () => void; updateStatus: (id: string, status: Status, options?: { manualReason?: string }) => void; updateConfirmationContact: (id: string, contactedAt: string | null, options?: { sendEmail?: boolean }) => Promise<void>; assignStores: (id: string, assignments: StoreAssignment[]) => void; updateReservation: (id: string, form: BookingForm) => Promise<Reservation>; menuCatalog: Menu[]; stores: Store[] }) {
  const initialEditForm = (): BookingForm => ({ menuItems: r.menuItems ?? (r.menu ? [r.menu] : []), date: r.date, startTime: r.startTime ?? DEFAULT_START_TIME, endTime: r.endTime ?? bookingFormEndTime({ startTime: r.startTime ?? DEFAULT_START_TIME, menuItems: r.menuItems ?? (r.menu ? [r.menu] : []) }, menuCatalog), people: r.people, name: r.customer, email: r.email ?? "", phone: r.phone, address: r.address ?? "", bookingType: r.bookingType ?? "individual", bookingContactName: r.bookingContactName ?? "", dayContactName: r.dayContactName ?? "", dayContactPhone: r.dayContactPhone ?? "", groupName: r.groupName ?? "", groupNameKana: r.groupNameKana ?? "", groupType: r.groupType ?? "", groupTypeOther: r.groupTypeOther ?? "", tcCount: r.tcCount ?? 0, dgCount: r.dgCount ?? 0, paymentCondition: r.paymentCondition ?? defaultPaymentCondition, remarks: r.remarks ?? "", status: r.status });
  const [isEditingReservation, setIsEditingReservation] = useState(false);
  const [editForm, setEditForm] = useState<BookingForm>(initialEditForm);
  const [isSavingReservation, setIsSavingReservation] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isManualStatusOpen, setIsManualStatusOpen] = useState(false);
  const [isConfirmingConfirmationEmail, setIsConfirmingConfirmationEmail] = useState(false);
  const [isSendingConfirmationEmail, setIsSendingConfirmationEmail] = useState(false);
  const [manualStatus, setManualStatus] = useState<Status>(r.status);
  const [manualStatusReason, setManualStatusReason] = useState("");
  const [assignmentDraft, setAssignmentDraft] = useState<StoreAssignment[]>(reservationAssignments(r).length ? reservationAssignments(r) : [{ store: "", people: r.people }]);
  const assignedPeople = assignmentDraft.reduce((total, assignment) => total + Number(assignment.people || 0), 0);
  const canSaveAssignments = assignmentDraft.length === 0 || (assignedPeople === r.people && assignmentDraft.every(assignment => assignment.store && assignment.people > 0));
  const canSaveReservation = Boolean(editForm.name && editForm.email && editForm.phone && editForm.date && editForm.startTime && editForm.people) && !isSavingReservation;
  const canSaveManualStatus = manualStatus !== r.status && manualStatusReason.trim().length > 0;
  const canUpdateConfirmationContact = r.status === STATUS.confirmed || r.status === STATUS.waitingForVisit || r.status === STATUS.visited;
  const nextActionComments = isConfirmedReservation(r) ? [
    !r.menuItems?.length && { title: "メニュー未確定", text: "予約内容を編集してメニューを確定してください。" },
    !reservationAssignments(r).length && { title: "店舗未割当", text: "店舗割当を編集して担当店舗を割り当ててください。" },
    !r.confirmationContactedAt && { title: "未確認連絡", text: "お客様へ確認連絡を行い、連絡済みにしてください。" },
  ].filter(Boolean) as { title: string; text: string }[] : [];
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
  const updateAssignment = (index: number, patch: Partial<StoreAssignment>) => setAssignmentDraft(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const removeAssignment = (index: number) => setAssignmentDraft(items => items.filter((_, itemIndex) => itemIndex !== index));
  const addAssignment = () => setAssignmentDraft(items => [...items, { store: "", people: Math.max(r.people - assignedPeople, 1) }]);
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
    updateStatus(r.id, manualStatus, { manualReason: manualStatusReason.trim() });
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
  const markConfirmationContactManually = () => updateConfirmationContact(r.id, new Date().toISOString(), { sendEmail: false });

  return <><div className="drawer-shade" onClick={onClose}/><aside className="drawer"><header><div><span className={"badge " + statusClass[r.status]}><i/>{reservationDisplayLabel(r)}</span><h2>{r.id}</h2></div><button onClick={onClose}><Icon name="close"/></button></header><div className="drawer-body">
    {isEditingReservation ? <section className="drawer-primary-action"><p className="section-label">予約内容を編集</p><div className="drawer-form single"><label>予約区分<select value={editForm.bookingType ?? "individual"} onChange={event => setEditForm({ ...editForm, bookingType: event.target.value as BookingForm["bookingType"], accountType: event.target.value === "travel_agency_group" ? "travel_agency" : "individual", tcCount: event.target.value === "travel_agency_group" ? editForm.tcCount ?? 0 : 0, dgCount: event.target.value === "travel_agency_group" ? editForm.dgCount ?? 0 : 0 })}><option value="individual">一般団体予約</option><option value="travel_agency_group">旅行会社様専用 団体予約</option></select></label><label>{isGroupBooking(editForm) ? "会社・支店名" : "お名前"}<input value={editForm.name} onChange={event => setEditForm({ ...editForm, name: event.target.value, companyBranchName: isGroupBooking(editForm) ? event.target.value : editForm.companyBranchName })}/></label><label>メールアドレス<input type="email" value={editForm.email} onChange={event => setEditForm({ ...editForm, email: event.target.value })}/></label><label>電話番号<input value={editForm.phone} onChange={event => setEditForm({ ...editForm, phone: event.target.value })}/></label><label>住所<input value={editForm.address} onChange={event => setEditForm({ ...editForm, address: event.target.value })}/></label></div>{isGroupBooking(editForm) && <GroupReservationFields form={editForm} setForm={setEditForm} /> }<div className="drawer-form"><label>利用日<input type="date" value={editForm.date} onChange={event => setEditForm({ ...editForm, date: event.target.value })}/></label><label>開始時間<input type="time" value={editForm.startTime} onChange={event => { const startTime = event.target.value; setEditForm({ ...editForm, startTime, endTime: bookingFormEndTime({ ...editForm, startTime, endTime: undefined }, menuCatalog) }); }}/></label><label>終了時間<input type="time" value={editForm.endTime ?? bookingFormEndTime(editForm, menuCatalog)} onChange={event => setEditForm({ ...editForm, endTime: event.target.value })}/></label><label>人数<input type="number" min="1" max="999" value={editForm.people} onChange={event => setEditForm({ ...editForm, people: Number(event.target.value) })}/></label></div><MenuPicker menuCatalog={menuCatalog} selected={editForm.menuItems} onChange={menuItems => setEditForm({ ...editForm, menuItems, endTime: bookingFormEndTime({ ...editForm, menuItems, endTime: undefined }, menuCatalog) })}/><PaymentAndRemarksFields form={editForm} setForm={setEditForm} /><div className="reservation-summary"><strong>{menuSelectionLabel(editForm.menuItems)}</strong><span>{bookingFormDateTimeLabel({ ...editForm, endTime: editForm.endTime ?? bookingFormEndTime(editForm, menuCatalog) })}・{editForm.people}名</span><small>{"¥"}{selectedMenuTotal(editForm.menuItems, menuCatalog).toLocaleString()}</small></div><div className="drawer-actions"><button onClick={cancelReservationEdit} disabled={isSavingReservation}>キャンセル</button><button className="approve" disabled={!canSaveReservation} onClick={saveReservationEdit}><Icon name="check"/>{isSavingReservation ? "保存中" : "保存する"}</button></div></section> : !isAssigning ? <>
      <section className="drawer-next-action"><p className="section-label">次のアクション</p>
        {r.status === STATUS.temporaryRequested && <button className="full-action" onClick={() => updateStatus(r.id, STATUS.temporaryConfirmed)}><Icon name="check"/>仮予約を承認する</button>}
        {r.status === STATUS.temporaryRequested && <button className="full-action danger" onClick={() => updateStatus(r.id, STATUS.temporaryRejected)}><Icon name="close"/>仮予約を却下する</button>}
        {r.status === STATUS.confirmedRequested && <button className="full-action" onClick={() => updateStatus(r.id, STATUS.confirmed)}><Icon name="check"/>本予約を承認する</button>}
        {r.status === STATUS.confirmedRequested && <button className="full-action danger" onClick={() => updateStatus(r.id, isConfirmedReservationChangeRequest(r) ? STATUS.temporaryConfirmed : STATUS.confirmedRejected)}><Icon name="close"/>{isConfirmedReservationChangeRequest(r) ? "本予約変更を却下する" : "本予約を却下する"}</button>}
        {r.status === STATUS.waitingForVisit && <button className="full-action" onClick={() => updateStatus(r.id, STATUS.visited)}><Icon name="check"/>来店済みにする</button>}
        {r.status === STATUS.cancellationRequested && <button className="full-action danger" onClick={() => { updateStatus(r.id, STATUS.cancelled); onClose(); }}>キャンセルを確定する</button>}
        {nextActionComments.length > 0 && <div className="next-action-notes">{nextActionComments.map(comment => <div className="next-action-note" key={comment.title}><strong>{comment.title}</strong><span>{comment.text}</span></div>)}</div>}
      </section>
      <section><p className="section-label">お客様情報</p><div className="customer-card"><span>{r.customer.slice(0,1)}</span><div><strong>{r.customer} 様</strong><small>{r.phone}<br/>{r.email ?? "customer@example.jp"}{r.address ? <><br/>{r.address}</> : null}</small></div></div></section>
      {r.bookingType === "travel_agency_group" && <section><p className="section-label">団体情報</p><dl><div><dt>担当者名</dt><dd>{r.bookingContactName || "-"}</dd></div><div><dt>当日責任者</dt><dd>{r.dayContactName || "-"}</dd></div><div><dt>当日責任者携帯</dt><dd>{r.dayContactPhone || "-"}</dd></div><div><dt>団体名</dt><dd>{r.groupName || "-"}</dd></div><div><dt>団体名ふりがな</dt><dd>{r.groupNameKana || "-"}</dd></div><div><dt>団体種別</dt><dd>{r.groupType === "その他" && r.groupTypeOther ? r.groupTypeOther : r.groupType || "-"}</dd></div><div><dt>T/C</dt><dd>{r.tcCount ?? 0}名</dd></div><div><dt>D/G</dt><dd>{r.dgCount ?? 0}名</dd></div></dl></section>}
      <section><p className="section-label">予約内容</p><dl><div><dt>利用日時</dt><dd>{reservationDateTimeLabel(r)}</dd></div><div><dt>予定人数</dt><dd>{r.people}名</dd></div><div><dt>メニュー</dt><dd>{reservationMenuLabel(r)}</dd></div><div><dt>金額</dt><dd>{"¥"}{(r.totalAmount ?? 0).toLocaleString()}</dd></div><div><dt>支払条件</dt><dd>{paymentConditionLabel(r.paymentCondition)}</dd></div>{r.remarks ? <div><dt>備考</dt><dd>{r.remarks}</dd></div> : null}<div><dt>同意確認</dt><dd>{policyAgreementLabel(r)}</dd></div></dl><button className="edit-reservation-button" onClick={() => setIsEditingReservation(true)}>予約内容を編集</button></section>
      <section><p className="section-label">店舗割当</p><dl><div><dt>割当状況</dt><dd>{assignmentLabel(r) || "未割当"}</dd></div><div><dt>割当人数</dt><dd>{reservationAssignments(r).reduce((total, assignment) => total + assignment.people, 0)}名 / {r.people}名</dd></div></dl><button className="edit-reservation-button" onClick={() => setIsAssigning(true)}>店舗割当を編集</button></section>
      {canUpdateConfirmationContact && <section><p className="section-label">確認連絡</p><dl><div><dt>連絡状況</dt><dd>{r.confirmationContactedAt ? "連絡済み" : "未連絡"}</dd></div></dl>{r.confirmationContactedAt ? <button className="edit-reservation-button" onClick={() => updateConfirmationContact(r.id, null)}>未連絡に戻す</button> : isConfirmingConfirmationEmail ? <div className="confirmation-send-confirm"><strong>確認メールを送信しますか？</strong><div><button type="button" disabled={isSendingConfirmationEmail} onClick={() => setIsConfirmingConfirmationEmail(false)}>キャンセル</button><button type="button" className="approve" disabled={isSendingConfirmationEmail || !r.email} onClick={sendConfirmationEmail}><Icon name="check"/>{isSendingConfirmationEmail ? "送信中" : "送信する"}</button></div></div> : <div className="confirmation-contact-actions"><button className="full-action" onClick={() => setIsConfirmingConfirmationEmail(true)}><Icon name="check"/>確認メール送信</button><button className="edit-reservation-button" onClick={markConfirmationContactManually}>手動で確認済みにする</button></div>}</section>}
      <section><p className="section-label">例外操作</p><button className="exception-toggle" type="button" onClick={() => setIsManualStatusOpen(current => !current)}><span><strong>任意のステータスに変更</strong></span><Icon name="arrow"/></button>{isManualStatusOpen && <div className="manual-status-panel drawer-form"><label>変更先ステータス<select value={manualStatus} onChange={event => setManualStatus(event.target.value as Status)}>{statusOptions.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label><label>変更理由<textarea value={manualStatusReason} onChange={event => setManualStatusReason(event.target.value)} placeholder="例: お客様から電話で変更依頼があったため"/></label><button className="full-action manual-status-submit" disabled={!canSaveManualStatus} onClick={saveManualStatus}><Icon name="check"/>ステータスを変更する</button></div>}</section>
    </> : <section className="drawer-primary-action"><p className="section-label">店舗割当を編集</p><div className="assignment-editor">{assignmentDraft.map((assignment, index) => <div className="assignment-row" key={index}><select value={assignment.store} onChange={event => updateAssignment(index, { store: event.target.value })}><option value="">店舗を選択</option>{stores.map(store => <option key={store.name} value={store.name}>{store.name}</option>)}</select><input type="number" min="1" max={r.people} value={assignment.people || ""} onChange={event => updateAssignment(index, { people: Number(event.target.value) })}/><span>名</span><button onClick={() => removeAssignment(index)}>削除</button></div>)}</div><button className="edit-reservation-button" onClick={addAssignment}>割当行を追加</button><div className={assignmentDraft.length === 0 || assignedPeople === r.people ? "assignment-total ok" : "assignment-total warn"}>{assignmentDraft.length === 0 ? "未割当として保存できます" : <>割当合計 {assignedPeople}名 / 予約人数 {r.people}名</>}</div><div className="drawer-actions"><button onClick={() => setIsAssigning(false)}>キャンセル</button><button className="approve" disabled={!canSaveAssignments} onClick={saveAssignments}><Icon name="check"/>保存する</button></div></section>}
  </div></aside></>;
}

function GroupReservationFields({ form, setForm }: { form: BookingForm; setForm: Dispatch<SetStateAction<BookingForm>> }) {
  return <section className="group-reservation-fields">
    <p className="section-label">団体情報</p>
    <div className="drawer-form single">
      <label>予約担当者名<input value={form.bookingContactName ?? ""} onChange={event => setForm(current => ({ ...current, bookingContactName: event.target.value, contactPersonName: event.target.value }))}/></label>
      <label>当日責任者名<input value={form.dayContactName ?? ""} onChange={event => setForm(current => ({ ...current, dayContactName: event.target.value }))}/></label>
      <label>当日責任者 携帯番号<input value={form.dayContactPhone ?? ""} onChange={event => setForm(current => ({ ...current, dayContactPhone: event.target.value }))}/></label>
      <label>団体名<input value={form.groupName ?? ""} onChange={event => setForm(current => ({ ...current, groupName: event.target.value }))}/></label>
      <label>団体名ふりがな<input value={form.groupNameKana ?? ""} onChange={event => setForm(current => ({ ...current, groupNameKana: event.target.value }))}/></label>
      <label>団体種別<select value={form.groupType ?? ""} onChange={event => setForm(current => ({ ...current, groupType: event.target.value }))}><option value="">選択してください</option>{groupTypeOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
      {form.groupType === "その他" && <label>団体種別 その他<input value={form.groupTypeOther ?? ""} onChange={event => setForm(current => ({ ...current, groupTypeOther: event.target.value }))}/></label>}<label>T/C<input type="number" min="0" max="999" value={form.tcCount ?? 0} onChange={event => setForm(current => ({ ...current, tcCount: Number(event.target.value) }))}/><small>添乗員・通訳ガイド様の現地でのお食事。（同食、同額となります。）</small></label><label>D/G<input type="number" min="0" max="999" value={form.dgCount ?? 0} onChange={event => setForm(current => ({ ...current, dgCount: Number(event.target.value) }))}/><small>ドライバー・ガイド様の持ち帰り弁当1,000円（税込）（店舗にとりに来ていただくようになります。）</small></label>
    </div>
  </section>;
}

function PaymentAndRemarksFields({ form, setForm }: { form: BookingForm; setForm: Dispatch<SetStateAction<BookingForm>> }) {
  return <div className="drawer-form single">
    <label>支払条件<select value={form.paymentCondition ?? defaultPaymentCondition} onChange={event => setForm(current => ({ ...current, paymentCondition: event.target.value as BookingForm["paymentCondition"] }))}>{paymentConditionOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <label>備考<textarea value={form.remarks ?? ""} onChange={event => setForm(current => ({ ...current, remarks: event.target.value }))}/></label>
  </div>;
}

function NewReservationDrawer({ form, setForm, onClose, onSubmit, menuCatalog }: { form: BookingForm; setForm: Dispatch<SetStateAction<BookingForm>>; onClose: () => void; onSubmit: () => void; menuCatalog: Menu[] }) {
  const groupReady = !isGroupBooking(form) || Boolean(form.bookingContactName && form.dayContactName && form.dayContactPhone && form.groupName && form.groupType);
  const canSubmit = Boolean(form.name && form.email && form.phone && form.date && form.startTime && form.people && groupReady);
  const total = selectedMenuTotal(form.menuItems, menuCatalog);

  return <><div className="drawer-shade" onClick={onClose}/><aside className="drawer new-reservation-drawer"><header><div><span className="badge blue"><i/>新規登録</span><h2>新規予約</h2></div><button onClick={onClose}><Icon name="close"/></button></header><div className="drawer-body">
    <section><p className="section-label">予約内容</p><div className="drawer-form"><label>登録時ステータス<select value={form.status ?? STATUS.temporaryRequested} onChange={event => setForm({ ...form, status: event.target.value as Status })}><option value={STATUS.confirmed}>{statusLabel(STATUS.confirmed)}</option><option value={STATUS.temporaryRequested}>{statusLabel(STATUS.temporaryRequested)}</option><option value={STATUS.temporaryConfirmed}>{statusLabel(STATUS.temporaryConfirmed)}</option><option value={STATUS.confirmedRequested}>{statusLabel(STATUS.confirmedRequested)}</option></select></label><label>予約区分<select value={form.bookingType ?? "individual"} onChange={event => setForm({ ...form, bookingType: event.target.value as BookingForm["bookingType"], accountType: event.target.value === "travel_agency_group" ? "travel_agency" : "individual", tcCount: event.target.value === "travel_agency_group" ? form.tcCount ?? 0 : 0, dgCount: event.target.value === "travel_agency_group" ? form.dgCount ?? 0 : 0 })}><option value="individual">一般団体予約</option><option value="travel_agency_group">旅行会社様専用 団体予約</option></select></label><label>利用日<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })}/></label><label>開始時間<input type="time" value={form.startTime} onChange={event => { const startTime = event.target.value; setForm({ ...form, startTime, endTime: bookingFormEndTime({ ...form, startTime, endTime: undefined }, menuCatalog) }); }}/></label><label>終了時間<input type="time" value={form.endTime ?? bookingFormEndTime(form, menuCatalog)} onChange={event => setForm({ ...form, endTime: event.target.value })}/></label><label>人数<input type="number" min="1" max="999" value={form.people} onChange={event => setForm({ ...form, people: Number(event.target.value) })}/></label></div></section>
    <section><p className="section-label">お客様情報</p><div className="drawer-form single"><label>{isGroupBooking(form) ? "会社・支店名" : "お名前"}<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value, companyBranchName: isGroupBooking(form) ? event.target.value : form.companyBranchName })}/></label><label>メールアドレス<input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></label><label>電話番号<input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })}/></label><label>住所<input value={form.address} onChange={event => setForm({ ...form, address: event.target.value })}/></label></div></section>
    {isGroupBooking(form) && <GroupReservationFields form={form} setForm={setForm} />}
    <section className="drawer-primary-action"><p className="section-label">任意メニュー</p><MenuPicker menuCatalog={menuCatalog} selected={form.menuItems} onChange={menuItems => setForm({ ...form, menuItems, endTime: bookingFormEndTime({ ...form, menuItems, endTime: undefined }, menuCatalog) })}/><PaymentAndRemarksFields form={form} setForm={setForm} /><div className="reservation-summary"><strong>{menuSelectionLabel(form.menuItems)}</strong><span>{bookingFormDateTimeLabel({ ...form, endTime: form.endTime ?? bookingFormEndTime(form, menuCatalog) })}・{form.people}名</span><small>{"¥"}{total.toLocaleString()}</small></div><button className="full-action" disabled={!canSubmit} onClick={onSubmit}><Icon name="check"/>予約を登録する</button></section>
  </div></aside></>;
}

type CustomerPortalMode = "home" | "account" | "reservation" | "confirmedChange" | "change" | "cancellation";
type CustomerContactRequestForm = { reservationId: string; email: string; phone: string };
type CustomerReservationChangeRequestForm = CustomerContactRequestForm & { requestedDate: string; requestedStartTime: string; requestedPeople: number; requestedMenuItems: string[]; reason: string };

function CustomerPortal({ initialMode, form, setForm, step, setStep, onAdmin, notify, toast, onSubmitReservation, onSubmitCancellation, onSubmitConfirmedReservationChange, onSubmitChangeRequest, menuCatalog }: { initialMode: CustomerPortalMode; form: BookingForm; setForm: Dispatch<SetStateAction<BookingForm>>; step:number; setStep:(n:number)=>void; onAdmin:()=>void; notify:(s:string)=>void; toast:string; onSubmitReservation:(form: BookingForm, options?: ReservationSubmitOptions)=>Promise<Reservation>; onSubmitCancellation:(input: { reservationId: string; email?: string; phone?: string }, options?: { authToken?: string })=>Promise<Reservation>; onSubmitConfirmedReservationChange:(input: { reservationId: string; email?: string; phone?: string }, options?: { authToken?: string })=>Promise<Reservation>; onSubmitChangeRequest:(input: { reservationId: string; email?: string; phone?: string; requestedDate: string; requestedStartTime: string; requestedPeople: number; requestedMenuItems: string[]; reason?: string }, options?: { authToken?: string })=>Promise<ReservationChangeRequest>; menuCatalog: Menu[] }) {
  const { customerUser, customerAuthLoading, customerAuthError, loginCustomer, registerCustomer, signOutCustomer } = useCustomerSession();
  const [portalMode, setPortalMode] = useState<CustomerPortalMode>(initialMode);
  const [bookingMode, setBookingMode] = useState<"login" | "register">("login");
  const [accountEmail, setAccountEmail] = useState(form.email);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [cancellationForm, setCancellationForm] = useState({ reservationId: "", email: "", phone: "" });
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);
  const [cancellationSubmitted, setCancellationSubmitted] = useState(false);
  const [confirmedChangeForm, setConfirmedChangeForm] = useState({ reservationId: "", email: "", phone: "" });
  const [isSubmittingConfirmedChange, setIsSubmittingConfirmedChange] = useState(false);
  const [confirmedChangeSubmitted, setConfirmedChangeSubmitted] = useState(false);
  const [changeRequestForm, setChangeRequestForm] = useState({ reservationId: "", email: "", phone: "", requestedDate: form.date, requestedStartTime: form.startTime, requestedPeople: form.people, requestedMenuItems: form.menuItems, reason: "" });
  const [isSubmittingChangeRequest, setIsSubmittingChangeRequest] = useState(false);
  const [changeRequestSubmitted, setChangeRequestSubmitted] = useState(false);
  const [accountReservations, setAccountReservations] = useState<Reservation[]>([]);
  const [isLoadingAccountReservations, setIsLoadingAccountReservations] = useState(false);
  const [accountReservationError, setAccountReservationError] = useState("");
  const total = selectedMenuTotal(form.menuItems, menuCatalog);
  const groupReady = !isGroupBooking(form) || Boolean(form.companyBranchName && form.bookingContactName && form.dayContactName && form.dayContactPhone && form.groupName && form.groupType);
  const canSubmit = Boolean(form.name && form.email && form.phone && form.date && form.startTime && form.people && groupReady);
  const canSubmitCancellation = Boolean(customerUser && cancellationForm.reservationId.trim()) && !isSubmittingCancellation;
  const canSubmitConfirmedChange = Boolean(customerUser && confirmedChangeForm.reservationId.trim()) && !isSubmittingConfirmedChange;
  const canSubmitChangeRequest = Boolean(customerUser && changeRequestForm.reservationId.trim() && changeRequestForm.requestedDate && changeRequestForm.requestedStartTime && changeRequestForm.requestedPeople) && !isSubmittingChangeRequest;

  useEffect(() => {
    setPortalMode(initialMode);
    if (initialMode === "reservation") setStep(1);
  }, [initialMode, setStep]);

  useEffect(() => {
    if (!customerUser) return;
    const loadCustomer = async () => {
      const token = await customerUser.getIdToken();
      const { customer } = await requestJson<{ customer: Customer | null }>("/api/customers/me", { authToken: token });
      setForm((current) => ({
        ...current,
        name: customer?.name || current.name,
        email: customer?.contact || customerUser.email || current.email,
        phone: customer?.phone || current.phone,
        address: customer?.address || current.address,
        accountType: customer?.accountType || current.accountType,
        companyBranchName: customer?.companyBranchName || current.companyBranchName,
        contactPersonName: customer?.contactPersonName || current.contactPersonName,
        bookingContactName: current.bookingContactName || customer?.contactPersonName || "",
      }));
      setAccountEmail(customer?.contact || customerUser.email || "");
    };
    loadCustomer().catch(() => notify("ログイン済みのお客様情報を取得できませんでした"));
  }, [customerUser, setForm]);

  useEffect(() => {
    if (portalMode !== "account" || !customerUser) return;
    const loadReservations = async () => {
      setIsLoadingAccountReservations(true);
      setAccountReservationError("");
      try {
        const token = await customerUser.getIdToken();
        const { reservations } = await requestJson<{ reservations: Reservation[] }>("/api/customers/me/reservations", { authToken: token });
        setAccountReservations(reservations);
      } catch {
        setAccountReservationError("予約情報を取得できませんでした。時間をおいて再度お試しください。");
      } finally {
        setIsLoadingAccountReservations(false);
      }
    };
    loadReservations();
  }, [customerUser, portalMode]);

  const selectBookingMode = (mode: "login" | "register") => {
    setBookingMode(mode);
    setAccountEmail(form.email);
  };

  const submitAccount = async () => {
    if (!accountEmail || !accountPassword || accountSubmitting) return;
    setAccountSubmitting(true);
    try {
      if (bookingMode === "register") {
        try {
          await registerCustomer(accountEmail, accountPassword);
          notify("アカウントを作成しました");
        } catch (error) {
          if (customerAuthErrorCode(error) === "auth/email-already-in-use") {
            await loginCustomer(accountEmail, accountPassword);
            notify("登録済みアカウントでログインしました");
          } else {
            throw error;
          }
        }
      } else {
        await loginCustomer(accountEmail, accountPassword);
        notify("ログインしました");
      }
      setForm((current) => ({ ...current, email: accountEmail }));
    } catch (error) {
      notify(error instanceof Error ? error.message : bookingMode === "register" ? "アカウント登録に失敗しました" : "ログインに失敗しました");
    } finally {
      setAccountSubmitting(false);
    }
  };

  const loginForAccountReservations = async () => {
    if (!accountEmail || !accountPassword || accountSubmitting) return;
    setAccountSubmitting(true);
    try {
      await loginCustomer(accountEmail, accountPassword);
      notify("ログインしました");
    } catch {
      notify("ログインに失敗しました");
    } finally {
      setAccountSubmitting(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    try {
      if (!customerUser) {
        notify("ログインまたはアカウント登録を完了してください");
        return;
      }
      const options: ReservationSubmitOptions = { customerAccountMode: "account", authToken: await customerUser.getIdToken() };
      const submitForm: BookingForm = isGroupBooking(form)
        ? { ...form, name: form.companyBranchName || form.name, accountType: "travel_agency", contactPersonName: form.contactPersonName || form.bookingContactName }
        : { ...form, accountType: "individual", bookingType: "individual", tcCount: 0, dgCount: 0 };
      const reservation = await onSubmitReservation(submitForm, options);
      notify("予約申請を受け付けました（" + reservation.id + "）");
      setStep(4);
    } catch (error) {
      notify(error instanceof Error ? error.message : "予約申請の保存に失敗しました");
    }
  };
  const submitCancellation = async () => {
    if (!canSubmitCancellation) return;
    setIsSubmittingCancellation(true);
    try {
      if (!customerUser) {
        notify("ログインしてください");
        return;
      }
      const authToken = await customerUser.getIdToken();
      const reservation = await onSubmitCancellation({
        reservationId: cancellationForm.reservationId.trim(),
        email: cancellationForm.email.trim() || undefined,
        phone: cancellationForm.phone.trim() || undefined,
      }, { authToken });
      notify("キャンセル申請を受け付けました（" + reservation.id + "）");
      setCancellationSubmitted(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : "キャンセル申請の保存に失敗しました");
    } finally {
      setIsSubmittingCancellation(false);
    }
  };
  const submitConfirmedChange = async () => {
    if (!canSubmitConfirmedChange) return;
    setIsSubmittingConfirmedChange(true);
    try {
      if (!customerUser) {
        notify("ログインしてください");
        return;
      }
      const authToken = await customerUser.getIdToken();
      const reservation = await onSubmitConfirmedReservationChange({
        reservationId: confirmedChangeForm.reservationId.trim(),
        email: confirmedChangeForm.email.trim() || undefined,
        phone: confirmedChangeForm.phone.trim() || undefined,
      }, { authToken });
      notify("本予約への変更申請を受け付けました（" + reservation.id + "）");
      setConfirmedChangeSubmitted(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : "本予約への変更申請の保存に失敗しました");
    } finally {
      setIsSubmittingConfirmedChange(false);
    }
  };
  const submitChangeRequest = async () => {
    if (!canSubmitChangeRequest) return;
    setIsSubmittingChangeRequest(true);
    try {
      if (!customerUser) {
        notify("ログインしてください");
        return;
      }
      const authToken = await customerUser.getIdToken();
      const request = await onSubmitChangeRequest({
        reservationId: changeRequestForm.reservationId.trim(),
        email: changeRequestForm.email.trim() || undefined,
        phone: changeRequestForm.phone.trim() || undefined,
        requestedDate: changeRequestForm.requestedDate,
        requestedStartTime: changeRequestForm.requestedStartTime,
        requestedPeople: changeRequestForm.requestedPeople,
        requestedMenuItems: changeRequestForm.requestedMenuItems,
        reason: changeRequestForm.reason.trim() || undefined,
      }, { authToken });
      notify("予約内容変更申請を受け付けました（" + request.reservationId + "）");
      setChangeRequestSubmitted(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : "予約内容変更申請の保存に失敗しました");
    } finally {
      setIsSubmittingChangeRequest(false);
    }
  };
  const startConfirmedChangeFromReservation = (reservation: Reservation) => {
    setConfirmedChangeForm({ reservationId: reservation.id, email: reservation.email ?? customerUser?.email ?? "", phone: reservation.phone });
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
    setCancellationForm({ reservationId: reservation.id, email: reservation.email ?? customerUser?.email ?? "", phone: reservation.phone });
    setCancellationSubmitted(false);
    setPortalMode("cancellation");
  };
  const customerRequestableStatuses: readonly Status[] = [STATUS.temporaryRequested, STATUS.temporaryConfirmed, STATUS.confirmedRequested, STATUS.confirmed, STATUS.waitingForVisit];
  const canRequestConfirmedChangeFromReservation = (reservation: Reservation) => reservation.status === STATUS.temporaryConfirmed;
  const canRequestChangeFromReservation = (reservation: Reservation) => customerRequestableStatuses.includes(reservation.status);
  const canRequestCancellationFromReservation = (reservation: Reservation) => customerRequestableStatuses.includes(reservation.status);
  const backToPortalHome = () => {
    setPortalMode("home");
    setStep(1);
    setCancellationSubmitted(false);
    setConfirmedChangeSubmitted(false);
    setChangeRequestSubmitted(false);
  };

  return <main className="customer-page restaurant-reservation">
    <header><div className="public-logo"><span>R</span><strong>Reserve</strong></div><nav><button onClick={onAdmin}>管理画面</button></nav></header>
    <section className="customer-hero restaurant-hero"><div><p>RESTAURANT RESERVATION</p><h1>{portalMode === "home" ? "お手続き" : portalMode === "account" ? "予約確認" : portalMode === "cancellation" ? "キャンセル申請" : portalMode === "confirmedChange" ? "本予約への変更申請" : portalMode === "change" ? "予約内容変更申請" : "予約フォーム"}</h1></div></section>
    <section className="booking-card">
      {portalMode === "home" && <div className="form-body narrow portal-entry"><p className="form-kicker">REQUEST</p><h2>お手続きを選択</h2><div className="portal-entry-grid"><button type="button" onClick={() => { setPortalMode("account"); setAccountReservationError(""); }}><strong>予約確認</strong><small>ログインして自分の予約を確認します</small></button><button type="button" onClick={() => { setPortalMode("reservation"); setStep(1); }}><strong>予約申請</strong><small>仮予約または本予約を申し込みます</small></button><button type="button" onClick={() => { setPortalMode("confirmedChange"); setConfirmedChangeSubmitted(false); }}><strong>本予約への変更申請</strong><small>確定済みの仮予約を本予約へ変更申請します</small></button><button type="button" onClick={() => { setPortalMode("change"); setChangeRequestSubmitted(false); }}><strong>予約内容変更申請</strong><small>受付済みの予約について日時・人数・メニューの変更を申請します</small></button><button type="button" onClick={() => { setPortalMode("cancellation"); setCancellationSubmitted(false); }}><strong>キャンセル申請</strong><small>受付済みの予約のキャンセルを申請します</small></button></div></div>}
      {portalMode === "account" && <CustomerReservationDashboard customerEmail={customerUser?.email ?? ""} isLoggedIn={Boolean(customerUser)} authError={customerAuthError} accountEmail={accountEmail} accountPassword={accountPassword} accountSubmitting={accountSubmitting} customerAuthLoading={customerAuthLoading} reservations={accountReservations} isLoading={isLoadingAccountReservations} reservationError={accountReservationError} canRequestConfirmedChange={canRequestConfirmedChangeFromReservation} canRequestChange={canRequestChangeFromReservation} canRequestCancellation={canRequestCancellationFromReservation} onBack={backToPortalHome} onAccountEmailChange={setAccountEmail} onAccountPasswordChange={setAccountPassword} onLogin={loginForAccountReservations} onLogout={() => { setAccountReservations([]); signOutCustomer(); }} onConfirmedChange={startConfirmedChangeFromReservation} onChange={startReservationChangeFromReservation} onCancellation={startCancellationFromReservation} />}
      {portalMode === "reservation" && <><button className="portal-back-button" type="button" onClick={backToPortalHome}>手続き選択へ戻る</button><div className="stepper">{["予約種別","日時・人数","お客様情報","受付完了"].map((label, index)=><div key={label} className={step >= index + 1 ? "active" : ""}><span>{step > index + 1 ? <Icon name="check"/> : index + 1}</span><small>{label}</small>{index < 3 && <i/>}</div>)}</div>
      {step === 1 && <div className="form-body narrow reservation-type-step"><p className="form-kicker">STEP 1</p><h2>予約種別を選択</h2><fieldset className="reservation-type-options"><legend>利用者区分</legend><button type="button" className={(form.bookingType ?? "individual") === "individual" ? "selected" : ""} onClick={() => setForm({ ...form, bookingType: "individual", accountType: "individual", tcCount: 0, dgCount: 0 })}><span className="radio-mark" aria-hidden="true"/><span><strong>一般団体予約</strong><small>学校・企業・各種団体・個人のお客様はこちら</small></span></button><button type="button" className={form.bookingType === "travel_agency_group" ? "selected" : ""} onClick={() => { setBookingMode("register"); setForm({ ...form, bookingType: "travel_agency_group", accountType: "travel_agency", companyBranchName: form.companyBranchName || form.name, bookingContactName: form.bookingContactName || form.contactPersonName || "" }); }}><span className="radio-mark" aria-hidden="true"/><span><strong>旅行会社様専用 団体予約</strong><small>旅行会社・旅行代理店の方はこちら</small></span></button></fieldset><fieldset className="reservation-type-options"><legend>予約種別</legend><button type="button" className={form.status === STATUS.confirmedRequested ? "selected" : ""} onClick={() => setForm({ ...form, status: STATUS.confirmedRequested })}><span className="radio-mark" aria-hidden="true"/><span><strong>本予約を申し込む</strong><small>正式な予約として申請します</small></span></button><button type="button" className={form.status === STATUS.temporaryRequested ? "selected" : ""} onClick={() => setForm({ ...form, status: STATUS.temporaryRequested })}><span className="radio-mark" aria-hidden="true"/><span><strong>仮予約として相談する</strong><small>日程を仮押さえして相談します</small></span></button></fieldset><div className="form-nav"><span/><button className="next" onClick={() => setStep(2)}>日時へ <Icon name="arrow"/></button></div></div>}
      {step === 2 && <div className="form-body narrow"><p className="form-kicker">STEP 2</p><h2>日時と人数</h2><div className="form-fields reservation-date-fields"><label>利用日<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })}/></label><label>開始時間<input type="time" value={form.startTime} onChange={event => setForm({ ...form, startTime: event.target.value })}/></label><label>人数<input type="number" min="1" max="999" value={form.people} onChange={event => setForm({ ...form, people: Number(event.target.value) })}/></label></div><MenuPicker menuCatalog={menuCatalog} selected={form.menuItems} onChange={menuItems => setForm({ ...form, menuItems })}/><div className="reservation-summary"><strong>終了予定 {bookingFormEndTime(form, menuCatalog)}</strong><span>{bookingFormDateTimeLabel({ ...form, endTime: bookingFormEndTime(form, menuCatalog) })}・{form.people}名</span></div><div className="form-nav"><button onClick={() => setStep(1)}>戻る</button><button className="next" disabled={!form.date || !form.startTime || !form.people} onClick={() => setStep(3)}>お客様情報へ <Icon name="arrow"/></button></div></div>}
      {step === 3 && <div className="form-body narrow"><p className="form-kicker">STEP 3</p><h2>お客様情報</h2>
        <section className="customer-account-panel">
          {customerUser ? (
            <div className="customer-account-current"><span>{customerAuthLoading ? "確認中" : "ログイン中"}</span><strong>{customerUser.email}</strong><button type="button" onClick={() => signOutCustomer()}>ログアウト</button></div>
          ) : (
            <>
              <div className="customer-booking-mode-grid">
                <button type="button" className={`customer-booking-mode-card ${bookingMode === "login" ? "selected" : ""}`} onClick={() => selectBookingMode("login")}><strong>ログイン</strong><small>登録済みのお客様情報を使います</small></button>
                <button type="button" className={`customer-booking-mode-card ${bookingMode === "register" ? "selected" : ""}`} onClick={() => selectBookingMode("register")}><strong>アカウント登録して予約する</strong><small>次回から入力を省けます</small></button>
              </div>
              <div className="customer-account-form">
                <input type="email" placeholder="メールアドレス" value={accountEmail} onChange={event => setAccountEmail(event.target.value)} />
                <input type="password" placeholder="パスワード" value={accountPassword} onChange={event => setAccountPassword(event.target.value)} />
                <button type="button" disabled={!accountEmail || !accountPassword || accountSubmitting} onClick={submitAccount}>{accountSubmitting ? "確認中" : bookingMode === "register" ? "登録" : "ログイン"}</button>
              </div>
            </>
          )}
          {customerAuthError ? <div className="auth-error">{customerAuthError}</div> : null}
        </section>
        <div className="form-fields single"><label>{isGroupBooking(form) ? "会社・支店名" : "お名前"}<input value={isGroupBooking(form) ? form.companyBranchName ?? form.name : form.name} onChange={event => setForm({ ...form, name: isGroupBooking(form) ? event.target.value : event.target.value, companyBranchName: isGroupBooking(form) ? event.target.value : form.companyBranchName })}/></label>{isGroupBooking(form) && <label>担当者名<input value={form.contactPersonName ?? ""} onChange={event => setForm({ ...form, contactPersonName: event.target.value, bookingContactName: form.bookingContactName || event.target.value })}/></label>}<label>メールアドレス<input type="email" value={form.email} onChange={event => { setForm({ ...form, email: event.target.value }); setAccountEmail(event.target.value); }}/></label><label>電話番号<input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })}/></label><label>住所<input value={form.address} onChange={event => setForm({ ...form, address: event.target.value })}/></label></div>{isGroupBooking(form) && <GroupReservationFields form={form} setForm={setForm} />}<PaymentAndRemarksFields form={form} setForm={setForm} /><div className="confirm-box"><span>{bookingFormDateTimeLabel({ ...form, endTime: bookingFormEndTime(form, menuCatalog) })}・{form.people}名</span><strong>{isGroupBooking(form) ? form.groupName || "団体名未入力" : menuSelectionLabel(form.menuItems)}</strong><small>{statusLabel(form.status ?? STATUS.confirmedRequested)}・{"¥"}{total.toLocaleString()}</small></div><div className="form-nav"><button onClick={() => setStep(2)}>戻る</button><button className="next" disabled={!canSubmit || !customerUser} onClick={submit}>この内容で申請する <Icon name="arrow"/></button></div></div>}
      {step === 4 && <div className="form-body complete"><span><Icon name="check"/></span><p className="form-kicker">REQUEST RECEIVED</p><h2>予約申請を受け付けました</h2><p>内容を確認後、予約可否をご連絡します。</p><button className="next" onClick={backToPortalHome}>トップに戻る</button></div>}</>}
      {isCustomerRequestMode(portalMode) && !customerUser ? <CustomerRequestLoginPanel authError={customerAuthError} accountEmail={accountEmail} accountPassword={accountPassword} accountSubmitting={accountSubmitting} customerAuthLoading={customerAuthLoading} onBack={backToPortalHome} onAccountEmailChange={setAccountEmail} onAccountPasswordChange={setAccountPassword} onLogin={loginForAccountReservations} /> : <CustomerRequestForms mode={portalMode} confirmedChangeForm={confirmedChangeForm} changeRequestForm={changeRequestForm} cancellationForm={cancellationForm} confirmedChangeSubmitted={confirmedChangeSubmitted} changeRequestSubmitted={changeRequestSubmitted} cancellationSubmitted={cancellationSubmitted} isSubmittingConfirmedChange={isSubmittingConfirmedChange} isSubmittingChangeRequest={isSubmittingChangeRequest} isSubmittingCancellation={isSubmittingCancellation} canSubmitConfirmedChange={canSubmitConfirmedChange} canSubmitChangeRequest={canSubmitChangeRequest} canSubmitCancellation={canSubmitCancellation} menuCatalog={menuCatalog} onBack={backToPortalHome} onConfirmedChangeFormChange={setConfirmedChangeForm} onChangeRequestFormChange={setChangeRequestForm} onCancellationFormChange={setCancellationForm} onSubmitConfirmedChange={submitConfirmedChange} onSubmitChangeRequest={submitChangeRequest} onSubmitCancellation={submitCancellation} />}
    </section>
    {toast && <div className="toast"><Icon name="check"/>{toast}</div>}
  </main>;
}

function isCustomerRequestMode(mode: CustomerPortalMode) {
  return mode === "confirmedChange" || mode === "change" || mode === "cancellation";
}

function CustomerRequestLoginPanel({ authError, accountEmail, accountPassword, accountSubmitting, customerAuthLoading, onBack, onAccountEmailChange, onAccountPasswordChange, onLogin }: { authError: string; accountEmail: string; accountPassword: string; accountSubmitting: boolean; customerAuthLoading: boolean; onBack: () => void; onAccountEmailChange: (value: string) => void; onAccountPasswordChange: (value: string) => void; onLogin: () => void }) {
  return <>
    <button className="portal-back-button" type="button" onClick={onBack}>手続き選択へ戻る</button>
    <div className="form-body narrow cancellation-form">
      <p className="form-kicker">LOGIN REQUIRED</p>
      <h2>ログインしてください</h2>
      <section className="customer-account-panel">
        <div className="customer-account-form">
          <input type="email" placeholder="メールアドレス" value={accountEmail} onChange={event => onAccountEmailChange(event.target.value)} />
          <input type="password" placeholder="パスワード" value={accountPassword} onChange={event => onAccountPasswordChange(event.target.value)} />
          <button type="button" disabled={accountSubmitting || customerAuthLoading} onClick={onLogin}>{accountSubmitting ? "確認中" : "ログイン"}</button>
        </div>
        {authError ? <div className="auth-error">{authError}</div> : null}
      </section>
    </div>
  </>;
}

