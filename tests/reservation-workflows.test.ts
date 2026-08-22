import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { canTransitionReservationStatus, reservationStatusCodes } from "../lib/domain";
import { FileReservationRepository } from "../lib/repositories/file-reservation-repository";
import type { Menu, Reservation, Store } from "../lib/domain";

const menus: Menu[] = [
  { name: "季節のコース", description: "コース", price: 6600, duration: "90分", displayOrder: 10 },
  { name: "100分コース", description: "長時間コース", price: 8800, duration: "100分", displayOrder: 15 },
  { name: "記念日プレート", description: "デザート", price: 2400, duration: "10分", displayOrder: 20 },
  { name: "来店後に注文", description: "当日注文", price: 0, duration: "来店後", displayOrder: 999 },
];

const stores: Store[] = [
  { name: "渋谷店", displayOrder: 10 },
  { name: "新宿店", displayOrder: 20 },
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
  {
    id: "RSV-1049",
    customer: "鈴木 由佳",
    email: "yuka@example.jp",
    date: "2026-07-30",
    startTime: "18:00",
    people: 2,
    menuItems: ["季節のコース"],
    totalAmount: 6600,
    store: null,
    storeAssignments: [],
    status: reservationStatusCodes.temporaryConfirmed,
    policyAgreement: { kind: "temporary", acceptedAt: "2026-07-01T00:00:00.000Z" },
    confirmationContactedAt: null,
    received: "7月9日 12:00",
    phone: "070-3456-7890",
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
      address: "東京都渋谷区1-2-3",
      paymentCondition: "invoice",
      remarks: "領収書の宛名を確認する",
      menuItems: ["季節のコース", "記念日プレート"],
      status: reservationStatusCodes.confirmedRequested,
    });

    assert.equal(reservation.id, "RSV-1050");
    assert.equal(reservation.startTime, "10:00");
    assert.equal(reservation.endTime, "11:30");
    assert.equal(reservation.status, reservationStatusCodes.confirmedRequested);
    assert.equal(reservation.totalAmount, 9000);
    assert.equal(reservation.store, null);
    assert.equal(reservation.address, "東京都渋谷区1-2-3");
    assert.equal(reservation.paymentCondition, "invoice");
    assert.equal(reservation.remarks, "領収書の宛名を確認する");

    const customers = await repository.listCustomers();
    const customer = customers.find((item) => item.contact === "yui@example.jp");
    assert.equal(customer?.address, "東京都渋谷区1-2-3");
  });

  await t.test("sets and updates reservation end time from menu duration", async () => {
    const reservation = await repository.createReservation({
      date: "2026-08-03",
      startTime: "18:00",
      people: 2,
      name: "田中 一郎",
      email: "tanaka@example.jp",
      phone: "080-2222-3333",
      menuItems: ["100分コース"],
      status: reservationStatusCodes.confirmed,
    });

    assert.equal(reservation.endTime, "19:40");

    const updated = await repository.updateReservation(reservation.id, {
      startTime: "19:00",
      menuItems: ["季節のコース"],
    });
    assert.equal(updated.endTime, "20:30");

    const manual = await repository.updateReservation(reservation.id, { endTime: "20:30" });
    assert.equal(manual.endTime, "20:30");

    const updatedPayment = await repository.updateReservation(reservation.id, {
      paymentCondition: "onsite_card",
      remarks: "カード払い希望",
    });
    assert.equal(updatedPayment.paymentCondition, "onsite_card");
    assert.equal(updatedPayment.remarks, "カード払い希望");
  });

  await t.test("uses default end time when selected menu has no configured duration", async () => {
    const reservation = await repository.createReservation({
      date: "2026-08-04",
      startTime: "12:00",
      people: 1,
      name: "加藤 花",
      email: "hana@example.jp",
      phone: "080-3333-4444",
      menuItems: ["来店後に注文"],
      status: reservationStatusCodes.confirmed,
    });

    assert.equal(reservation.endTime, "12:45");
  });

  await t.test("creates travel agency group reservations with group data on the reservation", async () => {
    const reservation = await repository.createReservation({
      date: "2026-08-10",
      startTime: "09:30",
      people: 42,
      name: "ABCツーリスト広島支店",
      email: "agency@example.jp",
      phone: "082-000-1111",
      accountType: "travel_agency",
      companyBranchName: "ABCツーリスト広島支店",
      contactPersonName: "山田太郎",
      bookingType: "travel_agency_group",
      bookingContactName: "山田太郎",
      dayContactName: "佐藤花子",
      dayContactPhone: "090-2222-3333",
      groupName: "○○小学校 修学旅行",
      groupNameKana: "まるまるしょうがっこう しゅうがくりょこう",
      groupType: "小学校",
      tcCount: 2,
      dgCount: 1,
      menuItems: ["季節のコース"],
      status: reservationStatusCodes.confirmedRequested,
    });

    assert.equal(reservation.people, 42);
    assert.equal(reservation.customer, "ABCツーリスト広島支店");
    assert.equal(reservation.bookingType, "travel_agency_group");
    assert.equal(reservation.bookingContactName, "山田太郎");
    assert.equal(reservation.dayContactName, "佐藤花子");
    assert.equal(reservation.groupName, "○○小学校 修学旅行");
    assert.equal(reservation.groupType, "小学校");
    assert.equal(reservation.tcCount, 2);
    assert.equal(reservation.dgCount, 1);

    const updated = await repository.updateReservation(reservation.id, { tcCount: 3, dgCount: 0 });
    assert.equal(updated.tcCount, 3);
    assert.equal(updated.dgCount, 0);

    const customer = (await repository.listCustomers()).find((item) => item.contact === "agency@example.jp");
    assert.equal(customer?.accountType, "travel_agency");
    assert.equal(customer?.companyBranchName, "ABCツーリスト広島支店");
    assert.equal(customer?.contactPersonName, "山田太郎");
  });

  await t.test("updates reservation status with stable status code", async () => {
    const reservation = await repository.updateReservationStatus("RSV-1047", reservationStatusCodes.waitingForVisit);

    assert.equal(reservation.status, reservationStatusCodes.waitingForVisit);
  });

  await t.test("allows rejecting temporary and confirmed reservation requests", () => {
    assert.equal(canTransitionReservationStatus(reservationStatusCodes.temporaryRequested, reservationStatusCodes.temporaryRejected), true);
    assert.equal(canTransitionReservationStatus(reservationStatusCodes.confirmedRequested, reservationStatusCodes.confirmedRejected), true);
    assert.equal(canTransitionReservationStatus(reservationStatusCodes.confirmed, reservationStatusCodes.confirmedRejected), false);
  });

  await t.test("allows customers to request cancellation for active reservations", () => {
    assert.equal(canTransitionReservationStatus(reservationStatusCodes.confirmed, reservationStatusCodes.cancellationRequested), true);
    assert.equal(canTransitionReservationStatus(reservationStatusCodes.waitingForVisit, reservationStatusCodes.cancellationRequested), true);
    assert.equal(canTransitionReservationStatus(reservationStatusCodes.visited, reservationStatusCodes.cancellationRequested), false);
  });

  await t.test("allows customers to request confirmed reservation change from temporary reservation", async () => {
    assert.equal(canTransitionReservationStatus(reservationStatusCodes.temporaryConfirmed, reservationStatusCodes.confirmedRequested), true);
    assert.equal(canTransitionReservationStatus(reservationStatusCodes.confirmedRequested, reservationStatusCodes.temporaryConfirmed), true);

    const reservation = await repository.updateReservationStatus("RSV-1049", reservationStatusCodes.confirmedRequested, {
      requestType: "confirmed_from_temporary",
    });
    assert.equal(reservation.status, reservationStatusCodes.confirmedRequested);
    assert.equal(reservation.requestType, "confirmed_from_temporary");

    const rejected = await repository.updateReservationStatus("RSV-1049", reservationStatusCodes.temporaryConfirmed);
    assert.equal(rejected.status, reservationStatusCodes.temporaryConfirmed);
    assert.equal(rejected.requestType, null);

    const requestedAgain = await repository.updateReservationStatus("RSV-1049", reservationStatusCodes.confirmedRequested);
    assert.equal(requestedAgain.status, reservationStatusCodes.confirmedRequested);
    assert.equal(requestedAgain.requestType, "confirmed_from_temporary");
  });

  await t.test("does not expose account reservations by email-only match", async () => {
    const reservations = await repository.listReservationsForReservationAccount("firebase-uid-without-link");

    assert.deepEqual(reservations, []);
  });

  await t.test("creates and approves reservation change requests", async () => {
    const request = await repository.createReservationChangeRequest({
      reservationId: "RSV-1048",
      email: "misaki@example.jp",
      requestedDate: "2026-08-02",
      requestedStartTime: "13:30",
      requestedPeople: 2,
      requestedMenuItems: [menus[0].name],
      reason: "schedule changed",
    });

    assert.equal(request.status, "requested");
    assert.equal(request.currentDate, "2026-07-24");
    assert.equal(request.requestedDate, "2026-08-02");

    const approved = await repository.approveReservationChangeRequest(request.id);

    assert.equal(approved.request.status, "approved");
    assert.equal(approved.reservation.id, "RSV-1048");
    assert.equal(approved.reservation.date, "2026-08-02");
    assert.equal(approved.reservation.startTime, "13:30");
    assert.equal(approved.reservation.people, 2);
    assert.deepEqual(approved.reservation.menuItems, [menus[0].name]);
    assert.equal(approved.reservation.totalAmount, menus[0].price);
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

  await t.test("deleting a store keeps existing reservation assignments", async () => {
    await repository.deleteStore("渋谷店");
    const stores = await repository.listStores();
    const reservations = await repository.listReservations();
    const target = reservations.find((reservation) => reservation.id === "RSV-1047");

    assert.deepEqual(stores.map((store) => store.name), ["新宿店"]);
    assert.ok(target);
    assert.equal(target.store, "複数店舗");
    assert.deepEqual(target.storeAssignments, [
      { store: "渋谷店", people: 2 },
      { store: "新宿店", people: 1 },
    ]);
  });

  await t.test("bulk marks confirmation contacts", async () => {
    const contactedAt = "2026-07-20T10:00:00.000Z";
    const updated = await Promise.all(
      ["RSV-1047", "RSV-1048"].map((id) => repository.updateConfirmationContact(id, contactedAt)),
    );

    assert.deepEqual(updated.map((reservation) => reservation.confirmationContactedAt), [contactedAt, contactedAt]);
  });

  await t.test("deleting a menu keeps existing reservation history", async () => {
    await repository.deleteMenu("記念日プレート");
    const menus = await repository.listMenus();
    const inactiveMenus = await repository.listInactiveMenus();
    const reservations = await repository.listReservations();
    const target = reservations.find((reservation) => reservation.id === "RSV-1047");

    assert.ok(!menus.some((menu) => menu.name === "記念日プレート"));
    assert.equal(inactiveMenus.length, 1);
    assert.equal(inactiveMenus[0].name, "記念日プレート");
    assert.ok(target);
    assert.deepEqual(target.menuItems, ["季節のコース", "記念日プレート"]);
    assert.equal(target.totalAmount, 9000);
  });

  await t.test("reactivating a menu returns it to active choices", async () => {
    const inactiveMenus = await repository.listInactiveMenus();
    const restored = await repository.reactivateMenu(inactiveMenus[0].id ?? "");
    const menus = await repository.listMenus();

    assert.equal(restored.name, "記念日プレート");
    assert.ok(menus.some((menu) => menu.name === "記念日プレート"));
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
