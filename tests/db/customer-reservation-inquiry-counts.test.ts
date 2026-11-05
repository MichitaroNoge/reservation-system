import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import { createCalendarFixture } from "./calendar-fixture";
import { getDatabase } from "../../lib/db/client";
import { InquiryRepository } from "../../lib/inquiries/repository";
import { GET } from "../../app/api/accounts/me/reservations/route";

const request = (token = "calendar-test-member") => new Request("http://localhost/api/accounts/me/reservations", { headers: token ? { authorization: `Bearer ${token}` } : {} });
test("reservation history availability is counted in bulk with the same owner visibility as history", async () => {
  const fixture = await createCalendarFixture();
  try {
    await fixture.repo.createAccount({ firebaseUid: "calendar-test-user", name: "本人", contact: "owner@example.test", phone: "09000000000" });
    await fixture.repo.createAccount({ firebaseUid: "foreign-user", name: "別人", contact: "other@example.test", phone: "09000000000" });
    const base = { name: "架空の予約", email: "owner@example.test", phone: "09000000000", date: "2099-11-15", startTime: "12:00", people: 10, menuItems: ["検証メニュー"], status: "confirmed" as const };
    const own = await fixture.repo.createReservation({ ...base, accountFirebaseUid: "calendar-test-user" });
    const empty = await fixture.repo.createReservation({ ...base, accountFirebaseUid: "calendar-test-user" });
    const foreign = await fixture.repo.createReservation({ ...base, accountFirebaseUid: "foreign-user" });
    const repository = new InquiryRepository(await getDatabase());
    const ownRow = await repository.ownedReservation(own.id, "calendar-test-user"), foreignRow = await repository.ownedReservation(foreign.id, "foreign-user");
    const create = (uid: string | null, reservationId: string | null) => repository.create({ name: "検証者", email: "inquiry@example.test", category: "reservation", subject: "履歴の有無", body: "検証本文", requestKey: randomUUID() }, "fixture", uid, reservationId, []);
    await create("calendar-test-user", ownRow.id);
    await create("foreign-user", ownRow.id);
    await create(null, ownRow.id);
    await create("calendar-test-user", foreignRow.id);
    await create("calendar-test-user", null);
    assert.deepEqual(await repository.reservationInquiryCounts("calendar-test-user", [own.id, empty.id, foreign.id]), { [own.id]: 1, [empty.id]: 0, [foreign.id]: 0 });
    assert.deepEqual(await repository.reservationInquiryCounts("calendar-test-user", []), {});
    const response = await GET(request());
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.inquiryCounts, { [own.id]: 1, [empty.id]: 0 });
    assert.equal(result.reservations.length, 2);
    for (const token of ["", "invalid"]) assert.equal((await GET(request(token))).status, 401);
    const failure = mock.method(InquiryRepository.prototype, "reservationInquiryCounts", async () => { throw new Error("synthetic count failure"); });
    try {
      const fallback = await GET(request()); assert.equal(fallback.status, 200);
      const data = await fallback.json(); assert.equal(data.inquiryCounts, null); assert.equal(data.reservations.length, 2);
    } finally { failure.mock.restore(); }
  } finally { await fixture.close(); }
});
