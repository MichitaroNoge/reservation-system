"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "仮予約申請中" | "仮予約確定" | "本予約申請中" | "本予約確定" | "来店待ち" | "来店済" | "キャンセル申請中" | "キャンセル確定";
type StoreAssignment = { store: string; people: number };
type Reservation = { id: string; customer: string; email?: string; date: string; people: number; menu?: string; menuItems?: string[]; totalAmount?: number; store: string | null; storeAssignments?: StoreAssignment[]; status: Status; confirmationContactedAt?: string | null; received: string; phone: string };
type Menu = { name: string; description: string; price: number; duration: string };
type Customer = { name: string; contact: string; phone: string; count: number; last: string };
type Store = { name: string; area: string; today: number; month: number; state: string };
type BookingForm = { menuItems: string[]; date: string; people: number; name: string; email: string; phone: string; status?: Status };
type MenuForm = Menu;
type CustomerForm = { name: string; contact: string; phone: string };
type StoreForm = Store;
type View = "dashboard" | "reservations" | "customers" | "stores" | "menus" | "billing";
type ReservationFilter = "すべて" | "承認待ち" | "仮予約確定" | "本予約確定" | "本予約確定（メニュー未確定）" | "本予約確定（店舗未割当）" | "本予約確定（未確認連絡）" | "来店待ち";
const VISIT_MENU_NAME = "来店後に注文";

