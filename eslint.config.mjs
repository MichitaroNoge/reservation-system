import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });
const config = [
  { ignores: [".next/**", ".next-dev/**", ".next-check/**", ".tmp/**", "src/generated/**", "node_modules/**", "drizzle/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Existing legacy adapters use untyped generated SDK data; new database modules remain typed.
  { files: ["app/page.tsx", "lib/repositories/firebase-sql-connect-repository.ts", "lib/repositories/in-memory-reservation-repository.ts"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
];
export default config;
