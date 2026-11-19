import { sql } from "drizzle-orm";
import type { Logger } from "drizzle-orm/logger";
import { getDatabase } from "../../lib/db/client";
import { createCalendarFixture } from "../../tests/db/calendar-fixture";
import { earliestReservationDate } from "../../lib/reservation-lead-time";

/** Never accepts an arbitrary database URL or starts mail/calendar workers. */
export async function performanceFixture(size: number, logger?: Logger) {
  const postgres = process.env.DB_TEST_DRIVER === "postgres" && process.env.TEST_DATABASE_URL === "postgresql://perf:performance-only@127.0.0.1:55439/reservation_system_test";
  if (process.env.APP_ENV !== "test" || !(process.env.DB_TEST_DRIVER === "pglite" || postgres)) throw new Error("Use npm run perf with the isolated database configuration.");
  if (![100, 1000, 10000].includes(size)) throw new Error("Fixture size must be 100, 1000 or 10000.");
  const fixture = await createCalendarFixture({ logger });
  const db = await getDatabase();
  await fixture.repo.createAccount({ firebaseUid: "calendar-test-user", name: "計測本人", contact: "member@example.test", phone: "09000000000" });
  await fixture.repo.createAccount({ firebaseUid: "performance-other", name: "計測他人", contact: "other@example.test", phone: "09000000000" });
  await db.execute(sql`insert into reservation (id, reservation_code, account_id, reserver_name, reserver_email, reserver_phone, reserver_address, remarks, usage_date, usage_time, usage_end_time, expected_people, status, received_at)
    select md5('performance-'||n)::uuid, 'RSV-'||(1000+n),
      (select id from account where firebase_uid=case when n%50=0 then 'calendar-test-user' else 'performance-other' end),
      '計測'||lpad(n::text,5,'0'), 'fixture@example.test', '09000000000', '架空住所', repeat('架空の備考',100),
      case when n%100=0 then ${earliestReservationDate(0)}::date else '2099-11-01'::date+(n%360) end,
      '12:00','13:30',5,
      (case n%20 when 0 then 'TEMPORARY_REQUESTED' when 1 then 'CONFIRMED_REQUESTED' when 2 then 'TEMPORARY_CONFIRMED' when 3 then 'CANCELLED' else 'CONFIRMED' end)::reservation_status,
      '2026-01-01'::timestamptz+n*interval '1 minute'
    from generate_series(1,${size}) n`);
  await db.execute(sql`insert into reservation_detail (reservation_id,menu_id,quantity,unit_price) select id,(select id from menu limit 1),1,1000 from reservation where substring(reservation_code from 5)::int%3<>0`);
  await db.execute(sql`insert into store_assignment (reservation_id,store_id,people) select id,(select id from store limit 1),5 from reservation where substring(reservation_code from 5)::int%4=0`);
  await db.execute(sql`insert into reservation_change_request (reservation_id,requested_date,requested_time,requested_people,requested_menu_items_json,status) select id,'2099-12-15','12:00',6,'["検証メニュー"]','REQUESTED' from reservation where substring(reservation_code from 5)::int%100=0`);
  await db.execute(sql`insert into approval_email_delivery (delivery_key,reservation_id,email_type,sent_at) select 'benchmark/'||reservation_code,id,'reservation_approved',now() from reservation`);
  await db.execute(sql`analyze`);
  return fixture;
}

export function benchmarkLabel(value = "measurement") {
  if (!/^[a-z0-9-]{1,60}$/.test(value)) throw new Error("Use an alphanumeric benchmark label.");
  return value;
}

export function statistics(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const round = (value: number) => Math.round(value * 100) / 100;
  return { median: round(sorted[Math.floor(sorted.length / 2)]), p95: round(sorted[Math.ceil(sorted.length * .95) - 1]), min: round(sorted[0]), max: round(sorted[sorted.length - 1]) };
}
