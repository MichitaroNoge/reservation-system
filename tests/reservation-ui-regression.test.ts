import { approvalDecision } from "../lib/reservation-availability";
import {reservationPageSource} from "./reservation-page-source";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

test("customer pages expose direct entry links for the official website", async () => {
  const pageSource = await reservationPageSource();
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
  assert.match(pageSource, /const openCustomerPortal/);
  assert.match(pageSource, /searchParams\.set\("customerMode", mode\)/, "opening the customer portal should persist its mode in the URL");
  assert.match(pageSource, /searchParams\.set\("customerMode", portalMode\)/, "customer portal navigation should keep the URL reload-safe");
  assert.match(pageSource, /searchParams\.delete\("customerMode"\)/, "returning to admin should clear the customer mode URL parameter");

  for (const [routePath, query] of directPages) {
    const routeSource = await readFile(path.join(process.cwd(), ...routePath), "utf8");
    assert.match(routeSource, new RegExp(query));
  }
});

test("approval decisions reject confirmed conversion back to the existing temporary reservation", () => {
  assert.deepEqual(approvalDecision("confirmed_requested", "confirmed_from_temporary"), { approve: "confirmed", reject: "temporary_confirmed" });
  assert.deepEqual(approvalDecision("confirmed_requested"), { approve: "confirmed", reject: "confirmed_rejected" });
});

