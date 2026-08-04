import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

test("reservation drawer rejects confirmed change requests back to temporary confirmation", async () => {
  const pageSource = await readFile(path.join(process.cwd(), "app", "page.tsx"), "utf8");

  assert.match(
    pageSource,
    /isConfirmedReservationChangeRequest\(r\)\s*\?\s*STATUS\.temporaryConfirmed\s*:\s*STATUS\.confirmedRejected/,
    "confirmed reservation change rejection in the drawer must return to temporary confirmation",
  );
  assert.match(pageSource, /本予約への変更申請を却下する/);
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
  const typeSource = await readFile(path.join(process.cwd(), "app", "reservations", "types.ts"), "utf8");

  assert.match(typeSource, /"reservationApprovals"\s*\|\s*"cancellationApprovals"/);
  assert.match(pageSource, /title="予約の承認"[\s\S]*setView\("reservationApprovals"\)/);
  assert.match(pageSource, /title="キャンセルの承認"[\s\S]*setView\("cancellationApprovals"\)/);
  assert.match(pageSource, /function ReservationApprovalPage/);
  assert.match(pageSource, /function CancellationApprovalPage/);
});
