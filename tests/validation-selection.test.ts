import assert from "node:assert/strict";
import test from "node:test";
import { selectedTestFiles, testFiles } from "../scripts/test-files";
test("scoped validation runs only discovered sources and rejects arbitrary paths, flags and fixtures", () => {
  const found = testFiles("tests/db").find(file => file.endsWith("reservation-history.test.ts"))!;
  assert.deepEqual(selectedTestFiles("tests/db", [found, found]), [found]);
  assert.deepEqual(selectedTestFiles("tests/db", []), testFiles("tests/db"));
  for (const value of ["tests/db/calendar-fixture.ts", "../app/api/reservations/route.ts", "--import=unsafe", "tests/admin-interactions.test.ts"]) assert.throws(() => selectedTestFiles("tests/db", [value]));
});
