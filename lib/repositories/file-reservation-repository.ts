import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CreateReservationInput, Customer, Menu, Reservation, ReservationStatus, SaveMenuInput, Store, UpdateReservationInput } from "../domain";
import { seedMenus, seedReservations, seedStores } from "../seed-data";
import type { ReservationRepository } from "./reservation-repository";

type Database = {
  reservations: Reservation[];
  menus: Menu[];
  stores: Store[];
};

const databasePath = path.join(process.cwd(), "data", "reservation-db.json");

async function readDatabase(): Promise<Database> {
  try {
    const raw = await readFile(databasePath, "utf8");
    const database = JSON.parse(raw) as Database;
    database.reservations = database.reservations.map((reservation) => normalizeReservation(reservation, database.menus));
    return database;
  } catch {
    const initial = { reservations: seedReservations, menus: seedMenus, stores: seedStores };
    await writeDatabase(initial);
    return initial;
  }
}

async function writeDatabase(database: Database) {
  await mkdir(path.dirname(databasePath), { recursive: true });
  await writeFile(databasePath, JSON.stringify(database, null, 2), "utf8");
}

function nextReservationId(reservations: Reservation[]) {
  const max = reservations.reduce((current, reservation) => {
    const number = Number(reservation.id.replace("RSV-", ""));
    return Number.isFinite(number) ? Math.max(current, number) : current;
  }, 1000);
  return `RSV-${max + 1}`;
}

function receivedLabel() {
  const now = new Date();
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now).replace(" ", " ");
}

function normalizeReservation(reservation: Reservation, menus: Menu[]): Reservation {
  const legacyMenu = reservation.menu ? [reservation.menu] : [];
  const menuItems = reservation.menuItems?.length ? reservation.menuItems : legacyMenu;
  const totalAmount = reservation.totalAmount ?? calculateTotalAmount(menuItems, menus);
  return { ...reservation, menuItems, totalAmount };
}

function calculateTotalAmount(menuItems: string[], menus: Menu[]) {
  return menuItems.reduce((total, name) => total + (menus.find((menu) => menu.name === name)?.price ?? 0), 0);
}

export class FileReservationRepository implements ReservationRepository {
  async listReservations() {
    const database = await readDatabase();
    return database.reservations;
  }

  async createReservation(input: CreateReservationInput) {
    const database = await readDatabase();
    const menuItems = input.menuItems?.length ? input.menuItems : input.menu ? [input.menu] : [];
    const reservation: Reservation = {
      id: nextReservationId(database.reservations),
      customer: input.name,
      email: input.email,
      date: input.date,
      people: input.people,
      menuItems,
      totalAmount: calculateTotalAmount(menuItems, database.menus),
      store: null,
      status: "仮予約申請中",
      received: receivedLabel(),
      phone: input.phone,
    };
    database.reservations = [reservation, ...database.reservations];
    await writeDatabase(database);
    return reservation;
  }

  async updateReservation(id: string, input: UpdateReservationInput) {
    const database = await readDatabase();
    const reservation = database.reservations.find((item) => item.id === id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    if (input.date !== undefined) reservation.date = input.date;
    if (input.people !== undefined) reservation.people = input.people;
    if (input.customer !== undefined) reservation.customer = input.customer;
    if (input.email !== undefined) reservation.email = input.email;
    if (input.phone !== undefined) reservation.phone = input.phone;
    if (input.menuItems !== undefined) {
      reservation.menuItems = input.menuItems;
      reservation.totalAmount = calculateTotalAmount(input.menuItems, database.menus);
    }
    await writeDatabase(database);
    return reservation;
  }

  async updateReservationStatus(id: string, status: ReservationStatus) {
    const database = await readDatabase();
    const reservation = database.reservations.find((item) => item.id === id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    reservation.status = status;
    await writeDatabase(database);
    return reservation;
  }

  async assignStore(id: string, store: string) {
    const database = await readDatabase();
    const reservation = database.reservations.find((item) => item.id === id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    reservation.store = store;
    await writeDatabase(database);
    return reservation;
  }

  async listCustomers(): Promise<Customer[]> {
    const database = await readDatabase();
    const grouped = new Map<string, Customer>();
    for (const reservation of database.reservations) {
      const current = grouped.get(reservation.customer);
      grouped.set(reservation.customer, {
        name: reservation.customer,
        contact: reservation.email ?? "customer@example.jp",
        phone: reservation.phone,
        count: (current?.count ?? 0) + 1,
        last: reservation.date.replaceAll("-", "/"),
      });
    }
    return Array.from(grouped.values());
  }

  async listStores() {
    const database = await readDatabase();
    return database.stores;
  }

  async listMenus() {
    const database = await readDatabase();
    return database.menus;
  }

  async createMenu(input: SaveMenuInput) {
    const database = await readDatabase();
    if (database.menus.some((menu) => menu.name === input.name)) {
      throw new Error(`Menu already exists: ${input.name}`);
    }
    database.menus = [...database.menus, input];
    await writeDatabase(database);
    return input;
  }

  async updateMenu(name: string, input: SaveMenuInput) {
    const database = await readDatabase();
    const index = database.menus.findIndex((menu) => menu.name === name);
    if (index < 0) throw new Error(`Menu not found: ${name}`);
    database.menus[index] = input;
    if (name !== input.name) {
      database.reservations = database.reservations.map((reservation) => ({
        ...reservation,
        menuItems: reservation.menuItems.map((item) => item === name ? input.name : item),
      }));
    }
    database.reservations = database.reservations.map((reservation) => ({
      ...reservation,
      totalAmount: calculateTotalAmount(reservation.menuItems, database.menus),
    }));
    await writeDatabase(database);
    return input;
  }

  async deleteMenu(name: string) {
    const database = await readDatabase();
    database.menus = database.menus.filter((menu) => menu.name !== name);
    database.reservations = database.reservations.map((reservation) => ({
      ...reservation,
      menuItems: reservation.menuItems.filter((item) => item !== name),
      totalAmount: calculateTotalAmount(reservation.menuItems.filter((item) => item !== name), database.menus),
    }));
    await writeDatabase(database);
  }
}
