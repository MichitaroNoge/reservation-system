import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { parseArgs, parseEnv } from "node:util";
import { Connector, AuthTypes, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import { GoogleAuth } from "google-auth-library";
import { Pool } from "pg";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { databaseConnection } from "../lib/db/environment";

// Separate from the local reset/seed tools: no reset, delete, seed or automatic startup migration.
const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  env: { type: "string" }, confirm: { type: "string" }, baseline: { type: "boolean" },
  "backup-id": { type: "string" }, "use-firebase-cli": { type: "boolean" },
} });
type Snapshot = { tables: Record<string, { name: string; columns: Record<string, { name: string; type: string; notNull: boolean; primaryKey: boolean }>; uniqueConstraints: Record<string, { columns: string[] }>; compositePrimaryKeys: Record<string, { columns: string[] }>; foreignKeys: Record<string, { columnsFrom: string[]; tableTo: string; columnsTo: string[] }> }>; enums: Record<string, { name: string; values: string[] }> };

async function main() {
  if (values.env) Object.assign(process.env, parseEnv(readFileSync(resolve(values.env), "utf8")));
  const config = databaseConnection();
  if (config.kind !== "cloud-sql") throw new Error("An explicit staging/production Cloud SQL configuration is required.");
  const [project, , instance] = config.instanceConnectionName.split(":");
  const command = positionals[0] ?? "plan";
  if (!["plan", "migrate", "check"].includes(command)) throw new Error("Commands: plan, check, migrate.");
  const write = command === "migrate";
  if (write && values.confirm !== `${project}/${instance}/${config.database}`) throw new Error("Migration requires --confirm PROJECT/INSTANCE/DATABASE.");
  let credentials = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) : undefined;
  if (values["use-firebase-cli"]) {
    const require = createRequire(import.meta.url);
    const account = require("firebase-tools/lib/auth").getGlobalDefaultAccount();
    const api = require("firebase-tools/lib/api");
    if (!account) throw new Error("No existing Firebase CLI account.");
    credentials = { type: "authorized_user", client_id: api.clientId(), client_secret: api.clientSecret(), refresh_token: account.tokens.refresh_token };
    if (config.user !== account.user.email) throw new Error("Cloud SQL user must match the selected CLI identity.");
  }
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/sqlservice.login"] });
  if (write) {
    if (!/^\d+$/.test(values["backup-id"] ?? "")) throw new Error("--backup-id is required before modifying a cloud database.");
    const client = await auth.getClient();
    const result = await client.request<{ status: string; instance: string; endTime: string }>({ url: `https://sqladmin.googleapis.com/sql/v1beta4/projects/${project}/instances/${instance}/backupRuns/${values["backup-id"]}` });
    if (result.data.status !== "SUCCESSFUL" || result.data.instance !== instance || Date.now() - Date.parse(result.data.endTime) > 24 * 3600_000) throw new Error("Backup must be successful, match the instance, and be less than 24 hours old.");
  }
  const connector = new Connector({ auth });
  let pool: Pool | undefined;
  try {
    const options = await connector.getOptions({ instanceConnectionName: config.instanceConnectionName, authType: AuthTypes.IAM, ipType: config.ipType === "PRIVATE" ? IpAddressTypes.PRIVATE : IpAddressTypes.PUBLIC });
    pool = new Pool({ ...options, user: config.user, database: config.database, max: 1, connectionTimeoutMillis: 15000, options: "-c statement_timeout=60000 -c lock_timeout=10000" });
    const client = await pool.connect();
    try {
      await client.query(write ? "BEGIN" : "BEGIN READ ONLY");
      if (write) await client.query("SELECT pg_advisory_xact_lock(hashtextextended('reservation-system-schema-migration', 0))");
      const current = (await client.query("select current_database() as database")).rows[0];
      if (current.database !== config.database) throw new Error("Connected database does not match the requested database.");
      const journalExists = (await client.query("select to_regclass('drizzle.__drizzle_migrations') is not null as present")).rows[0].present;
      const journal = journalExists ? (await client.query("select hash, created_at from drizzle.__drizzle_migrations order by created_at")).rows as { hash: string; created_at: string }[] : [];
      const migrations = readMigrationFiles({ migrationsFolder: resolve("drizzle") });
      for (const row of journal) if (!migrations.some(m => m.hash === row.hash && String(m.folderMillis) === String(row.created_at))) throw new Error("Migration journal does not match the checked-in migration files.");
      for (let i = 0; i < journal.length; i++) if (journal[i].hash !== migrations[i]?.hash) throw new Error("Migration history has a gap.");
      let baseline = false;
      if (!journal.length) {
        const expected = JSON.parse(readFileSync(resolve("drizzle/meta/0000_snapshot.json"), "utf8")) as Snapshot;
        const tables = (await client.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map(row => row.tablename);
        if (JSON.stringify(tables) !== JSON.stringify(Object.values(expected.tables).map(t => t.name).sort())) throw new Error("Existing tables do not exactly match the legacy baseline; manual review required.");
        for (const table of Object.values(expected.tables)) {
          const columns = (await client.query("select a.attname as name,format_type(a.atttypid,a.atttypmod) as type,a.attnotnull as not_null from pg_attribute a where a.attrelid=$1::regclass and a.attnum>0 and not a.attisdropped order by a.attname", [`public.${table.name}`])).rows;
          const wanted = Object.values(table.columns).map(c => ({ name: c.name, type: c.type.replace(/^varchar/, "character varying"), not_null: c.notNull })).sort((a,b) => a.name.localeCompare(b.name, "en"));
          const sorted = columns.sort((a,b) => a.name.localeCompare(b.name, "en"));
          if (JSON.stringify(sorted) !== JSON.stringify(wanted)) throw new Error(`Legacy column mismatch: ${table.name}`);
          const keys = (await client.query("select c.contype, array(select a.attname::text from unnest(c.conkey) with ordinality k(n,o) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n order by k.o) as columns, case when c.contype='f' then c.confrelid::regclass::text end as target, array(select a.attname::text from unnest(c.confkey) with ordinality k(n,o) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.n order by k.o) as target_columns from pg_constraint c where c.conrelid=$1::regclass", [`public.${table.name}`])).rows;
          const primary = Object.values(table.columns).filter(c => c.primaryKey).map(c => c.name);
          const required = [...Object.values(table.uniqueConstraints).map(k => ({ type: "u", columns: k.columns })), ...Object.values(table.compositePrimaryKeys).map(k => ({ type: "p", columns: k.columns })), ...(primary.length ? [{ type: "p", columns: primary }] : [])];
          const uniqueIndexes = (await client.query("select array(select a.attname::text from unnest(i.indkey) with ordinality k(n,o) join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.n where k.o<=i.indnkeyatts order by k.o) as columns from pg_index i where i.indrelid=$1::regclass and i.indisunique and i.indisvalid and i.indpred is null and i.indexprs is null", [`public.${table.name}`])).rows;
          for (const key of required) if (!keys.some(k => k.contype === key.type && JSON.stringify(k.columns) === JSON.stringify(key.columns)) && !(key.type === "u" && uniqueIndexes.some(k => JSON.stringify(k.columns) === JSON.stringify(key.columns)))) throw new Error(`Legacy key mismatch: ${table.name}`);
          for (const fk of Object.values(table.foreignKeys)) if (!keys.some(k => k.contype === "f" && k.target === fk.tableTo && JSON.stringify(k.columns) === JSON.stringify(fk.columnsFrom) && JSON.stringify(k.target_columns) === JSON.stringify(fk.columnsTo))) throw new Error(`Legacy foreign key mismatch: ${table.name}`);
        }
        for (const type of Object.values(expected.enums)) {
          const labels = (await client.query("select e.enumlabel from pg_enum e join pg_type t on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname=$1 order by e.enumsortorder", [type.name])).rows.map(r => r.enumlabel);
          if (JSON.stringify(labels) !== JSON.stringify(type.values)) throw new Error(`Legacy enum mismatch: ${type.name}`);
        }
        baseline = true;
        if (write && !values.baseline) throw new Error("Verified existing schema. Add --baseline to acknowledge migration 0000 without replaying it.");
      }
      const pending = migrations.slice(baseline ? 1 : journal.length);
      if (command === "check" && (baseline || pending.length)) throw new Error("Schema migrations are pending. Run plan before applying changes.");
      console.log(JSON.stringify({ target: `${project}/${instance}/${config.database}`, command, verifiedLegacyBaseline: baseline, pending: pending.map(m => ({ timestamp: m.folderMillis, hash: m.hash })), backupId: values["backup-id"] ?? null }));
      if (write) {
        await client.query('CREATE SCHEMA IF NOT EXISTS "drizzle"');
        await client.query('CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)');
        if (baseline) await client.query('INSERT INTO "drizzle"."__drizzle_migrations" (hash,created_at) VALUES ($1,$2)', [migrations[0].hash, migrations[0].folderMillis]);
        for (const migration of pending) {
          for (const statement of migration.sql) if (statement.trim()) await client.query(statement);
          await client.query('INSERT INTO "drizzle"."__drizzle_migrations" (hash,created_at) VALUES ($1,$2)', [migration.hash, migration.folderMillis]);
        }
        await client.query("COMMIT");
        console.log("Cloud migrations committed atomically; existing rows were not reset or seeded.");
      } else await client.query("ROLLBACK");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  } finally { if (pool) await pool.end(); connector.close(); }
}
main().catch(error => {
  // SDK errors may contain authorization headers, connection settings or a service-account key.
  const message = error instanceof Error && !/token|credential|password|authorization|private_key/i.test(error.message) ? error.message : "Cloud authentication/connection failed; sensitive details suppressed.";
  console.error(message); process.exitCode = 1;
});
