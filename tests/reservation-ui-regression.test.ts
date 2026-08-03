import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

test("reservation drawer rejects confirmed change requests back to temporary confirmation", async () => {
  const pageSource = await readFile(path.join(process.cwd(), "app", "page.tsx"), "utf8");

  assert.match(
    pageSource,
    /isConfirmedReservationChangeRequest\(r\)\s*\?\s*STATUS\.temporaryConfirmed\s*:\s*STATUS\.confirmedRejected/,
    "confirmed reservation change rejection in the drawer must return to temporary confirmation",
  );
  assert.match(pageSource, /本予約への変更申請を却下する/);
});
