import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { calculateReservationEndTime, defaultReservationStatus, getAutomaticReservationStatus, normalizePaymentCondition, normalizeReservationRequestType, normalizeReservationStatus, reservationStatusCodes, type Account, type CreateReservationChangeRequestInput, type CreateReservationInput, type Menu, type Reservation, type ReservationChangeRequest, type ReservationStatus, type SaveAccountInput, type SaveMenuInput, type SaveStoreInput, type Store, type StoreAssignment, type UpdateReservationInput } from "../domain";
import { seedMenus, seedReservations, seedStores } from "../seed-data";
import type { ReservationRepository } from "./reservation-repository";

type Database = {
  reservations: Reservation[];
  reservationChangeRequests?: ReservationChangeRequest[];
  menus: Menu[];
  stores: Store[];
  accounts?: Account[];
};

const defaultStartTime = "10:00";

async function readDatabase(databasePath: string): Promise<Database> {
  try {
    const raw = await readFile(databasePath, "utf8");
    const legacy = JSON.parse(raw) as Database & { customers?: unknown[] };
    const database: Database = {
      reservations: legacy.reservations,
      reservationChangeRequests: legacy.reservationChangeRequests ?? [],
      menus: legacy.menus,
      stores: legacy.stores,
      accounts: legacy.accounts ?? [],
    };
    database.reservations = database.reservations.map((reservation) => normalizeReservation(reservation, database.menus));
    return database;
  } catch {
    const initial: Database = { reservations: seedReservations, reservationChangeRequests: [], menus: seedMenus, stores: seedStores, accounts: [] };
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
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function normalizeReservation(reservation: Reservation, menus: Menu[]): Reservation {
  const legacyMenu = reservation.menu ? [reservation.menu] : [];
  const menuItems = reservation.menuItems?.length ? reservation.menuItems : legacyMenu;
  const totalAmount = reservation.totalAmount ?? calculateTotalAmount(menuItems, menus);
  const storeAssignments = reservation.storeAssignments?.length ? reservation.storeAssignments : reservation.store ? [{ store: reservation.store, people: reservation.people }] : [];
  const store = storeAssignments.length === 1 ? storeAssignments[0].store : storeAssignments.length > 1 ? "複数店舗" : null;
  const startTime = reservation.startTime ?? defaultStartTime;
  return { ...reservation, accountId: reservation.accountId ?? null, startTime, endTime: reservation.endTime ?? calculateReservationEndTime(startTime, menuItems, menus), menuItems, totalAmount, storeAssignments, store, paymentCondition: normalizePaymentCondition(reservation.paymentCondition), status: normalizeReservationStatus(reservation.status), requestType: normalizeReservationRequestType(reservation.requestType) };
}

function calculateTotalAmount(menuItems: string[], menus: Menu[]) {
  return menuItems.reduce((total, name) => total + (menus.find((menu) => menu.name === name)?.price ?? 0), 0);
}

function normalizeContact(value: string | undefined) {
  return (value ?? "").replace(/[\s-]/g, "").toLowerCase();
}

function reservationMatchesContact(reservation: Reservation, input: { email?: string; phone?: string }) {
  return Boolean((input.email && normalizeContact(reservation.email) === normalizeContact(input.email)) || (input.phone && normalizeContact(reservation.phone) === normalizeContact(input.phone)));
}

function assertCanRequestReservationChange(reservation: Reservation) {
  const allowedStatuses: readonly ReservationStatus[] = [reservationStatusCodes.temporaryRequested, reservationStatusCodes.temporaryConfirmed, reservationStatusCodes.confirmedRequested, reservationStatusCodes.confirmed, reservationStatusCodes.waitingForVisit];
  if (!allowedStatuses.includes(reservation.status)) throw new Error(`Reservation change cannot be requested for status: ${reservation.status}`);
}

function sortByDisplayOrderThenName<T extends { displayOrder?: number; name: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name, "ja-JP", { numeric: true }));
}

function normalizeMenu(menu: Menu): Menu { return { ...menu, displayOrder: menu.displayOrder ?? 0, active: menu.active ?? true }; }
function normalizeStore(store: Store): Store { return { ...store, displayOrder: store.displayOrder ?? 0 }; }

