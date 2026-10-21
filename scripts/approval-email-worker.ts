import { setTimeout as sleep } from "node:timers/promises";
import { loadEnvConfig } from "@next/env";
import { loadLocalEnvironment } from "./db-environment";
import { repositoryProvider } from "../lib/db/environment";
import { getReservationRepository } from "../lib/repositories";
import { sendPendingApprovalEmails } from "../lib/services/approval-email-service";
const production = ["staging", "production"].includes(process.env.APP_ENV ?? "") || process.env.NODE_ENV === "production";
if (!production) loadLocalEnvironment();
loadEnvConfig(process.cwd(), !production);
const stop = new AbortController();
process.on("SIGINT", () => stop.abort());
process.on("SIGTERM", () => stop.abort());
async function main() {
  if (process.env.APPROVAL_EMAIL_WORKER_ENABLED !== "true" || repositoryProvider() !== "drizzle") return;
  const repo = await getReservationRepository();
  while (!stop.signal.aborted) {
    try { await sendPendingApprovalEmails(repo); }
    catch { console.error(JSON.stringify({ event: "approval_email_worker_retry" })); }
    if (!stop.signal.aborted) await sleep(30000, undefined, { signal: stop.signal }).catch(() => undefined);
  }
}
void main().finally(async () => { const runtime = globalThis as typeof globalThis & { reservationDatabase?: { pool: { end(): Promise<void> } } }; await runtime.reservationDatabase?.pool.end(); });
