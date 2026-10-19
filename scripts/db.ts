import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { assertLocalDatabase } from "../lib/db/environment";
import { seedDatabase } from "../lib/db/seed";
import * as schema from "../lib/db/schema";
import { loadLocalEnvironment } from "./db-environment";

async function main() {
  loadLocalEnvironment();
  const url = assertLocalDatabase();
  const command = process.argv[2];
  if (["up", "stop", "down"].includes(command)) {
    if (process.env.APP_ENV !== "development" || process.env.POSTGRES_DB !== "reservation_system_dev" ||
      decodeURIComponent(url.username) !== process.env.POSTGRES_USER || decodeURIComponent(url.password) !== process.env.POSTGRES_PASSWORD ||
      (url.port || "5432") !== (process.env.POSTGRES_PORT || "5433")) throw new Error("Compose and DATABASE_URL must identify the same local development database.");
    const action = command === "up" ? ["up", "-d", "--wait", "--wait-timeout", "120"] : [command];
    const result = spawnSync("docker", ["compose", "--env-file", resolve(process.env.DB_ENV_FILE ?? ".env.development"), "-f", resolve("compose.yaml"), ...action], { stdio: "inherit" });
    if (result.error) throw new Error("Docker CLI is unavailable. Install/start Docker Desktop with WSL 2 and Linux containers.");
    if (result.status !== 0) throw new Error("Docker Compose failed. Check Docker Desktop and the configured port.");
    if (command !== "up") return;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis:5000, max:1 });
  try {
    const result = await pool.query("select current_database() as name, current_setting('server_version') as version");
    if (result.rows[0].name !== decodeURIComponent(url.pathname.slice(1))) throw new Error("Connected database does not match the allowed database.");
    const db=drizzle(pool,{schema});
    if (command === "reset") {
      const expected = decodeURIComponent(url.pathname.slice(1));
      if (process.argv[3] !== "--confirm" || process.argv[4] !== expected) throw new Error(`Reset deletes ONLY local data. Required: npm run db:reset -- --confirm ${expected}`);
      await pool.query("BEGIN");
      try { await pool.query("DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;"); await pool.query("COMMIT"); }
      catch (error) { await pool.query("ROLLBACK"); throw error; }
      await migrate(db,{migrationsFolder:resolve("drizzle")});
      await seedDatabase(db,process.env.DEV_SEED_FIREBASE_UID);
    } else if (command === "migrate") await migrate(db,{migrationsFolder:resolve("drizzle")});
    else if (command === "seed") await seedDatabase(db,process.env.DEV_SEED_FIREBASE_UID);
    else if (!["check","up"].includes(command)) throw new Error("Unknown database command.");
    console.log(`Local ${command} completed: ${result.rows[0].name} (PostgreSQL ${result.rows[0].version}).`);
  } finally { await pool.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Database command failed."); process.exitCode=1; });
