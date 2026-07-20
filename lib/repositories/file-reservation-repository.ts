import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultReservationStatus, normalizeReservationStatus, type CreateReservationInput, type Customer, type Menu, type Reservation, type ReservationStatus, type SaveCustomerInput, type SaveMenuInput, type SaveStoreInput, type Store, type StoreAssignment, type UpdateReservationInput } from "../domain";
import { seedMenus, seedReservations, seedStores } from "../seed-data";
import type { ReservationRepository } from "./reservation-repository";

type Database = {
  reservations: Reservation[];
  menus: Menu[];
  stores: Store[];
};

const defaultStartTime = "10:00";

async function readDatabase(databasePath: string): Promise<Database> {
  try {
    const raw = await readFile(databasePath, "utf8");
    const database = JSON.parse(raw) as Database;
    database.reservations = database.reservations.map((reservation) => normalizeReservation(reservation, database.menus));
    return database;
  } catch {
    const initial = { reservations: seedReservations, menus: seedMenus, stores: seedStores };
    await writeDatabase(databasePath, initial);
    return initial;
  }
}

async function writeDatabase(databasePath: string, database: Database) {
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
  const storeAssignments = reservation.storeAssignments?.length
    ? reservation.storeAssignments
    : reservation.store
      ? [{ store: reservation.store, people: reservation.people }]
      : [];
  const store = storeAssignments.length === 1 ? storeAssignments[0].store : storeAssignments.length > 1 ? "複数店舗" : null;
  return { ...reservation, startTime: reservation.startTime ?? defaultStartTime, menuItems, totalAmount, storeAssignments, store, status: normalizeReservationStatus(reservation.status) };
}

function calculateTotalAmount(menuItems: string[], menus: Menu[]) {
  return menuItems.reduce((total, name) => total + (menus.find((menu) => menu.name === name)?.price ?? 0), 0);
}

export class FileReservationRepository implements ReservationRepository {
  private readonly databasePath: string;

  constructor(databasePath = path.join(process.cwd(), "data", "reservation-db.json")) {
    this.databasePath = databasePath;
  }

  private readDatabase() {
    return readDatabase(this.databasePath);
  }

  private writeDatabase(database: Database) {
    return writeDatabase(this.databasePath, database);
  }

  async listReservations() {
    const database = await this.readDatabase();
    return database.reservations;
  }

  async createReservation(input: CreateReservationInput) {
    const database = await this.readDatabase();
    const menuItems = input.menuItems?.length ? input.menuItems : input.menu ? [input.menu] : [];
    const reservation: Reservation = {
      id: nextReservationId(database.reservations),
      customer: input.name,
      email: input.email,
      date: input.date,
      startTime: input.startTime ?? defaultStartTime,
      people: input.people,
      menuItems,
      totalAmount: calculateTotalAmount(menuItems, database.menus),
      store: null,
      storeAssignments: [],
      status: input.status ? normalizeReservationStatus(input.status) : defaultReservationStatus,
      policyAgreement: input.policyAgreement,
      confirmationContactedAt: null,
      received: receivedLabel(),
      phone: input.phone,
    };
    database.reservations = [reservation, ...database.reservations];
    await this.writeDatabase(database);
    return reservation;
  }