const initialReservations: Reservation[] = [
  { id: "RSV-1048", customer: "山田 美咲", date: "2026-07-12", people: 2, menuItems: ["前菜盛り合わせ", "パスタランチ"], totalAmount: 7600, store: null, status: "仮予約申請中", received: "7月8日 09:42", phone: "090-1234-5678" },
  { id: "RSV-1047", customer: "佐藤 健太", date: "2026-07-10", people: 1, menuItems: ["季節のコース"], totalAmount: 6600, store: "渋谷店", status: "来店待ち", received: "7月7日 18:10", phone: "080-2345-6789" },
  { id: "RSV-1046", customer: "鈴木 由佳", date: "2026-07-15", people: 3, menuItems: ["飲み放題プラン", "記念日プレート"], totalAmount: 16800, store: "新宿店", status: "本予約確定", received: "7月7日 14:25", phone: "070-3456-7890" },
  { id: "RSV-1045", customer: "高橋 直人", date: "2026-07-09", people: 2, menuItems: ["パスタランチ"], totalAmount: 4000, store: "渋谷店", status: "キャンセル申請中", received: "7月6日 11:03", phone: "090-4567-8901" },
  { id: "RSV-1044", customer: "伊藤 結衣", date: "2026-07-08", people: 1, menuItems: ["前菜盛り合わせ", "記念日プレート"], totalAmount: 4200, store: "横浜店", status: "来店済", received: "7月5日 16:30", phone: "080-5678-9012" },
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

const statusClass: Record<Status, string> = { "仮予約申請中": "amber", "仮予約確定": "blue", "本予約申請中": "violet", "本予約確定": "green", "来店待ち": "cyan", "来店済": "gray", "キャンセル申請中": "red", "キャンセル確定": "red" };
const statusOptions: Status[] = ["仮予約申請中", "仮予約確定", "本予約申請中", "本予約確定", "来店待ち", "来店済", "キャンセル申請中", "キャンセル確定"];

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

function menuSelectionLabel(menuItems: string[]) {
  return menuItems.length ? menuItems.join("、") : "メニュー未確定";
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

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
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
  const [reservationDateFilter, setReservationDateFilter] = useState("");
  const [menuCatalog, setMenuCatalog] = useState<Menu[]>(defaultMenus);
  const [stores, setStores] = useState<Store[]>(defaultStores);
  const [form, setForm] = useState<BookingForm>({ menuItems: [], date: "2026-07-12", people: 2, name: "", email: "", phone: "", status: "本予約申請中" });
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [adminForm, setAdminForm] = useState<BookingForm>({ menuItems: [], date: "2026-07-12", people: 2, name: "", email: "", phone: "", status: "本予約確定" });

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
    approvals: reservations.filter(reservation => ["仮予約申請中", "本予約申請中", "キャンセル申請中"].includes(reservation.status)).length,
    storeUnassigned: reservations.filter(reservation => reservation.status === "本予約確定" && !reservationAssignments(reservation).length).length,
    menuUnselected: reservations.filter(reservation => reservation.status === "本予約確定" && !(reservation.menuItems?.length)).length,
    preContact: reservations.filter(reservation => ["本予約確定", "来店待ち"].includes(reservation.status) && !reservation.confirmationContactedAt).length,
  }), [reservations]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2500); };
  const updateStatus = async (id: string, status: Status) => {
    setReservations(rs => rs.map(r => r.id === id ? { ...r, status } : r));
    setSelected(s => s?.id === id ? { ...s, status } : s);
    try {
      const { reservation } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setReservations(rs => rs.map(r => r.id === id ? reservation : r));
      setSelected(s => s?.id === id ? reservation : s);
      notify(`予約を「${status}」へ更新しました`);
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
      if (reservation.status === "本予約確定" && reservation.menuItems?.length && reservationAssignments(reservation).length && reservation.confirmationContactedAt) {
        const { reservation: progressed } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "来店待ち" }) });
        setReservations(rs => rs.map(r => r.id === id ? progressed : r));
        setSelected(s => s?.id === id ? progressed : s);
        notify("メニュー・店舗割当・確認連絡が完了したため、来店待ちにしました");
        return;
      }
      setReservations(rs => rs.map(r => r.id === id ? reservation : r));
      setSelected(s => s?.id === id ? reservation : s);
      notify(reservation.status === "本予約確定" ? "店舗割当を保存しました。メニュー選択と確認連絡後に来店待ちへ進みます" : "店舗割当を保存しました");
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
        people: input.people,
        menuItems: input.menuItems,
        customer: input.name,
        email: input.email,
        phone: input.phone,
      }),
    });
    setReservations(rs => rs.map(r => r.id === id ? reservation : r));
    setSelected(s => s?.id === id ? reservation : s);
    if (reservation.status === "本予約確定" && reservation.menuItems?.length && reservationAssignments(reservation).length && reservation.confirmationContactedAt) {
      const { reservation: progressed } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "来店待ち" }) });
      setReservations(rs => rs.map(r => r.id === id ? progressed : r));
      setSelected(s => s?.id === id ? progressed : s);
      notify("メニュー・店舗割当・確認連絡が完了したため、来店待ちにしました");
      return progressed;
    }
    notify(`予約内容を更新しました（${id}）`);
    return reservation;
  };
  const updateConfirmationContact = async (id: string, contactedAt: string | null) => {
    const { reservation } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/confirmation-contact`, {
      method: "PATCH",
      body: JSON.stringify({ contactedAt }),
    });
    if (reservation.status === "本予約確定" && reservation.menuItems?.length && reservationAssignments(reservation).length && reservation.confirmationContactedAt) {
      const { reservation: progressed } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "来店待ち" }) });
      setReservations(rs => rs.map(r => r.id === id ? progressed : r));
      setSelected(s => s?.id === id ? progressed : s);
      notify("メニュー・店舗割当・確認連絡が完了したため、来店待ちにしました");
      return;
    }
    if (!contactedAt && reservation.status === "来店待ち") {
      const { reservation: reverted } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "本予約確定" }) });
      setReservations(rs => rs.map(r => r.id === id ? reverted : r));
      setSelected(s => s?.id === id ? reverted : s);
      notify("確認連絡を未実施に戻したため、本予約確定に戻しました");
      return;
    }
    setReservations(rs => rs.map(r => r.id === id ? reservation : r));
    setSelected(s => s?.id === id ? reservation : s);
    notify(contactedAt ? "確認連絡済みに更新しました" : "確認連絡を未実施に戻しました");
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
      setAdminForm({ menuItems: [], date: "2026-07-12", people: 2, name: "", email: "", phone: "", status: "本予約確定" });
      setIsNewReservationOpen(false);
      setReservationFilter("すべて");
      setReservationDateFilter("");
      setView("reservations");
      setSelected(reservation);
      notify(`予約を登録しました（${reservation.id}）`);
    } catch {
      notify("予約登録に失敗しました");
    }
  };

  const openReservations = (nextFilter: ReservationFilter, nextDate = "") => {
    setReservationFilter(nextFilter);
    setReservationDateFilter(nextDate);
    setView("reservations");
  };

  if (role === "customer") return <CustomerPortal form={form} setForm={setForm} step={formStep} setStep={setFormStep} onAdmin={() => setRole("admin")} notify={notify} toast={toast} onSubmitReservation={createReservation} menuCatalog={menuCatalog} />;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="logo"><span>R</span><strong>Reserve</strong><small>Operations</small></div>
      <nav><p>メニュー</p><button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><Icon name="grid"/>ダッシュボード</button><button className={view === "reservations" ? "active" : ""} onClick={() => openReservations("すべて")}><Icon name="calendar"/>予約管理</button><button className={view === "customers" ? "active" : ""} onClick={() => setView("customers")}><Icon name="users"/>顧客管理</button><button className={view === "stores" ? "active" : ""} onClick={() => setView("stores")}><Icon name="store"/>店舗管理</button><button className={view === "menus" ? "active" : ""} onClick={() => setView("menus")}><Icon name="chart"/>メニュー管理</button><button className={view === "billing" ? "active" : ""} onClick={() => setView("billing")}><Icon name="chart"/>利用実績・請求</button></nav>
      <div className="sidebar-bottom"><button onClick={() => setRole("customer")}>顧客画面を表示 <Icon name="arrow"/></button><div className="profile"><span>MN</span><div><strong>野毛 道太郎</strong><small>システム管理者</small></div></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><h1>{{dashboard:"ダッシュボード",reservations:"予約管理",customers:"顧客管理",stores:"店舗管理",menus:"メニュー管理",billing:"利用実績・請求"}[view]}</h1><p>2026年7月8日（水）</p></div><div className="top-actions"><label><Icon name="search"/><input placeholder="予約ID・顧客名で検索" /></label><button className="icon-btn"><Icon name="bell"/><i/></button></div></header>
      {view === "dashboard" ? <main className="dashboard">
        <section className="welcome"><div><p>おはようございます、野毛さん</p><h2>今日も予約状況を確認しましょう。</h2></div><div className="pulse"><span/>システム正常稼働中</div></section>
        <section className="dashboard-block"><div className="dashboard-block-head"><h3>情報</h3><p>予約状況の概要と本日の予定を確認できます</p></div><div className="info-dashboard-grid"><div className="stats info-stats">
          <Stat icon="calendar" label="本日の予約" value="8" note="前日比 +2件" color="blue" onClick={() => openReservations("すべて", todayIso())} />
          <Stat icon="chart" label="今月の予約" value="124" note="先月比 +12.4%" color="green" />
        </div><div className="panel schedule dashboard-schedule"><div className="panel-head"><div><h3>本日の予約</h3><p>7月8日（水）</p></div><button onClick={() => openReservations("すべて", todayIso())}>予約管理で見る <Icon name="arrow"/></button></div><div className="timeline"><span>10:00</span><i className="blue"/><div><strong>伊藤 結衣 様</strong><small>横浜店・パーソナル診断</small></div><span>14:30</span><i className="green"/><div><strong>田中 大輔 様</strong><small>渋谷店・スタンダード</small></div><span>17:00</span><i className="violet"/><div><strong>松本 愛 様</strong><small>新宿店・プレミアム</small></div></div></div></div></section>
        <section className="dashboard-block"><div className="dashboard-block-head"><h3>タスク</h3><p>対応が必要な予約業務です</p></div><div className="task-card-grid">
          <Task color="amber" title="承認待ち" count={taskCounts.approvals} text="仮予約・本予約・キャンセル申請を確認しましょう" onClick={() => openReservations("承認待ち")} />
          <Task color="violet" title="店舗割り当て" count={taskCounts.storeUnassigned} text="店舗割り当てを行いましょう" onClick={() => openReservations("本予約確定（店舗未割当）")} />
          <Task color="green" title="メニュー確定" count={taskCounts.menuUnselected} text="メニューが未確定のお客様を確認しましょう" onClick={() => openReservations("本予約確定（メニュー未確定）")} />
          <Task color="blue" title="確認連絡" count={taskCounts.preContact} text="確認連絡を行いましょう" onClick={() => openReservations("本予約確定（未確認連絡）")} />
        </div></section>
      </main> : <ManagementPage view={view} reservations={reservations} customers={customers} stores={stores} menus={menuCatalog} reservationFilter={reservationFilter} setReservationFilter={setReservationFilter} reservationDateFilter={reservationDateFilter} setReservationDateFilter={setReservationDateFilter} onSelect={setSelected} notify={notify} onSaveMenu={saveMenu} onDeleteMenu={deleteMenu} onSaveCustomer={saveCustomer} onDeleteCustomer={deleteCustomer} onSaveStore={saveStore} onDeleteStore={deleteStore} onOpenNewReservation={() => setIsNewReservationOpen(true)} />}
    </div>
    {isNewReservationOpen && <NewReservationDrawer form={adminForm} setForm={setAdminForm} onClose={() => setIsNewReservationOpen(false)} onSubmit={submitAdminReservation} menuCatalog={menuCatalog} />}
    {selected && <ReservationDrawer reservation={selected} onClose={() => setSelected(null)} updateStatus={updateStatus} updateConfirmationContact={updateConfirmationContact} assignStores={assignStores} updateReservation={updateReservation} menuCatalog={menuCatalog} stores={stores} />}
    {toast && <div className="toast"><Icon name="check"/>{toast}</div>}
  </div>;
}

function Stat({ icon, label, value, note, color, onClick }: { icon: string; label: string; value: string; note: string; color: string; onClick?: () => void }) { return <button className={`stat ${onClick ? "clickable" : ""}`} onClick={onClick} disabled={!onClick}><span className={`stat-icon ${color}`}><Icon name={icon}/></span><div><p>{label}</p><strong>{value}<small>件</small></strong><span className={color === "amber" || color === "violet" ? "attention" : "positive"}>{note}</span></div></button> }
function Task({ color, title, count, text, onClick }: { color: string; title: string; count?: number; text: string; onClick?: () => void }) { return <button className="task" onClick={onClick}><i className={color}/><div><strong>{title}{count !== undefined && <span className="task-count">{count}件</span>}</strong><small>{text}</small></div><Icon name="arrow"/></button> }

function ManagementPage({ view, reservations, customers, stores, menus, reservationFilter, setReservationFilter, reservationDateFilter, setReservationDateFilter, onSelect, notify, onSaveMenu, onDeleteMenu, onSaveCustomer, onDeleteCustomer, onSaveStore, onDeleteStore, onOpenNewReservation }: { view: Exclude<View,"dashboard">; reservations: Reservation[]; customers: Customer[]; stores: Store[]; menus: Menu[]; reservationFilter: ReservationFilter; setReservationFilter: (filter: ReservationFilter) => void; reservationDateFilter: string; setReservationDateFilter: (date: string) => void; onSelect: (r: Reservation) => void; notify: (s:string) => void; onSaveMenu: (input: MenuForm, originalName?: string) => Promise<void>; onDeleteMenu: (name: string) => Promise<void>; onSaveCustomer: (originalName: string, input: CustomerForm) => Promise<void>; onDeleteCustomer: (name: string) => Promise<void>; onSaveStore: (originalName: string, input: StoreForm) => Promise<void>; onDeleteStore: (name: string) => Promise<void>; onOpenNewReservation: () => void }) {
  const filteredReservations = useMemo(() => reservations.filter((reservation) => {
    const matchesDate = !reservationDateFilter || reservation.date === reservationDateFilter;
    if (!matchesDate) return false;
    if (reservationFilter === "すべて") return true;
    if (reservationFilter === "承認待ち") return ["仮予約申請中", "本予約申請中", "キャンセル申請中"].includes(reservation.status);
    if (reservationFilter === "本予約確定（メニュー未確定）") return reservation.status === "本予約確定" && !(reservation.menuItems?.length);
    if (reservationFilter === "本予約確定（店舗未割当）") return reservation.status === "本予約確定" && !reservationAssignments(reservation).length;
    if (reservationFilter === "本予約確定（未確認連絡）") return ["本予約確定", "来店待ち"].includes(reservation.status) && !reservation.confirmationContactedAt;
    return reservation.status === reservationFilter;
  }), [reservationDateFilter, reservationFilter, reservations]);
  const quickFilters: ReservationFilter[] = ["すべて", "承認待ち", "仮予約確定", "本予約確定", "本予約確定（メニュー未確定）", "本予約確定（店舗未割当）", "本予約確定（未確認連絡）", "来店待ち"];
  return <main className="management">
    <section className="page-title"><div><p>RESERVATION OPERATIONS</p><h2>{{reservations:"すべての予約",customers:"お客様一覧",stores:"店舗一覧",menus:"メニュー一覧",billing:"利用実績・請求管理"}[view]}</h2><span>{{reservations:"予約申請から来店完了までを一元管理します。",customers:"予約者の連絡先と利用履歴を確認できます。",stores:"店舗ごとの割当状況と稼働実績を確認できます。",menus:"飲食店で提供する料理・コース・オプションを管理します。",billing:"来店実績、売上、請求書の発行状況を管理します。"}[view]}</span></div><button onClick={() => view === "reservations" ? onOpenNewReservation() : notify(view === "billing" ? "請求データをCSV出力しました" : view === "menus" ? "下部のフォームからメニューを追加できます" : "新規登録画面を準備しました")}><Icon name={view === "billing" ? "chart" : "plus"}/>{view === "billing" ? "CSV出力" : view === "menus" ? "メニュー追加" : "新規登録"}</button></section>
    {view === "reservations" && <section className="panel management-panel"><div className="management-tools"><div className="segmented">{quickFilters.map(filter => <button key={filter} className={reservationFilter === filter ? "active" : ""} onClick={() => setReservationFilter(filter)}>{filter}</button>)}</div><div className="result-count"><span>該当</span><strong>{filteredReservations.length}</strong><span>件</span></div><label className="status-filter">表示<select value={reservationFilter} onChange={(event) => setReservationFilter(event.target.value as ReservationFilter)}>{quickFilters.map(filter => <option key={filter} value={filter}>{filter}</option>)}</select></label><label className="status-filter">予約日<input type="date" value={reservationDateFilter} onChange={(event) => setReservationDateFilter(event.target.value)}/></label>{reservationDateFilter && <button className="clear-filter" onClick={() => setReservationDateFilter("")}>日付クリア</button>}</div><div className="table-wrap"><table className="large-table"><thead><tr><th>ステータス</th><th>予約ID</th><th>お客様</th><th>利用日・人数</th><th>メニュー</th><th>担当店舗</th><th>確認連絡</th><th/></tr></thead><tbody>{filteredReservations.map(r=><tr key={r.id} onClick={()=>onSelect(r)}><td><span className={`badge ${statusClass[r.status]}`}><i/>{r.status}</span></td><td><strong>{r.id}</strong><small>{r.received}</small></td><td><strong>{r.customer}</strong><small>{r.phone}</small></td><td><strong>{r.date.replaceAll("-","/")}</strong><small>{r.people}名</small></td><td>{reservationMenuLabel(r)}</td><td>{assignmentLabel(r) ? <strong>{assignmentLabel(r)}</strong> : <span className="unassigned">未割当</span>}</td><td>{r.confirmationContactedAt ? <><strong>連絡済</strong><small>{new Date(r.confirmationContactedAt).toLocaleDateString("ja-JP")}</small></> : <span className="unassigned">未連絡</span>}</td><td><Icon name="arrow"/></td></tr>)}</tbody></table>{!filteredReservations.length && <div className="empty-table">選択した条件の予約はありません。</div>}</div></section>}
    {view === "customers" && <CustomerManagement customers={customers} onSaveCustomer={onSaveCustomer} onDeleteCustomer={onDeleteCustomer} notify={notify} />}
    {view === "stores" && <StoreManagement stores={stores} onSaveStore={onSaveStore} onDeleteStore={onDeleteStore} notify={notify} />}
    {view === "menus" && <MenuManagement menus={menus} onSaveMenu={onSaveMenu} onDeleteMenu={onDeleteMenu} />}
    {view === "billing" && <><section className="stats billing-stats"><Stat icon="chart" label="今月の売上" value="682,400" note="先月比 +8.2%" color="green"/><Stat icon="calendar" label="利用完了" value="96" note="予約124件中" color="blue"/><Stat icon="users" label="未請求" value="4" note="対応が必要です" color="amber"/><Stat icon="chart" label="請求書発行" value="18" note="今月の発行数" color="violet"/></section><section className="panel management-panel"><div className="panel-head"><div><h3>最近の利用実績</h3><p>来店受付後に登録された実績と請求状態</p></div></div><div className="table-wrap"><table className="large-table"><thead><tr><th>利用日</th><th>予約ID / お客様</th><th>店舗</th><th>利用内容</th><th>金額</th><th>請求状態</th><th/></tr></thead><tbody><tr><td>2026/07/08</td><td><strong>RSV-1044</strong><small>伊藤 結衣 様</small></td><td>横浜店</td><td>パーソナル診断 × 1</td><td><strong>¥8,800</strong></td><td><span className="badge green"><i/>請求済</span></td><td><Icon name="arrow"/></td></tr><tr><td>2026/07/07</td><td><strong>RSV-1042</strong><small>小林 亮 様</small></td><td>渋谷店</td><td>スタンダード × 2</td><td><strong>¥11,000</strong></td><td><span className="badge amber"><i/>未請求</span></td><td><Icon name="arrow"/></td></tr><tr><td>2026/07/06</td><td><strong>RSV-1038</strong><small>中村 彩 様</small></td><td>新宿店</td><td>プレミアム × 1</td><td><strong>¥13,200</strong></td><td><span className="badge blue"><i/>請求書発行</span></td><td><Icon name="arrow"/></td></tr></tbody></table></div></section></>}
  </main>;
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

  return <section className="card-grid stores-grid">{stores.map((s)=><article className="entity-card store-card store-edit-card" key={s.name}>{editingName === s.name ? <><div className="store-photo"><Icon name="store"/><span><i/>{form.state || "未設定"}</span></div><div className="drawer-form single"><label>店舗名<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>エリア・住所<input value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/></label><label>状態<select value={form.state} onChange={e=>setForm({...form,state:e.target.value})}><option>営業中</option><option>休業中</option><option>準備中</option></select></label><label>本日の予約<input type="number" value={form.today} onChange={e=>setForm({...form,today:Number(e.target.value)})}/></label><label>今月の実績<input type="number" value={form.month} onChange={e=>setForm({...form,month:Number(e.target.value)})}/></label></div><div className="customer-card-actions"><button onClick={cancel}>キャンセル</button><button className="save" disabled={!form.name || !form.area || !form.state} onClick={save}>保存</button></div></> : <><div className="store-photo"><Icon name="store"/><span><i/>{s.state}</span></div><h3>{s.name}</h3><p>{s.area}<br/>10:00 — 20:00</p><dl><div><dt>本日の予約</dt><dd>{s.today}件</dd></div><div><dt>今月の実績</dt><dd>{s.month}件</dd></div></dl><div className="customer-card-actions"><button onClick={()=>notify(`${s.name}の割当状況を表示しました`)}>割当状況</button><button onClick={() => startEdit(s)}>編集</button><button className="danger" onClick={() => remove(s)}>削除</button></div></>}</article>)}</section>;
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
  return <div className="menu-check-grid">{menuCatalog.map(menu => <button type="button" key={menu.name} className={selected.includes(menu.name) ? "selected" : ""} onClick={() => toggle(menu.name)}><span>{selected.includes(menu.name) && <Icon name="check"/>}</span><h3>{menu.name}</h3><p>{menu.description}</p><div><strong>¥{menu.price.toLocaleString()}</strong><small>{menu.duration}</small></div></button>)}</div>;
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

  return <section className="menu-admin-grid"><div className="panel management-panel"><div className="panel-head"><div><h3>登録済みメニュー</h3><p>予約フォームで複数選択できる料理・コースです</p></div></div><div className="table-wrap"><table className="large-table"><thead><tr><th>メニュー名</th><th>説明</th><th>金額</th><th>提供目安</th><th/></tr></thead><tbody>{menus.map(menu => <tr key={menu.name}><td><strong>{menu.name}</strong></td><td>{menu.description}</td><td><strong>¥{menu.price.toLocaleString()}</strong></td><td>{menu.duration}</td><td><button className="text-action" onClick={() => startEdit(menu)}>編集</button><button className="text-action danger" onClick={() => onDeleteMenu(menu.name)}>削除</button></td></tr>)}</tbody></table></div></div>
    <aside className="panel menu-editor"><div className="panel-head"><div><h3>{editingName ? "メニュー編集" : "メニュー追加"}</h3><p>料理、コース、オプションを登録します</p></div></div><div className="drawer-form single"><label>メニュー名<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>説明<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label><label>金額<input type="number" value={form.price || ""} onChange={e => setForm({ ...form, price: Number(e.target.value) })}/></label><label>提供目安<input placeholder="例：45分" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}/></label><button className="full-action" disabled={!canSubmit} onClick={submit}>{editingName ? "更新する" : "追加する"}</button>{editingName && <button className="cancel-edit" onClick={() => { setEditingName(undefined); setForm(emptyForm); }}>編集をキャンセル</button>}</div></aside></section>;
}

function ReservationDrawer({ reservation: r, onClose, updateStatus, updateConfirmationContact, assignStores, updateReservation, menuCatalog, stores }: { reservation: Reservation; onClose: () => void; updateStatus: (id: string, status: Status) => void; updateConfirmationContact: (id: string, contactedAt: string | null) => Promise<void>; assignStores: (id: string, assignments: StoreAssignment[]) => void; updateReservation: (id: string, form: BookingForm) => Promise<Reservation>; menuCatalog: Menu[]; stores: Store[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [editForm, setEditForm] = useState<BookingForm>({ menuItems: r.menuItems ?? [], date: r.date, people: r.people, name: r.customer, email: r.email ?? "", phone: r.phone });
  const activeStores = stores.filter(store => store.state === "営業中");
  const canEditAssignments = r.status === "本予約確定" || r.status === "来店待ち" || r.status === "来店済";
  const isMenuSelected = Boolean(r.menuItems?.length);
  const isStoreAssigned = reservationAssignments(r).length > 0;
  const canUpdateConfirmationContact = r.status === "本予約確定" || r.status === "来店待ち" || r.status === "来店済";
  const [assignmentDraft, setAssignmentDraft] = useState<StoreAssignment[]>(reservationAssignments(r).length ? reservationAssignments(r) : [{ store: "", people: r.people }]);
  const editTotal = selectedMenuTotal(editForm.menuItems, menuCatalog);
  const canSave = Boolean(editForm.date && editForm.people && editForm.name && editForm.email && editForm.phone);
  const assignedPeople = assignmentDraft.reduce((total, assignment) => total + Number(assignment.people || 0), 0);
  const canSaveAssignments = assignmentDraft.length > 0 && assignedPeople === r.people && assignmentDraft.every(assignment => assignment.store && assignment.people > 0);
  useEffect(() => {
    setAssignmentDraft(reservationAssignments(r).length ? reservationAssignments(r) : [{ store: "", people: r.people }]);
  }, [r.id, r.people, r.store, r.storeAssignments]);
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

  return <><div className="drawer-shade" onClick={onClose}/><aside className="drawer"><header><div><span className={`badge ${statusClass[r.status]}`}><i/>{r.status}</span><h2>{r.id}</h2></div><button onClick={onClose}><Icon name="close"/></button></header>
    {!isEditing && !isAssigning ? <><section><p className="section-label">お客様情報</p><div className="customer-card"><span>{r.customer.slice(0,1)}</span><div><strong>{r.customer} 様</strong><small>{r.phone}<br/>{r.email ?? "customer@example.jp"}</small></div></div></section><section><p className="section-label">予約内容</p><dl><div><dt>利用日</dt><dd>{r.date.replaceAll("-", "/")} 10:00</dd></div><div><dt>予定人数</dt><dd>{r.people}名</dd></div><div><dt>メニュー</dt><dd>{reservationMenuLabel(r)}</dd></div><div><dt>金額</dt><dd>¥{(r.totalAmount ?? 0).toLocaleString()}</dd></div></dl><button className="edit-reservation-button" onClick={() => setIsEditing(true)}>予約内容を編集</button></section><section><p className="section-label">店舗割当</p><dl><div><dt>割当状況</dt><dd>{assignmentLabel(r) || "未割当"}</dd></div><div><dt>割当人数</dt><dd>{reservationAssignments(r).reduce((total, assignment) => total + assignment.people, 0)}名 / {r.people}名</dd></div></dl>{canEditAssignments ? <button className="edit-reservation-button" onClick={() => setIsAssigning(true)}>店舗割当を編集</button> : <p className="optional-note">店舗割当は本予約確定後に編集できます。</p>}</section>{canUpdateConfirmationContact && <section><p className="section-label">確認連絡</p><dl><div><dt>連絡状況</dt><dd>{r.confirmationContactedAt ? `連絡済み（${new Date(r.confirmationContactedAt).toLocaleString("ja-JP") }）` : "未連絡"}</dd></div></dl>{r.confirmationContactedAt ? <button className="edit-reservation-button" onClick={() => updateConfirmationContact(r.id, null)}>未連絡に戻す</button> : <button className="full-action" onClick={() => updateConfirmationContact(r.id, new Date().toISOString())}><Icon name="check"/>確認連絡済みにする</button>}<p className="optional-note">将来はメール送信完了時に自動更新します。</p></section>}<section><p className="section-label">ステータスを変更</p><p className="optional-note">誤って進めた場合など、必要に応じて前のステータスへ戻せます。</p><div className="drawer-form single"><label>現在のステータス<select value={r.status} onChange={event => updateStatus(r.id, event.target.value as Status)}>{statusOptions.map(status => <option key={status} value={status}>{status}</option>)}</select></label></div></section><section><p className="section-label">次のアクション</p>{r.status === "仮予約申請中" && <div className="drawer-actions"><button className="reject">受付不可</button><button className="approve" onClick={() => updateStatus(r.id,"仮予約確定")}><Icon name="check"/>承認する</button></div>}{r.status === "仮予約確定" && <button className="full-action" onClick={() => updateStatus(r.id,"本予約申請中")}>本予約申請へ進める</button>}{r.status === "本予約申請中" && <button className="full-action" onClick={() => updateStatus(r.id,"本予約確定")}>本予約を承認する</button>}{r.status === "本予約確定" && <div className="readiness-card"><strong>来店待ちに進む条件</strong><small>{isMenuSelected ? "✓ メニュー選択済み" : "・メニュー選択が未完了"}</small><small>{isStoreAssigned ? "✓ 店舗割当済み" : "・店舗割当が未完了"}</small><small>{r.confirmationContactedAt ? "✓ 確認連絡済み" : "・確認連絡が未完了"}</small><p>3つすべて完了すると自動で来店待ちになります。</p></div>}{r.status === "来店待ち" && <button className="full-action" onClick={() => updateStatus(r.id,"来店済")}>来店受付・利用実績を登録</button>}{r.status === "キャンセル申請中" && <button className="full-action danger" onClick={() => { updateStatus(r.id,"キャンセル確定"); onClose(); }}>キャンセルを確定する</button>}</section></> : isAssigning ?
    <><section><p className="section-label">店舗割当を編集</p><p className="optional-note">予約人数 {r.people}名に対して、複数店舗へ人数を分割して割り当てできます。</p><div className="assignment-editor">{assignmentDraft.map((assignment, index) => <div className="assignment-row" key={index}><select value={assignment.store} onChange={event => updateAssignment(index, { store: event.target.value })}><option value="">店舗を選択</option>{activeStores.map(store => <option key={store.name} value={store.name}>{store.name}</option>)}</select><input type="number" min="1" max={r.people} value={assignment.people || ""} onChange={event => updateAssignment(index, { people: Number(event.target.value) })}/><span>名</span><button onClick={() => removeAssignment(index)} disabled={assignmentDraft.length === 1}>削除</button></div>)}</div><button className="edit-reservation-button" onClick={addAssignment}>割当行を追加</button><div className={assignedPeople === r.people ? "assignment-total ok" : "assignment-total warn"}>割当合計 {assignedPeople}名 / 予約人数 {r.people}名</div><div className="drawer-actions"><button onClick={() => { setAssignmentDraft(reservationAssignments(r).length ? reservationAssignments(r) : [{ store: "", people: r.people }]); setIsAssigning(false); }}>キャンセル</button><button className="approve" disabled={!canSaveAssignments} onClick={saveAssignments}><Icon name="check"/>保存する</button></div></section></> :
    <><section><p className="section-label">予約内容を編集</p><div className="drawer-form"><label>利用日<input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })}/></label><label>人数<select value={editForm.people} onChange={e => setEditForm({ ...editForm, people: Number(e.target.value) })}>{[1,2,3,4,5,6].map(x => <option key={x}>{x}</option>)}</select></label></div></section><section><p className="section-label">お客様情報</p><div className="drawer-form single"><label>お名前<input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}/></label><label>メールアドレス<input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}/></label><label>電話番号<input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}/></label></div></section><section><p className="section-label">任意メニュー</p><p className="optional-note">変更連絡に応じて、事前注文メニューを追加・削除できます。未選択でも保存できます。</p><MenuPicker menuCatalog={menuCatalog} selected={editForm.menuItems} onChange={menuItems => setEditForm({ ...editForm, menuItems })}/><div className="reservation-summary"><strong>{menuSelectionLabel(editForm.menuItems)}</strong><span>{editForm.date.replaceAll("-", "/")}・{editForm.people}名</span><small>¥{editTotal.toLocaleString()}</small></div><div className="drawer-actions"><button onClick={() => { setEditForm({ menuItems: r.menuItems ?? [], date: r.date, people: r.people, name: r.customer, email: r.email ?? "", phone: r.phone }); setIsEditing(false); }}>キャンセル</button><button className="approve" disabled={!canSave} onClick={save}><Icon name="check"/>保存する</button></div></section></>}
  </aside></>;
}

function NewReservationDrawer({ form, setForm, onClose, onSubmit, menuCatalog }: { form: BookingForm; setForm: React.Dispatch<React.SetStateAction<BookingForm>>; onClose: () => void; onSubmit: () => void; menuCatalog: Menu[] }) {
  const canSubmit = Boolean(form.name && form.email && form.phone && form.date && form.people);
  const total = selectedMenuTotal(form.menuItems, menuCatalog);

  return <><div className="drawer-shade" onClick={onClose}/><aside className="drawer new-reservation-drawer"><header><div><span className="badge blue"><i/>新規登録</span><h2>新規予約</h2></div><button onClick={onClose}><Icon name="close"/></button></header>
    <section><p className="section-label">予約内容</p><div className="drawer-form"><label>登録時ステータス<select value={form.status ?? "仮予約申請中"} onChange={e => setForm({ ...form, status: e.target.value as Status })}><option value="本予約確定">本予約確定</option><option value="仮予約申請中">仮予約申請中</option><option value="仮予約確定">仮予約確定</option><option value="本予約申請中">本予約申請中</option></select></label><label>利用日<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></label><label>人数<select value={form.people} onChange={e => setForm({ ...form, people: Number(e.target.value) })}>{[1,2,3,4,5,6].map(x => <option key={x}>{x}</option>)}</select></label></div></section>
    <section><p className="section-label">お客様情報</p><div className="drawer-form single"><label>お名前<input placeholder="例：山田 花子" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>メールアドレス<input type="email" placeholder="hanako@example.jp" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label><label>電話番号<input placeholder="090-0000-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label></div></section>
    <section><p className="section-label">任意メニュー</p><p className="optional-note">事前に注文内容が決まっている場合のみ選択してください。未選択でも予約できます。</p><MenuPicker menuCatalog={menuCatalog} selected={form.menuItems} onChange={menuItems => setForm({ ...form, menuItems })}/></section>
    <section><p className="section-label">登録内容の確認</p><div className="reservation-summary"><strong>{menuSelectionLabel(form.menuItems)}</strong><span>{form.date.replaceAll("-", "/")}・{form.people}名・{form.status ?? "仮予約申請中"}</span><small>¥{total.toLocaleString()}</small></div><button className="full-action" disabled={!canSubmit} onClick={onSubmit}><Icon name="check"/>予約を登録する</button></section>
  </aside></>;
}

function CustomerPortal({ form, setForm, step, setStep, onAdmin, notify, toast, onSubmitReservation, menuCatalog }: { form: BookingForm; setForm: React.Dispatch<React.SetStateAction<BookingForm>>; step:number; setStep:(n:number)=>void; onAdmin:()=>void; notify:(s:string)=>void; toast:string; onSubmitReservation:(form: BookingForm)=>Promise<Reservation>; menuCatalog: Menu[] }) {
  const total = selectedMenuTotal(form.menuItems, menuCatalog);
  const submit = async () => {
    try {
      const reservation = await onSubmitReservation(form);
      notify(`${reservation.status === "本予約申請中" ? "本予約申請" : "仮予約申請"}を受け付けました（${reservation.id}）`);
      setStep(4);
    } catch {
      notify("予約申請の保存に失敗しました");
    }
  };
  return <main className="customer-page restaurant-reservation"><header><div className="public-logo"><span>R</span><strong>Reserve</strong></div><nav><a href="#guide">ご予約の流れ</a><a href="#contact">お問い合わせ</a><button onClick={onAdmin}>管理画面</button></nav></header><section className="customer-hero restaurant-hero"><div><p>RESTAURANT RESERVATION</p><h1>お席とお料理を、<br/><em>かんたん予約。</em></h1><span>ご希望の予約種別、来店日時、人数を選んでお申し込みください。メニューは事前に選んでも、来店後に注文しても大丈夫です。</span><div className="hero-tags"><span>席のみOK</span><span>事前注文OK</span><span>本予約・仮予約対応</span></div></div><div className="hero-orb restaurant-orb"><span>Table<br/>Menu</span></div></section><section className="booking-card"><div className="stepper">{["予約種別","日時・人数","お客様情報","メニュー","受付完了"].map((s,i)=><div key={s} className={step >= i+1 ? "active" : ""}><span>{step > i+1 ? "✓" : i+1}</span><small>{s}</small>{i<4&&<i/>}</div>)}</div>
    {step === 1 && <div className="form-body narrow"><p className="form-kicker">STEP 1</p><h2>予約種別を選択</h2><p>来店前提で席を確保する本予約、または内容を相談してから進める仮予約を選べます。</p><div className="reservation-type-grid"><button className={form.status === "本予約申請中" ? "selected" : ""} onClick={() => setForm({ ...form, status: "本予約申請中" })}><span>{form.status === "本予約申請中" && <Icon name="check"/>}</span><strong>本予約を申し込む</strong><small>席の確保を前提に予約を申請します</small></button><button className={form.status === "仮予約申請中" ? "selected" : ""} onClick={() => setForm({ ...form, status: "仮予約申請中" })}><span>{form.status === "仮予約申請中" && <Icon name="check"/>}</span><strong>仮予約として相談する</strong><small>人数や内容を確認してから確定します</small></button></div><div className="form-nav"><span/><button className="next" onClick={()=>setStep(2)}>日時・人数へ <Icon name="arrow"/></button></div></div>}
    {step === 2 && <div className="form-body narrow"><p className="form-kicker">STEP 2</p><h2>日時と人数を選択</h2><p>ご来店予定日と人数を入力してください。</p><div className="form-fields"><label>ご利用日<input type="date" value={form.date} min="2026-07-08" onChange={e=>setForm({...form,date:e.target.value})}/></label><label>人数<select value={form.people} onChange={e=>setForm({...form,people:Number(e.target.value)})}>{[1,2,3,4,5,6].map(x=><option key={x}>{x}</option>)}</select></label></div><div className="form-nav"><button onClick={()=>setStep(1)}>戻る</button><button className="next" onClick={()=>setStep(3)}>お客様情報へ <Icon name="arrow"/></button></div></div>}
    {step === 3 && <div className="form-body narrow"><p className="form-kicker">STEP 3</p><h2>お客様情報を入力</h2><div className="form-fields single"><label>お名前<input placeholder="例）山田 花子" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>メールアドレス<input type="email" placeholder="hanako@example.jp" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>電話番号<input placeholder="090-0000-0000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label></div><div className="form-nav"><button onClick={()=>setStep(2)}>戻る</button><button className="next" disabled={!form.name||!form.email||!form.phone} onClick={()=>setStep(4)}>メニューへ <Icon name="arrow"/></button></div></div>}
    {step === 4 && <div className="form-body menu-step"><p className="form-kicker">STEP 4</p><h2>メニューを選択</h2><p>事前注文したい料理があれば選択してください。「来店後に注文」を選ぶとメニュー確定済として受付できます。</p><MenuPicker menuCatalog={menuCatalog} selected={form.menuItems} onChange={menuItems=>setForm({...form,menuItems})}/><div className="confirm-box"><span>{form.date.replaceAll("-","/")}・{form.people}名</span><strong>{menuSelectionLabel(form.menuItems)}</strong><small>{form.status ?? "本予約申請中"}・¥{total.toLocaleString()}（税込）</small></div><div className="form-nav"><button onClick={()=>setStep(3)}>戻る</button><button className="next" onClick={submit}>予約を申請する <Icon name="arrow"/></button></div></div>}
    {step === 5 && <div className="form-body complete"><span><Icon name="check"/></span><p className="form-kicker">REQUEST RECEIVED</p><h2>予約申請を受け付けました</h2><p>店舗で空席状況と内容を確認後、予約可否をご連絡します。</p><button className="next" onClick={()=>{setStep(1);setForm({...form,name:"",email:"",phone:"",menuItems:[],status:"本予約申請中"})}}>トップに戻る</button></div>}
  </section><section className="guide restaurant-guide" id="guide"><h2>ご予約の流れ</h2><div><span>01</span><h3>予約を申請</h3><p>予約種別、日時、人数、お客様情報を入力します。メニューは事前選択または来店後注文を選べます。</p></div><div><span>02</span><h3>予約可否のご回答</h3><p>店舗で空席状況やご希望内容を確認し、予約可否をご連絡します。</p></div><div><span>03</span><h3>予約確定</h3><p>ご案内内容をご確認いただき、来店日時にお越しください。</p></div></section>{toast&&<div className="toast"><Icon name="check"/>{toast}</div>}</main>;
}
