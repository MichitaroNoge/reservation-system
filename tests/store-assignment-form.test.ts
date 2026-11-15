import assert from "node:assert/strict";
import { test } from "node:test";
import { storeAssignmentFormSchema, storeAssignmentRows } from "../lib/store-assignment-form";
import { validateStoreAssignments } from "../lib/api-validation";

const stores = [{ name: "店舗C", displayOrder: 3 }, { name: "店舗A", displayOrder: 1 }, { name: "店舗B", displayOrder: 2 }];

test("all active stores start at zero in display order and existing assignments are retained", () => {
  assert.deepEqual(storeAssignmentRows(stores, []), [
    { store: "店舗A", people: 0 }, { store: "店舗B", people: 0 }, { store: "店舗C", people: 0 },
  ]);
  const saved = [{ store: "店舗B", people: 10 }, { store: "停止店舗", people: 5 }];
  assert.deepEqual(storeAssignmentRows(stores, saved), [
    { store: "店舗A", people: 0 }, ...saved.slice(0, 1), { store: "店舗C", people: 0 }, ...saved.slice(1),
  ]);
  assert.deepEqual(storeAssignmentRows(stores, [{ store: "店舗A", people: 10 }, { store: "店舗A", people: 5 }]), [
    { store: "店舗A", people: 15 }, { store: "店舗B", people: 0 }, { store: "店舗C", people: 0 },
  ]);
});

test("unused and blank-as-zero rows are omitted from the existing API payload", () => {
  const schema = storeAssignmentFormSchema(stores, [], 15);
  const parsed = schema.parse({ assignments: [{ store: "店舗A", people: 10 }, { store: "店舗B", people: 0 }, { store: "店舗C", people: 5 }] });
  assert.deepEqual(parsed.assignments, [{ store: "店舗A", people: 10 }, { store: "店舗C", people: 5 }]);
  assert.deepEqual(validateStoreAssignments(parsed, 15), parsed.assignments);
  for (const assignments of [storeAssignmentRows(stores, []), [{ store: "店舗A", people: 14 }], [{ store: "店舗A", people: 16 }], [{ store: "店舗A", people: 14.5 }], [{ store: "店舗A", people: -1 }], [{ store: "店舗A", people: NaN }]]) assert.equal(schema.safeParse({ assignments }).success, false);
});

test("unassignment is allowed only in the existing editor and inactive stores cannot be newly assigned", () => {
  const assignments = storeAssignmentRows(stores, []);
  assert.deepEqual(storeAssignmentFormSchema(stores, [], 15, true).parse({ assignments }), { assignments: [] });
  assert.equal(storeAssignmentFormSchema(stores, [], 15).safeParse({ assignments }).success, false);
  const inactive = { store: "停止店舗", people: 15 };
  assert.equal(storeAssignmentFormSchema(stores, [], 15).safeParse({ assignments: [inactive] }).success, false);
  assert.deepEqual(storeAssignmentFormSchema(stores, [inactive], 15).parse({ assignments: [inactive] }), { assignments: [inactive] });
  assert.equal(storeAssignmentFormSchema(stores, [], 15).safeParse({ assignments: [{ store: "店舗A", people: 10 }, { store: "店舗A", people: 5 }] }).success, false);
});

test("catalog refresh preserves draft amounts, adds new stores and keeps removed input visible for correction", () => {
  const draft = [{ store: "店舗A", people: 8 }, { store: "店舗B", people: 7 }];
  const next = storeAssignmentRows([stores[0], stores[1]], [], draft);
  assert.deepEqual(next, [{ store: "店舗A", people: 8 }, { store: "店舗C", people: 0 }, { store: "店舗B", people: 7 }]);
  assert.deepEqual(draft, [{ store: "店舗A", people: 8 }, { store: "店舗B", people: 7 }]);
  assert.equal(storeAssignmentFormSchema([stores[0], stores[1]], [], 15).safeParse({ assignments: next }).success, false);
});
