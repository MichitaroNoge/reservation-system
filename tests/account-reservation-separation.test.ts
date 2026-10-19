import test from "node:test";
import assert from "node:assert/strict";
import { deliveryRecipients, reservationNotificationRecipients } from "../lib/email/reservation-recipients";
import { InMemoryReservationRepository } from "../lib/repositories/in-memory-reservation-repository";

async function withRepository(run: (repository: InMemoryReservationRepository) => Promise<void>) {
  await run(new InMemoryReservationRepository());
}

const baseReservation = {
  date: "2026-09-01",
  startTime: "12:00",
  people: 10,
  name: "ABCツーリスト広島支店",
  email: "shared@example.com",
  phone: "090-0000-0000",
  bookingType: "travel_agency_group" as const,
  accountType: "travel_agency" as const,
  companyBranchName: "ABCツーリスト広島支店",
  contactPersonName: "田中",
  menuItems: [],
};

test("admin reservation is not linked to an Account even when contact data matches", async () => {
  await withRepository(async (repository) => {
    const account = await repository.createAccount({
      firebaseUid: "uid-1",
      name: "ABCツーリスト広島支店",
      contact: "shared@example.com",
      phone: "090-0000-0000",
      accountType: "travel_agency",
    });

    const reservation = await repository.createReservation({ ...baseReservation, customerAccountMode: "admin" });
    assert.equal(reservation.accountId, null);
    assert.deepEqual(await repository.listReservationsForReservationAccount("uid-1"), []);
    assert.ok(account.id);
  });
});

test("only an authenticated customer-created reservation is linked to its Account", async () => {
  await withRepository(async (repository) => {
    const account = await repository.createAccount({
      firebaseUid: "uid-2",
      name: "予約者本人",
      contact: "person@example.com",
      phone: "090-1111-1111",
      accountType: "individual",
    });

    const adminReservation = await repository.createReservation({
      ...baseReservation,
      name: "予約者本人",
      email: "person@example.com",
      phone: "090-1111-1111",
      bookingType: "individual",
      accountType: "individual",
      customerAccountMode: "admin",
    });
    const accountReservation = await repository.createReservation({
      ...baseReservation,
      name: "予約者本人",
      email: "person@example.com",
      phone: "090-1111-1111",
      bookingType: "individual",
      accountType: "individual",
      customerAccountMode: "account",
      accountFirebaseUid: "uid-2",
    });

    assert.equal(adminReservation.accountId, null);
    assert.equal(accountReservation.accountId, account.id);
    const ownReservations = await repository.listReservationsForReservationAccount("uid-2");
    assert.deepEqual(ownReservations.map((item) => item.id), [accountReservation.id]);
  });
});

test("updating Account profile does not rewrite reservation snapshot", async () => {
  await withRepository(async (repository) => {
    const account = await repository.createAccount({
      firebaseUid: "uid-3",
      name: "変更前氏名",
      contact: "before@example.com",
      phone: "090-2222-2222",
      accountType: "individual",
    });
    const reservation = await repository.createReservation({
      ...baseReservation,
      name: "変更前氏名",
      email: "before@example.com",
      phone: "090-2222-2222",
      bookingType: "individual",
      accountType: "individual",
      customerAccountMode: "account",
      accountFirebaseUid: "uid-3",
    });

    await repository.updateAccount(account.id!, {
      id: account.id,
      name: "変更後氏名",
      contact: "after@example.com",
      phone: "090-3333-3333",
      accountType: "individual",
    });

    const stored = (await repository.listReservations()).find((item) => item.id === reservation.id)!;
    assert.equal(stored.customer, "変更前氏名");
    assert.equal(stored.email, "before@example.com");
    assert.equal(stored.phone, "090-2222-2222");
    assert.deepEqual((await repository.listReservationsForReservationAccount("uid-3")).map((item) => item.id), [reservation.id]);
    assert.equal((await repository.findAccountByFirebaseUid("uid-3"))?.contact, "after@example.com");
  });
});

test("reservation notices include only verified additional contact emails", async () => {
  await withRepository(async (repository) => {
    const account = await repository.createAccount({
      firebaseUid: "uid-4",
      name: "予約者本人",
      contact: "primary@example.com",
      phone: "090-4444-4444",
      accountType: "individual",
    });
    const reservation = await repository.createReservation({
      ...baseReservation,
      name: "予約者本人",
      email: "primary@example.com",
      phone: "090-4444-4444",
      bookingType: "individual",
      accountType: "individual",
      customerAccountMode: "account",
      accountFirebaseUid: "uid-4",
    });
    const verified = await repository.createAccountContactEmail({
      accountId: account.id!,
      email: "verified@example.com",
      verificationTokenHash: "verified-token",
      verificationExpiresAt: "2026-10-01T00:00:00.000Z",
    });
    await repository.verifyAccountContactEmail(verified.id, "2026-09-30T00:00:00.000Z");
    await repository.createAccountContactEmail({
      accountId: account.id!,
      email: "pending@example.com",
      verificationTokenHash: "pending-token",
      verificationExpiresAt: "2026-10-01T00:00:00.000Z",
    });

    assert.deepEqual(await reservationNotificationRecipients(repository, reservation), [
      "primary@example.com",
      "verified@example.com",
    ]);
    assert.deepEqual(deliveryRecipients("primary@example.com,verified@example.com"), {
      to: "primary@example.com",
      bcc: ["verified@example.com"],
    });
  });
});
