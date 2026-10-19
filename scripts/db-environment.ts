import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

/** Both Docker Compose and database tools read this explicit, ignored development file. */
export function loadLocalEnvironment() {
  const file = resolve(process.env.DB_ENV_FILE ?? ".env.development");
  const parsed = parseEnv(readFileSync(file, "utf8"));
  // Only DB settings are exported. Next.js keeps its normal .env.local precedence for Auth/Resend.
  const databaseKeys = new Set(["DB_PROVIDER", "APP_ENV", "DATABASE_URL", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_PORT", "DEV_SEED_FIREBASE_UID", "TEST_DATABASE_URL"]);
  for (const [key, value] of Object.entries(parsed)) if (databaseKeys.has(key) && process.env[key] === undefined) process.env[key] = value;
}
