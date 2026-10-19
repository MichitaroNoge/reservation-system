// Isolated test process only. Never imported by the application.
import { PGlite } from "@electric-sql/pglite";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite";
import { migrate as pgliteMigrate } from "drizzle-orm/pglite/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { assertLocalDatabase } from "../../lib/db/environment";
import { resolve } from "node:path";
import { mock } from "node:test";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "../../lib/auth";
import * as schema from "../../lib/db/schema";
import { DrizzleReservationRepository, type ReservationDatabase } from "../../lib/repositories/drizzle-reservation-repository";

export async function createCalendarFixture() {
  process.env.APP_ENV = "test";
  process.env.DB_PROVIDER = "drizzle";
  process.env.DATABASE_URL = "postgresql://test@127.0.0.1:5433/reservation_system_test";
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "calendar-isolated-test";
  // Fail closed before any external mail client can send.
  process.env.RESEND_API_KEY = "";
  process.env.RESEND_FROM_EMAIL = "";
  process.env.RESEND_ALLOWED_FROM_EMAILS = "";
  let db: ReservationDatabase;
  let closeDatabase: () => Promise<void>;
  if (process.env.DB_TEST_DRIVER === "postgres") {
    if (process.env.DB_TEST_RESET_CONFIRM !== "reservation_system_test") throw new Error("Use the confirmed local PostgreSQL test runner.");
    assertLocalDatabase({ APP_ENV: "test", DATABASE_URL: process.env.TEST_DATABASE_URL });
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 5000, max: 5 });
    await pool.query("DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
    db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: resolve("drizzle") });
    closeDatabase = () => pool.end();
  } else {
    const client = new PGlite();
    const embedded = pgliteDrizzle(client, { schema });
    await pgliteMigrate(embedded, { migrationsFolder: resolve("drizzle") });
    db = embedded as unknown as ReservationDatabase;
    closeDatabase = () => client.close();
  }
  Object.assign(globalThis, { reservationDatabase: { db, pool: { end: async () => {} } } });
  const token = mock.method(getAuth(getFirebaseAdminApp()), "verifyIdToken", async (value: string) => {
    if (!["calendar-test-admin", "calendar-test-member"].includes(value)) throw new Error("Invalid test token");
    return { uid: "calendar-test-user", admin: value === "calendar-test-admin", email_verified: true };
  });
  const repo = new DrizzleReservationRepository(db);
  await repo.createMenu({ name: "検証メニュー", description: "", price: 1000, duration: "60分", displayOrder: 1 });
  await repo.createStore({ name: "検証店舗", displayOrder: 1 });
  await repo.saveSystemSettings({ acceptanceCapacity: 100, reservationLeadDays: 3, blockedPeriods: [] });
  return { repo, close: async () => { token.mock.restore(); await closeDatabase(); } };
}
