import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { FormField } from "../components/ui/form-field";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

test("select controls associate the visible label, required state and field error", () => {
  const markup = renderToStaticMarkup(createElement(FormField,
    { label: "変更先ステータス", required: true, error: "変更先を選んでください。" } as Parameters<typeof FormField>[0],
    createElement(Select, { defaultValue: "", "aria-describedby": "status-help" }, createElement("option", { value: "" }, "選択してください"))));
  const labelId = markup.match(/<label[^>]*for="([^"]+)"/)?.[1];
  const select = markup.match(/<select[^>]*>/)?.[0] ?? "";
  assert.ok(labelId);
  assert.ok(select.includes(`id="${labelId}"`));
  assert.match(select, /aria-required="true"/);
  assert.match(select, /aria-invalid="true"/);
  const errorId = markup.match(/<p[^>]*id="([^"]+)"[^>]*role="alert"/)?.[1];
  assert.ok(errorId);
  assert.ok(select.includes(`aria-describedby="status-help ${errorId}"`));
});

test("textarea associates required and field error while preserving existing descriptions and input constraints", () => {
  const markup = renderToStaticMarkup(createElement(FormField,
    { label: "回答本文", required: true, error: "本文を入力してください。" } as Parameters<typeof FormField>[0],
    createElement(Textarea, { name: "body", maxLength: 10000, disabled: true, defaultValue: "保持した下書き", "aria-describedby": "reply-help" })));
  const labelId = markup.match(/<label[^>]*for="([^"]+)"/)?.[1];
  const control = markup.match(/<textarea[^>]*>/)?.[0] ?? "";
  const errorId = markup.match(/<p[^>]*id="([^"]+)"[^>]*role="alert"/)?.[1];
  assert.ok(labelId && errorId);
  assert.ok(control.includes(`id="${labelId}"`));
  assert.ok(control.includes(`aria-describedby="reply-help ${errorId}"`));
  assert.match(control, /aria-required="true"/);
  assert.match(control, /aria-invalid="true"/);
  assert.match(control, /maxLength="10000"/);
  assert.match(control, /disabled=""/);
  assert.match(markup, />保持した下書き<\/textarea>/);
});

test("textarea keeps explicit control associations when used in existing forms", () => {
  const markup = renderToStaticMarkup(createElement(Textarea, { id: "reply-body", "aria-invalid": true, "aria-describedby": "reply-body-error", "aria-required": true, readOnly: true }));
  assert.match(markup, /id="reply-body"/);
  assert.match(markup, /aria-describedby="reply-body-error"/);
  assert.match(markup, /aria-invalid="true"/);
  assert.match(markup, /aria-required="true"/);
  assert.match(markup, /readOnly=""/);
});
