import assert from "node:assert/strict";
import test from "node:test";

import { ResendEmailClient } from "../lib/email/resend-email-client";

test("uses the configured test recipient and suppresses bcc", async () => {
  const client = new ResendEmailClient({
    apiKey: "re_test",
    from: "Reserve <onboarding@resend.dev>",
    testRecipient: "test@golfgearlovers.com",
  });
  let sent: Record<string, unknown> | undefined;

  Object.assign(client, {
    resend: {
      emails: {
        send: async (input: Record<string, unknown>) => {
          sent = input;
          return { data: { id: "email-test" }, error: null };
        },
      },
    },
  });

  await client.send({
    to: "customer@example.com",
    bcc: ["contact@example.com"],
    subject: "Test",
    text: "Test",
    html: "<p>Test</p>",
    idempotencyKey: "test-recipient",
  });

  assert.equal(sent?.to, "test@golfgearlovers.com");
  assert.equal(sent?.bcc, undefined);
});
