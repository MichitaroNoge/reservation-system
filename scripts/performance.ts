import { spawn } from "node:child_process";
import { validationEnvironment } from "./validation-environment";

const [mode, ...args] = process.argv.slice(2);
if (!["db", "server", "browser", "smoke"].includes(mode)) throw new Error("Usage: npm run perf -- db|server|browser|smoke [arguments]");
const env = validationEnvironment();
// Opt-in targets only the documented disposable container, never an inherited database URL.
if (args.includes("--postgres")) Object.assign(env, {
  DB_TEST_DRIVER: "postgres", TEST_DATABASE_URL: "postgresql://perf:performance-only@127.0.0.1:55439/reservation_system_test",
  DB_TEST_RESET_CONFIRM: "reservation_system_test",
});
const child = spawn(process.execPath, [
  ...(["browser", "smoke"].includes(mode) ? [] : ["--conditions=react-server"]), "--import", "tsx", `scripts/performance/${mode}.ts`, ...args,
], { stdio: "inherit", env });
child.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