  async updateReservation(id: string, input: UpdateReservationInput) {
    const database = await this.readDatabase();
    const reservation = database.reservations.find((item) => item.id === id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    if (input.date !== undefined) reservation.date = input.date;
    if (input.startTime !== undefined) reservation.startTime = input.startTime;
    if (input.people !== undefined) reservation.people = input.people;
    if (input.customer !== undefined) reservation.customer = input.customer;
    if (input.email !== undefined) reservation.email = input.email;
    if (input.phone !== undefined) reservation.phone = input.phone;
    if (input.menuItems !== undefined) {
      reservation.menuItems = input.menuItems;
      reservation.totalAmount = calculateTotalAmount(input.menuItems, database.menus);
    }
    await this.writeDatabase(database);
    return reservation;
  }

  async updateReservationStatus(id: string, status: ReservationStatus) {
    const database = await this.readDatabase();
    const reservation = database.reservations.find((item) => item.id === id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    reservation.status = normalizeReservationStatus(status);
    await this.writeDatabase(database);
    return reservation;
  }

  async updateConfirmationContact(id: string, contactedAt: string | null) {
    const database = await this.readDatabase();
    const reservation = database.reservations.find((item) => item.id === id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    reservation.confirmationContactedAt = contactedAt;
    await this.writeDatabase(database);
    return reservation;
  }

  async assignStores(id: string, assignments: StoreAssignment[]) {
    const database = await this.readDatabase();
    const reservation = database.reservations.find((item) => item.id === id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    const validAssignments = assignments
      .filter((assignment) => assignment.store && assignment.people > 0)
      .map((assignment) => ({ store: assignment.store, people: Number(assignment.people) }));
    const assignedPeople = validAssignments.reduce((total, assignment) => total + assignment.people, 0);
    if (validAssignments.length > 0 && assignedPeople !== reservation.people) {
      throw new Error(`Assigned people must equal reservation people: ${reservation.people}`);
    }
    reservation.storeAssignments = validAssignments;
    reservation.store = validAssignments.length === 1 ? validAssignments[0].store : validAssignments.length > 1 ? "複数店舗" : null;
    await this.writeDatabase(database);
    return reservation;
  }

  async listCustomers(): Promise<Customer[]> {
    const database = await this.readDatabase();
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

  async updateCustomer(name: string, input: SaveCustomerInput): Promise<Customer> {
    const database = await this.readDatabase();
    const decodedName = decodeURIComponent(name);
    const targets = database.reservations.filter((reservation) => reservation.customer === decodedName);
    if (!targets.length) throw new Error(`Customer not found: ${decodedName}`);
    database.reservations = database.reservations.map((reservation) => reservation.customer === decodedName ? {
      ...reservation,
      customer: input.name,
      email: input.contact,
      phone: input.phone,
    } : reservation);
    await this.writeDatabase(database);
    const updated = (await this.listCustomers()).find((customer) => customer.name === input.name);
    if (!updated) throw new Error(`Customer not found after update: ${input.name}`);
    return updated;
  }

  async deleteCustomer(name: string): Promise<void> {
    const database = await this.readDatabase();
    const decodedName = decodeURIComponent(name);
    database.reservations = database.reservations.filter((reservation) => reservation.customer !== decodedName);
    await this.writeDatabase(database);
  }

  async listStores() {
    const database = await this.readDatabase();
    return database.stores;
  }

  async updateStore(name: string, input: SaveStoreInput) {
    const database = await this.readDatabase();
    const decodedName = decodeURIComponent(name);
    const index = database.stores.findIndex((store) => store.name === decodedName);
    if (index < 0) throw new Error(`Store not found: ${decodedName}`);
    database.stores[index] = input;
    if (decodedName !== input.name) {
      database.reservations = database.reservations.map((reservation) => {
        const storeAssignments = (reservation.storeAssignments ?? []).map((assignment) => assignment.store === decodedName ? { ...assignment, store: input.name } : assignment);
        const store = storeAssignments.length === 1 ? storeAssignments[0].store : storeAssignments.length > 1 ? "複数店舗" : reservation.store === decodedName ? input.name : reservation.store;
        return { ...reservation, storeAssignments, store };
      });
    }
    await this.writeDatabase(database);
    return input;
  }

  async deleteStore(name: string) {
    const database = await this.readDatabase();
    const decodedName = decodeURIComponent(name);
    database.stores = database.stores.filter((store) => store.name !== decodedName);
    database.reservations = database.reservations.map((reservation) => {
      const storeAssignments = (reservation.storeAssignments ?? []).filter((assignment) => assignment.store !== decodedName);
      const store = storeAssignments.length === 1 ? storeAssignments[0].store : storeAssignments.length > 1 ? "複数店舗" : null;
      return { ...reservation, storeAssignments, store };
    });
    await this.writeDatabase(database);
  }

  async listMenus() {
    const database = await this.readDatabase();
    return database.menus;
  }

  async createMenu(input: SaveMenuInput) {
    const database = await this.readDatabase();
    if (database.menus.some((menu) => menu.name === input.name)) {
      throw new Error(`Menu already exists: ${input.name}`);
    }
    database.menus = [...database.menus, input];
    await this.writeDatabase(database);
    return input;
  }

  async updateMenu(name: string, input: SaveMenuInput) {
    const database = await this.readDatabase();
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
    await this.writeDatabase(database);
    return input;
  }

  async deleteMenu(name: string) {
    const database = await this.readDatabase();
    database.menus = database.menus.filter((menu) => menu.name !== name);
    database.reservations = database.reservations.map((reservation) => ({
      ...reservation,
      menuItems: reservation.menuItems.filter((item) => item !== name),
      totalAmount: calculateTotalAmount(reservation.menuItems.filter((item) => item !== name), database.menus),
    }));
    await this.writeDatabase(database);
  }
}
