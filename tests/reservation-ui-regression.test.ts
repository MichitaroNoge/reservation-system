import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

test("customer pages expose direct entry links for the official website", async () => {
  const pageSource = await readFile(path.join(process.cwd(), "app", "page.tsx"), "utf8");
  const directPages = [
    [["app", "reserve", "page.tsx"], "customerMode=reservation"],
    [["app", "customer", "page.tsx"], "customerMode=home"],
    [["app", "customer", "reservations", "page.tsx"], "customerMode=account"],
    [["app", "customer", "change-request", "page.tsx"], "/customer/reservations"],
    [["app", "customer", "cancellation-request", "page.tsx"], "/customer/reservations"],
    [["app", "customer", "confirmed-request", "page.tsx"], "/customer/reservations"],
  ] as const;

  assert.match(pageSource, /customerPortalModeFromSearch/);
  assert.match(pageSource, /setRole\("customer"\)/);
  assert.match(pageSource, /initialMode=\{customerEntryMode\}/);

  for (const [routePath, query] of directPages) {
    const routeSource = await readFile(path.join(process.cwd(), ...routePath), "utf8");
    assert.match(routeSource, new RegExp(query));
  }
});

test("reservation drawer rejects confirmed change requests back to temporary confirmation", async () => {
  const pageSource = await readFile(path.join(process.cwd(), "app", "page.tsx"), "utf8");

  assert.match(
    pageSource,
    /isConfirmedReservationChangeRequest\(r\)\s*\?\s*STATUS\.temporaryConfirmed\s*:\s*STATUS\.confirmedRejected/,
    "confirmed reservation change rejection in the drawer must return to temporary confirmation",
  );
  assert.match(pageSource, /本予約変更を却下する/);
});

test("confirmed reservation request screen uses explicit request type", async () => {
  const pageSource = await readFile(path.join(process.cwd(), "app", "page.tsx"), "utf8");
  const helperSource = pageSource.slice(
    pageSource.indexOf("const isConfirmedReservationChangeRequest"),
    pageSource.indexOf("export default function Home"),
  );

  assert.match(helperSource, /reservation\.requestType\s*===\s*"confirmed_from_temporary"/);
  assert.doesNotMatch(helperSource, /policyAgreement\?\.kind/);
});

test("customer request APIs use authenticated reservation ownership when available", async () => {
  const routePaths = [
    ["app", "api", "reservations", "confirmed-request", "route.ts"],
    ["app", "api", "reservations", "cancellation-request", "route.ts"],
    ["app", "api", "reservations", "change-requests", "route.ts"],
  ];

  for (const routePath of routePaths) {
    const routeSource = await readFile(path.join(process.cwd(), ...routePath), "utf8");
    assert.match(routeSource, /findOwnedReservationByAuthenticatedCustomer/);
    assert.match(routeSource, /allowMissingContact:\s*true/);
    assert.doesNotMatch(routeSource, /emailMatches|phoneMatches/);
  }
});

