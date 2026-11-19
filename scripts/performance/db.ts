import { mkdir, writeFile } from "node:fs/promises";
import { performanceFixture, benchmarkLabel, statistics } from "./fixture";
import type { ReservationSearch } from "../../lib/reservation-search";

async function main() {
  const label = benchmarkLabel(process.argv[2]), size = Number(process.argv[3] ?? 1000);
  const queries: string[] = [];
  const fixture = await performanceFixture(size, { logQuery: query => { queries.push(query); } });
  try {
    const [{ GET: screen }, { POST: list }, { GET: detail }, { GET: calendar }, { GET: customer }, { POST: create }, { sendPendingApprovalEmails }, { sendDueConfirmationEmails }] = await Promise.all([
      import("../../app/api/admin/screen/route"), import("../../app/api/admin/reservations/route"),
      import("../../app/api/reservations/[id]/route"), import("../../app/api/admin/calendar/route"),
      import("../../app/api/accounts/me/reservations/route"), import("../../app/api/reservations/route"),
      import("../../lib/services/approval-email-service"), import("../../lib/services/confirmation-email-service"),
    ]);
    const request = (path: string, body?: object, token = "calendar-test-admin") => new Request(`http://localhost${path}`, {
      method: body ? "POST" : "GET", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const query: ReservationSearch = { search: "", dateFrom: "", dateTo: "", statuses: [], filter: "すべて", sortKey: "date", direction: "asc" };
    const measurements: Record<string, unknown> = {};
    const only = process.argv.find(arg => arg.startsWith("--only="))?.slice(7);
    const measure = async (name: string, work: () => Promise<unknown>) => {
      if (only && only !== name) return;
      const durations: number[] = [], counts: number[] = [], bytes: number[] = [];
      for (let i = 0; i < 9; i++) {
        queries.length = 0;
        const start = performance.now(), value = await work();
        if (value instanceof Response && !value.ok) throw new Error(`${name}: ${value.status} ${await value.text()}`);
        const payload = value instanceof Response ? await value.text() : JSON.stringify(value);
        const duration = performance.now() - start;
        if (i >= 2) { durations.push(duration); counts.push(queries.length); bytes.push(Buffer.byteLength(payload ?? "")); }
      }
      measurements[name] = { ms: statistics(durations), queries: statistics(counts), bytes: statistics(bytes), samples: durations };
      console.log(name, JSON.stringify(measurements[name]));
    };
    await measure("dashboard-api", () => screen(request("/api/admin/screen?view=dashboard")));
    await measure("list-api", () => list(request("/api/admin/reservations", { ...query, page: 1, pageSize: 50 })));
    await measure("search-api", () => list(request("/api/admin/reservations", { ...query, search: "計測000", page: 1, pageSize: 50 })));
    // Read APIs use POST and preserve existing mutation rate limits. Reset only this disposable fixture's buckets.
    const { getDatabase } = await import("../../lib/db/client");
    const { sql } = await import("drizzle-orm");
    await (await getDatabase()).execute(sql`delete from abuse_limit`);
    await measure("menu-sort-api", () => list(request("/api/admin/reservations", { ...query, sortKey: "menu", page: 1, pageSize: 50 })));
    await measure("detail-api", () => detail(request("/api/reservations/RSV-1004"), { params: Promise.resolve({ id: "RSV-1004" }) }));
    await measure("calendar-api", () => calendar(request("/api/admin/calendar?from=2099-11-01&to=2099-11-30")));
    await measure("customer-reservations-api", () => customer(request("/api/accounts/me/reservations", undefined, "calendar-test-member")));
    await measure("approval-worker-idle", () => sendPendingApprovalEmails(fixture.repo));
    await measure("confirmation-worker-idle", () => sendDueConfirmationEmails(fixture.repo, { now: new Date("2020-01-01T00:00:00Z") }));
    const { reservationNotificationProblems } = await import("../../lib/services/reservation-notification-recovery");
    await measure("notification-problems", () => reservationNotificationProblems(fixture.repo));
    await (await getDatabase()).execute(sql`delete from abuse_limit`);
    await measure("create-api", () => create(request("/api/reservations", { name: "計測登録", email: "create@example.test", phone: "09000000000", date: "2099-12-15", startTime: "12:00", people: 1, status: "confirmed", menuItems: ["検証メニュー"] })));
    const { PATCH: update } = await import("../../app/api/reservations/[id]/route");
    let revision = (await fixture.repo.getReservation("RSV-1004"))!.revision ?? 0;
    await measure("update-api", async () => {
      const response = await update(new Request("http://localhost/api/reservations/RSV-1004", { method: "PATCH", headers: { authorization: "Bearer calendar-test-admin", "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: revision, remarks: "計測更新" }) }), { params: Promise.resolve({ id: "RSV-1004" }) });
      if (response.ok) revision = (await response.clone().json()).reservation.revision;
      return response;
    });
    await measure("lookup-full-scan-reference", async () => (await fixture.repo.listReservations()).find(row => row.id === "RSV-1004"));
    await measure("lookup-indexed", () => fixture.repo.getReservation("RSV-1004"));
    const db = await getDatabase();
    if (only === "change-submit-api") {
      // Opt-in history-heavy workload in this disposable fixture only.
      await db.execute(sql`insert into reservation_change_request (reservation_id,requested_date,requested_time,requested_people,requested_menu_items_json,status)
        select id,'2099-12-15','12:00',6,'["検証メニュー"]','REQUESTED' from reservation r
        where not exists(select 1 from reservation_change_request c where c.reservation_id=r.id)`);
      const { POST: submitChange } = await import("../../app/api/reservations/change-requests/route");
      await measure("change-submit-api", () => submitChange(request("/api/reservations/change-requests", { reservationId: "RSV-1050", requestedDate: "2099-12-15", requestedStartTime: "12:00", requestedPeople: 6, requestedMenuItems: ["検証メニュー"] }, "calendar-test-member")));
    }
    const plans = {
      lookup: (await db.execute(sql`explain (analyze, buffers, format json) select id from reservation where reservation_code='RSV-1004'`)).rows,
      dateWindow: (await db.execute(sql`explain (analyze, buffers, format json) select id from reservation where usage_date >= '2099-12-13' and usage_date <= '2099-12-16'`)).rows,
      pendingMail: (await db.execute(sql`explain (analyze, buffers, format json) select id from approval_email_delivery where sent_at is null and stopped_at is null and retry_count<5 and (next_attempt_at is null or next_attempt_at<=now())`)).rows,
    };
    const output = { label, size, node: process.version, driver: process.env.DB_TEST_DRIVER === "postgres" ? "isolated PostgreSQL 17" : "isolated PGlite", warmups: 2, repetitions: 7, externalAuth: "mocked; revocation checks remain in application", measurements, plans };
    await mkdir(".tmp/performance", { recursive: true });
    await writeFile(`.tmp/performance/${label}-db-${size}.json`, JSON.stringify(output, null, 2));
  } finally { await fixture.close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