test("confirmed reservation request screen uses explicit request type", async () => {
  const pageSource = await reservationPageSource();
  const helperSource = pageSource.slice(
    pageSource.indexOf("const isConfirmedReservationChangeRequest"),
    pageSource.indexOf("const",pageSource.indexOf("const isConfirmedReservationChangeRequest")+6),
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

test("customer reservation creation sends a retryable receipt email", async () => {
  const routeSource = await readFile(path.join(process.cwd(), "app", "api", "reservations", "route.ts"), "utf8");
  const serviceSource = await readFile(path.join(process.cwd(), "lib", "services", "receipt-email-service.ts"), "utf8");

  assert.match(routeSource, /input\.receiptEmailRequestedAt = new Date\(\)\.toISOString\(\)/);
  assert.match(routeSource, /sendReceiptEmailForReservation\(repository, reservation\.id\)/);
  assert.match(routeSource, /receiptEmail = \{ status: "failed"/);
  assert.match(routeSource, /return NextResponse\.json\(\{ reservation, receiptEmail \}, \{ status: 201 \}\)/);
  assert.match(serviceSource, /reservation-receipt\/\$\{reservation\.id\}/);
  assert.match(serviceSource, /updateReceiptEmailDelivery/);
  assert.match(serviceSource, /receiptEmailRetryCount/);
});

test("reservation and cancellation approval screens stay separated", async () => {
  const pageSource = (await reservationPageSource()).replace(/\s+/g, " ");
  const commonSource = await readFile(path.join(process.cwd(), "app", "reservations", "components", "common.tsx"), "utf8");
  const formatterSource = await readFile(path.join(process.cwd(), "app", "reservations", "formatters.ts"), "utf8");
  const styleSource = (await Promise.all(["globals.css", "legacy.css"].map(file => readFile(path.join(process.cwd(), "app", file), "utf8")))).join("\n");
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
  assert.match(pageSource, /マスタ・設定/);
  assert.match(commonSource, /settings:/);
  assert.match(pageSource, /<Icon name="settings"\s*\/>[\s\S]*マスタ・設定/);
  assert.match(pageSource, /view === "masters"[\s\S]*view === "customers"[\s\S]*view === "stores"[\s\S]*view === "menus"/);
  assert.doesNotMatch(pageSource, /<Icon name="users"\/>顧客管理<\/button><button className=\{view === "stores"/);
  assert.match(pageSource, /sortedReservations\.map\([\s\S]*onClick=\{[\s\S]*onSelect\(r\)/);
  assert.match(pageSource, /reservations\.map\([\s\S]*onClick=\{[\s\S]*onSelect\(reservation\)/);
  assert.match(pageSource, /filteredRows\.map\([\s\S]*void openChange\(request\)/);
  const changeReviewSource = await readFile(path.join(process.cwd(), "app/reservations/components/reservation-change-review-dialog.tsx"), "utf8");
  assert.match(changeReviewSource, /変更前・変更後/);
  assert.match(changeReviewSource, /予約の基本情報（現在）/);
  assert.doesNotMatch(changeReviewSource, /updateReservation|assignStores|updateStatus|updateConfirmationContact/);
  assert.match(pageSource, /event\.stopPropagation\(\);[\s\S]*onSelect\(reservation\)/);
  assert.match(pageSource, /event\.stopPropagation\(\);[\s\S]*void openChange\(request\)/);
  assert.doesNotMatch(pageSource, /reservation-id-cell|reservation-list-table/);
  assert.doesNotMatch(pageSource, /管理者判断で通常の遷移以外にも変更できます/);
  assert.match(pageSource, /const\s*\[\s*reservationStatusFilters,\s*setReservationStatusFilters\s*\]\s*=\s*useState<\s*Status\[\]\s*>/);
  assert.match(pageSource, /useState<[\s\S]*Status\[\][\s\S]*activeReservationStatuses/);
  assert.match(pageSource, /useReservationPage\(view==="reservations",reservationQuery/);
  const searchSource = await readFile(path.join(process.cwd(), "lib", "reservation-search.ts"), "utf8");
  assert.match(searchSource, /query\.statuses\.length && !query\.statuses\.includes\(r\.status\)/);
  assert.match(pageSource, /className="reservation-status-dropdown"/);
  assert.match(pageSource, /className="panel management-panel reservation-list-panel"/);
  assert.match(pageSource, /有効分のみ/);
  assert.match(pageSource, /removeAttribute\("open"\)[\s\S]*閉じる/);
  assert.match(pageSource, /setReservationStatusFilters\([\s\S]*activeReservationStatuses/);
  assert.doesNotMatch(pageSource, /すべて選択/);
  assert.doesNotMatch(pageSource, /className="visited-filter"/);
  assert.match(pageSource, /function MasterManagementPage/);
  assert.match(pageSource, /onSelectMasterView\("customers"\)[\s\S]*顧客管理[\s\S]*onSelectMasterView\("stores"\)[\s\S]*店舗管理[\s\S]*onSelectMasterView\("menus"\)[\s\S]*メニュー管理/);
  assert.doesNotMatch(pageSource, /<small>予約者の連絡先/);
  assert.doesNotMatch(pageSource, /<small>店舗情報/);
  assert.doesNotMatch(pageSource, /<small>予約フォームに表示するメニュー/);
  assert.match(styleSource, /\.master-link-grid button\s*\{[\s\S]*grid-template-columns:\s*42px minmax\(0,\s*1fr\) 18px/);
  assert.doesNotMatch(customerManagementSource, /<span>有効な顧客<\/span>|必要な顧客だけ有効に戻せます。/);
  assert.doesNotMatch(storeManagementSource, /<span>有効な店舗<\/span>|必要な店舗だけ有効に戻せます。/);
  assert.doesNotMatch(menuManagementSource, /<span>登録済みメニュー<\/span>|必要なメニューだけ有効に戻せます。/);
  assert.match(pageSource, /isMasterChildView =[\s\S]*view === "customers"[\s\S]*view === "stores"[\s\S]*view === "menus"/);
  assert.match(pageSource, /className="breadcrumb-back"[\s\S]*マスタ・設定/);
  assert.match(pageSource, /onSelectMasterView\("masters"\)/);
  assert.match(styleSource, /\.breadcrumb-back/);
  assert.doesNotMatch(pageSource, /<h3>未対応の(?:予約承認|本予約変更承認|予約変更承認|キャンセル承認)<\/h3>/);
  assert.equal((pageSource.match(/<ReservationSearchToolbar count=\{filteredRows\.length\}/g) ?? []).length, 4);
  assert.match(pageSource, /requests\.filter\(row => \[row\.reservationId, row\.customer\]/);
  assert.match(styleSource, /\.change-request-head \.result-count strong\s*\{\s*font-size:\s*23px/);
  assert.match(styleSource, /\.change-request-head\s*\{[\s\S]*justify-content:\s*flex-end[\s\S]*background:\s*var\(--background\)/);
  assert.match(styleSource, /\.management-panel table thead th,\s*\.change-request-screen table thead th\s*\{\s*background:\s*var\(--background\)/);
  assert.match(styleSource, /\.management table td small\s*\{\s*font-size:\s*12px;\s*color:\s*var\(--foreground\)/);
  assert.match(styleSource, /\.reservation-status-dropdown/);
  assert.match(styleSource, /\.reservation-list-panel\s*\{\s*overflow:\s*visible/);
  assert.match(styleSource, /\.reservation-status-menu\s*\{[\s\S]*max-height:\s*min\(440px,\s*calc\(100vh - 170px\)\);\s*overflow-y:\s*auto/);
  assert.match(styleSource, /\.status-menu-actions\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*1fr 1fr 1fr/);
  assert.match(confirmationContactRouteSource, /sendConfirmationEmailForReservation/);
  assert.match(confirmationContactRouteSource, /sendEmail !== false/);
  assert.doesNotMatch(confirmationContactRouteSource, /idempotencyKeyScope/);
  assert.doesNotMatch(confirmationContactRouteSource, /getAutomaticReservationStatus/);
  assert.doesNotMatch(confirmationContactRouteSource, /updateReservationStatus\(id, automaticStatus\)/);
  assert.match(dataConnectRepositorySource, /contactedAt === null[\s\S]*clearConfirmationContact/);
  assert.match(dataConnectMutationsSource, /mutation ClearConfirmationContact/);
  assert.match(dataConnectMutationsSource, /confirmationContactedAt: null/);
  assert.doesNotMatch(pageSource, /normalizedReservation = !contactedAt/, "confirmation status must be persisted by the API, not synthesized only in the browser");
  assert.doesNotMatch(pageSource, /const saveConfirmationContact[\s\S]*return applyAutomaticStatus\(reservation\);[\s\S]*const updateConfirmationContact/);
  assert.match(pageSource, /const updateConfirmationContact = async[\s\S]*try \{[\s\S]*catch \(error\)/);
  assert.match(pageSource, /notify\(message, "error"\)/);
  assert.match(pageSource, /確認メールを送信しました/);
  assert.match(pageSource, /件が失敗しました/);
  assert.match(pageSource, /確認メールを送信/);
  assert.match(pageSource, /手動で連絡済みにする/);
  assert.match(pageSource, /sendEmail: mode === "send"/);
  assert.match(pageSource, /確認メール一括送信/);
  assert.match(pageSource, /送信中/);
  assert.match(pageSource, /確認メールを送信しますか？/);
  const interactionSource = await readFile(path.join(process.cwd(), "components/ui/admin-interactions.tsx"), "utf8");
  assert.match(pageSource, /mode === "send"/);
  assert.match(interactionSource, /confirmation\?\.confirmLabel/);
  assert.match(interactionSource, /role="alert"/);
  assert.doesNotMatch(pageSource, /メールアドレス未登録|reservationDateTimeLabel\(r\)<\/small>/);
  assert.doesNotMatch(pageSource, /確認連絡済みにする|一括更新|更新中/);
  assert.match(resendClientSource, /メールの送信に失敗しました/);
  assert.doesNotMatch(resendClientSource, /遒ｺ隱|縺|繧|螟/);
  assert.match(pageSource, /予約変更承認[\s\S]*キャンセル承認[\s\S]*確認連絡/);
  assert.match(pageSource, /function ReservationApprovalPage/);
  assert.match(commonSource, /loading \|\| error \? "—" : count/);
  assert.match(commonSource, /h-auto w-full min-w-0/);
  assert.match(pageSource, /function CancellationApprovalPage/);
});
