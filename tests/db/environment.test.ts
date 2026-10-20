import assert from "node:assert/strict";
import { test } from "node:test";
import { assertLocalDatabase, databaseConnection, databaseUrl, repositoryProvider } from "../../lib/db/environment";

const development = { APP_ENV: "development", DATABASE_URL: "postgresql://dev:password@127.0.0.1:5433/reservation_system_dev" };
test("legacy deployments keep Data Connect unless explicitly configured", () => {
  assert.equal(repositoryProvider({}), "dataconnect");
  assert.equal(repositoryProvider({ ...development, DB_PROVIDER: "drizzle" }), "drizzle");
  assert.throws(() => repositoryProvider({ DB_PROVIDER: "drizzle" }), /DATABASE_URL/);
  assert.throws(() => repositoryProvider({ DB_PROVIDER: "typo" }), /DB_PROVIDER/);
});
test("local tooling rejects production, nonlocal hosts, wrong names and URL host overrides", () => {
  assert.equal(assertLocalDatabase(development).hostname,"127.0.0.1");
  for (const env of [
    { ...development, APP_ENV: "production" }, { ...development, APP_ENV: "staging" },
    { ...development, VERCEL: "1" }, { ...development, APP_ENV:undefined },
    { ...development, DATABASE_URL:"postgresql://dev:password@remote.example/reservation_system_dev" },
    { ...development, DATABASE_URL:"postgresql://dev:password@127.0.0.1/production" },
    { ...development, DATABASE_URL:development.DATABASE_URL+"?host=remote.example" },
    { ...development, DATABASE_URL:development.DATABASE_URL+"?service=production" },
    { ...development, DATABASE_URL:development.DATABASE_URL+"?dbname=production" },
    { ...development, DATABASE_URL:"not a URL" },
  ]) assert.throws(()=>assertLocalDatabase(env));
  assert.throws(()=>databaseUrl({...development,APP_ENV:undefined}));
});

test("Cloud SQL requires an explicit remote environment and cannot bypass local tooling protections", () => {
  const cloud = { APP_ENV: "staging", DB_PROVIDER: "drizzle", CLOUD_SQL_CONNECTION_NAME: "example-project:asia-northeast1:database", CLOUD_SQL_DATABASE: "reservations", CLOUD_SQL_USER: "application@example-project.iam" };
  assert.equal(repositoryProvider(cloud), "drizzle");
  assert.equal(databaseConnection(cloud).kind, "cloud-sql");
  for (const env of [{ ...cloud, APP_ENV: "development" }, { ...cloud, APP_ENV: "test" }, { ...cloud, APP_ENV: undefined }, { ...cloud, DATABASE_URL: development.DATABASE_URL }, { ...cloud, CLOUD_SQL_DATABASE: "" }, { ...cloud, CLOUD_SQL_USER: "" }, { ...cloud, CLOUD_SQL_IP_TYPE: "invalid" }]) assert.throws(() => databaseConnection(env));
  assert.throws(() => assertLocalDatabase(cloud));
  assert.throws(() => databaseUrl({ APP_ENV: "production", DATABASE_URL: "postgresql://user:password@remote.example/database?sslmode=require" }), /verify-full/);
});
