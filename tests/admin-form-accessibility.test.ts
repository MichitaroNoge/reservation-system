import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { FormField } from "../components/ui/form-field";
import { Select } from "../components/ui/select";

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
