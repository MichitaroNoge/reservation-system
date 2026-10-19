import { spawnSync } from "node:child_process";
import { Pool } from "pg";
import { loadLocalEnvironment } from "./db-environment";
import { assertLocalDatabase } from "../lib/db/environment";

async function main() {
  loadLocalEnvironment();
  const url=process.env.TEST_DATABASE_URL;
  if (process.env.VERCEL || !["development","test"].includes(process.env.APP_ENV ?? "")) throw new Error("PostgreSQL integration tests are local-only.");
  assertLocalDatabase({APP_ENV:"test",DATABASE_URL:url});
  if (process.argv[2] !== "--confirm" || process.argv[3] !== "reservation_system_test") {
    throw new Error("This suite resets the local TEST database. Required: npm run test:db:postgres -- --confirm reservation_system_test");
  }
  const pool=new Pool({connectionString:url,connectionTimeoutMillis:5000,max:1});
  try { await pool.query("select 1"); } finally { await pool.end(); }
  const result=spawnSync(process.execPath,["--conditions=react-server","--import","tsx","--test","--test-concurrency=1","tests/db/environment.test.ts","tests/db/repository.test.ts","tests/db/reservation-export.test.ts","tests/db/google-auth.test.ts","tests/db/cancellation-policy.test.ts","tests/db/policy-consent.test.ts","tests/db/inquiries.test.ts"],{
    stdio:"inherit",env:{...process.env,DB_TEST_DRIVER:"postgres",DB_TEST_RESET_CONFIRM:"reservation_system_test",TEST_DATABASE_URL:url},
  });
  if(result.error)throw result.error;
  process.exitCode=result.status ?? 1;
}
main().catch(error=>{console.error(error instanceof Error?error.message:"PostgreSQL tests failed.");process.exitCode=1;});
