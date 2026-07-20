import { reservationStatusCodes, reservationStatuses } from "@/lib/domain";
import type { Menu, Reservation, Status, Store } from "./types";

export const VISIT_MENU_NAME = "来店後に注文";
export const DEFAULT_START_TIME = "10:00";
export const STATUS = reservationStatusCodes;

export const initialReservations: Reservation[] = [
  { id: "RSV-1048", customer: "山田 美咲", date: "2026-07-12", people: 2, menuItems: ["前菜盛り合わせ", "パスタランチ"], totalAmount: 7600, store: null, status: STATUS.temporaryRequested, received: "7月8日 09:42", phone: "090-1234-5678" },
  { id: "RSV-1047", customer: "佐藤 健太", date: "2026-07-10", people: 1, menuItems: ["季節のコース"], totalAmount: 6600, store: "渋谷店", status: STATUS.waitingForVisit, received: "7月7日 18:10", phone: "080-2345-6789" },
  { id: "RSV-1046", customer: "鈴木 由佳", date: "2026-07-15", people: 3, menuItems: ["飲み放題プラン", "記念日プレート"], totalAmount: 16800, store: "新宿店", status: STATUS.confirmed, received: "7月7日 14:25", phone: "070-3456-7890" },
  { id: "RSV-1045", customer: "高橋 直人", date: "2026-07-09", people: 2, menuItems: ["パスタランチ"], totalAmount: 4000, store: "渋谷店", status: STATUS.cancellationRequested, received: "7月6日 11:03", phone: "090-4567-8901" },
  { id: "RSV-1044", customer: "伊藤 結衣", date: "2026-07-08", people: 1, menuItems: ["前菜盛り合わせ", "記念日プレート"], totalAmount: 4200, store: "横浜店", status: STATUS.visited, received: "7月5日 16:30", phone: "080-5678-9012" },
];

export const defaultMenus: Menu[] = [
  { name: "前菜盛り合わせ", description: "季節野菜と小皿料理の盛り合わせ", price: 1800, duration: "15分" },
  { name: "パスタランチ", description: "本日のパスタ、サラダ、ドリンク付き", price: 2000, duration: "45分" },
  { name: "季節のコース", description: "前菜、メイン、デザートまで楽しめるコース", price: 6600, duration: "90分" },
  { name: "飲み放題プラン", description: "コースに追加できる90分飲み放題", price: 2800, duration: "90分" },
  { name: "記念日プレート", description: "メッセージ付きデザートプレート", price: 2400, duration: "10分" },
  { name: VISIT_MENU_NAME, description: "来店後にメニューを注文します", price: 0, duration: "来店後" },
];

export const defaultStores: Store[] = [
  { name: "渋谷店", area: "東京都渋谷区", today: 4, month: 48, state: "営業中" },
  { name: "新宿店", area: "東京都新宿区", today: 3, month: 41, state: "営業中" },
  { name: "横浜店", area: "神奈川県横浜市", today: 1, month: 35, state: "営業中" },
];

export const statusClass: Record<Status, string> = {
  temporary_requested: "amber",
  temporary_confirmed: "blue",
  confirmed_requested: "violet",
  confirmed: "green",
  waiting_for_visit: "cyan",
  visited: "gray",
  cancellation_requested: "red",
  cancelled: "red",
};
export const statusOptions: Status[] = [...reservationStatuses];
export const approvalStatuses: readonly Status[] = [STATUS.temporaryRequested, STATUS.confirmedRequested, STATUS.cancellationRequested];
