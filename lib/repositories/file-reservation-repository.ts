import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultReservationStatus, getAutomaticReservationStatus, normalizeReservationStatus, reservationStatusCodes, type CreateReservationChangeRequestInput, type CreateReservationInput, type Customer, type Menu, type Reservation, type ReservationChangeRequest, type ReservationStatus, type SaveCustomerInput, type SaveMenuInput, type SaveStoreInput, type Store, type StoreAssignment, type UpdateReservationInput } from "../domain";
import { seedMenus, seedReservations, seedStores } from "../seed-data";
import type { ReservationRepository } from "./reservation-repository";

type Database = {
  reservations: Reservation[];
  reservationChangeRequests?: ReservationChangeRequest[];
  menus: Menu[];
  stores: Store[];
  customers?: Customer[];
};

const defaultStartTime = "10:00";

async function readDatabase(databasePath: string): Promise<Database> {
  try {
    const raw = await readFile(databasePath, "utf8");
    const database = JSON.parse(raw) as Database;
    database.customers ??= [];
    database.reservationChangeRequests ??= [];
    database.reservations = database.reservations.map((reservation) => normalizeReservation(reservation, database.menus));
    return database;
  } catch {
    const initial = { reservations: seedReservations, reservationChangeRequests: [], menus: seedMenus, stores: seedStores, customers: [] };
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

function nextChangeRequestId(requests: ReservationChangeRequest[]) {
  const max = requests.reduce((current, request) => {
    const number = Number(request.id.replace("RCR-", ""));
    return Number.isFinite(number) ? Math.max(current, number) : current;
  }, 1000);
  return `RCR-${max + 1}`;
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

function normalizeContact(value: string | undefined) {
  return (value ?? "").replace(/[\s-]/g, "").toLowerCase();
}

function reservationMatchesContact(reservation: Reservation, input: { email?: string; phone?: string }) {
  return Boolean(
    (input.email && normalizeContact(reservation.email) === normalizeContact(input.email))
    || (input.phone && normalizeContact(reservation.phone) === normalizeContact(input.phone)),
  );
}

function assertCanRequestReservationChange(reservation: Reservation) {
  const allowedStatuses: readonly ReservationStatus[] = [
    reservationStatusCodes.temporaryRequested,
    reservationStatusCodes.temporaryConfirmed,
    reservationStatusCodes.confirmedRequested,
    reservationStatusCodes.confirmed,
    reservationStatusCodes.waitingForVisit,
  ];
  if (!allowedStatuses.includes(reservation.status)) {
    throw new Error(`Reservation change cannot be requested for status: ${reservation.status}`);
  }
}

function sortByDisplayOrderThenName<T extends { displayOrder?: number; name: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name, "ja-JP", { numeric: true }));
}

function normalizeMenu(menu: Menu): Menu {
  return { ...menu, displayOrder: menu.displayOrder ?? 0, active: menu.active ?? true };
}

function normalizeStore(store: Store): Store {
  return { ...store, displayOrder: store.displayOrder ?? 0 };
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

  async listReservationChangeRequests() {
    const database = await this.readDatabase();
    return database.reservationChangeRequests ?? [];
  }

  async createReservationChangeRequest(input: CreateReservationChangeRequestInput) {
    const database = await this.readDatabase();
    database.reservationChangeRequests ??= [];
    const reservation = database.reservations.find((item) => item.id.toLowerCase() === input.reservationId.toLowerCase());
    if (!reservation || !reservationMatchesContact(reservation, input)) {
      throw new Error(`Reservation not found: ${input.reservationId}`);
    }
    assertCanRequestReservationChange(reservation);
    const request: ReservationChangeRequest = {
      id: nextChangeRequestId(database.reservationChangeRequests),
      reservationId: reservation.id,
      customer: reservation.customer,
      email: reservation.email,
      phone: reservation.phone,
      currentDate: reservation.date,
      currentStartTime: reservation.startTime ?? defaultStartTime,
      currentPeople: reservation.people,
      currentMenuItems: reservation.menuItems ?? [],
      requestedDate: input.requestedDate,
      requestedStartTime: input.requestedStartTime,
      requestedPeople: input.requestedPeople,
      requestedMenuItems: input.requestedMenuItems,
      reason: input.reason,
      status: "requested",
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
    };
    database.reservationChangeRequests = [request, ...database.reservationChangeRequests];
    await this.writeDatabase(database);
    return request;
  }

  async approveReservationChangeRequest(id: string) {
    const database = await this.readDatabase();
    database.reservationChangeRequests ??= [];
    const request = database.reservationChangeRequests.find((item) => item.id === id);
    if (!request) throw new Error(`Reservation change request not found: ${id}`);
    if (request.status !== "requested") throw new Error(`Reservation change request already reviewed: ${id}`);
    const reservation = database.reservations.find((item) => item.id === request.reservationId);
    if (!reservation) throw new Error(`Reservation not found: ${request.reservationId}`);

    const shouldResetAssignments = reservation.date !== request.requestedDate
      || (reservation.startTime ?? defaultStartTime) !== request.requestedStartTime
      || reservation.people !== request.requestedPeople;
    reservation.date = request.requestedDate;
    reservation.startTime = request.requestedStartTime;
    reservation.people = request.requestedPeople;
    reservation.menuItems = request.requestedMenuItems;
    reservation.totalAmount = calculateTotalAmount(request.requestedMenuItems, database.menus);
    if (shouldResetAssignments) {
      reservation.store = null;
      reservation.storeAssignments = [];
    }
    reservation.status = getAutomaticReservationStatus(reservation);
    request.status = "approved";
    request.reviewedAt = new Date().toISOString();

    await this.writeDatabase(database);
    return { request, reservation };
  }

  async rejectReservationChangeRequest(id: string) {
    const database = await this.readDatabase();
    database.reservationChangeRequests ??= [];
    const request = database.reservationChangeRequests.find((item) => item.id === id);
    if (!request) throw new Error(`Reservation change request not found: ${id}`);
    if (request.status !== "requested") throw new Error(`Reservation change request already reviewed: ${id}`);
    request.status = "rejected";
    request.reviewedAt = new Date().toISOString();
    await this.writeDatabase(database);
    return request;
  }

  async listCustomers(): Promise<Customer[]> {
    const database = await this.readDatabase();
    const grouped = new Map<string, Customer>();
    for (const customer of database.customers ?? []) {
      grouped.set(customer.contact.toLowerCase(), customer);
    }
    for (const reservation of database.reservations) {
      const key = (reservation.email ?? reservation.customer).toLowerCase();
      const current = grouped.get(key);
      grouped.set(key, {
        id: current?.id,
        name: reservation.customer,
        contact: reservation.email ?? "customer@example.jp",
        phone: reservation.phone,
        count: (current?.count ?? 0) + 1,
        last: reservation.date.replaceAll("-", "/"),
      });
    }
    return Array.from(grouped.values());
  }

  async listInactiveCustomers(): Promise<Customer[]> {
    return [];
  }

  async findCustomerForReservationAccount(_firebaseUid: string, email: string): Promise<Customer | null> {
    const customers = await this.listCustomers();
    return customers.find((customer) => customer.contact.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async createCustomer(input: SaveCustomerInput): Promise<Customer> {
    const database = await this.readDatabase();
    database.customers ??= [];
    if (database.customers.some((customer) => customer.contact.toLowerCase() === input.contact.toLowerCase())) {
      throw new Error(`Customer already exists: ${input.contact}`);
    }
    const customer = {
      id: `file-customer-${Date.now()}`,
      name: input.name,
      contact: input.contact,
      phone: input.phone,
      count: 0,
      last: "-",
    };
    database.customers.push(customer);
    await this.writeDatabase(database);
    return customer;
  }

  async updateCustomer(name: string, input: SaveCustomerInput): Promise<Customer> {
    const database = await this.readDatabase();
    const decodedName = decodeURIComponent(name);
    database.customers ??= [];
    const customerIndex = database.customers.findIndex((customer) => customer.id === input.id || customer.name === decodedName || customer.contact === input.originalContact);
    if (customerIndex >= 0) {
      database.customers[customerIndex] = {
        ...database.customers[customerIndex],
        name: input.name,
        contact: input.contact,
        phone: input.phone,
      };
    }
    const targets = database.reservations.filter((reservation) => reservation.customer === decodedName || reservation.email === input.originalContact);
    if (!targets.length && customerIndex < 0) throw new Error(`Customer not found: ${decodedName}`);
    database.reservations = database.reservations.map((reservation) => reservation.customer === decodedName || reservation.email === input.originalContact ? {
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
    database.customers = (database.customers ?? []).filter((customer) => customer.name !== decodedName);
    await this.writeDatabase(database);
  }

  async reactivateCustomer(id: string): Promise<Customer> {
    throw new Error(`Customer not found: ${id}`);
  }

  async listStores() {
    const database = await this.readDatabase();
    return sortByDisplayOrderThenName(database.stores.map(normalizeStore));
  }

  async listInactiveStores(): Promise<Store[]> {
    return [];
  }

  async createStore(input: SaveStoreInput) {
    const database = await this.readDatabase();
    if (database.stores.some((store) => store.name === input.name)) {
      throw new Error(`Store already exists: ${input.name}`);
    }
    database.stores.push(normalizeStore(input));
    await this.writeDatabase(database);
    return normalizeStore(input);
  }

  async updateStore(name: string, input: SaveStoreInput) {
    const database = await this.readDatabase();
    const decodedName = decodeURIComponent(name);
    const index = database.stores.findIndex((store) => store.name === decodedName);
    if (index < 0) throw new Error(`Store not found: ${decodedName}`);
    database.stores[index] = normalizeStore(input);
    if (decodedName !== input.name) {
      database.reservations = database.reservations.map((reservation) => {
        const storeAssignments = (reservation.storeAssignments ?? []).map((assignment) => assignment.store === decodedName ? { ...assignment, store: input.name } : assignment);
        const store = storeAssignments.length === 1 ? storeAssignments[0].store : storeAssignments.length > 1 ? "複数店舗" : reservation.store === decodedName ? input.name : reservation.store;
        return { ...reservation, storeAssignments, store };
      });
    }
    await this.writeDatabase(database);
    return normalizeStore(input);
  }

  async deleteStore(name: string) {
    const database = await this.readDatabase();
    const decodedName = decodeURIComponent(name);
    database.stores = database.stores.filter((store) => store.name !== decodedName);
    await this.writeDatabase(database);
  }

  async reactivateStore(id: string): Promise<Store> {
    throw new Error(`Store not found: ${id}`);
  }

  async listMenus() {
    const database = await this.readDatabase();
    return sortByDisplayOrderThenName(database.menus.map(normalizeMenu).filter((menu) => menu.active !== false));
  }

  async listInactiveMenus(): Promise<Menu[]> {
    const database = await this.readDatabase();
    return sortByDisplayOrderThenName(database.menus.map(normalizeMenu).filter((menu) => menu.active === false));
  }

  async createMenu(input: SaveMenuInput) {
    const database = await this.readDatabase();
    const existingIndex = database.menus.findIndex((menu) => menu.name === input.name);
    const existing = existingIndex >= 0 ? normalizeMenu(database.menus[existingIndex]) : null;
    if (existing?.active !== false) {
      throw new Error(`Menu already exists: ${input.name}`);
    }
    if (existing) {
      database.menus[existingIndex] = normalizeMenu({ ...input, id: existing.id, active: true });
    } else {
      database.menus = [...database.menus, normalizeMenu(input)];
    }
    await this.writeDatabase(database);
    return normalizeMenu(input);
  }

  async updateMenu(name: string, input: SaveMenuInput) {
    const database = await this.readDatabase();
    const index = database.menus.findIndex((menu) => menu.name === name);
    if (index < 0) throw new Error(`Menu not found: ${name}`);
    database.menus[index] = normalizeMenu(input);
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
    return normalizeMenu(input);
  }

  async deleteMenu(name: string) {
    const database = await this.readDatabase();
    database.menus = database.menus.map((menu) => menu.name === name
      ? normalizeMenu({ ...menu, id: menu.id ?? `file-menu-${encodeURIComponent(menu.name)}`, active: false })
      : menu);
    await this.writeDatabase(database);
  }

  async reactivateMenu(id: string): Promise<Menu> {
    const database = await this.readDatabase();
    const index = database.menus.findIndex((menu) => menu.id === id);
    if (index < 0) throw new Error(`Menu not found: ${id}`);
    database.menus[index] = normalizeMenu({ ...database.menus[index], active: true });
    await this.writeDatabase(database);
    return normalizeMenu(database.menus[index]);
  }
}
