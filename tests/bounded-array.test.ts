import assert from "node:assert/strict";
import { test } from "node:test";
import { systemSettingsSchema } from "../lib/system-settings";
import { reservationExportSchema } from "../lib/reservation-export-validation";
import { reservationStatuses } from "../lib/domain";

test("API collection limits reject oversized inputs before visiting any elements", () => {
  const query = { search: "", dateFrom: "", dateTo: "", statuses: reservationStatuses, filter: "すべて", sortKey: "id", direction: "asc" };
  const block = { start: "2099-11-15T12:00", end: "2099-11-15T13:00", reason: "検証" };
  assert.ok(systemSettingsSchema.safeParse({ acceptanceCapacity: null, blockedPeriods: Array(200).fill(block) }).success);
  assert.ok(reservationExportSchema.safeParse(query).success);
  for (const [maximum, parse] of [
    [200, (values: unknown[]) => systemSettingsSchema.safeParse({ acceptanceCapacity: null, blockedPeriods: values })],
    [reservationStatuses.length, (values: unknown[]) => reservationExportSchema.safeParse({ ...query, statuses: values })],
  ] as const) {
    const values = Array(maximum + 1).fill(null);
    let visited = 0;
    Object.defineProperty(values, 0, { get: () => { visited++; return null; } });
    const result = parse(values);
    assert.equal(result.success, false);
    assert.equal(visited, 0, "reject excessive collections before accumulating per-element validation errors");
    if (!result.success) assert.equal(result.error.issues.length, 1);
  }
});
