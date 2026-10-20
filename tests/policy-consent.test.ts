import assert from "node:assert/strict";
import { test } from "node:test";
import { cancellationPolicyText, cancellationPolicyVersion, policyConsentDate, policyConsentDetail } from "../lib/cancellation-policy-consent";
import { validateCancellationPolicyAgreement } from "../lib/api-validation";
import { requireCancellationPolicyAgreement } from "../lib/services/policy-consent-service";
test("confirmed booking consent requires explicit acceptance of the current version", () => {
  assert.throws(() => requireCancellationPolicyAgreement(undefined));
  assert.throws(() => validateCancellationPolicyAgreement({ accepted: false, version: cancellationPolicyVersion }));
  assert.throws(() => validateCancellationPolicyAgreement({ accepted: "true", version: cancellationPolicyVersion }));
  assert.throws(() => requireCancellationPolicyAgreement({ accepted: true, version: "old" }), /更新/);
  assert.doesNotThrow(() => requireCancellationPolicyAgreement(validateCancellationPolicyAgreement({ accepted: true, version: cancellationPolicyVersion, acceptedAt: "1900-01-01", firebaseUid: "imposter" })));
  assert.deepEqual(validateCancellationPolicyAgreement({ accepted: true, version: cancellationPolicyVersion, acceptedAt: "1900-01-01" }), { accepted: true, version: cancellationPolicyVersion });
});
test("policy snapshot includes both fee rules, all supplied examples and the one-day exception", () => {
  for (const phrase of ["本予約完了後の取り消し", "100%", "50％以上の減員", "60名 → 55名", "60名 → 40名", "60名 → 30名", "初回予約人数", "前日まで変更可能"]) assert.ok(cancellationPolicyText.includes(phrase));
  assert.equal(policyConsentDate("2026-10-19T23:30:00Z"), "2026/10/20 08:30:00");
  assert.match(policyConsentDetail({ source: "confirmed_change_request", people: 60, acceptedAt: "2026-10-19T23:30:00Z", policyText: "保存した旧本文", version: "v-old" }), /本予約への変更申請[\s\S]*2026\/10\/20 08:30:00[\s\S]*v-old[\s\S]*60名[\s\S]*保存した旧本文/);
});
