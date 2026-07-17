"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReservationStatus } from "@/lib/domain";

type Status = ReservationStatus;
type StoreAssignment = { store: string; people: number };
type PolicyAgreement = { kind: "temporary" | "confirmed"; acceptedAt: string };
type Reservation = { id: string; customer: string; email?: string; date: string; startTime?: string; people: number; menu?: string; menuItems?: string[]; totalAmount?: number; store: string | null; storeAssignments?: StoreAssignment[]; status: Status; policyAgreement?: PolicyAgreement; confirmationContactedAt?: string | null; received: string; phone: string };
type Menu = { name: string; description: string; price: number; duration: string };
type Customer = { name: string; contact: string; phone: string; count: number; last: string };
type Store = { name: string; area: string; today: number; month: number; state: string };
type BookingForm = { menuItems: string[]; date: string; startTime: string; people: number; name: string; email: string; phone: string; status?: Status; policyAgreement?: PolicyAgreement };
type MenuForm = Menu;
type CustomerForm = { name: string; contact: string; phone: string };
type StoreForm = Store;
type View = "dashboard" | "reservations" | "confirmationContacts" | "customers" | "stores" | "menus" | "billing";
type ReservationFilter = "すべて" | "承認待ち" | "仮予約確定" | "仮予約確定（期限切れ）" | "本予約確定" | "本予約確定（メニュー未確定）" | "本予約確定（店舗未割当）" | "本予約確定（未確認連絡）" | "本予約確定（来店待ち）";
type ReservationSortKey = "status" | "id" | "customer" | "date" | "menu" | "store" | "contact";
type SortDirection = "asc" | "desc";
const VISIT_MENU_NAME = "来店後に注文";
const DEFAULT_START_TIME = "10:00";
const STATUS = {
  temporaryRequested: "temporary_requested",
  temporaryConfirmed: "temporary_confirmed",
  confirmedRequested: "confirmed_requested",
  confirmed: "confirmed",
  waitingForVisit: "waiting_for_visit",
  visited: "visited",
  cancellationRequested: "cancellation_requested",
  cancelled: "cancelled",
} as const satisfies Record<string, Status>;

const statusLabels: Record<Status, string> = {
  temporary_requested: "仮予約申請中",
  temporary_confirmed: "仮予約確定",
  confirmed_requested: "本予約申請中",
  confirmed: "本予約確定",
  waiting_for_visit: "来店待ち",
  visited: "来店済",
  cancellation_requested: "キャンセル申請中",
  cancelled: "キャンセル確定",
};

const initialReservations: Reservation[] = [
  { id: "RSV-1048", customer: "山田 美咲", date: "2026-07-12", people: 2, menuItems: ["前菜盛り合わせ", "パスタランチ"], totalAmount: 7600, store: null, status: STATUS.temporaryRequested, received: "7月8日 09:42", phone: "090-1234-5678" },
  { id: "RSV-1047", customer: "佐藤 健太", date: "2026-07-10", people: 1, menuItems: ["季節のコース"], totalAmount: 6600, store: "渋谷店", status: STATUS.waitingForVisit, received: "7月7日 18:10", phone: "080-2345-6789" },
  { id: "RSV-1046", customer: "鈴木 由佳", date: "2026-07-15", people: 3, menuItems: ["飲み放題プラン", "記念日プレート"], totalAmount: 16800, store: "新宿店", status: STATUS.confirmed, received: "7月7日 14:25", phone: "070-3456-7890" },
  { id: "RSV-1045", customer: "高橋 直人", date: "2026-07-09", people: 2, menuItems: ["パスタランチ"], totalAmount: 4000, store: "渋谷店", status: STATUS.cancellationRequested, received: "7月6日 11:03", phone: "090-4567-8901" },
  { id: "RSV-1044", customer: "伊藤 結衣", date: "2026-07-08", people: 1, menuItems: ["前菜盛り合わせ", "記念日プレート"], totalAmount: 4200, store: "横浜店", status: STATUS.visited, received: "7月5日 16:30", phone: "080-5678-9012" },
];

const defaultMenus: Menu[] = [
  { name: "前菜盛り合わせ", description: "季節野菜と小皿料理の盛り合わせ", price: 1800, duration: "15分" },
  { name: "パスタランチ", description: "本日のパスタ、サラダ、ドリンク付き", price: 2000, duration: "45分" },
  { name: "季節のコース", description: "前菜、メイン、デザートまで楽しめるコース", price: 6600, duration: "90分" },
  { name: "飲み放題プラン", description: "コースに追加できる90分飲み放題", price: 2800, duration: "90分" },
  { name: "記念日プレート", description: "メッセージ付きデザートプレート", price: 2400, duration: "10分" },
  { name: VISIT_MENU_NAME, description: "来店後にメニューを注文します", price: 0, duration: "来店後" },
];

const defaultStores: Store[] = [
  { name:"渋谷店", area:"東京都渋谷区", today:4, month:48, state:"営業中" },
  { name:"新宿店", area:"東京都新宿区", today:3, month:41, state:"営業中" },
  { name:"横浜店", area:"神奈川県横浜市", today:1, month:35, state:"営業中" },
];

const statusClass: Record<Status, string> = {
  temporary_requested: "amber",
  temporary_confirmed: "blue",
  confirmed_requested: "violet",
  confirmed: "green",
  waiting_for_visit: "cyan",
  visited: "gray",
  cancellation_requested: "red",
  cancelled: "red",
};
const statusOptions: Status[] = [STATUS.temporaryRequested, STATUS.temporaryConfirmed, STATUS.confirmedRequested, STATUS.confirmed, STATUS.waitingForVisit, STATUS.visited, STATUS.cancellationRequested, STATUS.cancelled];
const approvalStatuses: readonly Status[] = [STATUS.temporaryRequested, STATUS.confirmedRequested, STATUS.cancellationRequested];

