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
    [["app", "customer", "change-request", "page.tsx"], "customerMode=change"],
    [["app", "customer", "cancellation-request", "page.tsx"], "customerMode=cancellation"],
    [["app", "customer", "confirmed-request", "page.tsx"], "customerMode=confirmedChange"],
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
    assert.match(routeSource, /allowMissingContact:\s*Boolean\(ownedReservation\)/);
  }
});

test("reservation and cancellation approval screens stay separated", async () => {
  const pageSource = await readFile(path.join(process.cwd(), "app", "page.tsx"), "utf8");
  const commonSource = await readFile(path.join(process.cwd(), "app", "reservations", "components", "common.tsx"), "utf8");
  const formatterSource = await readFile(path.join(process.cwd(), "app", "reservations", "formatters.ts"), "utf8");
  const styleSource = await readFile(path.join(process.cwd(), "app", "globals.css"), "utf8");
  const typeSource = await readFile(path.join(process.cwd(), "app", "reservations", "types.ts"), "utf8");

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
  assert.match(formatterSource, /export function fullDateHeadingLabel/);
  assert.match(formatterSource, /year.+month.+day.+weekday/s);
  assert.doesNotMatch(pageSource, /<nav><p>メニュー<\/p>/);
  assert.match(pageSource, /マスタ管理/);
  assert.match(commonSource, /settings:/);
  assert.match(pageSource, /<Icon name="settings"\/>マスタ管理/);
  assert.match(pageSource, /view === "masters" \|\| view === "customers" \|\| view === "stores" \|\| view === "menus"/);
  assert.doesNotMatch(pageSource, /<Icon name="users"\/>顧客管理<\/button><button className=\{view === "stores"/);
  assert.match(pageSource, /function MasterManagementPage/);
  assert.match(pageSource, /onSelectMasterView\("customers"\)[\s\S]*<span><strong>顧客管理<\/strong><small>[\s\S]*onSelectMasterView\("stores"\)[\s\S]*onSelectMasterView\("menus"\)/);
  assert.match(styleSource, /\.master-link-grid button\{[\s\S]*grid-template-columns:42px minmax\(0,1fr\) 18px/);
  assert.match(pageSource, /isMasterChildView = view === "customers" \|\| view === "stores" \|\| view === "menus"/);
  assert.match(pageSource, /className="breadcrumb-back"[\s\S]*マスタ管理/);
  assert.match(pageSource, /onSelectMasterView\("masters"\)/);
  assert.match(styleSource, /\.breadcrumb-back/);
  assert.match(pageSource, /未対応の本予約変更承認/);
  assert.match(pageSource, /未対応の予約変更承認/);
  assert.match(pageSource, /未対応の本予約変更承認<\/h3><div className="result-count"><span>該当<\/span><strong>\{reservations\.length\}<\/strong><span>件<\/span><\/div>/);
  assert.match(pageSource, /未対応の予約変更承認<\/h3><div className="result-count"><span>該当<\/span><strong>\{requests\.length\}<\/strong><span>件<\/span><\/div>/);
  assert.match(pageSource, /未対応のキャンセル承認<\/h3><div className="result-count"><span>該当<\/span><strong>\{reservations\.length\}<\/strong><span>件<\/span><\/div>/);
  assert.match(styleSource, /\.change-request-head \.result-count strong\{font-size:23px/);
  assert.match(pageSource, /予約変更承認[\s\S]*キャンセル承認[\s\S]*確認連絡/);
  assert.match(pageSource, /function ReservationApprovalPage/);
  assert.match(commonSource, /count \? "has-count" : "no-count"/);
  assert.match(styleSource, /\.task-card-grid\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(240px,1fr\)\)/);
  assert.match(styleSource, /\.task-card-grid \.task small\{display:none\}/);
  assert.match(styleSource, /\.task-card-grid \.task\.no-count/);
  assert.match(pageSource, /function CancellationApprovalPage/);
});
