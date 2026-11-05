import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { testFiles } from "./test-files";
import { validationEnvironment } from "./validation-environment";

function main() {
  const mode = process.argv[2];
  let env = validationEnvironment();
  let args: string[];
  switch (mode) {
    case "unit":
      args = ["--test", ...testFiles("tests").map(file => join(".tmp/test-build", file.replace(/\.ts$/, ".js")))];
      break;
    case "db":
      // A single PGlite process at a time bounds memory on development PCs and CI runners.
      args = ["--conditions=react-server", "--import", "tsx", "--test", "--test-concurrency=1", ...testFiles("tests/db")];
      break;
    case "build":
      if (!process.env.npm_execpath) throw new Error("Run through npm run build:check.");
      env = { ...env, NODE_ENV: "production", RESERVATION_VALIDATION_BUILD: "1" };
      args = [process.env.npm_execpath, "run", "build"];
      break;
    case "auth":
      args = ["node_modules/firebase-tools/lib/bin/firebase.js", "emulators:exec", "--only", "auth", "--project", "demo-reservation-google", "--config", "firebase.auth-test.json", "npm run test:auth:contract"];
      // The CLI starts and owns the emulator. It will pass the actual local endpoint to its child.
      delete env.FIREBASE_AUTH_EMULATOR_HOST;
      break;
    default:
      throw new Error("Expected validation mode: unit, db, build or auth.");
  }
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
try { main(); } catch (error) {
  console.error(error instanceof Error ? error.message : "Validation failed.");
  process.exitCode = 1;
}
