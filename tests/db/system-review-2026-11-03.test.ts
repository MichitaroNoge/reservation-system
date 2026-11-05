import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mock, test } from "node:test";
import { createCalendarFixture } from "./calendar-fixture";
import { GET as verifyContact } from "../../app/api/accounts/contact-emails/verify/route";

test("contact links are repeatable after verification and reject expired or inactive owners", async () => {
  const fixture = await createCalendarFixture();
  const repo = fixture.repo, time = Date.now();
  try {
    const cases = [
      { name: "valid", expiresAt: time + 3600000, expected: "verified" },
      { name: "expired", expiresAt: time - 3600000, expected: "invalid" },
      { name: "boundary", expiresAt: time, expected: "invalid" },
      { name: "verified-expired", expiresAt: time - 3600000, verified: true, expected: "verified" },
      { name: "inactive", expiresAt: time + 3600000, inactive: true, expected: "invalid" },
      { name: "verified-inactive", expiresAt: time + 3600000, verified: true, inactive: true, expected: "invalid" },
      { name: "deleting", expiresAt: time + 3600000, deleting: true, expected: "invalid" },
    ];
    for (const [index, item] of cases.entries()) {
      const uid = `contact-review-${item.name}`;
      const account = await repo.createAccount({ firebaseUid: uid, name: "検証者", contact: `${uid}@example.test` });
      const token = String(index + 1).repeat(64), hash = createHash("sha256").update(token).digest("hex");
      const contact = await repo.createAccountContactEmail({ accountId: account.id!, email: `additional-${index}@example.test`, verificationTokenHash: hash, verificationExpiresAt: new Date(item.expiresAt).toISOString() });
      const verifiedAt = new Date(time - 7200000).toISOString();
      if (item.verified) await repo.verifyAccountContactEmail(contact.id, verifiedAt);
      if (item.inactive) await repo.deactivateAccount(account.id!);
      if (item.deleting) await repo.recordAccountDeletion(uid);
      const clock = mock.method(Date, "now", () => time);
      let response: Response;
      try { response = await verifyContact(new Request(`http://localhost/api/accounts/contact-emails/verify?token=${token}`)); }
      finally { clock.mock.restore(); }
      assert.equal(new URL(response.headers.get("location")!).searchParams.get("contactEmail"), item.expected, item.name);
      assert.equal(new URL(response.headers.get("location")!).searchParams.get("customerMode"), "settings");
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("referrer-policy"), "no-referrer");
      const saved = (await repo.listAccountContactEmails(account.id!))[0];
      if (item.verified) assert.equal(saved.verifiedAt, verifiedAt, "reopening a verified link must not rewrite its first verification time");
      else assert.equal(Boolean(saved.verifiedAt), item.expected === "verified", item.name);
    }
    const bad = await verifyContact(new Request("http://localhost/api/accounts/contact-emails/verify?token=invalid"));
    assert.equal(new URL(bad.headers.get("location")!).searchParams.get("contactEmail"), "invalid");
  } finally { await fixture.close(); }
});
