import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { StoreAssignmentOptions } from "../app/reservations/components/store-assignment-options";

const stores = [{ name: "店舗A", displayOrder: 1 }, { name: "店舗B", displayOrder: 2 }];
function options(assignments: { store: string; people: number }[], index: number) {
  const markup = renderToStaticMarkup(createElement("select", { value: assignments[index]?.store ?? "", onChange: () => {} }, createElement(StoreAssignmentOptions, { stores, assignments, index })));
  return [...markup.matchAll(/<option([^>]*)>(.*?)<\/option>/g)].map(([, attributes, label]) => ({
    value: attributes.match(/value="([^"]*)"/)?.[1], label,
    selected: /\bselected=/.test(attributes), disabled: /\bdisabled=/.test(attributes),
  }));
}

test("an assigned store absent from the active catalog remains visibly selected", () => {
  const rendered = options([{ store: "停止店舗", people: 5 }], 0);
  const current = rendered.find(option => option.value === "停止店舗");
  assert.ok(current, "the native select must contain its saved value instead of showing the placeholder");
  assert.equal(current.selected, true);
  assert.match(current.label, /停止店舗/);
  assert.deepEqual(rendered.filter(option => option.selected).map(option => option.value), ["停止店舗"]);
});

test("retained selections do not offer inactive stores to another row or remove duplicate prevention", () => {
  const assignments = [{ store: "停止店舗", people: 1 }, { store: "店舗A", people: 2 }, { store: "店舗B", people: 2 }];
  const rendered = options(assignments, 2);
  assert.equal(rendered.some(option => option.value === "停止店舗"), false);
  assert.equal(rendered.find(option => option.value === "店舗A")?.disabled, true);
  assert.equal(rendered.find(option => option.value === "店舗B")?.disabled, false);
  assert.equal(rendered.find(option => option.value === "店舗B")?.selected, true);
});
