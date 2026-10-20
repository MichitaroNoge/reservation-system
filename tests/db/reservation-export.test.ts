import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { getAuth } from "firebase-admin/auth";
import { createCalendarFixture } from "./calendar-fixture";
import { getDatabase } from "../../lib/db/client";
import { getFirebaseAdminApp } from "../../lib/auth";
import { DrizzleReservationRepository } from "../../lib/repositories/drizzle-reservation-repository";
import * as schema from "../../lib/db/schema";

test("CSV route enforces authorization, bounded SQL batches, snapshots, query validation, rate limits and sanitized audit", async () => {
  const fixture = await createCalendarFixture();
  const events: string[] = [];
  const info = mock.method(console, "info", (value: unknown) => { events.push(String(value)); });
  try {
    const db = await getDatabase();
    await fixture.repo.createStore({ name: "別店舗", displayOrder: 2 });
    const reservation = await fixture.repo.createReservation({ name: "CSV検証PRIVATE", email: "private@example.test", phone: "09000000000", address: "PRIVATE住所", remarks: " \n=HYPERLINK(\"https://example.test\")", date: "2030-11-15", startTime: "12:00", people: 12, menuItems: ["検証メニュー"], status: "confirmed" });
    await fixture.repo.assignStores(reservation.id, [{ store: "検証店舗", people: 6 }, { store: "別店舗", people: 6 }]);
    await db.insert(schema.reservation).values(Array.from({ length: 501 }, (_,i) => ({ reservationCode: `CSV-${2000+i}`, usageDate: "2030-11-15", usageTime: "12:00", status: "CONFIRMED" as const, expectedPeople: 1, reserverName: "CSV検証", reserverPhone: "09000000000" })));
    await fixture.repo.createReservation({ name: "CSV検証取消", email: "test@example.test", phone: "09000000000", date: "2030-11-15", startTime: "12:00", people: 1, status: "cancelled" });
    const { POST } = await import("../../app/api/reservations/export/route");
    const query = { search: "CSV検証", dateFrom: "2030-11-15", dateTo: "2030-11-15", statuses: ["confirmed"], filter: "すべて", sortKey: "id", direction: "desc" };
    const call = (body: unknown = query, token = "calendar-test-admin", headers: Record<string,string> = {}) => POST(new Request("http://localhost/api/reservations/export", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify(body) }));
    const clearLimits = () => db.delete(schema.abuseLimit);
    assert.equal((await call(query, "")).status, 401);
    assert.equal((await call(query, "invalid")).status, 401);
    assert.equal((await call(query, "calendar-test-member")).status, 403);
    assert.equal((await call(query, "calendar-test-admin", { origin: "https://untrusted.example" })).status, 403);
    const exported = await call(); assert.equal(exported.status, 200);
    assert.equal(exported.headers.get("cache-control"), "private, no-store");
    assert.equal(exported.headers.get("x-content-type-options"), "nosniff");
    assert.match(exported.headers.get("content-type")!, /^text\/csv; charset=utf-8/);
    assert.match(exported.headers.get("content-disposition")!, /attachment; filename="reservations_\d{8}_\d{6}\.csv"/);
    assert.equal(exported.headers.get("x-export-count"), "502");
    const bytes = new Uint8Array(await exported.arrayBuffer()); assert.deepEqual([...bytes.slice(0,3)], [239,187,191]);
    const csv = Buffer.from(bytes).toString("utf8"); assert.match(csv, /PRIVATE住所/); assert.match(csv, /検証店舗：6名/); assert.match(csv, /別店舗：6名/); assert.match(csv, /\t \r\n=HYPERLINK/); assert.doesNotMatch(csv, /CSV検証取消/);
    for (const body of [{ ...query, userId: "private-user" }, { ...query, storeId: "private-store" }, { ...query, tenantId: "private-tenant" }, { ...query, dateFrom: "2030-02-30" }, { ...query, sortKey: "DROP TABLE" }, { ...query, statuses: ["UNKNOWN"] }]) { await clearLimits(); assert.equal((await call(body)).status, 400); }
    await clearLimits(); assert.equal((await call({ ...query, search: "'; DROP TABLE reservation; --" })).status, 422);
    // The export is read-only and SQL meta characters were treated as literal keyword text.
    assert.equal((await fixture.repo.listReservations()).length, 503);
    await clearLimits();
    assert.equal((await call({ ...query, search: "no matches" })).status, 422);
    assert.equal((await call({ ...query, search: "no matches" })).status, 422);
    const limited = await call(); assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get("retry-after")) > 0);
    await clearLimits();
    const fail = mock.method(DrizzleReservationRepository.prototype, "scanReservationsForExport", async () => { throw new Error("PRIVATE_SQL_PASSWORD_AND_CUSTOMER"); });
    try { const failure = await call(); assert.equal(failure.status, 500); assert.doesNotMatch(await failure.text(), /PRIVATE|SQL|PASSWORD/); } finally { fail.mock.restore(); }
    await clearLimits();
    let validations = 0;
    const permission = mock.method(getAuth(getFirebaseAdminApp()), "verifyIdToken", async () => ({ uid: "revoked-export", admin: ++validations === 1, email_verified: true }));
    try { assert.equal((await call()).status, 403); assert.equal(validations, 2); } finally { permission.mock.restore(); }
    assert.ok(events.some(event => event.includes('"result":"generated"') && event.includes('"count":502')));
    assert.doesNotMatch(events.join("\n"), /PRIVATE|private@example|private-user|private-store|private-tenant|HYPERLINK|calendar-test-admin|CSV検証/);
  } finally { info.mock.restore(); await fixture.close(); }
});

test("export HTTP timeout fails closed while token verification is stalled", async () => {
  // No DB is accessed in this case. The previous fixture initialized the test Firebase app.
  const token = mock.method(getAuth(getFirebaseAdminApp()), "verifyIdToken", () => new Promise<never>(() => {}));
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { POST } = await import("../../app/api/reservations/export/route");
    const pending = POST(new Request("http://localhost/api/reservations/export", { method: "POST", headers: { authorization: "Bearer calendar-test-admin" } }));
    mock.timers.tick(30000);
    const response = await pending;
    assert.equal(response.status, 504); assert.match((await response.json()).code, /TIMEOUT/);
  } finally { mock.timers.reset(); token.mock.restore(); }
});
