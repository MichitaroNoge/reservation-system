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
    "予約確認",
    "本予約への変更申請",
    "予約内容変更申請",
    "キャンセル申請",
    "/api/customers/me",
    "/api/customers/me/reservations",
  ]) {
    assert.match(pageSource, new RegExp(escapeRegExp(requiredText)), `${requiredText} should remain in the customer portal`);
  }

  assert.match(pageSource, /customerAccountMode[^;\n]+guest/, "guest reservation mode must remain wired");
  assert.match(pageSource, /customerAccountMode[^;\n]+account/, "account reservation mode must remain wired");
  assert.match(pageSource, /startConfirmedChangeFromReservation/, "confirmed reservation change must be available from account reservations");
  assert.match(pageSource, /startReservationChangeFromReservation/, "reservation change must be available from account reservations");
  assert.match(pageSource, /startCancellationFromReservation/, "cancellation must be available from account reservations");
  assert.match(pageSource, /onSubmitCancellation[\s\S]*\{ authToken \}/, "customer cancellation requests must send the Firebase token when logged in");
  assert.match(pageSource, /onSubmitConfirmedReservationChange[\s\S]*\{ authToken \}/, "confirmed reservation change requests must send the Firebase token when logged in");
  assert.match(pageSource, /onSubmitChangeRequest[\s\S]*\{ authToken \}/, "reservation change requests must send the Firebase token when logged in");
  assert.match(sessionSource, /createUserWithEmailAndPassword/, "customer registration must remain wired to Firebase Auth");
  assert.match(sessionSource, /signInWithEmailAndPassword/, "customer login must remain wired to Firebase Auth");
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
