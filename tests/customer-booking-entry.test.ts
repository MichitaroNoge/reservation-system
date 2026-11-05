import assert from "node:assert/strict";
import { test } from "node:test";
import { applyAccountToReservationForm } from "../app/reservations/customer-form";
import type { BookingForm } from "../app/reservations/types";

const draft: BookingForm = {
  name: "", email: "", phone: "", address: "", date: "2026-12-15", startTime: "12:00", people: 15,
  bookingType: "individual", accountType: "individual", status: "temporary_requested", menuItems: ["ランチ"],
};

test("login after booking selection preserves the reservation even when the account has another default category", () => {
  const result = applyAccountToReservationForm(draft, {
    name: "旅行社", companyBranchName: "旅行社 本店", accountType: "travel_agency", contactPersonName: "担当者",
    contact: "account@example.test", phone: "0300000000", address: "検証住所",
  }, { preserveBookingType: true });
  for (const key of ["date", "startTime", "people", "menuItems", "status", "bookingType", "accountType"] as const) {
    assert.deepEqual(result[key], draft[key]);
  }
  assert.equal(result.email, "account@example.test");
  assert.equal(result.phone, "0300000000");
  assert.equal(result.address, "検証住所");
});

test("group booking selection and counts survive login with an individual account", () => {
  const result = applyAccountToReservationForm({ ...draft, bookingType: "travel_agency_group", tcCount: 2, dgCount: 1 }, {
    name: "予約者", contact: "individual@example.test", accountType: "individual",
  }, { preserveBookingType: true });
  assert.equal(result.bookingType, "travel_agency_group");
  assert.equal(result.accountType, "travel_agency");
  assert.equal(result.tcCount, 2);
  assert.equal(result.dgCount, 1);
  assert.equal(result.companyBranchName, "");
});

test("opening a fresh form still uses the account category default", () => {
  const result = applyAccountToReservationForm(draft, { name: "旅行社", accountType: "travel_agency", contact: "agency@example.test" });
  assert.equal(result.bookingType, "travel_agency_group");
});
