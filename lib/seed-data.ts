import type { Menu, Reservation, Store } from "./domain";

export const seedReservations: Reservation[] = [
  { id: "RSV-1048", customer: "山田 美咲", email: "misaki@example.jp", date: "2026-07-12", people: 2, menu: "パーソナル診断", store: null, status: "仮予約申請中", received: "7月8日 09:42", phone: "090-1234-5678" },
  { id: "RSV-1047", customer: "佐藤 健太", email: "kenta@example.jp", date: "2026-07-10", people: 1, menu: "スタンダード", store: "渋谷店", status: "来店待ち", received: "7月7日 18:10", phone: "080-2345-6789" },
  { id: "RSV-1046", customer: "鈴木 由佳", email: "yuka@example.jp", date: "2026-07-15", people: 3, menu: "プレミアム", store: "新宿店", status: "本予約確定", received: "7月7日 14:25", phone: "070-3456-7890" },
  { id: "RSV-1045", customer: "高橋 直人", email: "naoto@example.jp", date: "2026-07-09", people: 2, menu: "スタンダード", store: "渋谷店", status: "キャンセル申請中", received: "7月6日 11:03", phone: "090-4567-8901" },
  { id: "RSV-1044", customer: "伊藤 結衣", email: "yui@example.jp", date: "2026-07-08", people: 1, menu: "パーソナル診断", store: "横浜店", status: "来店済", received: "7月5日 16:30", phone: "080-5678-9012" },
];

export const seedMenus: Menu[] = [
  { name: "スタンダード", description: "基本プラン。初めての方にもおすすめです", price: 5500, duration: "60分" },
  { name: "パーソナル診断", description: "ご希望に合わせて丁寧にご提案します", price: 8800, duration: "90分" },
  { name: "プレミアム", description: "充実した内容をゆっくり体験できます", price: 13200, duration: "120分" },
];

export const seedStores: Store[] = [
  { name: "渋谷店", area: "東京都渋谷区", today: 4, month: 48, state: "営業中" },
  { name: "新宿店", area: "東京都新宿区", today: 3, month: 41, state: "営業中" },
  { name: "横浜店", area: "神奈川県横浜市", today: 1, month: 35, state: "営業中" },
];
