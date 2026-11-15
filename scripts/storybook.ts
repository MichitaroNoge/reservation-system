import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { validationEnvironment } from "./validation-environment";

const mode = process.argv[2];
if (mode !== "dev" && mode !== "build") throw new Error("Expected Storybook mode: dev or build.");

// Use the same dummy environment as app validation; never start application workers.
const requirePackage = createRequire(join(process.cwd(), "package.json"));
const packagePath = requirePackage.resolve("storybook/package.json");
const { bin } = JSON.parse(readFileSync(packagePath, "utf8")) as { bin: string | { storybook: string } };
const executable = typeof bin === "string" ? bin : bin.storybook;
const args = mode === "dev"
  ? ["dev", "--port", "6006", "--host", "127.0.0.1", "--ci", "--no-open"]
  : ["build", "--output-dir", "storybook-static"];
const result = spawnSync(process.execPath, [resolve(dirname(packagePath), executable), ...args], {
  stdio: "inherit",
  env: {
    ...validationEnvironment(),
    NODE_ENV: mode === "dev" ? "development" : "production",
    STORYBOOK_DISABLE_TELEMETRY: "1",
  },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
