import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCustomerListPosition } from "../lib/customer-list-position";

test("customer list return positions tolerate corrupt storage without inventing invalid pages", () => {
  assert.deepEqual(parseCustomerListPosition('{"page":3,"scroll":640}'), { page: 3, scroll: 640 });
  for (const value of [null, "", "not json", "null", "{}", "[]", '{"page":"2","scroll":"200"}', '{"page":0,"scroll":-2}', '{"page":1.5,"scroll":1e100}']) {
    assert.deepEqual(parseCustomerListPosition(value), { page: 1, scroll: 0 });
  }
  assert.deepEqual(parseCustomerListPosition('{"page":2,"scroll":-1}'), { page: 2, scroll: 0 });
});