test("reservation and cancellation approval screens stay separated", async () => {
  const pageSource = await readFile(path.join(process.cwd(), "app", "page.tsx"), "utf8");
  const commonSource = await readFile(path.join(process.cwd(), "app", "reservations", "components", "common.tsx"), "utf8");
  const formatterSource = await readFile(path.join(process.cwd(), "app", "reservations", "formatters.ts"), "utf8");
  const styleSource = await readFile(path.join(process.cwd(), "app", "globals.css"), "utf8");
  const typeSource = await readFile(path.join(process.cwd(), "app", "reservations", "types.ts"), "utf8");
  const customerManagementSource = await readFile(path.join(process.cwd(), "app", "reservations", "components", "customer-management.tsx"), "utf8");
  const storeManagementSource = await readFile(path.join(process.cwd(), "app", "reservations", "components", "store-management.tsx"), "utf8");
  const menuManagementSource = await readFile(path.join(process.cwd(), "app", "reservations", "components", "menu-management.tsx"), "utf8");
  const confirmationContactRouteSource = await readFile(path.join(process.cwd(), "app", "api", "reservations", "[id]", "confirmation-contact", "route.ts"), "utf8");
  const dataConnectRepositorySource = await readFile(path.join(process.cwd(), "lib", "repositories", "firebase-sql-connect-repository.ts"), "utf8");
  const dataConnectMutationsSource = await readFile(path.join(process.cwd(), "dataconnect", "reservation", "mutations.gql"), "utf8");
  const resendClientSource = await readFile(path.join(process.cwd(), "lib", "email", "resend-email-client.ts"), "utf8");

  assert.match(typeSource, /"reservationApprovals"\s*\|\s*"cancellationApprovals"/);
  assert.match(pageSource, /title="予約の承認"[\s\S]*setView\("reservationApprovals"\)/);
  assert.match(pageSource, /title="キャンセルの承認"[\s\S]*setView\("cancellationApprovals"\)/);
  assert.match(pageSource, /title="本予約変更承認"[\s\S]*setView\("confirmedReservationRequests"\)/);
  assert.match(pageSource, /title="予約変更承認"[\s\S]*setView\("reservationChangeRequests"\)/);
  assert.match(pageSource, /title="予約変更承認"[\s\S]*title="キャンセルの承認"[\s\S]*title="確認連絡"[\s\S]*title="本予約の催促"/);
  assert.match(pageSource, /承認系[\s\S]*予約の承認[\s\S]*内部業務系[\s\S]*確認連絡[\s\S]*催促系[\s\S]*本予約の催促/);
  assert.doesNotMatch(pageSource, /今日も予約状況を確認しましょう/);
  assert.doesNotMatch(pageSource, /<h3>情報<\/h3>/);
  assert.doesNotMatch(pageSource, /予約状況の概要と本日の予定を確認できます/);
  assert.doesNotMatch(pageSource, /対応が必要な予約業務です/);
  assert.doesNotMatch(pageSource, /2026年7月8日（水）/);
  assert.match(pageSource, /fullDateHeadingLabel\(todayIso\(\)\)/);
  assert.match(pageSource, /className="topbar-meta"[\s\S]*fullDateHeadingLabel\(todayIso\(\)\)/);
  assert.match(styleSource, /\.topbar-meta/);
  assert.match(formatterSource, /export function fullDateHeadingLabel/);
  assert.match(formatterSource, /year.+month.+day.+weekday/s);
  assert.doesNotMatch(pageSource, /<nav><p>メニュー<\/p>/);
  assert.match(pageSource, /マスタ管理/);
  assert.match(commonSource, /settings:/);
  assert.match(pageSource, /<Icon name="settings"\/>マスタ管理/);
  assert.match(pageSource, /view === "masters" \|\| view === "customers" \|\| view === "stores" \|\| view === "menus"/);
  assert.doesNotMatch(pageSource, /<Icon name="users"\/>顧客管理<\/button><button className=\{view === "stores"/);
  assert.match(pageSource, /sortedReservations\.map\(r => <tr key=\{r\.id\} onClick=\{\(\) => onSelect\(r\)\}/);
  assert.match(pageSource, /reservations\.map\(reservation => <tr key=\{reservation\.id\} onClick=\{\(\) => onSelect\(reservation\)\}/);
  assert.match(pageSource, /requests\.map\(request => \{[\s\S]*return <tr key=\{request\.id\} onClick=\{\(\) => reservation && onSelect\(reservation\)\}/);
  assert.match(pageSource, /event\.stopPropagation\(\); updateStatus/);
  assert.match(pageSource, /event\.stopPropagation\(\); onApproveChangeRequest/);
  assert.doesNotMatch(pageSource, /reservation-id-cell|reservation-list-table/);
  assert.doesNotMatch(pageSource, /管理者判断で通常の遷移以外にも変更できます/);
  assert.match(pageSource, /const \[reservationStatusFilters, setReservationStatusFilters\] = useState<Status\[\]>/);
  assert.match(pageSource, /reservationStatusFilters\.length > 0 && !reservationStatusFilters\.includes\(reservation\.status\)/);
  assert.match(pageSource, /className="reservation-status-dropdown"/);
  assert.match(pageSource, /有効分のみ/);
  assert.match(pageSource, /status !== STATUS\.cancelled && status !== STATUS\.visited/);
  assert.doesNotMatch(pageSource, /すべて選択/);
  assert.doesNotMatch(pageSource, /className="visited-filter"/);
  assert.match(pageSource, /function MasterManagementPage/);
  assert.match(pageSource, /onSelectMasterView\("customers"\)[\s\S]*<span><strong>顧客管理<\/strong><\/span>[\s\S]*onSelectMasterView\("stores"\)[\s\S]*<span><strong>店舗管理<\/strong><\/span>[\s\S]*onSelectMasterView\("menus"\)[\s\S]*<span><strong>メニュー管理<\/strong><\/span>/);
  assert.doesNotMatch(pageSource, /<small>予約者の連絡先/);
  assert.doesNotMatch(pageSource, /<small>店舗情報/);
  assert.doesNotMatch(pageSource, /<small>予約フォームに表示するメニュー/);
  assert.match(styleSource, /\.master-link-grid button\{[\s\S]*grid-template-columns:42px minmax\(0,1fr\) 18px/);
  assert.doesNotMatch(customerManagementSource, /<span>有効な顧客<\/span>|必要な顧客だけ有効に戻せます。/);
  assert.doesNotMatch(storeManagementSource, /<span>有効な店舗<\/span>|必要な店舗だけ有効に戻せます。/);
  assert.doesNotMatch(menuManagementSource, /<span>登録済みメニュー<\/span>|必要なメニューだけ有効に戻せます。/);
  assert.match(pageSource, /isMasterChildView = view === "customers" \|\| view === "stores" \|\| view === "menus"/);
  assert.match(pageSource, /className="breadcrumb-back"[\s\S]*マスタ管理/);
  assert.match(pageSource, /onSelectMasterView\("masters"\)/);
  assert.match(styleSource, /\.breadcrumb-back/);
  assert.doesNotMatch(pageSource, /<h3>未対応の(?:予約承認|本予約変更承認|予約変更承認|キャンセル承認)<\/h3>/);
  assert.match(pageSource, /<div className="change-request-head"><div className="result-count"><span>該当<\/span><strong>\{reservations\.length\}<\/strong><span>件<\/span><\/div><\/div>/);
  assert.match(pageSource, /<div className="change-request-head"><div className="result-count"><span>該当<\/span><strong>\{requests\.length\}<\/strong><span>件<\/span><\/div><\/div>/);
  assert.match(styleSource, /\.change-request-head \.result-count strong\{font-size:23px/);
  assert.match(styleSource, /\.change-request-head\{[\s\S]*justify-content:flex-end[\s\S]*background:#fbfcfe/);
  assert.match(styleSource, /\.management-panel table thead th,\.change-request-screen table thead th\{background:#fafbfc\}/);
  assert.match(styleSource, /\.management table td small\{font-size:12px;color:#263149\}/);
  assert.match(styleSource, /\.reservation-status-dropdown/);
  assert.match(styleSource, /\.reservation-status-menu\{[\s\S]*max-height:min\(440px,calc\(100vh - 170px\)\);overflow-y:auto/);
  assert.match(confirmationContactRouteSource, /sendConfirmationEmailForReservation/);
  assert.match(confirmationContactRouteSource, /sendEmail !== false/);
  assert.match(confirmationContactRouteSource, /idempotencyKeyScope: `manual\/\$\{nextContactedAt\}`/);
  assert.doesNotMatch(confirmationContactRouteSource, /getAutomaticReservationStatus/);
  assert.doesNotMatch(confirmationContactRouteSource, /updateReservationStatus\(id, automaticStatus\)/);
  assert.match(dataConnectRepositorySource, /contactedAt === null[\s\S]*clearConfirmationContact/);
  assert.match(dataConnectMutationsSource, /mutation ClearConfirmationContact/);
  assert.match(dataConnectMutationsSource, /confirmationContactedAt: null/);
  assert.match(pageSource, /normalizedReservation = !contactedAt && current\?\.status === STATUS\.waitingForVisit/);
  assert.match(pageSource, /setReservations\(rs => rs\.map\(r => r\.id === id \? normalizedReservation : r\)\)/);
  assert.doesNotMatch(pageSource, /const saveConfirmationContact[\s\S]*return applyAutomaticStatus\(reservation\);[\s\S]*const updateConfirmationContact/);
  assert.match(pageSource, /const updateConfirmationContact = async[\s\S]*try \{[\s\S]*catch \(error\)/);
  assert.match(pageSource, /notify\(message\)/);
  assert.match(pageSource, /確認メールを送信しました/);
  assert.match(pageSource, /確認メールの一括送信に失敗しました/);
  assert.match(pageSource, /確認メール送信/);
  assert.match(pageSource, /手動で確認済みにする/);
  assert.match(pageSource, /sendEmail: false/);
  assert.match(pageSource, /確認メール一括送信/);
  assert.match(pageSource, /送信中/);
  assert.match(pageSource, /確認メールを送信しますか？/);
  assert.match(pageSource, /setIsConfirmingConfirmationEmail\(true\)/);
  assert.match(pageSource, /confirmation-send-confirm/);
  assert.doesNotMatch(pageSource, /メールアドレス未登録|reservationDateTimeLabel\(r\)<\/small>/);
  assert.doesNotMatch(pageSource, /確認連絡済みにする|一括更新|更新中/);
  assert.match(resendClientSource, /確認メールの送信に失敗しました/);
  assert.doesNotMatch(resendClientSource, /遒ｺ隱|縺|繧|螟/);
  assert.match(pageSource, /予約変更承認[\s\S]*キャンセル承認[\s\S]*確認連絡/);
  assert.match(pageSource, /function ReservationApprovalPage/);
  assert.match(commonSource, /count \? "has-count" : "no-count"/);
  assert.match(styleSource, /\.task-card-grid\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(240px,1fr\)\)/);
  assert.match(styleSource, /\.task-card-grid \.task small\{display:none\}/);
  assert.match(styleSource, /\.task-card-grid \.task\.no-count/);
  assert.match(pageSource, /function CancellationApprovalPage/);
});
