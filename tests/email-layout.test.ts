import test from "node:test";
import assert from "node:assert/strict";
import { buildEmailContent } from "../lib/email/email-layout";

test("email layout turns verification URLs into safe clickable links", () => {
  const url = "http://localhost:3000/api/accounts/contact-emails/verify?token=abc123";
  const content = buildEmailContent("確認", `次のURLを開いてください。\n\n${url}`);

  assert.match(content.html, new RegExp(`<a href="${url.replace(/[?]/g, "\\?")}"`));
  assert.match(content.html, />http:\/\/localhost:3000\/api\/accounts\/contact-emails\/verify\?token=abc123<\/a>/);
  assert.equal(content.text, `次のURLを開いてください。\n\n${url}`);
});

test("email layout escapes HTML outside generated links", () => {
  const content = buildEmailContent("確認", `<script>alert("x")</script> https://example.com/?a=1&b=2`);

  assert.doesNotMatch(content.html, /<script>/);
  assert.match(content.html, /&lt;script&gt;/);
  assert.match(content.html, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
});