function statusLabel(status: Status) {
  return statusLabels[status] ?? status;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function reservationMenuLabel(reservation: Reservation) {
  const items = reservation.menuItems?.length ? reservation.menuItems : reservation.menu ? [reservation.menu] : [];
  return menuSelectionLabel(items);
}

function policyAgreementLabel(reservation: Reservation) {
  if (!reservation.policyAgreement) return "未同意";
  const label = reservation.policyAgreement.kind === "temporary" ? "仮予約の注意事項" : "キャンセルポリシー";
  return `${label}に同意済み（${new Date(reservation.policyAgreement.acceptedAt).toLocaleString("ja-JP")}）`;
}

function menuSelectionLabel(menuItems: string[]) {
  return menuItems.length ? menuItems.join("、") : "メニュー未確定";
}

function reservationStartTime(reservation: Pick<Reservation, "startTime">) {
  return reservation.startTime || DEFAULT_START_TIME;
}

function reservationDateTimeLabel(reservation: Pick<Reservation, "date" | "startTime">) {
  return `${reservation.date.replaceAll("-", "/")} ${reservationStartTime(reservation)}`;
}

function bookingFormDateTimeLabel(form: Pick<BookingForm, "date" | "startTime">) {
  return `${form.date.replaceAll("-", "/")} ${form.startTime || DEFAULT_START_TIME}`;
}

function parseIsoDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function daysUntilVisit(date: string) {
  const visitDate = parseIsoDate(date);
  const today = parseIsoDate(todayIso());
  if (Number.isNaN(visitDate.getTime())) return Number.POSITIVE_INFINITY;
  return Math.ceil((visitDate.getTime() - today.getTime()) / 86400000);
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

function isConfirmedReservation(reservation: Reservation) {
  return reservation.status === STATUS.confirmed || reservation.status === STATUS.waitingForVisit;
}

function reservationAssignments(reservation: Reservation): StoreAssignment[] {
  return reservation.storeAssignments?.length
    ? reservation.storeAssignments
    : reservation.store
      ? [{ store: reservation.store, people: reservation.people }]
      : [];
}

function assignmentLabel(reservation: Reservation) {
  const assignments = reservationAssignments(reservation);
  return assignments.length ? assignments.map((assignment) => `${assignment.store} ${assignment.people}名`).join(" / ") : "";
}

function isVisitReadyReservation(reservation: Reservation) {
  return isConfirmedReservation(reservation) && Boolean(reservation.menuItems?.length) && Boolean(reservationAssignments(reservation).length) && Boolean(reservation.confirmationContactedAt);
}

function isConfirmationContactDue(reservation: Reservation, windowDays: number) {
  const days = daysUntilVisit(reservation.date);
  return reservation.status === STATUS.confirmed && !reservation.confirmationContactedAt && days >= 0 && days < windowDays;
}

function isTemporaryReservationExpired(reservation: Reservation) {
  if (reservation.status !== STATUS.temporaryConfirmed) return false;
  const visitDate = parseIsoDate(reservation.date);
  if (Number.isNaN(visitDate.getTime())) return false;
  return visitDate < addCalendarMonths(parseIsoDate(todayIso()), 1);
}

function reservationStatusLabel(reservation: Reservation) {
  if (isTemporaryReservationExpired(reservation)) return "仮予約確定（期限切れ）";
  return isVisitReadyReservation(reservation) ? "本予約確定（来店待ち）" : statusLabel(reservation.status);
}

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function monthIso(date: string) {
  return date.slice(0, 7);
}

function dateHeadingLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}

function selectedMenuTotal(menuItems: string[], menuCatalog: Menu[]) {
  return menuItems.reduce((total, name) => total + (menuCatalog.find(menu => menu.name === name)?.price ?? 0), 0);
}

function buildCustomers(reservations: Reservation[]): Customer[] {
  const grouped = new Map<string, Customer>();
  reservations.forEach((reservation) => {
    const current = grouped.get(reservation.customer);
    grouped.set(reservation.customer, {
      name: reservation.customer,
      contact: reservation.email ?? current?.contact ?? "customer@example.jp",
      phone: reservation.phone,
      count: (current?.count ?? 0) + 1,
      last: reservation.date.replaceAll("-", "/"),
    });
  });
  return Array.from(grouped.values());
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>, users: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></>,
    store: <><path d="M3 9l2-5h14l2 5"/><path d="M5 13v8h14v-8M9 21v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>, bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>, check: <path d="m5 12 4 4L19 6"/>, close: <path d="M18 6 6 18M6 6l12 12"/>, plus: <path d="M12 5v14M5 12h14"/>, search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export default function Home() {
  const [role, setRole] = useState<"admin" | "customer">("admin");
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
  const [stores, setStores] = useState<Store[]>(defaultStores);
  const [form, setForm] = useState<BookingForm>({ menuItems: [], date: "2026-07-12", startTime: DEFAULT_START_TIME, people: 2, name: "", email: "", phone: "", status: STATUS.confirmedRequested });
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [isBulkContacting, setIsBulkContacting] = useState(false);
  const [confirmationContactWindowDays, setConfirmationContactWindowDays] = useState(7);
  const [adminForm, setAdminForm] = useState<BookingForm>({ menuItems: [], date: "2026-07-12", startTime: DEFAULT_START_TIME, people: 2, name: "", email: "", phone: "", status: STATUS.confirmed });

  useEffect(() => {
    requestJson<{ reservations: Reservation[] }>("/api/reservations")
      .then(({ reservations }) => setReservations(reservations))
      .catch(() => notify("予約データの読み込みに失敗しました"));
    requestJson<{ menus: Menu[] }>("/api/menus")
      .then(({ menus }) => setMenuCatalog(menus))
      .catch(() => notify("メニューデータの読み込みに失敗しました"));
    requestJson<{ stores: Store[] }>("/api/stores")
      .then(({ stores }) => setStores(stores))
      .catch(() => notify("店舗データの読み込みに失敗しました"));
  }, []);

  const visible = useMemo(() => filter === "すべて" ? reservations : reservations.filter(r => r.status.includes(filter)), [filter, reservations]);
  const customers = useMemo(() => buildCustomers(reservations), [reservations]);
  const taskCounts = useMemo(() => ({
    approvals: reservations.filter(reservation => approvalStatuses.includes(reservation.status)).length,
    temporaryExpired: reservations.filter(isTemporaryReservationExpired).length,
    storeUnassigned: reservations.filter(reservation => isConfirmedReservation(reservation) && !reservationAssignments(reservation).length).length,
    menuUnselected: reservations.filter(reservation => isConfirmedReservation(reservation) && !(reservation.menuItems?.length)).length,
    preContact: reservations.filter(reservation => isConfirmedReservation(reservation) && !reservation.confirmationContactedAt).length,
    preContactDue: reservations.filter(reservation => isConfirmationContactDue(reservation, confirmationContactWindowDays)).length,
  }), [confirmationContactWindowDays, reservations]);
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
  const updateStatus = async (id: string, status: Status) => {
    setReservations(rs => rs.map(r => r.id === id ? { ...r, status } : r));
    setSelected(s => s?.id === id ? { ...s, status } : s);
    try {
      const { reservation } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
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
      const { reservation } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/store`, { method: "PATCH", body: JSON.stringify({ assignments }) });
      if (reservation.status === STATUS.confirmed && isVisitReadyReservation(reservation)) {
        const { reservation: progressed } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: STATUS.waitingForVisit }) });
        setReservations(rs => rs.map(r => r.id === id ? progressed : r));
        setSelected(s => s?.id === id ? progressed : s);
        notify("メニュー・店舗割当・確認連絡が完了したため、本予約確定（来店待ち）にしました");
        return;
      }
      if (reservation.status === STATUS.waitingForVisit && !isVisitReadyReservation(reservation)) {
        const { reservation: reverted } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: STATUS.confirmed }) });
        setReservations(rs => rs.map(r => r.id === id ? reverted : r));
        setSelected(s => s?.id === id ? reverted : s);
        notify("店舗割当を未割当に戻したため、本予約確定に戻しました");
        return;
      }
      setReservations(rs => rs.map(r => r.id === id ? reservation : r));
      setSelected(s => s?.id === id ? reservation : s);
      notify(reservation.status === STATUS.confirmed ? "店舗割当を保存しました。メニュー選択と確認連絡後に本予約確定（来店待ち）へ進みます" : "店舗割当を保存しました");
    } catch {
      notify("店舗割当の保存に失敗しました");
    }
  };
  const createReservation = async (input: BookingForm) => {
    const { reservation } = await requestJson<{ reservation: Reservation }>("/api/reservations", { method: "POST", body: JSON.stringify(input) });
    setReservations(rs => [reservation, ...rs.filter(r => r.id !== reservation.id)]);
    return reservation;
  };
  const updateReservation = async (id: string, input: BookingForm) => {
    const { reservation } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        date: input.date,
        startTime: input.startTime,
        people: input.people,
        menuItems: input.menuItems,
        customer: input.name,
        email: input.email,
        phone: input.phone,
      }),
    });
    setReservations(rs => rs.map(r => r.id === id ? reservation : r));
    setSelected(s => s?.id === id ? reservation : s);
    if (reservation.status === STATUS.confirmed && isVisitReadyReservation(reservation)) {
      const { reservation: progressed } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: STATUS.waitingForVisit }) });
      setReservations(rs => rs.map(r => r.id === id ? progressed : r));
      setSelected(s => s?.id === id ? progressed : s);
      notify("メニュー・店舗割当・確認連絡が完了したため、本予約確定（来店待ち）にしました");
      return progressed;
    }
    notify(`予約内容を更新しました（${id}）`);
    return reservation;
  };
  const saveConfirmationContact = async (id: string, contactedAt: string | null) => {
    const { reservation } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/confirmation-contact`, {
      method: "PATCH",
      body: JSON.stringify({ contactedAt }),
    });
    if (reservation.status === STATUS.confirmed && isVisitReadyReservation(reservation)) {
      const { reservation: progressed } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: STATUS.waitingForVisit }) });
      setReservations(rs => rs.map(r => r.id === id ? progressed : r));
      setSelected(s => s?.id === id ? progressed : s);
      return progressed;
    }
    if (!contactedAt && reservation.status === STATUS.waitingForVisit) {
      const { reservation: reverted } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: STATUS.confirmed }) });
      setReservations(rs => rs.map(r => r.id === id ? reverted : r));
      setSelected(s => s?.id === id ? reverted : s);
      return reverted;
    }
    setReservations(rs => rs.map(r => r.id === id ? reservation : r));
    setSelected(s => s?.id === id ? reservation : s);
    return reservation;
  };
  const updateConfirmationContact = async (id: string, contactedAt: string | null) => {
    const reservation = await saveConfirmationContact(id, contactedAt);
    if (contactedAt && reservation.status === STATUS.waitingForVisit) {
      notify("メニュー・店舗割当・確認連絡が完了したため、本予約確定（来店待ち）にしました");
      return;
    }
    if (!contactedAt && reservation.status === STATUS.confirmed) {
      notify("確認連絡を未実施に戻したため、本予約確定に戻しました");
      return;
    }
    notify(contactedAt ? "確認連絡済みに更新しました" : "確認連絡を未実施に戻しました");
  };
  const bulkUpdateConfirmationContacts = async () => {
    if (!confirmationContactTargets.length || isBulkContacting) return;
    const ok = window.confirm(`${confirmationContactTargets.length}件を確認連絡済みにします。よろしいですか？`);
    if (!ok) return;
    setIsBulkContacting(true);
    try {
      const contactedAt = new Date().toISOString();
      const updated = await Promise.all(confirmationContactTargets.map(reservation => saveConfirmationContact(reservation.id, contactedAt)));
      notify(`${updated.length}件を確認連絡済みにしました`);
    } catch {
      notify("一括確認連絡の保存に失敗しました");
    } finally {
      setIsBulkContacting(false);
    }
  };
  const saveMenu = async (input: MenuForm, originalName?: string) => {
    const url = originalName ? `/api/menus/${encodeURIComponent(originalName)}` : "/api/menus";
    const method = originalName ? "PATCH" : "POST";
    const { menu } = await requestJson<{ menu: Menu }>(url, { method, body: JSON.stringify(input) });
    setMenuCatalog(items => originalName ? items.map(item => item.name === originalName ? menu : item) : [...items, menu]);
    setReservations(rs => originalName && originalName !== menu.name ? rs.map(r => ({ ...r, menuItems: (r.menuItems ?? []).map(item => item === originalName ? menu.name : item) })) : rs);
    notify(originalName ? "メニューを更新しました" : "メニューを追加しました");
  };
  const deleteMenu = async (name: string) => {
    await requestJson<{ ok: boolean }>(`/api/menus/${encodeURIComponent(name)}`, { method: "DELETE" });
    setMenuCatalog(items => items.filter(item => item.name !== name));
    setReservations(rs => rs.map(r => ({ ...r, menuItems: (r.menuItems ?? []).filter(item => item !== name) })));
    notify("メニューを削除しました");
  };
  const saveCustomer = async (originalName: string, input: CustomerForm) => {
    const { customer } = await requestJson<{ customer: Customer }>(`/api/customers/${encodeURIComponent(originalName)}`, { method: "PATCH", body: JSON.stringify(input) });
    setReservations(rs => rs.map(r => r.customer === originalName ? { ...r, customer: customer.name, email: customer.contact, phone: customer.phone } : r));
    setSelected(s => s?.customer === originalName ? { ...s, customer: customer.name, email: customer.contact, phone: customer.phone } : s);
    notify(`${customer.name}様の顧客情報を更新しました`);
  };
  const deleteCustomer = async (name: string) => {
    await requestJson<{ ok: boolean }>(`/api/customers/${encodeURIComponent(name)}`, { method: "DELETE" });
    setReservations(rs => rs.filter(r => r.customer !== name));
    setSelected(s => s?.customer === name ? null : s);
    notify(`${name}様の顧客情報を削除しました`);
  };
  const saveStore = async (originalName: string, input: StoreForm) => {
    const { store } = await requestJson<{ store: Store }>(`/api/stores/${encodeURIComponent(originalName)}`, { method: "PATCH", body: JSON.stringify(input) });
    setStores(items => items.map(item => item.name === originalName ? store : item));
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
  const deleteStore = async (name: string) => {
    await requestJson<{ ok: boolean }>(`/api/stores/${encodeURIComponent(name)}`, { method: "DELETE" });
    setStores(items => items.filter(item => item.name !== name));
    setReservations(rs => rs.map(r => {
      const storeAssignments = reservationAssignments(r).filter(assignment => assignment.store !== name);
      return { ...r, storeAssignments, store: storeAssignments.length === 1 ? storeAssignments[0].store : storeAssignments.length > 1 ? "複数店舗" : null };
    }));
    setSelected(s => s ? (() => {
      const storeAssignments = reservationAssignments(s).filter(assignment => assignment.store !== name);
      return { ...s, storeAssignments, store: storeAssignments.length === 1 ? storeAssignments[0].store : storeAssignments.length > 1 ? "複数店舗" : null };
    })() : s);
    notify(`${name}を削除し、関連予約を未割当に戻しました`);
  };
  const submitAdminReservation = async () => {
    try {
      const reservation = await createReservation(adminForm);
      setAdminForm({ menuItems: [], date: "2026-07-12", startTime: DEFAULT_START_TIME, people: 2, name: "", email: "", phone: "", status: STATUS.confirmed });
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

  if (role === "customer") return <CustomerPortal form={form} setForm={setForm} step={formStep} setStep={setFormStep} onAdmin={() => setRole("admin")} notify={notify} toast={toast} onSubmitReservation={createReservation} menuCatalog={menuCatalog} />;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="logo"><span>R</span><strong>Reserve</strong><small>Operations</small></div>
      <nav><p>メニュー</p><button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><Icon name="grid"/>ダッシュボード</button><button className={view === "reservations" ? "active" : ""} onClick={() => openReservations("すべて")}><Icon name="calendar"/>予約管理</button><button className={view === "confirmationContacts" ? "active" : ""} onClick={() => setView("confirmationContacts")}><Icon name="mail"/>確認連絡{taskCounts.preContactDue > 0 && <i>{taskCounts.preContactDue}</i>}</button><button className={view === "customers" ? "active" : ""} onClick={() => setView("customers")}><Icon name="users"/>顧客管理</button><button className={view === "stores" ? "active" : ""} onClick={() => setView("stores")}><Icon name="store"/>店舗管理</button><button className={view === "menus" ? "active" : ""} onClick={() => setView("menus")}><Icon name="chart"/>メニュー管理</button><button className={view === "billing" ? "active" : ""} onClick={() => setView("billing")}><Icon name="chart"/>利用実績・請求</button></nav>
      <div className="sidebar-bottom"><button onClick={() => setRole("customer")}>顧客画面を表示 <Icon name="arrow"/></button><div className="profile"><span>MN</span><div><strong>野毛 道太郎</strong><small>システム管理者</small></div></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><h1>{{dashboard:"ダッシュボード",reservations:"予約管理",confirmationContacts:"確認連絡",customers:"顧客管理",stores:"店舗管理",menus:"メニュー管理",billing:"利用実績・請求"}[view]}</h1><p>2026年7月8日（水）</p></div><div className="top-actions"><button className="icon-btn"><Icon name="bell"/><i/></button></div></header>
      {view === "dashboard" ? <main className="dashboard">
        <section className="welcome"><div><p>おはようございます、野毛さん</p><h2>今日も予約状況を確認しましょう。</h2></div><div className="pulse"><span/>システム正常稼働中</div></section>
        <section className="dashboard-block dashboard-info-block"><div className="dashboard-block-head"><h3>情報</h3><p>予約状況の概要と本日の予定を確認できます</p></div><div className="info-dashboard-grid"><div className="info-summary-list">
          <InfoMetric icon="calendar" label="本日の予約" value={String(dashboardCounts.today)} color="blue" />
          <InfoMetric icon="chart" label="今月の予約" value={String(dashboardCounts.month)} color="green" />
        </div><div className="today-reservation-list"><div className="today-reservation-head"><div><h3>本日の予約</h3><p>{dateHeadingLabel(todayIso())}</p></div><button onClick={() => openReservations("すべて", todayIso())}>予約管理で見る <Icon name="arrow"/></button></div>{todayReservations.length ? <div className="timeline">{todayReservations.map((reservation, index)=><Fragment key={reservation.id}><span>{reservationStartTime(reservation)}</span><i className={["blue","green","violet"][index % 3]}/><div><strong>{reservation.customer} 様</strong><small>{assignmentLabel(reservation) || "店舗未割当"}・{reservationMenuLabel(reservation)}</small></div></Fragment>)}</div> : <div className="empty-panel"><p>本日の予約はありません。</p></div>}</div></div></section>
        <section className="dashboard-block"><div className="dashboard-block-head"><h3>タスク</h3><p>対応が必要な予約業務です</p></div><div className="task-card-grid">
          <Task color="amber" title="承認待ち" count={taskCounts.approvals} text="仮予約・本予約・キャンセル申請を確認しましょう" onClick={() => openReservations("承認待ち")} />
          <Task color="amber" title="本予約の督促" count={taskCounts.temporaryExpired} text="期限切れの仮予約へ本予約申請を依頼しましょう" onClick={() => openReservations("仮予約確定（期限切れ）")} />
          <Task color="violet" title="店舗割り当て" count={taskCounts.storeUnassigned} text="店舗割り当てを行いましょう" onClick={() => openReservations("本予約確定（店舗未割当）")} />
          <Task color="green" title="メニュー確定の催促" count={taskCounts.menuUnselected} text="メニューが未確定のお客様を確認しましょう" onClick={() => openReservations("本予約確定（メニュー未確定）")} />
          <Task color="blue" title="確認連絡" count={taskCounts.preContactDue} text={`食事日まで${confirmationContactWindowDays}日未満のお客様へ確認連絡を行いましょう`} onClick={() => setView("confirmationContacts")} />
        </div></section>
      </main> : <ManagementPage view={view} reservations={reservations} confirmationContactTargets={confirmationContactTargets} confirmationContactWindowDays={confirmationContactWindowDays} setConfirmationContactWindowDays={setConfirmationContactWindowDays} isBulkContacting={isBulkContacting} onBulkConfirmationContact={bulkUpdateConfirmationContacts} customers={customers} stores={stores} menus={menuCatalog} reservationFilter={reservationFilter} setReservationFilter={setReservationFilter} reservationDateFromFilter={reservationDateFromFilter} setReservationDateFromFilter={setReservationDateFromFilter} reservationDateToFilter={reservationDateToFilter} setReservationDateToFilter={setReservationDateToFilter} reservationSearch={reservationSearch} setReservationSearch={setReservationSearch} onSelect={setSelected} notify={notify} onSaveMenu={saveMenu} onDeleteMenu={deleteMenu} onSaveCustomer={saveCustomer} onDeleteCustomer={deleteCustomer} onSaveStore={saveStore} onDeleteStore={deleteStore} onOpenNewReservation={() => setIsNewReservationOpen(true)} />}
    </div>
    {isNewReservationOpen && <NewReservationDrawer form={adminForm} setForm={setAdminForm} onClose={() => setIsNewReservationOpen(false)} onSubmit={submitAdminReservation} menuCatalog={menuCatalog} />}
    {selected && <ReservationDrawer reservation={selected} onClose={() => setSelected(null)} updateStatus={updateStatus} updateConfirmationContact={updateConfirmationContact} assignStores={assignStores} updateReservation={updateReservation} menuCatalog={menuCatalog} stores={stores} />}
    {toast && <div className="toast"><Icon name="check"/>{toast}</div>}
  </div>;
}

function Stat({ icon, label, value, note, color, onClick }: { icon: string; label: string; value: string; note: string; color: string; onClick?: () => void }) { return <button className={`stat ${onClick ? "clickable" : "static"}`} onClick={onClick} disabled={!onClick}><span className={`stat-icon ${color}`}><Icon name={icon}/></span><div><p>{label}</p><strong>{value}<small>件</small></strong>{note && <span className={color === "amber" || color === "violet" ? "attention" : "positive"}>{note}</span>}</div></button> }
function InfoMetric({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) { return <div className="info-metric"><span className={`stat-icon ${color}`}><Icon name={icon}/></span><div><p>{label}</p><strong>{value}<small>件</small></strong></div></div> }
function Task({ color, title, count, text, onClick }: { color: string; title: string; count?: number; text: string; onClick?: () => void }) { return <button className={`task ${count ? "has-count" : ""}`} onClick={onClick}><i className={color}/><div><strong>{title}{count !== undefined && <span className="task-count">{count}件</span>}</strong><small>{text}</small></div><Icon name="arrow"/></button> }

function ManagementPage({ view, reservations, confirmationContactTargets, confirmationContactWindowDays, setConfirmationContactWindowDays, isBulkContacting, onBulkConfirmationContact, customers, stores, menus, reservationFilter, setReservationFilter, reservationDateFromFilter, setReservationDateFromFilter, reservationDateToFilter, setReservationDateToFilter, reservationSearch, setReservationSearch, onSelect, notify, onSaveMenu, onDeleteMenu, onSaveCustomer, onDeleteCustomer, onSaveStore, onDeleteStore, onOpenNewReservation }: { view: Exclude<View,"dashboard">; reservations: Reservation[]; confirmationContactTargets: Reservation[]; confirmationContactWindowDays: number; setConfirmationContactWindowDays: (days: number) => void; isBulkContacting: boolean; onBulkConfirmationContact: () => Promise<void>; customers: Customer[]; stores: Store[]; menus: Menu[]; reservationFilter: ReservationFilter; setReservationFilter: (filter: ReservationFilter) => void; reservationDateFromFilter: string; setReservationDateFromFilter: (date: string) => void; reservationDateToFilter: string; setReservationDateToFilter: (date: string) => void; reservationSearch: string; setReservationSearch: (search: string) => void; onSelect: (r: Reservation) => void; notify: (s:string) => void; onSaveMenu: (input: MenuForm, originalName?: string) => Promise<void>; onDeleteMenu: (name: string) => Promise<void>; onSaveCustomer: (originalName: string, input: CustomerForm) => Promise<void>; onDeleteCustomer: (name: string) => Promise<void>; onSaveStore: (originalName: string, input: StoreForm) => Promise<void>; onDeleteStore: (name: string) => Promise<void>; onOpenNewReservation: () => void }) {
  const [reservationSort, setReservationSort] = useState<{ key: ReservationSortKey; direction: SortDirection }>({ key: "date", direction: "asc" });
  const filteredReservations = useMemo(() => reservations.filter((reservation) => {
    const effectiveDateFrom = reservationDateFromFilter && reservationDateToFilter && reservationDateFromFilter > reservationDateToFilter ? reservationDateToFilter : reservationDateFromFilter;
    const effectiveDateTo = reservationDateFromFilter && reservationDateToFilter && reservationDateFromFilter > reservationDateToFilter ? reservationDateFromFilter : reservationDateToFilter;
    const matchesDateFrom = !effectiveDateFrom || reservation.date >= effectiveDateFrom;
    const matchesDateTo = !effectiveDateTo || reservation.date <= effectiveDateTo;
    const matchesDate = matchesDateFrom && matchesDateTo;
    if (!matchesDate) return false;
    const keyword = reservationSearch.trim().toLowerCase();
    const matchesSearch = !keyword || [reservation.id, reservation.customer, reservation.phone, reservation.email ?? ""].some(value => value.toLowerCase().includes(keyword));
    if (!matchesSearch) return false;
    if (reservationFilter === "すべて") return true;
    if (reservationFilter === "承認待ち") return approvalStatuses.includes(reservation.status);
    if (reservationFilter === "仮予約確定（期限切れ）") return isTemporaryReservationExpired(reservation);
    if (reservationFilter === "本予約確定") return isConfirmedReservation(reservation);
    if (reservationFilter === "本予約確定（メニュー未確定）") return isConfirmedReservation(reservation) && !(reservation.menuItems?.length);
    if (reservationFilter === "本予約確定（店舗未割当）") return isConfirmedReservation(reservation) && !reservationAssignments(reservation).length;
    if (reservationFilter === "本予約確定（未確認連絡）") return isConfirmedReservation(reservation) && !reservation.confirmationContactedAt;
    if (reservationFilter === "本予約確定（来店待ち）") return isVisitReadyReservation(reservation);
    return statusLabel(reservation.status) === reservationFilter;
  }), [reservationDateFromFilter, reservationDateToFilter, reservationFilter, reservationSearch, reservations]);
  const sortedReservations = useMemo(() => {
    const valueFor = (reservation: Reservation, key: ReservationSortKey): string | number => {
      if (key === "status") return reservationStatusLabel(reservation);
      if (key === "id") return Number(reservation.id.replace(/\D/g, "")) || reservation.id;
      if (key === "customer") return reservation.customer;
      if (key === "date") return `${reservation.date}T${reservationStartTime(reservation)}`;
      if (key === "menu") return reservationMenuLabel(reservation);
      if (key === "store") return assignmentLabel(reservation) || "未割当";
      return reservation.confirmationContactedAt ? `連絡済 ${reservation.confirmationContactedAt}` : "未連絡";
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
  const toggleReservationSort = (key: ReservationSortKey) => {
    setReservationSort(current => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
  };
  const sortLabel = (key: ReservationSortKey) => reservationSort.key === key ? (reservationSort.direction === "asc" ? "↑" : "↓") : "↕";
  const quickFilters: ReservationFilter[] = ["すべて", "承認待ち", "仮予約確定", "仮予約確定（期限切れ）", "本予約確定", "本予約確定（メニュー未確定）", "本予約確定（店舗未割当）", "本予約確定（未確認連絡）", "本予約確定（来店待ち）"];
  const pageDescriptions: Record<Exclude<View, "dashboard">, string> = {
    reservations: "",
    confirmationContacts: "",
    customers: "予約者の連絡先と利用履歴を確認できます。",
    stores: "店舗ごとの割当状況と稼働実績を確認できます。",
    menus: "予約フォームで選択できる料理・コースを管理します。",
    billing: "来店実績、売上、請求書の発行状況を管理します。",
  };
  return <main className="management">
    {view !== "confirmationContacts" && <section className="page-title compact"><span>{pageDescriptions[view]}</span><button onClick={() => view === "reservations" ? onOpenNewReservation() : notify(view === "billing" ? "請求データをCSV出力しました" : view === "menus" ? "下部のフォームからメニューを追加できます" : "新規登録画面を準備しました")}><Icon name={view === "billing" ? "chart" : "plus"}/>{view === "billing" ? "CSV出力" : view === "menus" ? "メニュー追加" : "新規登録"}</button></section>}
    {view === "confirmationContacts" && <ConfirmationContactPage reservations={confirmationContactTargets} windowDays={confirmationContactWindowDays} setWindowDays={setConfirmationContactWindowDays} isBulkContacting={isBulkContacting} onBulkConfirmationContact={onBulkConfirmationContact} onSelect={onSelect} />}
    {view === "reservations" && <section className="panel management-panel"><div className="management-tools reservation-tools"><div className="reservation-search-row"><label className="reservation-search"><div><Icon name="search"/><input placeholder="予約ID・顧客名で検索" value={reservationSearch} onChange={(event) => setReservationSearch(event.target.value)}/></div></label><div className="reservation-date-range"><span>予約日</span><input type="date" value={reservationDateFromFilter} onChange={(event) => { const value = event.target.value; setReservationDateFromFilter(value); if (value && !reservationDateToFilter) setReservationDateToFilter(value); }}/><em>～</em><input type="date" value={reservationDateToFilter} onChange={(event) => setReservationDateToFilter(event.target.value)}/></div>{(reservationDateFromFilter || reservationDateToFilter) && <button className="clear-filter" onClick={() => { setReservationDateFromFilter(""); setReservationDateToFilter(""); }}>日付クリア</button>}<div className="result-count"><span>該当</span><strong>{filteredReservations.length}</strong><span>件</span></div></div><div className="reservation-filter-row"><div className="segmented">{quickFilters.map(filter => <button key={filter} className={reservationFilter === filter ? "active" : ""} onClick={() => setReservationFilter(filter)}>{filter}</button>)}</div></div></div><div className="table-wrap"><table className="large-table"><thead><tr><th><button className="sort-header" onClick={() => toggleReservationSort("status")}>ステータス<span>{sortLabel("status")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("id")}>予約ID<span>{sortLabel("id")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("customer")}>お客様<span>{sortLabel("customer")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("date")}>利用日時・人数<span>{sortLabel("date")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("menu")}>メニュー<span>{sortLabel("menu")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("store")}>担当店舗<span>{sortLabel("store")}</span></button></th><th><button className="sort-header" onClick={() => toggleReservationSort("contact")}>確認連絡<span>{sortLabel("contact")}</span></button></th><th/></tr></thead><tbody>{sortedReservations.map(r=><tr key={r.id} onClick={()=>onSelect(r)}><td><span className={`badge ${statusClass[r.status]}`}><i/>{reservationStatusLabel(r)}</span></td><td><strong>{r.id}</strong><small>{r.received}</small></td><td><strong>{r.customer}</strong><small>{r.phone}</small></td><td><strong>{reservationDateTimeLabel(r)}</strong><small>{r.people}名</small></td><td>{reservationMenuLabel(r)}</td><td>{assignmentLabel(r) ? <strong>{assignmentLabel(r)}</strong> : <span className="unassigned">未割当</span>}</td><td>{r.confirmationContactedAt ? <><strong>連絡済</strong><small>{new Date(r.confirmationContactedAt).toLocaleDateString("ja-JP")}</small></> : <span className="unassigned">未連絡</span>}</td><td><Icon name="arrow"/></td></tr>)}</tbody></table>{!filteredReservations.length && <div className="empty-table">選択した条件の予約はありません。</div>}</div></section>}
    {view === "customers" && <CustomerManagement customers={customers} onSaveCustomer={onSaveCustomer} onDeleteCustomer={onDeleteCustomer} notify={notify} />}
    {view === "stores" && <StoreManagement stores={stores} onSaveStore={onSaveStore} onDeleteStore={onDeleteStore} notify={notify} />}
    {view === "menus" && <MenuManagement menus={menus} onSaveMenu={onSaveMenu} onDeleteMenu={onDeleteMenu} />}
    {view === "billing" && <><section className="stats billing-stats"><Stat icon="chart" label="今月の売上" value="682,400" note="先月比 +8.2%" color="green"/><Stat icon="calendar" label="利用完了" value="96" note="予約124件中" color="blue"/><Stat icon="users" label="未請求" value="4" note="対応が必要です" color="amber"/><Stat icon="chart" label="請求書発行" value="18" note="今月の発行数" color="violet"/></section><section className="panel management-panel"><div className="panel-head"><div><h3>最近の利用実績</h3><p>来店受付後に登録された実績と請求状態</p></div></div><div className="table-wrap"><table className="large-table"><thead><tr><th>利用日</th><th>予約ID / お客様</th><th>店舗</th><th>利用内容</th><th>金額</th><th>請求状態</th><th/></tr></thead><tbody><tr><td>2026/07/08</td><td><strong>RSV-1044</strong><small>伊藤 結衣 様</small></td><td>横浜店</td><td>パーソナル診断 × 1</td><td><strong>\8,800</strong></td><td><span className="badge green"><i/>請求済</span></td><td><Icon name="arrow"/></td></tr><tr><td>2026/07/07</td><td><strong>RSV-1042</strong><small>小林 亮 様</small></td><td>渋谷店</td><td>スタンダード × 2</td><td><strong>\11,000</strong></td><td><span className="badge amber"><i/>未請求</span></td><td><Icon name="arrow"/></td></tr><tr><td>2026/07/06</td><td><strong>RSV-1038</strong><small>中村 彩 様</small></td><td>新宿店</td><td>プレミアム × 1</td><td><strong>\13,200</strong></td><td><span className="badge blue"><i/>請求書発行</span></td><td><Icon name="arrow"/></td></tr></tbody></table></div></section></>}
  </main>;
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
      <button className="confirmation-bulk-button" disabled={!reservations.length || isBulkContacting} onClick={onBulkConfirmationContact}><Icon name="check"/>{isBulkContacting ? "更新中" : "一括更新"}</button>
    </div>
    <div className="table-wrap"><table className="large-table"><thead><tr><th>食事日</th><th>予約ID / お客様</th><th>連絡先</th><th>人数</th><th>メニュー</th><th>担当店舗</th><th>期限</th><th/></tr></thead><tbody>{reservations.map(reservation => {
      const days = daysUntilVisit(reservation.date);
      return <tr key={reservation.id} onClick={() => onSelect(reservation)}><td><strong>{reservationDateTimeLabel(reservation)}</strong><small>{days === 0 ? "本日" : `${days}日後`}</small></td><td><strong>{reservation.id}</strong><small>{reservation.customer} 様</small></td><td><strong>{reservation.phone}</strong><small>{reservation.email ?? "customer@example.jp"}</small></td><td><strong>{reservation.people}名</strong></td><td>{reservationMenuLabel(reservation)}</td><td>{assignmentLabel(reservation) ? <strong>{assignmentLabel(reservation)}</strong> : <span className="unassigned">未割当</span>}</td><td><span className="badge amber"><i/>{windowDays}日未満</span></td><td><Icon name="arrow"/></td></tr>;
    })}</tbody></table>{!reservations.length && <div className="empty-table">確認連絡が必要な予約はありません。</div>}</div></section>
}

function CustomerManagement({ customers, onSaveCustomer, onDeleteCustomer, notify }: { customers: Customer[]; onSaveCustomer: (originalName: string, input: CustomerForm) => Promise<void>; onDeleteCustomer: (name: string) => Promise<void>; notify: (s: string) => void }) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>({ name: "", contact: "", phone: "" });
  const startEdit = (customer: Customer) => {
    setEditingName(customer.name);
    setForm({ name: customer.name, contact: customer.contact, phone: customer.phone });
  };
  const cancel = () => {
    setEditingName(null);
    setForm({ name: "", contact: "", phone: "" });
  };
  const save = async () => {
    if (!editingName || !form.name || !form.contact || !form.phone) return;
    await onSaveCustomer(editingName, form);
    cancel();
  };
  const remove = async (customer: Customer) => {
    const ok = window.confirm(`${customer.name}様の顧客情報を削除します。関連する予約も一覧から削除されます。よろしいですか？`);
    if (!ok) return;
    await onDeleteCustomer(customer.name);
    if (editingName === customer.name) cancel();
  };

  if (!customers.length) return <section className="panel empty-panel"><h3>顧客情報はまだありません</h3><p>予約が登録されると顧客情報が表示されます。</p></section>;

  return <section className="panel management-panel"><div className="table-wrap"><table className="large-table customer-table"><thead><tr><th>お客様</th><th>メールアドレス</th><th>電話番号</th><th>予約回数</th><th>最終利用</th><th/></tr></thead><tbody>{customers.map((c)=> editingName === c.name ? <tr key={c.name} className="editing-row"><td><input aria-label="お名前" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></td><td><input aria-label="メールアドレス" type="email" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></td><td><input aria-label="電話番号" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></td><td>{c.count}回</td><td>{c.last}</td><td><div className="row-actions"><button onClick={cancel}>キャンセル</button><button className="save" disabled={!form.name || !form.contact || !form.phone} onClick={save}>保存</button></div></td></tr> : <tr key={c.name}><td><strong>{c.name} 様</strong></td><td>{c.contact}</td><td>{c.phone}</td><td><strong>{c.count}回</strong></td><td>{c.last}</td><td><div className="row-actions"><button onClick={()=>notify(`${c.name}様の利用履歴を表示しました`)}>利用履歴</button><button onClick={() => startEdit(c)}>編集</button><button className="danger" onClick={() => remove(c)}>削除</button></div></td></tr>)}</tbody></table></div></section>;
}

function StoreManagement({ stores, onSaveStore, onDeleteStore, notify }: { stores: Store[]; onSaveStore: (originalName: string, input: StoreForm) => Promise<void>; onDeleteStore: (name: string) => Promise<void>; notify: (s: string) => void }) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [form, setForm] = useState<StoreForm>({ name: "", area: "", today: 0, month: 0, state: "営業中" });
  const startEdit = (store: Store) => {
    setEditingName(store.name);
    setForm(store);
  };
  const cancel = () => {
    setEditingName(null);
    setForm({ name: "", area: "", today: 0, month: 0, state: "営業中" });
  };
  const save = async () => {
    if (!editingName || !form.name || !form.area || !form.state) return;
    await onSaveStore(editingName, form);
    cancel();
  };
  const remove = async (store: Store) => {
    const ok = window.confirm(`${store.name}を削除します。関連する予約の店舗割当は未割当に戻ります。よろしいですか？`);
    if (!ok) return;
    await onDeleteStore(store.name);
    if (editingName === store.name) cancel();
  };

  if (!stores.length) return <section className="panel empty-panel"><h3>店舗情報はまだありません</h3><p>店舗を登録するとここに表示されます。</p></section>;

  return <section className="card-grid stores-grid">{stores.map((s)=><article className="entity-card store-card store-edit-card" key={s.name}>{editingName === s.name ? <><div className="store-photo"><Icon name="store"/><span><i/>{form.state || "未設定"}</span></div><div className="drawer-form single"><label>店舗名<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>エリア・住所<input value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/></label><label>状態<select value={form.state} onChange={e=>setForm({...form,state:e.target.value})}><option>営業中</option><option>休業中</option><option>準備中</option></select></label><label>本日の予約<input type="number" value={form.today} onChange={e=>setForm({...form,today:Number(e.target.value)})}/></label><label>今月の実績<input type="number" value={form.month} onChange={e=>setForm({...form,month:Number(e.target.value)})}/></label></div><div className="customer-card-actions"><button onClick={cancel}>キャンセル</button><button className="save" disabled={!form.name || !form.area || !form.state} onClick={save}>保存</button></div></> : <><div className="store-photo"><Icon name="store"/><span><i/>{s.state}</span></div><h3>{s.name}</h3><p>{s.area}<br/>10:00 ? 20:00</p><dl><div><dt>本日の予約</dt><dd>{s.today}件</dd></div><div><dt>今月の実績</dt><dd>{s.month}件</dd></div></dl><div className="customer-card-actions"><button onClick={()=>notify(`${s.name}の割当状況を表示しました`)}>割当状況</button><button onClick={() => startEdit(s)}>編集</button><button className="danger" onClick={() => remove(s)}>削除</button></div></>}</article>)}</section>;
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
  return <div className="menu-check-grid">{menuCatalog.map(menu => <button type="button" key={menu.name} className={selected.includes(menu.name) ? "selected" : ""} onClick={() => toggle(menu.name)}><span>{selected.includes(menu.name) && <Icon name="check"/>}</span><h3>{menu.name}</h3><p>{menu.description}</p><div><strong>{"¥"}{menu.price.toLocaleString()}</strong><small>{menu.duration}</small></div></button>)}</div>;
}

function MenuManagement({ menus, onSaveMenu, onDeleteMenu }: { menus: Menu[]; onSaveMenu: (input: MenuForm, originalName?: string) => Promise<void>; onDeleteMenu: (name: string) => Promise<void> }) {
  const emptyForm = { name: "", description: "", price: 0, duration: "" };
  const [form, setForm] = useState<MenuForm>(emptyForm);
  const [editingName, setEditingName] = useState<string | undefined>();
  const canSubmit = Boolean(form.name && form.description && form.price > 0 && form.duration);
  const startEdit = (menu: Menu) => { setEditingName(menu.name); setForm(menu); };
  const submit = async () => {
    if (!canSubmit) return;
    await onSaveMenu(form, editingName);
    setEditingName(undefined);
    setForm(emptyForm);
  };

  return <section className="menu-admin-grid"><div className="panel management-panel"><div className="panel-head"><div><h3>登録済みメニュー</h3><p>予約フォームで複数選択できる料理・コースです</p></div></div><div className="table-wrap"><table className="large-table"><thead><tr><th>メニュー名</th><th>説明</th><th>金額</th><th>提供目安</th><th/></tr></thead><tbody>{menus.map(menu => <tr key={menu.name}><td><strong>{menu.name}</strong></td><td>{menu.description}</td><td><strong>{"¥"}{menu.price.toLocaleString()}</strong></td><td>{menu.duration}</td><td><button className="text-action" onClick={() => startEdit(menu)}>編集</button><button className="text-action danger" onClick={() => onDeleteMenu(menu.name)}>削除</button></td></tr>)}</tbody></table></div></div>
    <aside className="panel menu-editor"><div className="panel-head"><div><h3>{editingName ? "メニュー編集" : "メニュー追加"}</h3><p>料理、コース、オプションを登録します</p></div></div><div className="drawer-form single"><label>メニュー名<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>説明<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label><label>金額<input type="number" value={form.price || ""} onChange={e => setForm({ ...form, price: Number(e.target.value) })}/></label><label>提供目安<input placeholder="例：45分" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}/></label><button className="full-action" disabled={!canSubmit} onClick={submit}>{editingName ? "更新する" : "追加する"}</button>{editingName && <button className="cancel-edit" onClick={() => { setEditingName(undefined); setForm(emptyForm); }}>編集をキャンセル</button>}</div></aside></section>;
}

function ReservationDrawer({ reservation: r, onClose, updateStatus, updateConfirmationContact, assignStores, updateReservation, menuCatalog, stores }: { reservation: Reservation; onClose: () => void; updateStatus: (id: string, status: Status) => void; updateConfirmationContact: (id: string, contactedAt: string | null) => Promise<void>; assignStores: (id: string, assignments: StoreAssignment[]) => void; updateReservation: (id: string, form: BookingForm) => Promise<Reservation>; menuCatalog: Menu[]; stores: Store[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isManualStatusOpen, setIsManualStatusOpen] = useState(false);
  const [manualStatus, setManualStatus] = useState<Status>(r.status);
  const [manualStatusReason, setManualStatusReason] = useState("");
  const [editForm, setEditForm] = useState<BookingForm>({ menuItems: r.menuItems ?? [], date: r.date, startTime: reservationStartTime(r), people: r.people, name: r.customer, email: r.email ?? "", phone: r.phone });
  const activeStores = stores.filter(store => store.state === "営業中");
  const canEditAssignments = r.status === STATUS.confirmed || r.status === STATUS.waitingForVisit || r.status === STATUS.visited;
  const isMenuSelected = Boolean(r.menuItems?.length);
  const isStoreAssigned = reservationAssignments(r).length > 0;
  const canUpdateConfirmationContact = r.status === STATUS.confirmed || r.status === STATUS.waitingForVisit || r.status === STATUS.visited;
  const [assignmentDraft, setAssignmentDraft] = useState<StoreAssignment[]>(reservationAssignments(r).length ? reservationAssignments(r) : [{ store: "", people: r.people }]);
  const editTotal = selectedMenuTotal(editForm.menuItems, menuCatalog);
  const canSave = Boolean(editForm.date && editForm.people && editForm.name && editForm.email && editForm.phone);
  const assignedPeople = assignmentDraft.reduce((total, assignment) => total + Number(assignment.people || 0), 0);
  const canSaveAssignments = assignmentDraft.length === 0 || (assignedPeople === r.people && assignmentDraft.every(assignment => assignment.store && assignment.people > 0));
  useEffect(() => {
    setAssignmentDraft(reservationAssignments(r).length ? reservationAssignments(r) : [{ store: "", people: r.people }]);
  }, [r.id, r.people, r.store, r.storeAssignments]);
  useEffect(() => {
    setManualStatus(r.status);
    setManualStatusReason("");
    setIsManualStatusOpen(false);
  }, [r.id, r.status]);
  useEffect(() => {
    if (!canEditAssignments && isAssigning) setIsAssigning(false);
  }, [canEditAssignments, isAssigning]);
  const save = async () => {
    await updateReservation(r.id, editForm);
    setIsEditing(false);
  };
  const updateAssignment = (index: number, patch: Partial<StoreAssignment>) => setAssignmentDraft(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const removeAssignment = (index: number) => setAssignmentDraft(items => items.filter((_, itemIndex) => itemIndex !== index));
  const addAssignment = () => setAssignmentDraft(items => [...items, { store: "", people: Math.max(r.people - assignedPeople, 1) }]);
  const saveAssignments = () => {
    if (!canEditAssignments || !canSaveAssignments) return;
    assignStores(r.id, assignmentDraft);
    setIsAssigning(false);
  };
  const changeStatusManually = () => {
    const reason = manualStatusReason.trim();
    if (!reason || manualStatus === r.status) return;
    const confirmed = window.confirm(`${r.id} のステータスを「${statusLabel(r.status)}」から「${statusLabel(manualStatus)}」へ変更します。\n\n理由: ${reason}\n\nこの操作は例外対応です。`);
    if (!confirmed) return;
    updateStatus(r.id, manualStatus);
    setManualStatusReason("");
    setIsManualStatusOpen(false);
  };
  const pendingConfirmedActions: string[] = [
    !isMenuSelected && "メニュー確定",
    !isStoreAssigned && "店舗割り当て",
    !r.confirmationContactedAt && "確認連絡",
  ].filter((action): action is string => Boolean(action));
  const nextAction = <section className="drawer-next-action"><p className="section-label">次のアクション</p>{r.status === STATUS.temporaryRequested && <div className="drawer-actions"><button className="reject">受付不可</button><button className="approve" onClick={() => updateStatus(r.id, STATUS.temporaryConfirmed)}><Icon name="check"/>承認する</button></div>}{r.status === STATUS.temporaryConfirmed && <p className="optional-note">{isTemporaryReservationExpired(r) ? "仮予約期間を過ぎています。お客様へ本予約申請をご依頼ください。" : "管理側で実行する次のアクションはありません。"}</p>}{r.status === STATUS.confirmedRequested && <button className="full-action" onClick={() => updateStatus(r.id, STATUS.confirmed)}>本予約を承認する</button>}{isConfirmedReservation(r) && pendingConfirmedActions.length > 0 && <div className="readiness-card">{pendingConfirmedActions.map(action => <small key={action}>・{action}</small>)}</div>}{isVisitReadyReservation(r) && <button className="full-action" onClick={() => updateStatus(r.id, STATUS.visited)}>来店受付・利用実績を登録</button>}{r.status === STATUS.cancellationRequested && <button className="full-action danger" onClick={() => { updateStatus(r.id, STATUS.cancelled); onClose(); }}>キャンセルを確定する</button>}</section>;

  return <><div className="drawer-shade" onClick={onClose}/><aside className="drawer"><header><div><span className={`badge ${statusClass[r.status]}`}><i/>{reservationStatusLabel(r)}</span><h2>{r.id}</h2></div><button onClick={onClose}><Icon name="close"/></button></header><div className="drawer-body">
    {!isEditing && !isAssigning ? <>{nextAction}<section><p className="section-label">お客様情報</p><div className="customer-card"><span>{r.customer.slice(0,1)}</span><div><strong>{r.customer} 様</strong><small>{r.phone}<br/>{r.email ?? "customer@example.jp"}</small></div></div></section><section><p className="section-label">予約内容</p><dl><div><dt>利用日時</dt><dd>{reservationDateTimeLabel(r)}</dd></div><div><dt>予定人数</dt><dd>{r.people}名</dd></div><div><dt>メニュー</dt><dd>{reservationMenuLabel(r)}</dd></div><div><dt>金額</dt><dd>{"¥"}{(r.totalAmount ?? 0).toLocaleString()}</dd></div><div><dt>同意確認</dt><dd>{policyAgreementLabel(r)}</dd></div></dl><button className="edit-reservation-button" onClick={() => setIsEditing(true)}>予約内容を編集</button></section><section><p className="section-label">店舗割当</p><dl><div><dt>割当状況</dt><dd>{assignmentLabel(r) || "未割当"}</dd></div><div><dt>割当人数</dt><dd>{reservationAssignments(r).reduce((total, assignment) => total + assignment.people, 0)}名 / {r.people}名</dd></div></dl>{canEditAssignments ? <button className="edit-reservation-button" onClick={() => setIsAssigning(true)}>店舗割当を編集</button> : <p className="optional-note">店舗割当は本予約確定後に編集できます。</p>}</section>{canUpdateConfirmationContact && <section><p className="section-label">確認連絡</p><dl><div><dt>連絡状況</dt><dd>{r.confirmationContactedAt ? `連絡済み（${new Date(r.confirmationContactedAt).toLocaleString("ja-JP") }）` : "未連絡"}</dd></div></dl>{r.confirmationContactedAt ? <button className="edit-reservation-button" onClick={() => updateConfirmationContact(r.id, null)}>未連絡に戻す</button> : <button className="full-action" onClick={() => updateConfirmationContact(r.id, new Date().toISOString())}><Icon name="check"/>確認連絡済みにする</button>}<p className="optional-note">将来はメール送信完了時に自動更新します。</p></section>}<section><button className="exception-toggle" onClick={() => setIsManualStatusOpen(open => !open)}><span><strong>例外対応</strong><small>誤操作など特殊なケースでのみ手動変更します</small></span><Icon name="arrow"/></button>{isManualStatusOpen && <div className="manual-status-panel"><p className="optional-note">通常の進行は上部の「次のアクション」から行ってください。手動変更は理由を入力したうえで、確認後に反映します。</p><div className="drawer-form single"><label>現在のステータス<input value={statusLabel(r.status)} disabled readOnly/></label><label>変更先ステータス<select value={manualStatus} onChange={event => setManualStatus(event.target.value as Status)}>{statusOptions.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label><label>変更理由<textarea value={manualStatusReason} onChange={event => setManualStatusReason(event.target.value)} placeholder="例：誤って承認したため、電話でキャンセル確認済みのため"/></label></div><button className="full-action danger manual-status-submit" disabled={!manualStatusReason.trim() || manualStatus === r.status} onClick={changeStatusManually}>確認して変更</button></div>}</section></> : isAssigning ?
    <><section className="drawer-primary-action"><p className="section-label">店舗割当を編集</p><p className="optional-note">予約人数 {r.people}名に対して、複数店舗へ人数を分割して割り当てできます。</p><div className="assignment-editor">{assignmentDraft.map((assignment, index) => <div className="assignment-row" key={index}><select value={assignment.store} onChange={event => updateAssignment(index, { store: event.target.value })}><option value="">店舗を選択</option>{activeStores.map(store => <option key={store.name} value={store.name}>{store.name}</option>)}</select><input type="number" min="1" max={r.people} value={assignment.people || ""} onChange={event => updateAssignment(index, { people: Number(event.target.value) })}/><span>名</span><button onClick={() => removeAssignment(index)}>削除</button></div>)}</div><button className="edit-reservation-button" onClick={addAssignment}>割当行を追加</button><div className={assignmentDraft.length === 0 || assignedPeople === r.people ? "assignment-total ok" : "assignment-total warn"}>{assignmentDraft.length === 0 ? "未割当として保存できます" : <>割当合計 {assignedPeople}名 / 予約人数 {r.people}名</>}</div><div className="drawer-actions"><button onClick={() => { setAssignmentDraft(reservationAssignments(r).length ? reservationAssignments(r) : [{ store: "", people: r.people }]); setIsAssigning(false); }}>キャンセル</button><button className="approve" disabled={!canSaveAssignments} onClick={saveAssignments}><Icon name="check"/>保存する</button></div></section></> :
    <><section><p className="section-label">予約内容を編集</p><div className="drawer-form"><label>利用日<input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })}/></label><label>開始時間<input type="time" value={editForm.startTime} onChange={e => setEditForm({ ...editForm, startTime: e.target.value })}/></label><label>人数<select value={editForm.people} onChange={e => setEditForm({ ...editForm, people: Number(e.target.value) })}>{[1,2,3,4,5,6].map(x => <option key={x}>{x}</option>)}</select></label></div></section><section><p className="section-label">お客様情報</p><div className="drawer-form single"><label>お名前<input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}/></label><label>メールアドレス<input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}/></label><label>電話番号<input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}/></label></div></section><section className="drawer-primary-action"><p className="section-label">任意メニュー</p><p className="optional-note">変更連絡に応じて、事前注文メニューを追加・削除できます。未選択でも保存できます。</p><MenuPicker menuCatalog={menuCatalog} selected={editForm.menuItems} onChange={menuItems => setEditForm({ ...editForm, menuItems })}/><div className="reservation-summary"><strong>{menuSelectionLabel(editForm.menuItems)}</strong><span>{bookingFormDateTimeLabel(editForm)}・{editForm.people}名</span><small>{"¥"}{editTotal.toLocaleString()}</small></div><div className="drawer-actions"><button onClick={() => { setEditForm({ menuItems: r.menuItems ?? [], date: r.date, startTime: reservationStartTime(r), people: r.people, name: r.customer, email: r.email ?? "", phone: r.phone }); setIsEditing(false); }}>キャンセル</button><button className="approve" disabled={!canSave} onClick={save}><Icon name="check"/>保存する</button></div></section></>}
  </div></aside></>;
}

function NewReservationDrawer({ form, setForm, onClose, onSubmit, menuCatalog }: { form: BookingForm; setForm: React.Dispatch<React.SetStateAction<BookingForm>>; onClose: () => void; onSubmit: () => void; menuCatalog: Menu[] }) {
  const canSubmit = Boolean(form.name && form.email && form.phone && form.date && form.startTime && form.people);
  const total = selectedMenuTotal(form.menuItems, menuCatalog);

  return <><div className="drawer-shade" onClick={onClose}/><aside className="drawer new-reservation-drawer"><header><div><span className="badge blue"><i/>新規登録</span><h2>新規予約</h2></div><button onClick={onClose}><Icon name="close"/></button></header><div className="drawer-body">
    <section><p className="section-label">予約内容</p><div className="drawer-form"><label>登録時ステータス<select value={form.status ?? STATUS.temporaryRequested} onChange={e => setForm({ ...form, status: e.target.value as Status })}><option value={STATUS.confirmed}>{statusLabel(STATUS.confirmed)}</option><option value={STATUS.temporaryRequested}>{statusLabel(STATUS.temporaryRequested)}</option><option value={STATUS.temporaryConfirmed}>{statusLabel(STATUS.temporaryConfirmed)}</option><option value={STATUS.confirmedRequested}>{statusLabel(STATUS.confirmedRequested)}</option></select></label><label>利用日<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></label><label>開始時間<input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}/></label><label>人数<select value={form.people} onChange={e => setForm({ ...form, people: Number(e.target.value) })}>{[1,2,3,4,5,6].map(x => <option key={x}>{x}</option>)}</select></label></div></section>
    <section><p className="section-label">お客様情報</p><div className="drawer-form single"><label>お名前<input placeholder="例：山田 花子" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>メールアドレス<input type="email" placeholder="hanako@example.jp" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label><label>電話番号<input placeholder="090-0000-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label></div></section>
    <section><p className="section-label">任意メニュー</p><p className="optional-note">事前に注文内容が決まっている場合のみ選択してください。未選択でも予約できます。</p><MenuPicker menuCatalog={menuCatalog} selected={form.menuItems} onChange={menuItems => setForm({ ...form, menuItems })}/></section>
    <section className="drawer-primary-action"><p className="section-label">登録内容の確認</p><div className="reservation-summary"><strong>{menuSelectionLabel(form.menuItems)}</strong><span>{bookingFormDateTimeLabel(form)}・{form.people}名・{statusLabel(form.status ?? STATUS.temporaryRequested)}</span><small>{"¥"}{total.toLocaleString()}</small></div><button className="full-action" disabled={!canSubmit} onClick={onSubmit}><Icon name="check"/>予約を登録する</button></section>
  </div></aside></>;
}