export class FileReservationRepository implements ReservationRepository {
  private readonly databasePath: string;

  constructor(databasePath = path.join(process.cwd(), "data", "reservation-db.json")) { this.databasePath = databasePath; }
  private readDatabase() { return readDatabase(this.databasePath); }
  private writeDatabase(database: Database) { return writeDatabase(this.databasePath, database); }

  async listReservations() { return (await this.readDatabase()).reservations; }

  async listReservationsForReservationAccount(firebaseUid: string) {
    const database = await this.readDatabase();
    const account = (database.accounts ?? []).find((item) => item.firebaseUid === firebaseUid && item.active !== false);
    if (!account?.id) return [];
    return database.reservations.filter((reservation) => reservation.accountId === account.id);
  }

  async createReservation(input: CreateReservationInput) {
    const database = await this.readDatabase();
    const menuItems = input.menuItems?.length ? input.menuItems : input.menu ? [input.menu] : [];
    const startTime = input.startTime ?? defaultStartTime;
    const firebaseUid = input.accountFirebaseUid ?? input.customerFirebaseUid;
    const account = firebaseUid ? (database.accounts ?? []).find((item) => item.firebaseUid === firebaseUid && item.active !== false) : undefined;
    if (firebaseUid && !account?.id) throw new Error(`Account not found for Firebase UID: ${firebaseUid}`);

    const reservation: Reservation = {
      id: nextReservationId(database.reservations),
      accountId: account?.id ?? null,
      customer: input.name,
      email: input.email,
      address: input.address,
      bookingType: input.bookingType ?? "individual",
      bookingContactName: input.bookingContactName,
      dayContactName: input.dayContactName,
      dayContactPhone: input.dayContactPhone,
      groupName: input.groupName,
      groupNameKana: input.groupNameKana,
      groupType: input.groupType,
      groupTypeOther: input.groupTypeOther,
      tcCount: input.tcCount ?? 0,
      dgCount: input.dgCount ?? 0,
      paymentCondition: normalizePaymentCondition(input.paymentCondition),
      remarks: input.remarks,
      date: input.date,
      startTime,
      endTime: input.endTime ?? calculateReservationEndTime(startTime, menuItems, database.menus),
      people: input.people,
      menuItems,
      totalAmount: calculateTotalAmount(menuItems, database.menus),
      store: null,
      storeAssignments: [],
      status: input.status ? normalizeReservationStatus(input.status) : defaultReservationStatus,
      requestType: input.requestType ?? null,
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
    if (input.endTime !== undefined) reservation.endTime = input.endTime;
    if (input.people !== undefined) reservation.people = input.people;
    if (input.customer !== undefined) reservation.customer = input.customer;
    if (input.email !== undefined) reservation.email = input.email;
    if (input.phone !== undefined) reservation.phone = input.phone;
    if (input.address !== undefined) reservation.address = input.address;
    if (input.bookingType !== undefined) reservation.bookingType = input.bookingType;
    if (input.bookingContactName !== undefined) reservation.bookingContactName = input.bookingContactName;
    if (input.dayContactName !== undefined) reservation.dayContactName = input.dayContactName;
    if (input.dayContactPhone !== undefined) reservation.dayContactPhone = input.dayContactPhone;
    if (input.groupName !== undefined) reservation.groupName = input.groupName;
    if (input.groupNameKana !== undefined) reservation.groupNameKana = input.groupNameKana;
    if (input.groupType !== undefined) reservation.groupType = input.groupType;
    if (input.groupTypeOther !== undefined) reservation.groupTypeOther = input.groupTypeOther;
    if (input.tcCount !== undefined) reservation.tcCount = input.tcCount;
    if (input.dgCount !== undefined) reservation.dgCount = input.dgCount;
    if (input.paymentCondition !== undefined) reservation.paymentCondition = normalizePaymentCondition(input.paymentCondition);
    if (input.remarks !== undefined) reservation.remarks = input.remarks;
    if (input.menuItems !== undefined) { reservation.menuItems = input.menuItems; reservation.totalAmount = calculateTotalAmount(input.menuItems, database.menus); }
    if (input.endTime === undefined && (input.startTime !== undefined || input.menuItems !== undefined)) reservation.endTime = calculateReservationEndTime(reservation.startTime, reservation.menuItems, database.menus);
    await this.writeDatabase(database);
    return reservation;
  }

  async updateReservationStatus(id: string, status: ReservationStatus, options?: { requestType?: Reservation["requestType"] }) {
    const database = await this.readDatabase();
    const reservation = database.reservations.find((item) => item.id === id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    const previousStatus = reservation.status;
    const nextStatus = normalizeReservationStatus(status);
    reservation.status = nextStatus;
    if (options && "requestType" in options) reservation.requestType = options.requestType ?? null;
    else if (previousStatus === reservationStatusCodes.temporaryConfirmed && nextStatus === reservationStatusCodes.confirmedRequested) reservation.requestType = "confirmed_from_temporary";
    else if (nextStatus !== reservationStatusCodes.confirmedRequested) reservation.requestType = null;
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
    const validAssignments = assignments.filter((assignment) => assignment.store && assignment.people > 0).map((assignment) => ({ store: assignment.store, people: Number(assignment.people) }));
    const assignedPeople = validAssignments.reduce((total, assignment) => total + assignment.people, 0);
    if (validAssignments.length > 0 && assignedPeople !== reservation.people) throw new Error(`Assigned people must equal reservation people: ${reservation.people}`);
    reservation.storeAssignments = validAssignments;
    reservation.store = validAssignments.length === 1 ? validAssignments[0].store : validAssignments.length > 1 ? "複数店舗" : null;
    await this.writeDatabase(database);
    return reservation;
  }

  async listReservationChangeRequests() { return (await this.readDatabase()).reservationChangeRequests ?? []; }

  async createReservationChangeRequest(input: CreateReservationChangeRequestInput) {
    const database = await this.readDatabase();
    database.reservationChangeRequests ??= [];
    const reservation = database.reservations.find((item) => item.id.toLowerCase() === input.reservationId.toLowerCase());
    if (!reservation || !reservationMatchesContact(reservation, input)) throw new Error(`Reservation not found: ${input.reservationId}`);
    assertCanRequestReservationChange(reservation);
    const request: ReservationChangeRequest = {
      id: nextChangeRequestId(database.reservationChangeRequests), reservationId: reservation.id, customer: reservation.customer, email: reservation.email, phone: reservation.phone,
      currentDate: reservation.date, currentStartTime: reservation.startTime ?? defaultStartTime, currentPeople: reservation.people, currentMenuItems: reservation.menuItems ?? [],
      requestedDate: input.requestedDate, requestedStartTime: input.requestedStartTime, requestedPeople: input.requestedPeople, requestedMenuItems: input.requestedMenuItems,
      reason: input.reason, status: "requested", requestedAt: new Date().toISOString(), reviewedAt: null,
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
    const shouldResetAssignments = reservation.date !== request.requestedDate || (reservation.startTime ?? defaultStartTime) !== request.requestedStartTime || reservation.people !== request.requestedPeople;
    reservation.date = request.requestedDate;
    reservation.startTime = request.requestedStartTime;
    reservation.people = request.requestedPeople;
    reservation.menuItems = request.requestedMenuItems;
    reservation.endTime = calculateReservationEndTime(reservation.startTime, reservation.menuItems, database.menus);
    reservation.totalAmount = calculateTotalAmount(request.requestedMenuItems, database.menus);
    if (shouldResetAssignments) { reservation.store = null; reservation.storeAssignments = []; }
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

  async listAccounts() {
    const database = await this.readDatabase();
    return (database.accounts ?? []).filter((account) => account.active !== false);
  }

  async listInactiveAccounts() {
    const database = await this.readDatabase();
    return (database.accounts ?? []).filter((account) => account.active === false);
  }

  async findAccountByFirebaseUid(firebaseUid: string) {
    const database = await this.readDatabase();
    return (database.accounts ?? []).find((account) => account.firebaseUid === firebaseUid && account.active !== false) ?? null;
  }

  async createAccount(input: SaveAccountInput & { firebaseUid: string }) {
    const database = await this.readDatabase();
    database.accounts ??= [];
    if (database.accounts.some((account) => account.firebaseUid === input.firebaseUid)) throw new Error(`Account already exists for Firebase UID: ${input.firebaseUid}`);
    const account: Account = { ...input, id: `file-account-${Date.now()}`, active: true };
    database.accounts.push(account);
    await this.writeDatabase(database);
    return account;
  }

  async updateAccount(id: string, input: SaveAccountInput) {
    const database = await this.readDatabase();
    database.accounts ??= [];
    const index = database.accounts.findIndex((account) => account.id === id);
    if (index < 0) throw new Error(`Account not found: ${id}`);
    database.accounts[index] = { ...database.accounts[index], ...input, id, firebaseUid: database.accounts[index].firebaseUid };
    await this.writeDatabase(database);
    return database.accounts[index];
  }

  async deactivateAccount(id: string) {
    const database = await this.readDatabase();
    database.accounts ??= [];
    const account = database.accounts.find((item) => item.id === id);
    if (!account) throw new Error(`Account not found: ${id}`);
    account.active = false;
    await this.writeDatabase(database);
  }

  async reactivateAccount(id: string) {
    const database = await this.readDatabase();
    database.accounts ??= [];
    const account = database.accounts.find((item) => item.id === id);
    if (!account) throw new Error(`Account not found: ${id}`);
    account.active = true;
    await this.writeDatabase(database);
    return account;
  }

  async listStores() { const database = await this.readDatabase(); return sortByDisplayOrderThenName(database.stores.map(normalizeStore)); }
  async listInactiveStores(): Promise<Store[]> { return []; }

  async createStore(input: SaveStoreInput) {
    const database = await this.readDatabase();
    if (database.stores.some((store) => store.name === input.name)) throw new Error(`Store already exists: ${input.name}`);
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

  async deleteStore(name: string) { const database = await this.readDatabase(); const decodedName = decodeURIComponent(name); database.stores = database.stores.filter((store) => store.name !== decodedName); await this.writeDatabase(database); }
  async reactivateStore(id: string): Promise<Store> { throw new Error(`Store not found: ${id}`); }

  async listMenus() { const database = await this.readDatabase(); return sortByDisplayOrderThenName(database.menus.map(normalizeMenu).filter((menu) => menu.active !== false)); }
  async listInactiveMenus() { const database = await this.readDatabase(); return sortByDisplayOrderThenName(database.menus.map(normalizeMenu).filter((menu) => menu.active === false)); }

  async createMenu(input: SaveMenuInput) {
    const database = await this.readDatabase();
    const existingIndex = database.menus.findIndex((menu) => menu.name === input.name);
    const existing = existingIndex >= 0 ? normalizeMenu(database.menus[existingIndex]) : null;
    if (existing?.active !== false) throw new Error(`Menu already exists: ${input.name}`);
    if (existing) database.menus[existingIndex] = normalizeMenu({ ...input, id: existing.id, active: true });
    else database.menus = [...database.menus, normalizeMenu(input)];
    await this.writeDatabase(database);
    return normalizeMenu(input);
  }

  async updateMenu(name: string, input: SaveMenuInput) {
    const database = await this.readDatabase();
    const index = database.menus.findIndex((menu) => menu.name === name);
    if (index < 0) throw new Error(`Menu not found: ${name}`);
    database.menus[index] = normalizeMenu(input);
    if (name !== input.name) database.reservations = database.reservations.map((reservation) => ({ ...reservation, menuItems: reservation.menuItems.map((item) => item === name ? input.name : item) }));
    database.reservations = database.reservations.map((reservation) => ({ ...reservation, totalAmount: calculateTotalAmount(reservation.menuItems, database.menus) }));
    await this.writeDatabase(database);
    return normalizeMenu(input);
  }

  async deleteMenu(name: string) {
    const database = await this.readDatabase();
    database.menus = database.menus.map((menu) => menu.name === name ? normalizeMenu({ ...menu, id: menu.id ?? `file-menu-${encodeURIComponent(menu.name)}`, active: false }) : menu);
    await this.writeDatabase(database);
  }

  async reactivateMenu(id: string) {
    const database = await this.readDatabase();
    const index = database.menus.findIndex((menu) => menu.id === id);
    if (index < 0) throw new Error(`Menu not found: ${id}`);
    database.menus[index] = normalizeMenu({ ...database.menus[index], active: true });
    await this.writeDatabase(database);
    return normalizeMenu(database.menus[index]);
  }
}
