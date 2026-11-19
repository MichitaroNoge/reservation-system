import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../../app/api/reservations/route";
import { cancellationPolicyVersion } from "../../lib/cancellation-policy-consent";
import { createCalendarFixture } from "./calendar-fixture";

const booking = {
  name: "時刻検証", email: "time@example.test", phone: "09000000000",
  date: "2099-11-15", people: 1, menuItems: ["検証メニュー"],
};

function request(body: object, token = "calendar-test-member") {
  return new Request("http://localhost/api/reservations", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("customer reservation API rejects non-quarter-hour starts before saving and accepts each quarter", async () => {
  const fixture = await createCalendarFixture();
  try {
    await fixture.repo.createAccount({ firebaseUid: "calendar-test-user", name: booking.name, contact: booking.email, phone: booking.phone });
    for (const status of ["temporary_requested", "confirmed_requested"]) {
      for (const startTime of ["00:01", "12:14", "19:16", "23:59"]) {
        const response = await POST(request({ ...booking, status, startTime }));
        assert.equal(response.status, 400);
        assert.match((await response.json()).fields.startTime[0], /15分単位/);
      }
    }
    const adminCustomer = await POST(request({ ...booking, status: "temporary_requested", customerAccountMode: "account", startTime: "19:01" }, "calendar-test-admin"));
    assert.equal(adminCustomer.status, 400);
    assert.equal((await fixture.repo.listReservations()).length, 0);
    for (const status of ["temporary_requested", "confirmed_requested"]) {
      for (const minute of ["00", "15", "30", "45"]) {
        const startTime = `19:${minute}`;
        const response = await POST(request({ ...booking, status, startTime, cancellationPolicyAgreement: { accepted: true, version: cancellationPolicyVersion } }));
        assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
        assert.equal((await response.json()).reservation.startTime, startTime);
      }
    }
  } finally { await fixture.close(); }
});

test("admin direct registration still accepts minute precision and calculated end times", async () => {
  const fixture = await createCalendarFixture();
  try {
    const response = await POST(request({ ...booking, status: "confirmed", startTime: "19:07", endTime: "20:47" }, "calendar-test-admin"));
    assert.equal(response.status, 201);
    const saved = (await response.json()).reservation;
    assert.equal(saved.startTime, "19:07");
    assert.equal(saved.endTime, "20:47");
  } finally { await fixture.close(); }
});
