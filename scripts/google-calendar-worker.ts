import { setTimeout as sleep } from "node:timers/promises";
import { loadEnvConfig } from "@next/env";
import { loadLocalEnvironment } from "./db-environment";
import { repositoryProvider } from "../lib/db/environment";
import { runCalendarSync } from "../lib/google-calendar/sync";
const production = ["staging", "production"].includes(process.env.APP_ENV ?? "") || process.env.NODE_ENV === "production";
if (!production) loadLocalEnvironment();
// Match Next.js secret loading; preserve the explicitly selected DB environment.
loadEnvConfig(process.cwd(), !production);
const stop = new AbortController();
process.on("SIGINT", () => { stop.abort(); });
process.on("SIGTERM", () => { stop.abort(); });
async function main() {
  if (repositoryProvider() !== "drizzle") return;
  while (!stop.signal.aborted) {
    let delay = 15000;
    try { const result = await runCalendarSync(undefined, undefined, 10); if (result.processed > 0 && !result.failed) delay = 250; }
    catch { console.error(JSON.stringify({ event: "google_calendar_worker_retry" })); }
    if (!stop.signal.aborted) await sleep(delay, undefined, { signal: stop.signal }).catch(() => undefined);
  }
}
void main().finally(async () => { const runtime = globalThis as typeof globalThis & { reservationDatabase?: { pool: { end(): Promise<void> } } }; await runtime.reservationDatabase?.pool.end(); });
