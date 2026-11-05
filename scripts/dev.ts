import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { loadEnvConfig } from "@next/env";
import { repositoryProvider } from "../lib/db/environment";
import { loadLocalEnvironment } from "./db-environment";
import { Pool } from "pg";

async function main() {
  const production = process.argv.includes("--production");
  if (production && !existsSync(resolve(".next", "BUILD_ID"))) throw new Error("ビルドがありません。npm run build を実行してから npm run start:local を実行してください。");
  loadLocalEnvironment();
  loadEnvConfig(process.cwd(), !production);
  if (repositoryProvider() !== "drizzle") throw new Error("Local startup requires DB_PROVIDER=drizzle.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, max: 1 });
  try { await pool.query("select revision, reservation_lead_days, acceptance_capacity, blocked_periods from system_settings limit 0"); await pool.query("select bucket_key from abuse_limit limit 0"); await pool.query("select firebase_uid from account_deletion limit 0"); await pool.query("select request_key from reservation_submission limit 0"); await pool.query("select id, meal_date, meal_start_time, people from inquiry limit 0"); const inquiryStates = await pool.query("select e.enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='inquiry_status' order by e.enumsortorder"); if (JSON.stringify(inquiryStates.rows.map(row => row.enumlabel)) !== JSON.stringify(["unhandled", "answered"])) throw new Error("問い合わせステータスのマイグレーションが未適用です。"); await pool.query("select id, resolution from inquiry_reply limit 0"); await pool.query("select id, revision from inquiry_reply_template limit 0"); await pool.query("select reservation_id from google_calendar_sync limit 0"); await pool.query("select snapshot_key, next_attempt_at, stopped_at from approval_email_delivery limit 0"); await pool.query("select revision, cancellation_previous_status, confirmation_email_generation from reservation limit 0"); await pool.query("select key from transactional_mail_job limit 0"); }
  catch { throw new Error("開発DBに接続できないか、必要なマイグレーションが未適用です。Docker Desktopを起動し、npm run db:up と npm run db:migrate を実行してから再度 npm run dev:local を実行してください。"); }
  finally { await pool.end(); }
  if (production) Object.assign(process.env, { NODE_ENV: "production" });
  // Pass the checked environment explicitly so .env.local cannot silently switch the database backend.
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", production ? "start" : "dev", "--hostname", "127.0.0.1", ...process.argv.slice(2).filter(arg => arg !== "--production")], { stdio:"inherit", env:process.env });
  const calendarWorker = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/google-calendar-worker.ts"], { stdio: "inherit", env: process.env });
  const approvalWorker = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/approval-email-worker.ts"], { stdio: "inherit", env: process.env });
  approvalWorker?.on("error", () => console.error("承認通知メールの再試行を起動できませんでした。"));
  calendarWorker.on("error", () => console.error("Googleカレンダーの自動連携を起動できませんでした。"));
  child.on("exit", code => { calendarWorker.kill("SIGTERM"); approvalWorker?.kill("SIGTERM"); process.exitCode=code ?? 1; });
  process.on("SIGINT", () => { child.kill("SIGINT"); calendarWorker.kill("SIGINT"); approvalWorker?.kill("SIGINT"); });
  process.on("SIGTERM", () => { child.kill("SIGTERM"); calendarWorker.kill("SIGTERM"); approvalWorker?.kill("SIGTERM"); });
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Local development startup failed."); process.exitCode = 1; });
