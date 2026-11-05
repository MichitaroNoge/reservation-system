/** Validation never inherits database, mail, OAuth or service-account credentials. */
export function validationEnvironment(source: Record<string, string | undefined> = process.env): NodeJS.ProcessEnv {
  const env = { ...source };
  for (const key of Object.keys(env)) {
    if (/^(FIREBASE_|NEXT_PUBLIC_FIREBASE_|GOOGLE_|GCLOUD_|CLOUD_SQL_|RESEND_|DB_|DATA_CONNECT_|DATACONNECT_)/.test(key)) env[key] = "";
  }
  return {
    ...env,
    NODE_ENV: "test",
    APP_ENV: "test", DB_PROVIDER: "drizzle", DB_TEST_DRIVER: "pglite",
    DATABASE_URL: "postgresql://test@127.0.0.1:1/reservation_system_test",
    TEST_DATABASE_URL: "", DB_TEST_RESET_CONFIRM: "",
    FIREBASE_SERVICE_ACCOUNT_KEY: "", GOOGLE_APPLICATION_CREDENTIALS: "",
    FIREBASE_AUTH_ADMIN_EMAILS: "", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:1",
    CLOUD_SQL_CONNECTION_NAME: "", CLOUD_SQL_DATABASE: "", CLOUD_SQL_USER: "",
    GOOGLE_OAUTH_CLIENT_ID: "", GOOGLE_AUTH_COOKIE_SECRET: "",
    GOOGLE_CALENDAR_CLIENT_ID: "", GOOGLE_CALENDAR_CLIENT_SECRET: "", GOOGLE_CALENDAR_ENCRYPTION_KEY: "",
    RESEND_API_KEY: "", RESEND_FROM_EMAIL: "", RESEND_ALLOWED_FROM_EMAILS: "", RESEND_TEST_RECIPIENT: "",
    APPROVAL_EMAIL_WORKER_ENABLED: "false",
    NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-reservation-google.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-reservation-google",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-reservation-google.appspot.com",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:1234567890:web:validation",
    GCLOUD_PROJECT: "demo-reservation-google", GOOGLE_CLOUD_PROJECT: "demo-reservation-google",
    GCE_METADATA_HOST: "127.0.0.1:1", NEXT_TELEMETRY_DISABLED: "1", FIREBASE_CLI_DISABLE_MOTD: "1", NO_UPDATE_NOTIFIER: "1",
  };
}
