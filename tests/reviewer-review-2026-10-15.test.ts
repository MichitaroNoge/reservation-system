import assert from "node:assert/strict";
import { test } from "node:test";
import { applyAccountToReservationForm } from "../app/reservations/customer-form";
import { ReservationSubmission } from "../app/reservations/reservation-submission";
import { validateUpdateReservationInput } from "../lib/api-validation";
import { InMemoryReservationRepository } from "../lib/repositories/in-memory-reservation-repository";
import { saveAuthenticatedAccountProfile, updateAuthenticatedAccountProfile } from "../lib/services/account-profile-service";

test("an account with empty optional fields never inherits the previous customer's contact data", () => {
  const current = { menuItems: [], date: "2026-11-15", startTime: "13:00", people: 5, name: "旧会員", email: "old@example.test", phone: "09000000000", address: "旧住所", bookingContactName: "旧担当者" };
  const individual = applyAccountToReservationForm(current, { name: "新会員", contact: "new@example.test" });
  assert.equal(individual.phone, ""); assert.equal(individual.address, ""); assert.equal(individual.bookingContactName, "");
  assert.equal(individual.email, "new@example.test"); assert.equal(individual.bookingType, "individual");
  const agency = applyAccountToReservationForm(current, { name: "新旅行社", contact: "agency@example.test", accountType: "travel_agency" });
  assert.equal(agency.bookingType, "travel_agency_group"); assert.equal(agency.bookingContactName, "");
  assert.equal(agency.date, current.date);
});

test("reservation PATCH distinguishes explicit clearing from omitted fields", async () => {
  const repository = new InMemoryReservationRepository();
  const reservation = await repository.createReservation({ name: "予約者", email: "customer@example.test", phone: "09000000000", date: "2026-11-15", people: 5, address: "旧住所", groupNameKana: "カナ", dayContactPhone: "09000000000" });
  const input = validateUpdateReservationInput({ address: " ", groupNameKana: "", dayContactPhone: "" });
  const saved = await repository.updateReservation(reservation.id, input);
  assert.equal(saved.address, ""); assert.equal(saved.groupNameKana, ""); assert.equal(saved.dayContactPhone, "");
  assert.equal(saved.phone, "09000000000");
});

test("registration and profile editing enforce the same travel agency required fields", async () => {
  const repository = new InMemoryReservationRepository();
  const user = { uid: "agency", email: "agency@example.test" };
  const body = { name: "旅行社", phone: "09000000000", accountType: "travel_agency", companyBranchName: "旅行社" };
  await assert.rejects(saveAuthenticatedAccountProfile(repository, user, body), /担当者/);
  const saved = await saveAuthenticatedAccountProfile(repository, user, { ...body, contactPersonName: "担当者" });
  assert.equal(saved.account.name, "旅行社");
  await assert.rejects(updateAuthenticatedAccountProfile(repository, user.uid, body), /担当者/);
  const individual = await updateAuthenticatedAccountProfile(repository, user.uid, { name: "個人", phone: "09000000000", accountType: "individual", companyBranchName: "古い会社", contactPersonName: "古い担当者", contact: "untrusted@example.test" });
  assert.equal(individual.companyBranchName, undefined); assert.equal(individual.contactPersonName, undefined);
  assert.equal(individual.contact, user.email);
});

test("a lost response reuses its submission key; edited and completed bookings receive new keys", () => {
  const submission = new ReservationSubmission();
  const first = submission.begin("payload-1");
  assert.equal(submission.begin("payload-1"), first);
  const edited = submission.begin("payload-2");
  assert.notEqual(edited, first);
  submission.complete(first); // A slow older response must not clear the newer request.
  assert.equal(submission.begin("payload-2"), edited);
  submission.complete(edited);
  assert.notEqual(submission.begin("payload-2"), edited);
});
