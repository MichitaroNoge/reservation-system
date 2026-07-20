import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { FileReservationRepository } from "../lib/repositories/file-reservation-repository";
import { reservationStatusCodes } from "../lib/domain";
import type { Menu, Reservation, Store } from "../lib/domain";

const menus: Menu[] = [
  { name: "季節のコース", description: "コース", price: 6600, duration: "90分" },
  { name: "記念日プレート", description: "デザート", price: 2400, duration: "10分" },
  { name: "来店後に注文", description: "当日注文", price: 0, duration: "来店後" },
];

const stores: Store[] = [
  { name: "渋谷店", area: "東京都渋谷区", today: 0, month: 0, state: "営業中" },
  { name: "新宿店", area: "東京都新宿区", today: 0, month: 0, state: "営業中" },
];

const baseReservations: Reservation[] = [
  {
    id: "RSV-1047",
    customer: "佐藤 健太",
    email: "kenta@example.jp",
    date: "2026-07-23",
    startTime: "10:00",
    people: 3,
    menuItems: ["季節のコース", "記念日プレート"],
    totalAmount: 9000,
    store: null,
    storeAssignments: [],
    status: reservationStatusCodes.confirmed,
    confirmationContactedAt: null,
    received: "7月7日 18:10",
    phone: "080-2345-6789",
  },
  {
    id: "RSV-1048",
    customer: "山田 美咲",
    email: "misaki@example.jp",
    date: "2026-07-24",
    startTime: "12:00",
    people: 1,
    menuItems: ["来店後に注文"],
    totalAmount: 0,
    store: null,
    storeAssignments: [],
    status: reservationStatusCodes.confirmed,
    confirmationContactedAt: null,
    received: "7月8日 09:42",
    phone: "090-1234-5678",
  },
];

test("important reservation workflows", async (t) => {
  const { repository, cleanup } = await createRepository();
  t.after(cleanup);

  await t.test("creates a reservation with generated id, default time, status, and menu total", async () => {
    const reservation = await repository.createReservation({
      date: "2026-08-01",
      people: 2,
      name: "伊藤 結衣",
      email: "yui@example.jp",
      phone: "080-1111-2222",
      menuItems: ["季節のコース", "記念日プレート"],
      status: reservationStatusCodes.confirmedRequested,
    });

    assert.equal(reservation.id, "RSV-1049");
    assert.equal(reservation.startTime, "10:00");
    assert.equal(reservation.status, reservationStatusCodes.confirmedRequested);
    assert.equal(reservation.totalAmount, 9000);
    assert.equal(reservation.store, null);
  });

  await t.test("updates reservation status with stable status code", async () => {
    const reservation = await repository.updateReservationStatus("RSV-1047", reservationStatusCodes.waitingForVisit);

    assert.equal(reservation.status, reservationStatusCodes.waitingForVisit);
  });

  await t.test("assigns people across stores and rejects mismatched totals", async () => {
    const reservation = await repository.assignStores("RSV-1047", [
      { store: "渋谷店", people: 2 },
      { store: "新宿店", people: 1 },
    ]);

    assert.equal(reservation.store, "複数店舗");
    assert.deepEqual(reservation.storeAssignments, [
      { store: "渋谷店", people: 2 },
      { store: "新宿店", people: 1 },
    ]);
    await assert.rejects(
      () => repository.assignStores("RSV-1047", [{ store: "渋谷店", people: 2 }]),
      /Assigned people must equal reservation people: 3/,
    );
  });

  await t.test("bulk marks confirmation contacts", async () => {
    const contactedAt = "2026-07-20T10:00:00.000Z";
    const updated = await Promise.all(
      ["RSV-1047", "RSV-1048"].map((id) => repository.updateConfirmationContact(id, contactedAt)),
    );

    assert.deepEqual(updated.map((reservation) => reservation.confirmationContactedAt), [contactedAt, contactedAt]);
  });

  await t.test("deleting a menu removes it from reservations and recalculates totals", async () => {
    await repository.deleteMenu("記念日プレート");
    const reservations = await repository.listReservations();
    const target = reservations.find((reservation) => reservation.id === "RSV-1047");

    assert.ok(target);
    assert.deepEqual(target.menuItems, ["季節のコース"]);
    assert.equal(target.totalAmount, 6600);
  });
});

async function createRepository() {
  const directory = await mkdtemp(path.join(tmpdir(), "reservation-system-test-"));
  const databasePath = path.join(directory, "reservation-db.json");
  await writeFile(databasePath, JSON.stringify({ reservations: baseReservations, menus, stores }, null, 2), "utf8");
  return {
    repository: new FileReservationRepository(databasePath),
    readDatabase: async () => JSON.parse(await readFile(databasePath, "utf8")) as { reservations: Reservation[]; menus: Menu[]; stores: Store[] },
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}
