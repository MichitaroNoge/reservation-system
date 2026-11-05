import assert from "node:assert/strict";
import { test } from "node:test";
import { createReplyTemplateSchema, updateReplyTemplateSchema, replyTemplateFields } from "../lib/inquiries/reply-template-types";
import { insertReplyTemplateText } from "../lib/inquiries/reply-template-insertion";
const fields = { name: "空席あり", body: "お問い合わせありがとうございます。\n\nご希望の日時でご案内できます。", isActive: true };
test("reply snippets preserve surrounding text and place the caret after the insertion", () => {
  assert.deepEqual(insertReplyTemplateText("", "ご案内します。"), { body: "ご案内します。", caret: 7 });
  const body = "お客様へ\n\nよろしくお願いします。";
  const result = insertReplyTemplateText(body, "空きがございます。\n", 5);
  assert.equal(result.body, body.slice(0, 5) + "空きがございます。\n" + body.slice(5));
  assert.equal(result.body.slice(result.caret), body.slice(5));
  const repeated = insertReplyTemplateText(result.body, "続けてご案内します。", result.caret);
  assert.equal(repeated.body, body.slice(0, 5) + "空きがございます。\n続けてご案内します。" + body.slice(5));
  assert.equal(insertReplyTemplateText("入力済み", "追記").body, "入力済み追記");
  assert.equal(insertReplyTemplateText("入力済み", "冒頭", 0).body, "冒頭入力済み");
  assert.equal(insertReplyTemplateText("😀\n末尾", "定型文", 3).body, "😀\n定型文末尾");
});
test("reply snippet length checks reject overflow without truncating either text", () => {
  const body = "あ".repeat(9998);
  assert.equal(insertReplyTemplateText(body, "追記", 400).body.length, 10000);
  assert.throws(() => insertReplyTemplateText(body, "長い追記", 400), /10,000文字を超えます/);
  assert.equal(body.length, 9998);
  assert.equal(insertReplyTemplateText("本文", "文", -1).body, "文本文");
  assert.equal(insertReplyTemplateText("本文", "文", 99).body, "本文文");
});
test("reply templates validate plain text, length and explicit active state", () => {
  assert.deepEqual(replyTemplateFields.parse({ ...fields, name: " 空席あり " }), fields);
  for (const patch of [{ name: " " }, { name: "a".repeat(101) }, { name: "改行\nあり" }, { body: " " }, { body: "x".repeat(10001) }, { body: "null\u0000" }, { isActive: "true" }, { subject: "不要" }]) assert.equal(replyTemplateFields.safeParse({ ...fields, ...patch }).success, false);
  const literal = "<script>alert(1)</script>\n{{customerName}} 様";
  assert.equal(replyTemplateFields.parse({ ...fields, body: literal }).body, literal);
});
test("template creates use a stable UUID and updates require a revision", () => {
  const id = "c8aeb038-299f-49a2-8f91-f4289597d180";
  assert.equal(createReplyTemplateSchema.parse({ ...fields, id }).id, id);
  assert.equal(createReplyTemplateSchema.safeParse(fields).success, false);
  assert.equal(createReplyTemplateSchema.safeParse({ ...fields, id: "bad" }).success, false);
  assert.equal(updateReplyTemplateSchema.parse({ ...fields, revision: 1 }).revision, 1);
  for (const revision of [undefined, 0, -1, 1.5, "1"]) assert.equal(updateReplyTemplateSchema.safeParse({ ...fields, revision }).success, false);
});
