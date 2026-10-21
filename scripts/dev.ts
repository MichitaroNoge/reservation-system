import { spawn } from "node:child_process";
import { loadEnvConfig } from "@next/env";
import { repositoryProvider } from "../lib/db/environment";
import { loadLocalEnvironment } from "./db-environment";
import { Pool } from "pg";

async function main() {
  loadLocalEnvironment();
  loadEnvConfig(process.cwd(), true);
  if (repositoryProvider() !== "drizzle") throw new Error("npm run dev:local requires DB_PROVIDER=drizzle.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, max: 1 });
  try { await pool.query("select revision, reservation_lead_days, acceptance_capacity, blocked_periods from system_settings limit 0"); await pool.query("select bucket_key from abuse_limit limit 0"); await pool.query("select firebase_uid from account_deletion limit 0"); await pool.query("select request_key from reservation_submission limit 0"); await pool.query("select id from inquiry limit 0"); await pool.query("select id, resolution from inquiry_reply limit 0"); await pool.query("select reservation_id from google_calendar_sync limit 0"); await pool.query("select snapshot_key, next_attempt_at, stopped_at from approval_email_delivery limit 0"); await pool.query("select revision, cancellation_previous_status from reservation limit 0"); }
  catch { throw new Error("開発DBに接続できないか、必要なマイグレーションが未適用です。Docker Desktopを起動し、npm run db:up と npm run db:migrate を実行してから再度 npm run dev:local を実行してください。"); }
  finally { await pool.end(); }
  // Pass the checked environment explicitly so .env.local cannot silently switch the database backend.
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", ...process.argv.slice(2)], { stdio:"inherit", env:process.env });
  const calendarWorker = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/google-calendar-worker.ts"], { stdio: "inherit", env: process.env });
  const approvalWorker = process.env.APPROVAL_EMAIL_WORKER_ENABLED === "true" ? spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/approval-email-worker.ts"], { stdio: "inherit", env: process.env }) : null;
  approvalWorker?.on("error", () => console.error("承認通知メールの再試行を起動できませんでした。"));
  calendarWorker.on("error", () => console.error("Googleカレンダーの自動連携を起動できませんでした。"));
  child.on("exit", code => { calendarWorker.kill("SIGTERM"); approvalWorker?.kill("SIGTERM"); process.exitCode=code ?? 1; });
  process.on("SIGINT", () => { child.kill("SIGINT"); calendarWorker.kill("SIGINT"); approvalWorker?.kill("SIGINT"); });
  process.on("SIGTERM", () => { child.kill("SIGTERM"); calendarWorker.kill("SIGTERM"); approvalWorker?.kill("SIGTERM"); });
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Local development startup failed."); process.exitCode = 1; });
