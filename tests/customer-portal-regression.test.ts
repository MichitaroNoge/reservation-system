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
    "利用者区分を選択",
    "予約種別へ",
    "一般予約",
    "予約確認",
    "本予約への変更申請",
    "予約内容変更申請",
    "キャンセル申請",
    "/api/accounts/me",
    "/api/accounts/me/reservations",
  ]) {
    assert.match(pageSource, new RegExp(escapeRegExp(requiredText)), `${requiredText} should remain in the customer portal`);
  }

  assert.doesNotMatch(pageSource, /アカウント登録なしで予約する/, "guest reservation entry must not be shown");
  assert.doesNotMatch(pageSource, /\/api\/customers\/me/, "customer reservation portal should use Account APIs for logged-in profile data");
  assert.doesNotMatch(pageSource, /一般団体予約/, "individual reservations should not be labeled as group reservations");
  assert.doesNotMatch(pageSource, /customerAccountMode[^;\n]+guest/, "guest reservation mode must not be wired");
  assert.match(pageSource, /customerAccountMode:\s*"account"/, "account reservation mode must remain wired");
  assert.match(pageSource, /CustomerRequestLoginPanel/, "customer request forms should require login before submission");
  assert.match(pageSource, /startConfirmedChangeFromReservation/, "confirmed reservation change must be available from account reservations");
  assert.match(pageSource, /startReservationChangeFromReservation/, "reservation change must be available from account reservations");
  assert.match(pageSource, /startCancellationFromReservation/, "cancellation must be available from account reservations");
  assert.match(pageSource, /function CustomerReservationDashboard/, "customer reservation dashboard should stay split from CustomerPortal");
  assert.match(pageSource, /function CustomerRequestForms/, "customer request forms should stay split from CustomerPortal");
  assert.match(pageSource, /function ReservationActionButtons/, "reservation action buttons should stay split from CustomerPortal");
  assert.match(pageSource, /onSubmitCancellation[\s\S]*\{ authToken \}/, "customer cancellation requests must send the Firebase token when logged in");
  assert.match(pageSource, /onSubmitConfirmedReservationChange[\s\S]*\{ authToken \}/, "confirmed reservation change requests must send the Firebase token when logged in");
  assert.match(pageSource, /onSubmitChangeRequest[\s\S]*\{ authToken \}/, "reservation change requests must send the Firebase token when logged in");
  assert.match(sessionSource, /createUserWithEmailAndPassword/, "customer registration must remain wired to Firebase Auth");
  assert.match(sessionSource, /signInWithEmailAndPassword/, "customer login must remain wired to Firebase Auth");
  assert.match(sessionSource, /browserLocalPersistence/, "customer login state should persist in the browser");
  assert.match(sessionSource, /setPersistence\(firebaseAuth,\s*browserLocalPersistence\)/, "Firebase Auth persistence should be configured explicitly");
  assert.match(sessionSource, /auth\/email-already-in-use/, "registered email errors should be explained to customers");
  assert.match(sessionSource, /auth\/weak-password/, "weak password errors should be explained to customers");
  assert.match(sessionSource, /auth\/operation-not-allowed/, "disabled email-password auth should be explained to customers");
  assert.match(sessionSource, /Object\.assign\(error, \{ code \}\)/, "Firebase Auth error codes should be preserved for UI decisions");
  assert.match(pageSource, /customerAuthErrorCode\(error\) === "auth\/email-already-in-use"/, "existing email fallback should use Firebase Auth error codes");
  assert.match(pageSource, /登録済みアカウントでログインしました/, "registration with an existing email should fall back to login when credentials match");
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
