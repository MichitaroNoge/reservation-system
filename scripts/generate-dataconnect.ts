import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const cli = require.resolve("firebase-tools/lib/bin/firebase.js");
const result = spawnSync(process.execPath, [cli, "dataconnect:sdk:generate"], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
// The generator still emits Admin 13-only metadata. Both APIs are tested on Admin 14.
const path = "src/generated/dataconnect-admin/package.json";
const metadata = JSON.parse(readFileSync(path, "utf8"));
metadata.peerDependencies["firebase-admin"] = "^13.4.0 || ^14.5.0";
writeFileSync(path, JSON.stringify(metadata, null, 2) + "\n");
