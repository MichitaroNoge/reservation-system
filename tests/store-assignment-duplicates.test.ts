import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiValidationError, validateStoreAssignments } from "../lib/api-validation";

test("store assignments reject duplicate stores even with surrounding whitespace", () => {
  for (const store of ["新宿店", " 新宿店 "]) {
    assert.throws(() => validateStoreAssignments({ assignments: [{ store: "新宿店", people: 6 }, { store, people: 6 }] }, 12), error => error instanceof ApiValidationError && /同じ店舗/.test(error.message));
  }
  assert.deepEqual(validateStoreAssignments({ assignments: [{ store: "新宿店", people: 6 }, { store: "渋谷店", people: 6 }] }, 12), [{ store: "新宿店", people: 6 }, { store: "渋谷店", people: 6 }]);
  assert.deepEqual(validateStoreAssignments({ assignments: [] }, 12), []);
  assert.deepEqual(validateStoreAssignments({ store: "新宿店" }, 12), [{ store: "新宿店", people: 12 }]);
});