function CustomerPortal({ form, setForm, step, setStep, onAdmin, notify, toast, onSubmitReservation, menuCatalog }: { form: BookingForm; setForm: React.Dispatch<React.SetStateAction<BookingForm>>; step:number; setStep:(n:number)=>void; onAdmin:()=>void; notify:(s:string)=>void; toast:string; onSubmitReservation:(form: BookingForm)=>Promise<Reservation>; menuCatalog: Menu[] }) {
  const total = selectedMenuTotal(form.menuItems, menuCatalog);
  const agreementKind = form.status === STATUS.temporaryRequested ? "temporary" : "confirmed";
  const agreementAccepted = form.policyAgreement?.kind === agreementKind && Boolean(form.policyAgreement.acceptedAt);
  const agreementTitle = agreementKind === "temporary" ? "仮予約の注意事項" : "キャンセルポリシー";
  const agreementIntro = agreementKind === "temporary"
    ? "以下をご理解いただいた上で、お進みください。"
    : "以下のキャンセルポリシーにご同意いただいた上で、お進みください。";
  const agreementItems = agreementKind === "temporary"
    ? [
      "仮予約期間は、食事日の1ヶ月前までとなります。",
      "同じ日時に他のお客様の本予約が入った場合、本予約を優先し、仮予約を取り消しさせていただきます。※日程が確定しましたら、お早めに本予約をお願いします。",
      "キャンセル料は発生しません。",
    ]
    : [
      "本予約完了後の取り消しは、キャンセル料100%頂きます。",
      "本予約完了後から50％以上の減員は、キャンセル料100％を頂きます。",
      "60名で本予約した場合: 60名 → 55名（5名減）は対象外、60名 → 40名（20名減）は対象外、60名 → 30名（30名減・50％減）はキャンセル料が発生します。",
      "キャンセルポリシーに該当しない人数変更は、前日まで変更可能です。",
      "本サイトから予約内容を入力後、小社からの予約確定の返信メールが届いた時点で予約完了となります。",
    ];
  const setAgreement = (checked: boolean) => {
    setForm({ ...form, policyAgreement: checked ? { kind: agreementKind, acceptedAt: new Date().toISOString() } : undefined });
  };
  const submit = async () => {
    if (!agreementAccepted) {
      notify(`${agreementTitle}への同意が必要です`);
      setStep(2);
      return;
    }
    try {
      const reservation = await onSubmitReservation(form);
      notify(`${reservation.status === STATUS.confirmedRequested ? "本予約申請" : "仮予約申請"}を受け付けました（${reservation.id}）`);
      setStep(7);
    } catch {
      notify("予約申請の保存に失敗しました");
    }
  };
  return <main className="customer-page restaurant-reservation"><header><div className="public-logo"><span>R</span><strong>Reserve</strong></div><nav><a href="#guide">ご予約の流れ</a><a href="#contact">お問い合わせ</a><button onClick={onAdmin}>管理画面</button></nav></header><section className="customer-hero restaurant-hero"><div><p>RESTAURANT RESERVATION</p><h1>ご予約フォーム</h1></div></section><section className="booking-card"><div className="stepper">{["予約種別","同意確認","日時・人数","お客様情報","メニュー","最終確認","受付完了"].map((s,i)=><div key={s} className={step >= i+1 ? "active" : ""}><span>{step > i+1 ? "?" : i+1}</span><small>{s}</small>{i<6&&<i/>}</div>)}</div>
    {step === 1 && <div className="form-body narrow reservation-type-step"><p className="form-kicker">STEP 1</p><h2>予約種別を選択</h2><div className="reservation-notes"><section><h3>本予約とは</h3><p>正式なご予約です（キャンセル料が発生いたします）</p></section><section><h3>仮予約とは</h3><p>仮予約は1ヶ月前までです（キャンセル料は発生しません）。尚、同じ日時に他のお客様の本予約が入った場合、本予約を優先し、仮予約を取り消しさせていただきます。</p></section></div><fieldset className="reservation-type-options"><legend>予約種別を選択してください</legend><button type="button" className={form.status === STATUS.confirmedRequested ? "selected" : ""} onClick={() => setForm({ ...form, status: STATUS.confirmedRequested, policyAgreement: undefined })}><span className="radio-mark" aria-hidden="true"/><span><strong>本予約を申し込む</strong><small>正式な予約として申し込みます</small></span><em>{form.status === STATUS.confirmedRequested ? "選択中" : ""}</em></button><button type="button" className={form.status === STATUS.temporaryRequested ? "selected" : ""} onClick={() => setForm({ ...form, status: STATUS.temporaryRequested, policyAgreement: undefined })}><span className="radio-mark" aria-hidden="true"/><span><strong>仮予約として相談する</strong><small>1ヶ月前まで仮押さえします</small></span><em>{form.status === STATUS.temporaryRequested ? "選択中" : ""}</em></button></fieldset><div className="form-nav"><span/><button className="next" onClick={()=>setStep(2)}>同意確認へ <Icon name="arrow"/></button></div></div>}
    {step === 2 && <div className="form-body agreement-step"><p className="form-kicker">STEP 2</p><h2>{agreementTitle}</h2><p>{agreementIntro}</p><div className="agreement-notes"><strong>{agreementTitle}</strong><span>*</span><ul>{agreementItems.map(item => <li key={item}>{item}</li>)}</ul></div><label className={`agreement-check ${agreementAccepted ? "selected" : ""}`}><input type="checkbox" checked={agreementAccepted} onChange={event=>setAgreement(event.target.checked)}/><span><strong>{agreementTitle}に同意します</strong><small>チェックすると次の入力へ進めます</small></span><em>{agreementAccepted ? "同意済み" : ""}</em></label><div className="form-nav"><button onClick={()=>setStep(1)}>戻る</button><button className="next" disabled={!agreementAccepted} onClick={()=>setStep(3)}>日時・人数へ <Icon name="arrow"/></button></div></div>}
    {step === 3 && <div className="form-body narrow"><p className="form-kicker">STEP 3</p><h2>日時と人数を選択</h2><p>ご来店予定日、開始時間、人数を入力してください。</p><div className="form-fields reservation-date-fields"><label>ご利用日<input type="date" value={form.date} min="2026-07-08" onChange={e=>setForm({...form,date:e.target.value})}/></label><label>開始時間<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label>人数<select value={form.people} onChange={e=>setForm({...form,people:Number(e.target.value)})}>{[1,2,3,4,5,6].map(x=><option key={x}>{x}</option>)}</select></label></div><div className="form-nav"><button onClick={()=>setStep(2)}>戻る</button><button className="next" disabled={!form.date||!form.startTime} onClick={()=>setStep(4)}>お客様情報へ <Icon name="arrow"/></button></div></div>}
    {step === 4 && <div className="form-body narrow"><p className="form-kicker">STEP 4</p><h2>お客様情報を入力</h2><div className="form-fields single"><label>お名前<input placeholder="例）山田 花子" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>メールアドレス<input type="email" placeholder="hanako@example.jp" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>電話番号<input placeholder="090-0000-0000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label></div><div className="form-nav"><button onClick={()=>setStep(3)}>戻る</button><button className="next" disabled={!form.name||!form.email||!form.phone} onClick={()=>setStep(5)}>メニューへ <Icon name="arrow"/></button></div></div>}
    {step === 5 && <div className="form-body menu-step"><p className="form-kicker">STEP 5</p><h2>メニューを選択</h2><p>事前注文したい料理があれば選択してください。「来店後に注文」を選ぶとメニュー確定済として受付できます。</p><MenuPicker menuCatalog={menuCatalog} selected={form.menuItems} onChange={menuItems=>setForm({...form,menuItems})}/><div className="confirm-box"><span>{bookingFormDateTimeLabel(form)}・{form.people}名</span><strong>{menuSelectionLabel(form.menuItems)}</strong><small>{statusLabel(form.status ?? STATUS.confirmedRequested)}・{"¥"}{total.toLocaleString()}（税込）</small></div><div className="form-nav"><button onClick={()=>setStep(4)}>戻る</button><button className="next" disabled={!agreementAccepted} onClick={()=>setStep(6)}>最終確認へ <Icon name="arrow"/></button></div></div>}
    {step === 6 && <div className="form-body final-check"><p className="form-kicker">STEP 6</p><h2>予約内容の最終確認</h2><p>以下の内容で予約申請します。内容に誤りがないかご確認ください。</p><div className="final-summary"><dl><div><dt>予約種別</dt><dd>{statusLabel(form.status ?? STATUS.confirmedRequested)}</dd></div><div><dt>同意内容</dt><dd>{agreementTitle}に同意済み</dd></div><div><dt>ご利用日時</dt><dd>{bookingFormDateTimeLabel(form)}</dd></div><div><dt>人数</dt><dd>{form.people}名</dd></div><div><dt>お名前</dt><dd>{form.name}</dd></div><div><dt>メールアドレス</dt><dd>{form.email}</dd></div><div><dt>電話番号</dt><dd>{form.phone}</dd></div><div><dt>メニュー</dt><dd>{menuSelectionLabel(form.menuItems)}</dd></div><div><dt>金額</dt><dd>{"¥"}{total.toLocaleString()}（税込）</dd></div></dl></div><div className="form-nav"><button onClick={()=>setStep(5)}>戻る</button><button className="next" disabled={!agreementAccepted||!form.name||!form.email||!form.phone||!form.date||!form.startTime} onClick={submit}>この内容で申請する <Icon name="arrow"/></button></div></div>}
    {step === 7 && <div className="form-body complete"><span><Icon name="check"/></span><p className="form-kicker">REQUEST RECEIVED</p><h2>予約申請を受け付けました</h2><p>店舗で空席状況と内容を確認後、予約可否をご連絡します。</p><button className="next" onClick={()=>{setStep(1);setForm({...form,startTime:DEFAULT_START_TIME,name:"",email:"",phone:"",menuItems:[],status:STATUS.confirmedRequested,policyAgreement:undefined})}}>トップに戻る</button></div>}
  </section><section className="guide restaurant-guide" id="guide"><h2>ご予約の流れ</h2><div><span>01</span><h3>予約を申請</h3><p>予約種別、日時、人数、お客様情報を入力します。メニューは事前選択または来店後注文を選べます。</p></div><div><span>02</span><h3>予約可否のご回答</h3><p>店舗で空席状況やご希望内容を確認し、予約可否をご連絡します。</p></div><div><span>03</span><h3>予約確定</h3><p>ご案内内容をご確認いただき、来店日時にお越しください。</p></div></section>{toast&&<div className="toast"><Icon name="check"/>{toast}</div>}</main>;
}

