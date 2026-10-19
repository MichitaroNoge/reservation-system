export type DatabaseEnvironment = Record<string, string | undefined>;

/** NODE_ENV is deliberately not the deployment environment: next build sets it to production. */
export function databaseUrl(env: DatabaseEnvironment = process.env) {
  const value = env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required for the Drizzle repository.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("DATABASE_URL is not a valid PostgreSQL URL."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.username || !url.pathname.slice(1)) {
    throw new Error("DATABASE_URL must specify a PostgreSQL host, user and database.");
  }
  if (!env.APP_ENV || !["development", "test", "staging", "production"].includes(env.APP_ENV)) {
    throw new Error("APP_ENV must explicitly identify the database environment.");
  }
  if (env.APP_ENV === "development" || env.APP_ENV === "test") assertLocalDatabase(env);
  if (["staging", "production"].includes(env.APP_ENV) && url.searchParams.get("sslmode") !== "verify-full") {
    throw new Error("Remote PostgreSQL connections require sslmode=verify-full or the Cloud SQL IAM connector.");
  }
  return value;
}

export function databaseConnection(env: DatabaseEnvironment = process.env) {
  if (!env.CLOUD_SQL_CONNECTION_NAME) return { kind: "url" as const, connectionString: databaseUrl(env) };
  if (!["staging", "production"].includes(env.APP_ENV ?? "")) throw new Error("Cloud SQL requires APP_ENV=staging or production; local tools cannot connect to it.");
  if (env.DATABASE_URL) throw new Error("Select either DATABASE_URL or CLOUD_SQL_CONNECTION_NAME, not both.");
  if (!/^[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$/.test(env.CLOUD_SQL_CONNECTION_NAME)) throw new Error("CLOUD_SQL_CONNECTION_NAME must be project:region:instance.");
  if (!env.CLOUD_SQL_DATABASE || !/^[a-zA-Z0-9_-]{1,63}$/.test(env.CLOUD_SQL_DATABASE)) throw new Error("CLOUD_SQL_DATABASE is required and must be an explicit database name.");
  if (!env.CLOUD_SQL_USER || env.CLOUD_SQL_USER.length > 256) throw new Error("CLOUD_SQL_USER must identify the existing IAM database user.");
  const ipType = env.CLOUD_SQL_IP_TYPE ?? "PUBLIC";
  if (ipType !== "PUBLIC" && ipType !== "PRIVATE") throw new Error("CLOUD_SQL_IP_TYPE must be PUBLIC or PRIVATE.");
  return { kind: "cloud-sql" as const, instanceConnectionName: env.CLOUD_SQL_CONNECTION_NAME, database: env.CLOUD_SQL_DATABASE, user: env.CLOUD_SQL_USER, ipType };
}

/** All migration, seed, backup and reset commands in this change are LOCAL ONLY. */
export function assertLocalDatabase(env: DatabaseEnvironment = process.env) {
  if (!["development", "test"].includes(env.APP_ENV ?? "") || env.VERCEL || env.CI_PRODUCTION) {
    throw new Error("Database tools are restricted to an explicitly selected local development/test environment.");
  }
  const value = env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid DATABASE_URL."); }
  const allowedHosts = ["localhost", "127.0.0.1", "[::1]"];
  const expectedDb = env.APP_ENV === "test" ? "reservation_system_test" : "reservation_system_dev";
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !allowedHosts.includes(url.hostname) || decodeURIComponent(url.pathname.slice(1)) !== expectedDb) {
    throw new Error(`Local database tools require a loopback host and database ${expectedDb}.`);
  }
  // pg accepts host overrides through URL query parameters; do not allow these to bypass the check.
  const allowedParameters = new Set(["sslmode", "application_name"]);
  for (const key of url.searchParams.keys()) {
    if (!allowedParameters.has(key)) throw new Error(`Unsupported DATABASE_URL parameter: ${key}`);
  }
  return url;
}

export function repositoryProvider(env: DatabaseEnvironment = process.env): "dataconnect" | "drizzle" {
  const provider = env.DB_PROVIDER ?? "dataconnect";
  if (provider !== "dataconnect" && provider !== "drizzle") throw new Error("DB_PROVIDER must be dataconnect or drizzle.");
  if (provider === "drizzle") databaseConnection(env);
  return provider;
}
