import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const checkedFiles = [
  "app/page.tsx",
  "app/reservations/hooks/use-admin-session.ts",
  "app/reservations/hooks/use-customer-session.ts",
  "lib/domain.ts",
  "lib/seed-data.ts",
  "lib/repositories/file-reservation-repository.ts",
];

const mojibakePattern = /繝|縺|譛|莠|蠎|鬘|蜑|隍|蛻|逋|菫|諠|遒|謌|譖|蠕|雎|讒|匳|邂|髯|ﾂ|�/;

test("user-facing source files do not contain mojibake text", async () => {
  for (const file of checkedFiles) {
    const source = await readFile(path.join(process.cwd(), file), "utf8");
    assert.doesNotMatch(source, mojibakePattern, `${file} contains likely mojibake text`);
  }
});
