import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CreateReservationInput, Customer, Menu, Reservation, ReservationStatus, Store } from "../domain";
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
    return JSON.parse(raw) as Database;
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

export class FileReservationRepository implements ReservationRepository {
  async listReservations() {
    const database = await readDatabase();
    return database.reservations;
  }

  async createReservation(input: CreateReservationInput) {
    const database = await readDatabase();
    const reservation: Reservation = {
      id: nextReservationId(database.reservations),
      customer: input.name,
      email: input.email,
      date: input.date,
      people: input.people,
      menu: input.menu,
      store: null,
      status: "仮予約申請中",
      received: receivedLabel(),
      phone: input.phone,
    };
    database.reservations = [reservation, ...database.reservations];
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
}
