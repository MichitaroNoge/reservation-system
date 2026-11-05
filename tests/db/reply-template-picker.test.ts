import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createCalendarFixture } from "./calendar-fixture";
import { getDatabase } from "../../lib/db/client";
import { InquiryReplyTemplateRepository } from "../../lib/inquiries/reply-template-repository";
import { getReplyTemplate, listReplyTemplates } from "../../lib/inquiries/reply-template-controllers";

const request = (query = "", token = "calendar-test-admin") => new Request("http://localhost/api/admin/inquiry-reply-templates" + query, { headers: token ? { authorization: "Bearer " + token } : {} });

test("reply picker bulk reads preserve summary compatibility, access control and insertion freshness", async () => {
  const fixture = await createCalendarFixture();
  try {
    const repository = new InquiryReplyTemplateRepository(await getDatabase());
    const second = await repository.create({ id: randomUUID(), name: "B 結び", body: "よろしくお願いします。", isActive: true });
    const first = await repository.create({ id: randomUUID(), name: "A ご案内", body: "ご案内\n" + "長い本文😀".repeat(200), isActive: true });
    const inactive = await repository.create({ id: randomUUID(), name: "C 無効", body: "無効な本文", isActive: false });
    const summary = await listReplyTemplates(request());
    assert.equal(summary.status, 200);
    const summaries = (await summary.json()).templates;
    assert.deepEqual(summaries.map((item: { id: string }) => item.id), [first.id, second.id, inactive.id]);
    assert.ok(summaries.every((item: object) => !Object.hasOwn(item, "body")));
    const response = await listReplyTemplates(request("?activeOnly=true&includeBody=true"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const templates = (await response.json()).templates;
    assert.deepEqual(templates.map((item: { id: string }) => item.id), [first.id, second.id]);
    assert.equal(templates[0].body, first.body);
    assert.equal(templates[1].body, second.body);
    assert.equal((await (await listReplyTemplates(request("?includeBody=true"))).json()).templates.length, 3);
    assert.ok((await (await listReplyTemplates(request("?includeBody=false"))).json()).templates.every((item: object) => !Object.hasOwn(item, "body")));
    for (const [token, status] of [["", 401], ["invalid", 401], ["calendar-test-member", 403]] as const) {
      assert.equal((await listReplyTemplates(request("?activeOnly=true&includeBody=true", token))).status, status);
    }
    for (const query of ["?includeBody=yes", "?includeBody=true&includeBody=false", "?activeOnly=true&extra=true"]) {
      assert.equal((await listReplyTemplates(request(query))).status, 400);
    }
    await repository.update(first.id, { name: first.name, body: "取得後に更新された本文", isActive: true, revision: first.revision });
    const latest = await getReplyTemplate(request(), first.id);
    assert.equal((await latest.json()).template.body, "取得後に更新された本文");
    await repository.update(second.id, { name: second.name, body: second.body, isActive: false, revision: second.revision });
    assert.equal((await (await getReplyTemplate(request(), second.id)).json()).template.isActive, false);
    assert.deepEqual((await (await listReplyTemplates(request("?activeOnly=true&includeBody=true"))).json()).templates.map((item: { id: string }) => item.id), [first.id]);
  } finally { await fixture.close(); }
});
