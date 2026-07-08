"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "仮予約申請中" | "仮予約確定" | "本予約申請中" | "本予約確定" | "来店待ち" | "来店済" | "キャンセル申請中" | "キャンセル確定";
type Reservation = { id: string; customer: string; date: string; people: number; menu?: string; menuItems?: string[]; totalAmount?: number; store: string | null; status: Status; received: string; phone: string };
type Menu = { name: string; description: string; price: number; duration: string };
type BookingForm = { menuItems: string[]; date: string; people: number; name: string; email: string; phone: string };
type MenuForm = Menu;
type View = "dashboard" | "reservations" | "customers" | "stores" | "menus" | "billing";

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
];

const statusClass: Record<Status, string> = { "仮予約申請中": "amber", "仮予約確定": "blue", "本予約申請中": "violet", "本予約確定": "green", "来店待ち": "cyan", "来店済": "gray", "キャンセル申請中": "red", "キャンセル確定": "red" };

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
  return items.length ? items.join("、") : "未選択";
}

function selectedMenuTotal(menuItems: string[], menuCatalog: Menu[]) {
  return menuItems.reduce((total, name) => total + (menuCatalog.find(menu => menu.name === name)?.price ?? 0), 0);
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
  const [menuCatalog, setMenuCatalog] = useState<Menu[]>(defaultMenus);
  const [form, setForm] = useState<BookingForm>({ menuItems: ["季節のコース"], date: "2026-07-12", people: 2, name: "", email: "", phone: "" });
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [adminForm, setAdminForm] = useState<BookingForm>({ menuItems: ["季節のコース"], date: "2026-07-12", people: 2, name: "", email: "", phone: "" });

  useEffect(() => {
    requestJson<{ reservations: Reservation[] }>("/api/reservations")
      .then(({ reservations }) => setReservations(reservations))
      .catch(() => notify("予約データの読み込みに失敗しました"));
    requestJson<{ menus: Menu[] }>("/api/menus")
      .then(({ menus }) => setMenuCatalog(menus))
      .catch(() => notify("メニューデータの読み込みに失敗しました"));
  }, []);

  const visible = useMemo(() => filter === "すべて" ? reservations : reservations.filter(r => r.status.includes(filter)), [filter, reservations]);
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
  const assignStore = async (id: string, store: string) => {
    setReservations(rs => rs.map(r => r.id === id ? { ...r, store } : r));
    setSelected(s => s?.id === id ? { ...s, store } : s);
    try {
      const { reservation } = await requestJson<{ reservation: Reservation }>(`/api/reservations/${id}/store`, { method: "PATCH", body: JSON.stringify({ store }) });
      setReservations(rs => rs.map(r => r.id === id ? reservation : r));
      setSelected(s => s?.id === id ? reservation : s);
      notify(`${store}を割り当てました`);
    } catch {
      notify("店舗割当の保存に失敗しました");
    }
  };
  const createReservation = async (input: BookingForm) => {
    const { reservation } = await requestJson<{ reservation: Reservation }>("/api/reservations", { method: "POST", body: JSON.stringify(input) });
    setReservations(rs => [reservation, ...rs.filter(r => r.id !== reservation.id)]);
    return reservation;
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
  const submitAdminReservation = async () => {
    try {
      const reservation = await createReservation(adminForm);
      setAdminForm({ menuItems: [menuCatalog[0]?.name ?? ""].filter(Boolean), date: "2026-07-12", people: 2, name: "", email: "", phone: "" });
      setIsNewReservationOpen(false);
      setView("reservations");
      setSelected(reservation);
      notify(`予約を登録しました（${reservation.id}）`);
    } catch {
      notify("予約登録に失敗しました");
    }
  };

  if (role === "customer") return <CustomerPortal form={form} setForm={setForm} step={formStep} setStep={setFormStep} onAdmin={() => setRole("admin")} notify={notify} toast={toast} onSubmitReservation={createReservation} menuCatalog={menuCatalog} />;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="logo"><span>R</span><strong>Reserve</strong><small>Operations</small></div>
      <nav><p>メニュー</p><button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><Icon name="grid"/>ダッシュボード</button><button className={view === "reservations" ? "active" : ""} onClick={() => setView("reservations")}><Icon name="calendar"/>予約管理<i>7</i></button><button className={view === "customers" ? "active" : ""} onClick={() => setView("customers")}><Icon name="users"/>顧客管理</button><button className={view === "stores" ? "active" : ""} onClick={() => setView("stores")}><Icon name="store"/>店舗管理</button><button className={view === "menus" ? "active" : ""} onClick={() => setView("menus")}><Icon name="chart"/>メニュー管理</button><button className={view === "billing" ? "active" : ""} onClick={() => setView("billing")}><Icon name="chart"/>利用実績・請求</button></nav>
      <div className="sidebar-bottom"><button onClick={() => setRole("customer")}>顧客画面を表示 <Icon name="arrow"/></button><div className="profile"><span>MN</span><div><strong>野毛 道太郎</strong><small>システム管理者</small></div></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><h1>{{dashboard:"ダッシュボード",reservations:"予約管理",customers:"顧客管理",stores:"店舗管理",menus:"メニュー管理",billing:"利用実績・請求"}[view]}</h1><p>2026年7月8日（水）</p></div><div className="top-actions"><label><Icon name="search"/><input placeholder="予約ID・顧客名で検索" /></label><button className="icon-btn"><Icon name="bell"/><i/></button><button className="new-btn" onClick={() => setIsNewReservationOpen(true)}><Icon name="plus"/>新規予約</button></div></header>
      {view === "dashboard" ? <main className="dashboard">
        <section className="welcome"><div><p>おはようございます、野毛さん</p><h2>今日も予約状況を確認しましょう。</h2></div><div className="pulse"><span/>システム正常稼働中</div></section>
        <section className="stats">
          <Stat icon="calendar" label="本日の予約" value="8" note="前日比 +2件" color="blue" />
          <Stat icon="users" label="承認待ち" value="3" note="対応が必要です" color="amber" />
          <Stat icon="store" label="店舗未割当" value="2" note="3日以内の予約" color="violet" />
          <Stat icon="chart" label="今月の予約" value="124" note="先月比 +12.4%" color="green" />
        </section>
        <section className="content-grid">
          <div className="panel reservations-panel"><div className="panel-head"><div><h3>最近の予約</h3><p>新着・更新された予約を確認できます</p></div><button>すべて見る <Icon name="arrow"/></button></div>
            <div className="filters">{["すべて","申請中","確定","来店","キャンセル"].map(x => <button key={x} className={filter === x ? "active" : ""} onClick={() => setFilter(x)}>{x}</button>)}</div>
            <div className="table-wrap"><table><thead><tr><th>予約ID / 受付</th><th>お客様</th><th>利用日</th><th>店舗</th><th>ステータス</th><th/></tr></thead><tbody>{visible.map(r => <tr key={r.id} onClick={() => setSelected(r)}><td><strong>{r.id}</strong><small>{r.received}</small></td><td><strong>{r.customer}</strong><small>{r.people}名・{reservationMenuLabel(r)}</small></td><td>{new Date(`${r.date}T00:00`).toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" })}</td><td>{r.store ?? <span className="unassigned">未割当</span>}</td><td><span className={`badge ${statusClass[r.status]}`}><i/>{r.status}</span></td><td><button className="row-arrow"><Icon name="arrow"/></button></td></tr>)}</tbody></table></div>
          </div>
          <aside className="right-rail"><div className="panel tasks"><div className="panel-head"><div><h3>要対応タスク</h3><p>本日中の対応をおすすめします</p></div><span>5</span></div>
            <Task color="amber" title="仮予約の承認" text="3件の申請が承認待ちです" /> <Task color="violet" title="店舗の割り当て" text="2件が未割り当てです" /> <Task color="blue" title="事前連絡" text="明日利用のお客様 4組" />
          </div><div className="panel schedule"><div className="panel-head"><div><h3>本日の予定</h3><p>7月8日（水）</p></div></div><div className="timeline"><span>10:00</span><i className="blue"/><div><strong>伊藤 結衣 様</strong><small>横浜店・パーソナル診断</small></div><span>14:30</span><i className="green"/><div><strong>田中 大輔 様</strong><small>渋谷店・スタンダード</small></div><span>17:00</span><i className="violet"/><div><strong>松本 愛 様</strong><small>新宿店・プレミアム</small></div></div></div></aside>
        </section>
      </main> : <ManagementPage view={view} reservations={reservations} menus={menuCatalog} onSelect={setSelected} notify={notify} onSaveMenu={saveMenu} onDeleteMenu={deleteMenu} />}
    </div>
    {isNewReservationOpen && <NewReservationDrawer form={adminForm} setForm={setAdminForm} onClose={() => setIsNewReservationOpen(false)} onSubmit={submitAdminReservation} menuCatalog={menuCatalog} />}
    {selected && <ReservationDrawer reservation={selected} onClose={() => setSelected(null)} updateStatus={updateStatus} assignStore={assignStore} />}
    {toast && <div className="toast"><Icon name="check"/>{toast}</div>}
  </div>;
}

function Stat({ icon, label, value, note, color }: { icon: string; label: string; value: string; note: string; color: string }) { return <div className="stat"><span className={`stat-icon ${color}`}><Icon name={icon}/></span><div><p>{label}</p><strong>{value}<small>件</small></strong><span className={color === "amber" || color === "violet" ? "attention" : "positive"}>{note}</span></div></div> }
function Task({ color, title, text }: { color: string; title: string; text: string }) { return <button className="task"><i className={color}/><div><strong>{title}</strong><small>{text}</small></div><Icon name="arrow"/></button> }

function ManagementPage({ view, reservations, menus, onSelect, notify, onSaveMenu, onDeleteMenu }: { view: Exclude<View,"dashboard">; reservations: Reservation[]; menus: Menu[]; onSelect: (r: Reservation) => void; notify: (s:string) => void; onSaveMenu: (input: MenuForm, originalName?: string) => Promise<void>; onDeleteMenu: (name: string) => Promise<void> }) {
  const customers = [
    { name:"山田 美咲", contact:"misaki@example.jp", phone:"090-1234-5678", count:3, last:"2026/06/18" },
    { name:"佐藤 健太", contact:"kenta@example.jp", phone:"080-2345-6789", count:5, last:"2026/07/10" },
    { name:"鈴木 由佳", contact:"yuka@example.jp", phone:"070-3456-7890", count:2, last:"2026/05/22" },
    { name:"高橋 直人", contact:"naoto@example.jp", phone:"090-4567-8901", count:1, last:"2026/04/03" },
  ];
  const stores = [
    { name:"渋谷店", area:"東京都渋谷区", today:4, month:48, state:"営業中" },
    { name:"新宿店", area:"東京都新宿区", today:3, month:41, state:"営業中" },
    { name:"横浜店", area:"神奈川県横浜市", today:1, month:35, state:"営業中" },
  ];
  return <main className="management">
    <section className="page-title"><div><p>RESERVATION OPERATIONS</p><h2>{{reservations:"すべての予約",customers:"お客様一覧",stores:"店舗一覧",menus:"メニュー一覧",billing:"利用実績・請求管理"}[view]}</h2><span>{{reservations:"予約申請から来店完了までを一元管理します。",customers:"予約者の連絡先と利用履歴を確認できます。",stores:"店舗ごとの割当状況と稼働実績を確認できます。",menus:"飲食店で提供する料理・コース・オプションを管理します。",billing:"来店実績、売上、請求書の発行状況を管理します。"}[view]}</span></div><button onClick={() => notify(view === "billing" ? "請求データをCSV出力しました" : view === "menus" ? "下部のフォームからメニューを追加できます" : "新規登録画面を準備しました")}><Icon name={view === "billing" ? "chart" : "plus"}/>{view === "billing" ? "CSV出力" : view === "menus" ? "メニュー追加" : "新規登録"}</button></section>
    {view === "reservations" && <section className="panel management-panel"><div className="management-tools"><div className="segmented"><button className="active">すべて <b>{reservations.length}</b></button><button>承認待ち</button><button>確定</button><button>来店待ち</button><button>完了</button></div><label><Icon name="search"/><input placeholder="予約を検索"/></label></div><div className="table-wrap"><table className="large-table"><thead><tr><th>予約ID</th><th>お客様</th><th>利用日・人数</th><th>メニュー</th><th>金額</th><th>担当店舗</th><th>ステータス</th><th/></tr></thead><tbody>{reservations.map(r=><tr key={r.id} onClick={()=>onSelect(r)}><td><strong>{r.id}</strong><small>{r.received}</small></td><td><strong>{r.customer}</strong><small>{r.phone}</small></td><td><strong>{r.date.replaceAll("-","/")}</strong><small>{r.people}名</small></td><td>{reservationMenuLabel(r)}</td><td><strong>¥{(r.totalAmount ?? 0).toLocaleString()}</strong></td><td>{r.store??<span className="unassigned">未割当</span>}</td><td><span className={`badge ${statusClass[r.status]}`}><i/>{r.status}</span></td><td><Icon name="arrow"/></td></tr>)}</tbody></table></div></section>}
    {view === "customers" && <section className="card-grid">{customers.map((c,i)=><article className="entity-card" key={c.name}><div className="entity-head"><span>{c.name.slice(0,1)}</span><button>•••</button></div><h3>{c.name} 様</h3><p>{c.contact}<br/>{c.phone}</p><dl><div><dt>予約回数</dt><dd>{c.count}回</dd></div><div><dt>最終利用</dt><dd>{c.last}</dd></div></dl><button onClick={()=>notify(`${c.name}様の利用履歴を表示しました`)}>利用履歴を見る <Icon name="arrow"/></button></article>)}</section>}
    {view === "stores" && <section className="card-grid stores-grid">{stores.map((s,i)=><article className="entity-card store-card" key={s.name}><div className="store-photo"><Icon name="store"/><span><i/>{s.state}</span></div><h3>{s.name}</h3><p>{s.area}<br/>10:00 — 20:00</p><dl><div><dt>本日の予約</dt><dd>{s.today}件</dd></div><div><dt>今月の実績</dt><dd>{s.month}件</dd></div></dl><button onClick={()=>notify(`${s.name}の割当状況を表示しました`)}>割当状況を見る <Icon name="arrow"/></button></article>)}</section>}
    {view === "menus" && <MenuManagement menus={menus} onSaveMenu={onSaveMenu} onDeleteMenu={onDeleteMenu} />}
    {view === "billing" && <><section className="stats billing-stats"><Stat icon="chart" label="今月の売上" value="682,400" note="先月比 +8.2%" color="green"/><Stat icon="calendar" label="利用完了" value="96" note="予約124件中" color="blue"/><Stat icon="users" label="未請求" value="4" note="対応が必要です" color="amber"/><Stat icon="chart" label="請求書発行" value="18" note="今月の発行数" color="violet"/></section><section className="panel management-panel"><div className="panel-head"><div><h3>最近の利用実績</h3><p>来店受付後に登録された実績と請求状態</p></div></div><div className="table-wrap"><table className="large-table"><thead><tr><th>利用日</th><th>予約ID / お客様</th><th>店舗</th><th>利用内容</th><th>金額</th><th>請求状態</th><th/></tr></thead><tbody><tr><td>2026/07/08</td><td><strong>RSV-1044</strong><small>伊藤 結衣 様</small></td><td>横浜店</td><td>パーソナル診断 × 1</td><td><strong>¥8,800</strong></td><td><span className="badge green"><i/>請求済</span></td><td><Icon name="arrow"/></td></tr><tr><td>2026/07/07</td><td><strong>RSV-1042</strong><small>小林 亮 様</small></td><td>渋谷店</td><td>スタンダード × 2</td><td><strong>¥11,000</strong></td><td><span className="badge amber"><i/>未請求</span></td><td><Icon name="arrow"/></td></tr><tr><td>2026/07/06</td><td><strong>RSV-1038</strong><small>中村 彩 様</small></td><td>新宿店</td><td>プレミアム × 1</td><td><strong>¥13,200</strong></td><td><span className="badge blue"><i/>請求書発行</span></td><td><Icon name="arrow"/></td></tr></tbody></table></div></section></>}
  </main>;
}

function MenuPicker({ menuCatalog, selected, onChange }: { menuCatalog: Menu[]; selected: string[]; onChange: (items: string[]) => void }) {
  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter(item => item !== name) : [...selected, name]);
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

function ReservationDrawer({ reservation: r, onClose, updateStatus, assignStore }: { reservation: Reservation; onClose: () => void; updateStatus: (id: string, status: Status) => void; assignStore: (id: string, store: string) => void }) {
  return <><div className="drawer-shade" onClick={onClose}/><aside className="drawer"><header><div><span className={`badge ${statusClass[r.status]}`}><i/>{r.status}</span><h2>{r.id}</h2></div><button onClick={onClose}><Icon name="close"/></button></header><section><p className="section-label">お客様情報</p><div className="customer-card"><span>{r.customer.slice(0,1)}</span><div><strong>{r.customer} 様</strong><small>{r.phone}<br/>customer@example.jp</small></div></div></section><section><p className="section-label">予約内容</p><dl><div><dt>利用日</dt><dd>{r.date.replaceAll("-", "/")} 10:00</dd></div><div><dt>予定人数</dt><dd>{r.people}名</dd></div><div><dt>メニュー</dt><dd>{reservationMenuLabel(r)}</dd></div><div><dt>金額</dt><dd>¥{(r.totalAmount ?? 0).toLocaleString()}</dd></div><div><dt>担当店舗</dt><dd><select value={r.store ?? ""} onChange={e => e.target.value && assignStore(r.id, e.target.value)}><option value="">未割当</option><option>渋谷店</option><option>新宿店</option><option>横浜店</option></select></dd></div></dl></section><section><p className="section-label">次のアクション</p>{r.status === "仮予約申請中" && <div className="drawer-actions"><button className="reject">受付不可</button><button className="approve" onClick={() => updateStatus(r.id,"仮予約確定")}><Icon name="check"/>承認する</button></div>}{r.status === "仮予約確定" && <button className="full-action" onClick={() => updateStatus(r.id,"本予約申請中")}>本予約申請へ進める</button>}{r.status === "本予約申請中" && <button className="full-action" onClick={() => updateStatus(r.id,"本予約確定")}>本予約を承認する</button>}{r.status === "本予約確定" && <button className="full-action" onClick={() => updateStatus(r.id,"来店待ち")}>業務タスク完了・来店待ちへ</button>}{r.status === "来店待ち" && <button className="full-action" onClick={() => updateStatus(r.id,"来店済")}>来店受付・利用実績を登録</button>}{r.status === "キャンセル申請中" && <button className="full-action danger" onClick={() => { updateStatus(r.id,"キャンセル確定"); onClose(); }}>キャンセルを確定する</button>}</section></aside></>;
}

function NewReservationDrawer({ form, setForm, onClose, onSubmit, menuCatalog }: { form: BookingForm; setForm: React.Dispatch<React.SetStateAction<BookingForm>>; onClose: () => void; onSubmit: () => void; menuCatalog: Menu[] }) {
  const canSubmit = Boolean(form.name && form.email && form.phone && form.date && form.menuItems.length && form.people);
  const total = selectedMenuTotal(form.menuItems, menuCatalog);

  return <><div className="drawer-shade" onClick={onClose}/><aside className="drawer new-reservation-drawer"><header><div><span className="badge blue"><i/>新規登録</span><h2>新規予約</h2></div><button onClick={onClose}><Icon name="close"/></button></header>
    <section><p className="section-label">予約内容</p><MenuPicker menuCatalog={menuCatalog} selected={form.menuItems} onChange={menuItems => setForm({ ...form, menuItems })}/><div className="drawer-form"><label>利用日<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></label><label>人数<select value={form.people} onChange={e => setForm({ ...form, people: Number(e.target.value) })}>{[1,2,3,4,5,6].map(x => <option key={x}>{x}</option>)}</select></label></div></section>
    <section><p className="section-label">お客様情報</p><div className="drawer-form single"><label>お名前<input placeholder="例：山田 花子" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>メールアドレス<input type="email" placeholder="hanako@example.jp" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label><label>電話番号<input placeholder="090-0000-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label></div></section>
    <section><p className="section-label">登録内容の確認</p><div className="reservation-summary"><strong>{form.menuItems.join("、") || "未選択"}</strong><span>{form.date.replaceAll("-", "/")}・{form.people}名</span><small>¥{total.toLocaleString()}</small></div><button className="full-action" disabled={!canSubmit} onClick={onSubmit}><Icon name="check"/>予約を登録する</button></section>
  </aside></>;
}

function CustomerPortal({ form, setForm, step, setStep, onAdmin, notify, toast, onSubmitReservation, menuCatalog }: { form: BookingForm; setForm: React.Dispatch<React.SetStateAction<BookingForm>>; step:number; setStep:(n:number)=>void; onAdmin:()=>void; notify:(s:string)=>void; toast:string; onSubmitReservation:(form: BookingForm)=>Promise<Reservation>; menuCatalog: Menu[] }) {
  const total = selectedMenuTotal(form.menuItems, menuCatalog);
  const submit = async () => {
    try {
      const reservation = await onSubmitReservation(form);
      notify(`仮予約を受け付けました（${reservation.id}）`);
      setStep(4);
    } catch {
      notify("仮予約の保存に失敗しました");
    }
  };
  return <main className="customer-page"><header><div className="public-logo"><span>R</span><strong>Reserve</strong></div><nav><a href="#guide">ご利用ガイド</a><a href="#contact">お問い合わせ</a><button onClick={onAdmin}>管理画面</button></nav></header><section className="customer-hero"><div><p>ONLINE RESERVATION</p><h1>あなたにぴったりの時間を、<br/><em>かんたん予約。</em></h1><span>ご希望のメニューと日時を選んで、オンラインで仮予約を申請できます。</span></div><div className="hero-orb"><Icon name="calendar"/></div></section><section className="booking-card"><div className="stepper">{["メニュー選択","日時・人数","お客様情報","受付完了"].map((s,i)=><div key={s} className={step >= i+1 ? "active" : ""}><span>{step > i+1 ? "✓" : i+1}</span><small>{s}</small>{i<3&&<i/>}</div>)}</div>
    {step === 1 && <div className="form-body"><p className="form-kicker">STEP 1</p><h2>ご希望のメニューを選択</h2><p>複数の料理・コース・オプションを選択できます。</p><MenuPicker menuCatalog={menuCatalog} selected={form.menuItems} onChange={menuItems=>setForm({...form,menuItems})}/><button className="next" disabled={!form.menuItems.length} onClick={()=>setStep(2)}>日時・人数を選ぶ <Icon name="arrow"/></button></div>}
    {step === 2 && <div className="form-body narrow"><p className="form-kicker">STEP 2</p><h2>日時と人数を選択</h2><div className="form-fields"><label>ご利用日<input type="date" value={form.date} min="2026-07-08" onChange={e=>setForm({...form,date:e.target.value})}/></label><label>人数<select value={form.people} onChange={e=>setForm({...form,people:Number(e.target.value)})}>{[1,2,3,4,5,6].map(x=><option key={x}>{x}</option>)}</select></label></div><div className="form-nav"><button onClick={()=>setStep(1)}>戻る</button><button className="next" onClick={()=>setStep(3)}>お客様情報へ <Icon name="arrow"/></button></div></div>}
    {step === 3 && <div className="form-body narrow"><p className="form-kicker">STEP 3</p><h2>お客様情報を入力</h2><div className="form-fields single"><label>お名前<input placeholder="例）山田 花子" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>メールアドレス<input type="email" placeholder="hanako@example.jp" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>電話番号<input placeholder="090-0000-0000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label></div><div className="confirm-box"><span>{form.date.replaceAll("-","/")}</span><strong>{form.menuItems.join("、")}・{form.people}名</strong><small>¥{total.toLocaleString()}（税込）</small></div><div className="form-nav"><button onClick={()=>setStep(2)}>戻る</button><button className="next" disabled={!form.name||!form.email||!form.phone} onClick={submit}>仮予約を申請する <Icon name="arrow"/></button></div></div>}
    {step === 4 && <div className="form-body complete"><span><Icon name="check"/></span><p className="form-kicker">REQUEST RECEIVED</p><h2>仮予約を受け付けました</h2><p>管理部門で内容を確認後、確定メールをお送りします。</p><button className="next" onClick={()=>{setStep(1);setForm({...form,name:"",email:"",phone:""})}}>トップに戻る</button></div>}
  </section><section className="guide" id="guide"><div><span>01</span><h3>仮予約を申請</h3><p>メニューと日時を選び、お客様情報を入力します。</p></div><div><span>02</span><h3>運営が内容を確認</h3><p>空き状況を確認し、受付可否をメールでご連絡します。</p></div><div><span>03</span><h3>予約確定</h3><p>本予約の承認後、担当店舗をご案内します。</p></div></section>{toast&&<div className="toast"><Icon name="check"/>{toast}</div>}</main>;
}
