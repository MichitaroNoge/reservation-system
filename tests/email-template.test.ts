import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderTemplate, validateTemplate } from "../lib/email/template-renderer";

test("email template expands variables in subject and body", () => {
  const result = renderTemplate("reservation_received", "受付 {{reservationId}}", "{{customerName}} 様 {{numberOfGuests}}名", {
    reservationId: "RSV-1001", customerName: "山田太郎", numberOfGuests: "20",
  });
  assert.equal(result.subject, "受付 RSV-1001");
  assert.equal(result.body, "山田太郎 様 20名");
});

test("email template rejects unknown and malformed variables", () => {
  assert.throws(() => validateTemplate("reservation_received", "件名", "{{unknownValue}}"), /使用できません/);
  assert.throws(() => validateTemplate("reservation_received", "件名", "{{customerName}"), /記述が正しくありません/);
});

test("email template rejects missing variable values", () => {
  assert.throws(() => renderTemplate("reservation_received", "{{reservationId}}", "{{customerName}}", { reservationId: "RSV-1" }), /値がありません/);
});

test("email template management APIs require administrator authentication", async () => {
  const routes = [
    ["app", "api", "email-templates", "route.ts"],
    ["app", "api", "email-templates", "[templateKey]", "route.ts"],
    ["app", "api", "email-templates", "preview", "route.ts"],
  ];

  for (const route of routes) {
    const source = await readFile(path.join(process.cwd(), ...route), "utf8");
    assert.match(source, /await requireAdmin\(request\)/);
  }
});
