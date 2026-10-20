import assert from "node:assert/strict";
import { test } from "node:test";
import { createCalendarFixture } from "./calendar-fixture";

test("assignment API rejects duplicate stores without overwriting the previous split", async () => {
  const fixture = await createCalendarFixture();
  try {
    await fixture.repo.createStore({ name: "別の店舗", displayOrder: 2 });
    const reservation = await fixture.repo.createReservation({ name: "割当検証", email: "test@example.test", phone: "09000000000", date: "2030-11-15", startTime: "12:00", people: 12, menuItems: ["検証メニュー"], status: "confirmed" });
    const { PATCH } = await import("../../app/api/reservations/[id]/store/route");
    const context = { params: Promise.resolve({ id: reservation.id }) };
    const assign = (assignments: { store: string; people: number }[]) => PATCH(new Request(`http://localhost/api/reservations/${reservation.id}/store`, { method: "PATCH", headers: { authorization: "Bearer calendar-test-admin", "content-type": "application/json" }, body: JSON.stringify({ assignments }) }), context);
    const split = [{ store: "検証店舗", people: 6 }, { store: "別の店舗", people: 6 }];
    assert.equal((await assign(split)).status, 200);
    const duplicate = await assign([{ store: "検証店舗", people: 6 }, { store: "検証店舗", people: 6 }]);
    assert.equal(duplicate.status, 400);
    assert.match((await duplicate.json()).error, /同じ店舗/);
    const saved = (await fixture.repo.listReservations()).find(row => row.id === reservation.id)!;
    assert.deepEqual(saved.storeAssignments?.sort((a,b)=>a.store.localeCompare(b.store)), split.sort((a,b)=>a.store.localeCompare(b.store)));
    assert.equal((await assign([{ store: "検証店舗", people: 12 }])).status, 200);
  } finally { await fixture.close(); }
});
