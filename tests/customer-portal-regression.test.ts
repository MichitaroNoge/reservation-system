import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

test("customer reservation portal keeps account booking choices", async () => {
  const pageSource = await readFile(path.join(process.cwd(), "app", "page.tsx"), "utf8");
  const sessionSource = await readFile(path.join(process.cwd(), "app", "reservations", "hooks", "use-customer-session.ts"), "utf8");

  for (const requiredText of [
    "ログイン",
    "アカウント登録して予約する",
    "アカウント登録なしで予約する",
    "/api/customers/me",
  ]) {
    assert.match(pageSource, new RegExp(escapeRegExp(requiredText)), `${requiredText} should remain in the customer portal`);
  }

  assert.match(pageSource, /customerAccountMode[^;\n]+guest/, "guest reservation mode must remain wired");
  assert.match(pageSource, /customerAccountMode[^;\n]+account/, "account reservation mode must remain wired");
  assert.match(sessionSource, /createUserWithEmailAndPassword/, "customer registration must remain wired to Firebase Auth");
  assert.match(sessionSource, /signInWithEmailAndPassword/, "customer login must remain wired to Firebase Auth");
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
