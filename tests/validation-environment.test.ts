import assert from "node:assert/strict";
import { test } from "node:test";
import { validationEnvironment } from "../scripts/validation-environment";
import { testFiles } from "../scripts/test-files";

test("validation pins PGlite and demo credentials without inheriting destructive or external settings", () => {
  const original = {
    PATH: "keep-path", APP_ENV: "production", DATABASE_URL: "postgresql://secret@remote.example/production",
    TEST_DATABASE_URL: "postgresql://secret@localhost/reservation_system_dev", DB_TEST_DRIVER: "postgres",
    DB_TEST_RESET_CONFIRM: "reservation_system_test", FIREBASE_SERVICE_ACCOUNT_KEY: "private-key",
    RESEND_API_KEY: "mail-key", GOOGLE_APPLICATION_CREDENTIALS: "/private/key.json",
    CLOUD_SQL_CONNECTION_NAME: "project:region:instance", GOOGLE_CALENDAR_CLIENT_SECRET: "oauth-secret",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "live-project", FIREBASE_AUTH_EMULATOR_HOST: "remote.example:9099",
  };
  const env = validationEnvironment(original);
  assert.equal(env.PATH, "keep-path");
  assert.equal(env.APP_ENV, "test");
  assert.equal(env.DB_TEST_DRIVER, "pglite");
  assert.equal(env.DB_TEST_RESET_CONFIRM, "");
  assert.equal(env.TEST_DATABASE_URL, "");
  assert.equal(env.DATABASE_URL, "postgresql://test@127.0.0.1:1/reservation_system_test");
  for (const key of ["FIREBASE_SERVICE_ACCOUNT_KEY", "RESEND_API_KEY", "GOOGLE_APPLICATION_CREDENTIALS", "CLOUD_SQL_CONNECTION_NAME", "GOOGLE_CALENDAR_CLIENT_SECRET"]) assert.equal(env[key], "");
  assert.equal(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "demo-reservation-google");
  assert.equal(env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:1");
  assert.equal(original.APP_ENV, "production", "parent environment must remain unchanged");
});

test("test discovery includes newly added DB suites and excludes fixtures", () => {
  const files = testFiles("tests/db");
  assert.ok(files.some(file => file.endsWith("customer-reservation-inquiry-counts.test.ts")));
  assert.ok(files.some(file => file.endsWith("reply-template-picker.test.ts")));
  assert.ok(files.every(file => file.endsWith(".test.ts")));
  assert.ok(!files.some(file => file.endsWith("calendar-fixture.ts")));
});
