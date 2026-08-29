import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileReservationRepository } from "../lib/repositories/file-reservation-repository";

async function withRepository(run: (repository: FileReservationRepository) => Promise<void>) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "reservation-account-test-"));
  try {
    await run(new FileReservationRepository(path.join(directory, "db.json")));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
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
  });
});
