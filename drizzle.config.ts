import { defineConfig } from "drizzle-kit";
import { loadLocalEnvironment } from "./scripts/db-environment";
import { assertLocalDatabase } from "./lib/db/environment";

loadLocalEnvironment();
assertLocalDatabase();
export default defineConfig({ dialect: "postgresql", schema: "./lib/db/schema.ts", out: "./drizzle", dbCredentials: { url: process.env.DATABASE_URL! }, strict: true });
