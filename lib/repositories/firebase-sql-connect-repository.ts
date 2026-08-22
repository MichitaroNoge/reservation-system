import { getDataConnect, type ConnectorConfig, type DataConnect } from "firebase-admin/data-connect";
import * as generated from "@reservation-system/dataconnect-admin";
import {
  calculateReservationEndTime,
  getAutomaticReservationStatus,
  normalizePaymentCondition,
  normalizeReservationRequestType,
  normalizeReservationStatus,
  reservationStatusCodes,
  toDataConnectReservationStatus,
  type Account,
  type CreateReservationChangeRequestInput,
  type CreateReservationInput,
  type Menu,
  type Reservation,
  type ReservationChangeRequest,
  type ReservationStatus,
  type SaveAccountInput,
  type SaveMenuInput,
  type SaveStoreInput,
  type Store,
  type StoreAssignment,
  type UpdateReservationInput,
} from "../domain";
import { getFirebaseAdminApp } from "../auth";
import type { ReservationRepository } from "./reservation-repository";

// Data Connect SDK is generated from dataconnect/**/*.gql. During this refactor the checked-in
// generated package may temporarily lag behind the schema, so access operations through a narrow
// runtime adapter. After `firebase dataconnect:sdk:generate` this resolves to the generated methods.
const sdk = generated as unknown as Record<string, any>;

const connectorConfig: ConnectorConfig = {
  ...(sdk.connectorConfig ?? {}),
  location: process.env.FIREBASE_DATACONNECT_LOCATION ?? "asia-northeast1",
  serviceId: process.env.FIREBASE_DATACONNECT_SERVICE_ID ?? "reservation-system",
  connector: process.env.FIREBASE_DATACONNECT_CONNECTOR ?? "reservation",
};

type RawReservation = Record<string, any>;
type RawAccount = Record<string, any>;
type RawMenu = Record<string, any>;
type RawStore = Record<string, any>;
type InternalReservation = Reservation & {
  dataConnectId: string;
  dataConnectReservationDetails: { id: string }[];
  dataConnectStoreAssignments: { id: string }[];
};

function op(name: string) {
  const fn = sdk[name];
  if (typeof fn !== "function") {
    throw new Error(`Data Connect SDK operation is not generated yet: ${name}. Run firebase dataconnect:sdk:generate.`);
  }
  return fn as (connection: DataConnect, variables?: Record<string, unknown>) => Promise<{ data: any }>;
}

export class FirebaseSqlConnectReservationRepository implements ReservationRepository {
  private dataConnect?: DataConnect;

  private connection() {
    this.dataConnect ??= getDataConnect(connectorConfig, getFirebaseAdminApp());
    return this.dataConnect;
  }

  async listReservations() {
    const { data } = await op("listReservations")(this.connection());
    return (data.reservations ?? []).map(toReservation);
  }

  async listReservationsForReservationAccount(firebaseUid: string) {
    const account = await this.findRawAccountByFirebaseUid(firebaseUid);
    if (!account) return [];
    const { data } = await op("listReservations")(this.connection());
    return (data.reservations ?? [])
      .filter((reservation: RawReservation) => reservation.account?.id === account.id)
      .map(toReservation);
  }

  async createReservation(input: CreateReservationInput) {
    const menuItems = input.menuItems ?? (input.menu ? [input.menu] : []);
    const reservationCode = await this.nextReservationCode();
    const firebaseUid = input.accountFirebaseUid ?? input.customerFirebaseUid;
    const account = firebaseUid ? await this.findRawAccountByFirebaseUid(firebaseUid) : null;
    if (firebaseUid && !account) throw new Error(`Account not found for Firebase UID: ${firebaseUid}`);

    const menus = await this.listRawMenus();
    const startTime = input.startTime ?? "10:00";
    const { data } = await op("createReservation")(this.connection(), {
      reservationCode,
      accountId: account?.id ?? null,
      reserverName: input.name,
      reserverEmail: input.email,
      reserverPhone: input.phone,
      reserverAddress: input.address ?? null,
      reserverAccountType: input.accountType ?? (input.bookingType === "travel_agency_group" ? "travel_agency" : "individual"),
      reserverCompanyBranchName: input.companyBranchName ?? null,
      reserverContactPersonName: input.contactPersonName ?? null,
      usageDate: input.date,
      usageTime: startTime,
      usageEndTime: input.endTime ?? calculateReservationEndTime(startTime, menuItems, menus.map(toMenu)),
      expectedPeople: input.people,
      status: toDataConnectReservationStatus(normalizeReservationStatus(input.status)),
      requestType: input.requestType ?? null,
      bookingType: input.bookingType ?? "individual",
      bookingContactName: input.bookingContactName ?? null,
      dayContactName: input.dayContactName ?? null,
      dayContactPhone: input.dayContactPhone ?? null,
      groupName: input.groupName ?? null,
      groupNameKana: input.groupNameKana ?? null,
      groupType: input.groupType ?? null,
      groupTypeOther: input.groupTypeOther ?? null,
      tcCount: input.tcCount ?? 0,
      dgCount: input.dgCount ?? 0,
      paymentCondition: normalizePaymentCondition(input.paymentCondition),
      remarks: input.remarks ?? null,
      policyAgreementKind: input.policyAgreement?.kind ?? null,
      policyAgreementAcceptedAt: input.policyAgreement?.acceptedAt ?? null,
    });

    const reservationId = data.reservation_insert.id;
    for (const menuName of menuItems) {
      const menu = menus.find((item) => item.name === menuName);
      if (!menu) continue;
      await op("addReservationDetail")(this.connection(), { reservationId, menuId: menu.id, quantity: 1, unitPrice: menu.standardPrice });
    }
    return this.getReservationWithInternalId(reservationCode);
  }

  async updateReservation(id: string, input: UpdateReservationInput) {
    const current = await this.getReservationWithInternalId(id);
    const shouldCalculateEndTime = input.endTime === undefined && (input.startTime !== undefined || input.menuItems !== undefined || !current.endTime);
    const menuCatalog = shouldCalculateEndTime ? await this.listMenus() : [];

    await op("updateReservation")(this.connection(), {
      id: current.dataConnectId,
      reserverName: input.customer ?? current.customer,
      reserverEmail: input.email ?? current.email ?? "",
      reserverPhone: input.phone ?? current.phone,
      reserverAddress: input.address ?? current.address ?? null,
      usageDate: input.date ?? current.date,
      usageTime: input.startTime ?? current.startTime ?? "10:00",
      usageEndTime: input.endTime ?? (shouldCalculateEndTime
        ? calculateReservationEndTime(input.startTime ?? current.startTime, input.menuItems ?? current.menuItems, menuCatalog)
        : current.endTime ?? null),
      expectedPeople: input.people ?? current.people,
      bookingType: input.bookingType ?? current.bookingType ?? "individual",
      bookingContactName: input.bookingContactName ?? current.bookingContactName ?? null,
      dayContactName: input.dayContactName ?? current.dayContactName ?? null,
      dayContactPhone: input.dayContactPhone ?? current.dayContactPhone ?? null,
      groupName: input.groupName ?? current.groupName ?? null,
      groupNameKana: input.groupNameKana ?? current.groupNameKana ?? null,
      groupType: input.groupType ?? current.groupType ?? null,
      groupTypeOther: input.groupTypeOther ?? current.groupTypeOther ?? null,
      tcCount: input.tcCount ?? current.tcCount ?? 0,
      dgCount: input.dgCount ?? current.dgCount ?? 0,
      paymentCondition: normalizePaymentCondition(input.paymentCondition ?? current.paymentCondition),
      remarks: input.remarks ?? current.remarks ?? null,
    });

    if (input.menuItems !== undefined) await this.replaceReservationDetails(current.dataConnectId, current.dataConnectReservationDetails, input.menuItems);
    return this.getReservationWithInternalId(id);
  }

  async updateReservationStatus(id: string, status: ReservationStatus, options?: { requestType?: Reservation["requestType"] }) {
    const current = await this.getReservationWithInternalId(id);
    const nextRequestType = options && "requestType" in options
      ? options.requestType ?? null
      : current.status === reservationStatusCodes.temporaryConfirmed && status === reservationStatusCodes.confirmedRequested
        ? "confirmed_from_temporary"
        : status === reservationStatusCodes.confirmedRequested ? current.requestType ?? null : null;
    await op("updateReservationStatus")(this.connection(), { id: current.dataConnectId, status: toDataConnectReservationStatus(status), requestType: nextRequestType });
    return this.getReservationWithInternalId(id);
  }

  async updateConfirmationContact(id: string, contactedAt: string | null) {
    const current = await this.getReservationWithInternalId(id);
    if (contactedAt === null) await op("clearConfirmationContact")(this.connection(), { id: current.dataConnectId });
    else await op("updateConfirmationContact")(this.connection(), { id: current.dataConnectId, confirmationContactedAt: contactedAt });
    return this.getReservationWithInternalId(id);
  }

  async assignStores(id: string, assignments: StoreAssignment[]) {
    const reservation = await this.getReservationWithInternalId(id);
    const valid = assignments.filter((item) => item.store && item.people > 0).map((item) => ({ store: item.store, people: Number(item.people) }));
    const total = valid.reduce((sum, item) => sum + item.people, 0);
    if (valid.length > 0 && total !== reservation.people) throw new Error(`Assigned people must equal reservation people: ${reservation.people}`);
    for (const assignment of reservation.dataConnectStoreAssignments) await op("deleteStoreAssignment")(this.connection(), { id: assignment.id });
    for (const assignment of valid) {
      const store = await this.getRawStoreByName(assignment.store);
      await op("assignStore")(this.connection(), { reservationId: reservation.dataConnectId, storeId: store.id, people: assignment.people });
    }
    return this.getReservationWithInternalId(id);
  }

  async listReservationChangeRequests() {
    const { data } = await op("listReservationChangeRequests")(this.connection());
    return (data.reservationChangeRequests ?? []).map(toReservationChangeRequest);
  }

  async createReservationChangeRequest(input: CreateReservationChangeRequestInput) {
    const reservation = await this.getReservationWithInternalId(input.reservationId);
    if (!reservationMatchesContact(reservation, input)) throw new Error(`Reservation not found: ${input.reservationId}`);
    assertCanRequestReservationChange(reservation);
    const { data } = await op("createReservationChangeRequest")(this.connection(), {
      reservationId: reservation.dataConnectId,
      requestedDate: input.requestedDate,
      requestedTime: input.requestedStartTime,
      requestedPeople: input.requestedPeople,
      requestedMenuItemsJson: JSON.stringify(input.requestedMenuItems),
      reason: input.reason ?? null,
    });
    const created = (await this.listReservationChangeRequests()).find((item) => item.id === data.reservationChangeRequest_insert.id);
    if (!created) throw new Error(`Reservation change request not found: ${data.reservationChangeRequest_insert.id}`);
    return created;
  }

  async approveReservationChangeRequest(id: string) {
    const request = await this.getReservationChangeRequest(id);
    if (request.status !== "requested") throw new Error(`Reservation change request already reviewed: ${id}`);
    const reservation = await this.getReservationWithInternalId(request.reservationId);
    const resetAssignments = reservation.date !== request.requestedDate || (reservation.startTime ?? "10:00") !== request.requestedStartTime || reservation.people !== request.requestedPeople;
    await this.updateReservation(reservation.id, { date: request.requestedDate, startTime: request.requestedStartTime, people: request.requestedPeople, menuItems: request.requestedMenuItems });
    if (resetAssignments) {
      const refreshed = await this.getReservationWithInternalId(request.reservationId);
      for (const assignment of refreshed.dataConnectStoreAssignments) await op("deleteStoreAssignment")(this.connection(), { id: assignment.id });
    }
    const updated = await this.getReservationWithInternalId(request.reservationId);
    const automaticStatus = getAutomaticReservationStatus(updated);
    const reservationAfterStatus = automaticStatus === updated.status ? updated : await this.updateReservationStatus(updated.id, automaticStatus);
    const reviewedAt = new Date().toISOString();
    await op("updateReservationChangeRequestStatus")(this.connection(), { id, status: "APPROVED", reviewedAt });
    return { request: { ...request, status: "approved" as const, reviewedAt }, reservation: reservationAfterStatus };
  }

  async rejectReservationChangeRequest(id: string) {
    const request = await this.getReservationChangeRequest(id);
    if (request.status !== "requested") throw new Error(`Reservation change request already reviewed: ${id}`);
    const reviewedAt = new Date().toISOString();
    await op("updateReservationChangeRequestStatus")(this.connection(), { id, status: "REJECTED", reviewedAt });
    return { ...request, status: "rejected" as const, reviewedAt };
  }

  async listAccounts() {
    const { data } = await op("listAccounts")(this.connection());
    return (data.accounts ?? []).map(toAccount);
  }

  async listInactiveAccounts() {
    const { data } = await op("listInactiveAccounts")(this.connection());
    return (data.accounts ?? []).map(toAccount);
  }

  async findAccountByFirebaseUid(firebaseUid: string) {
    const account = await this.findRawAccountByFirebaseUid(firebaseUid);
    return account ? toAccount(account) : null;
  }

  async createAccount(input: SaveAccountInput & { firebaseUid: string }) {
    if (await this.findRawAccountByFirebaseUid(input.firebaseUid)) throw new Error(`Account already exists for Firebase UID: ${input.firebaseUid}`);
    const { data } = await op("createAccount")(this.connection(), accountVariables(input));
    const raw = await this.getRawAccountById(data.account_insert.id);
    return toAccount(raw);
  }

  async updateAccount(id: string, input: SaveAccountInput) {
    await op("updateAccount")(this.connection(), { id, ...accountVariables(input) });
    return toAccount(await this.getRawAccountById(id));
  }

  async deactivateAccount(id: string) { await op("deactivateAccount")(this.connection(), { id }); }

  async reactivateAccount(id: string) {
    await op("reactivateAccount")(this.connection(), { id });
    return toAccount(await this.getRawAccountById(id));
  }

  async listStores() { const { data } = await op("listStores")(this.connection()); return sortByDisplayOrderThenName((data.stores ?? []).map(toStore)); }
  async listInactiveStores() { const { data } = await op("listInactiveStores")(this.connection()); return sortByDisplayOrderThenName((data.stores ?? []).map(toStore)); }

  async createStore(input: SaveStoreInput) {
    const existing = await this.findRawStoreByName(input.name);
    if (existing?.active) throw new Error(`Store already exists: ${input.name}`);
    if (existing) {
      await op("updateStore")(this.connection(), { id: existing.id, name: input.name, displayOrder: input.displayOrder, active: true });
      await op("reactivateStore")(this.connection(), { id: existing.id });
      return toStore(await this.getRawStoreById(existing.id));
    }
    const { data } = await op("createStore")(this.connection(), { name: input.name, displayOrder: input.displayOrder, active: true });
    return { ...input, id: data.store_insert?.id };
  }

  async updateStore(name: string, input: SaveStoreInput) {
    const store = await this.getRawStoreByName(name);
    await op("updateStore")(this.connection(), { id: store.id, name: input.name, displayOrder: input.displayOrder, active: true });
    return { ...input, id: store.id };
  }

  async deleteStore(name: string) { const store = await this.getRawStoreByName(name); await op("deactivateStore")(this.connection(), { id: store.id }); }
  async reactivateStore(id: string) { await op("reactivateStore")(this.connection(), { id }); return toStore(await this.getRawStoreById(id)); }

  async listMenus() { return sortByDisplayOrderThenName((await this.listRawMenus()).map(toMenu)); }
  async listInactiveMenus() { const { data } = await op("listInactiveMenus")(this.connection()); return sortByDisplayOrderThenName((data.menus ?? []).map(toMenu)); }

  async createMenu(input: SaveMenuInput) {
    const existing = await this.findRawMenuByName(input.name);
    if (existing?.active) throw new Error(`Menu already exists: ${input.name}`);
    if (existing) {
      await op("updateMenu")(this.connection(), menuVariables(existing.id, input, true));
      await op("reactivateMenu")(this.connection(), { id: existing.id });
      return toMenu(await this.getRawMenuByName(input.name));
    }
    const { data } = await op("createMenu")(this.connection(), { name: input.name, description: input.description, standardPrice: input.price, durationMinutes: durationToMinutes(input.duration), displayOrder: input.displayOrder, active: true });
    return { ...input, id: data.menu_insert?.id, active: true };
  }

  async updateMenu(name: string, input: SaveMenuInput) {
    const menu = await this.getRawMenuByName(name);
    await op("updateMenu")(this.connection(), menuVariables(menu.id, input, true));
    return { ...input, id: menu.id, active: true };
  }

  async deleteMenu(name: string) { const menu = await this.getRawMenuByName(name); await op("deactivateMenu")(this.connection(), { id: menu.id }); }
  async reactivateMenu(id: string) { await op("reactivateMenu")(this.connection(), { id }); const all = [...await this.listRawMenus(), ...await this.listRawInactiveMenus()]; const menu = all.find((item) => item.id === id); if (!menu) throw new Error(`Menu not found: ${id}`); return toMenu(menu); }

  private async getReservationWithInternalId(reservationCode: string): Promise<InternalReservation> {
    const { data } = await op("getReservationByCode")(this.connection(), { reservationCode });
    const raw = data.reservations?.[0];
    if (!raw) throw new Error(`Reservation not found: ${reservationCode}`);
    return {
      ...toReservation(raw),
      dataConnectId: raw.id,
      dataConnectReservationDetails: (raw.reservationDetails_on_reservation ?? []).map((item: any) => ({ id: item.id })),
      dataConnectStoreAssignments: (raw.storeAssignments_on_reservation ?? []).map((item: any) => ({ id: item.id })),
    };
  }

  private async replaceReservationDetails(reservationId: string, existing: { id: string }[], menuItems: string[]) {
    for (const detail of existing) await op("deleteReservationDetail")(this.connection(), { id: detail.id });
    const menus = await this.listRawMenus();
    for (const menuName of menuItems) {
      const menu = menus.find((item) => item.name === menuName);
      if (!menu) continue;
      await op("addReservationDetail")(this.connection(), { reservationId, menuId: menu.id, quantity: 1, unitPrice: menu.standardPrice });
    }
  }

  private async getReservationChangeRequest(id: string) {
    const request = (await this.listReservationChangeRequests()).find((item) => item.id === id);
    if (!request) throw new Error(`Reservation change request not found: ${id}`);
    return request;
  }

  private async findRawAccountByFirebaseUid(firebaseUid: string): Promise<RawAccount | undefined> {
    const { data } = await op("getAccountByFirebaseUid")(this.connection(), { firebaseUid });
    return data.accounts?.[0];
  }

  private async getRawAccountById(id: string): Promise<RawAccount> {
    const { data } = await op("getAccountById")(this.connection(), { id });
    if (!data.account) throw new Error(`Account not found: ${id}`);
    return data.account;
  }

  private async listRawMenus(): Promise<RawMenu[]> { const { data } = await op("listMenus")(this.connection()); return data.menus ?? []; }
  private async listRawInactiveMenus(): Promise<RawMenu[]> { const { data } = await op("listInactiveMenus")(this.connection()); return data.menus ?? []; }
  private async findRawMenuByName(name: string): Promise<RawMenu | undefined> { const { data } = await op("getMenuByName")(this.connection(), { name }); return data.menus?.[0]; }
  private async getRawMenuByName(name: string): Promise<RawMenu> { const menu = await this.findRawMenuByName(name); if (!menu) throw new Error(`Menu not found: ${name}`); return menu; }
  private async findRawStoreByName(name: string): Promise<RawStore | undefined> { const { data } = await op("getStoreByName")(this.connection(), { name }); return data.stores?.[0]; }
  private async getRawStoreByName(name: string): Promise<RawStore> { const store = await this.findRawStoreByName(name); if (!store) throw new Error(`Store not found: ${name}`); return store; }
  private async getRawStoreById(id: string): Promise<RawStore> { const { data } = await op("getStoreById")(this.connection(), { id }); if (!data.store) throw new Error(`Store not found: ${id}`); return data.store; }

  private async nextReservationCode() {
    const reservations = await this.listReservations();
    const max = reservations.reduce((current, reservation) => {
      const parsed = Number(reservation.id.replace("RSV-", ""));
      return Number.isFinite(parsed) ? Math.max(current, parsed) : current;
    }, 1000);
    return `RSV-${max + 1}`;
  }
}

function accountVariables(input: SaveAccountInput & { firebaseUid?: string }) {
  return {
    ...(input.firebaseUid ? { firebaseUid: input.firebaseUid } : {}),
    name: input.name,
    phone: input.phone ?? null,
    email: input.contact,
    address: input.address ?? null,
    accountType: input.accountType ?? "individual",
    companyBranchName: input.companyBranchName ?? null,
    contactPersonName: input.contactPersonName ?? null,
  };
}

function toAccount(raw: RawAccount): Account {
  return { id: raw.id, firebaseUid: raw.firebaseUid, name: raw.name, contact: raw.email, phone: raw.phone ?? undefined, address: raw.address ?? undefined, accountType: raw.accountType ?? undefined, companyBranchName: raw.companyBranchName ?? undefined, contactPersonName: raw.contactPersonName ?? undefined, active: raw.active };
}

function toReservation(raw: RawReservation): Reservation {
  const details = raw.reservationDetails_on_reservation ?? [];
  const assignments = raw.storeAssignments_on_reservation ?? [];
  const menuItems = details.flatMap((detail: any) => Array(Math.max(1, detail.quantity ?? 1)).fill(detail.menu?.name)).filter(Boolean);
  const totalAmount = details.reduce((sum: number, detail: any) => sum + (detail.unitPrice ?? 0) * (detail.quantity ?? 1), 0);
  const storeAssignments = assignments.map((assignment: any) => ({ store: assignment.store.name, people: assignment.people }));
  const store = storeAssignments.length === 1 ? storeAssignments[0].store : storeAssignments.length > 1 ? "複数店舗" : null;
  return {
    id: raw.reservationCode,
    accountId: raw.account?.id ?? null,
    customer: raw.reserverName,
    email: raw.reserverEmail,
    phone: raw.reserverPhone,
    address: raw.reserverAddress ?? undefined,
    date: String(raw.usageDate),
    startTime: raw.usageTime,
    endTime: raw.usageEndTime ?? undefined,
    people: raw.expectedPeople,
    bookingType: raw.bookingType ?? undefined,
    bookingContactName: raw.bookingContactName ?? undefined,
    dayContactName: raw.dayContactName ?? undefined,
    dayContactPhone: raw.dayContactPhone ?? undefined,
    groupName: raw.groupName ?? undefined,
    groupNameKana: raw.groupNameKana ?? undefined,
    groupType: raw.groupType ?? undefined,
    groupTypeOther: raw.groupTypeOther ?? undefined,
    tcCount: raw.tcCount ?? 0,
    dgCount: raw.dgCount ?? 0,
    paymentCondition: normalizePaymentCondition(raw.paymentCondition),
    remarks: raw.remarks ?? undefined,
    menuItems,
    totalAmount,
    store,
    storeAssignments,
    status: normalizeReservationStatus(raw.status),
    requestType: normalizeReservationRequestType(raw.requestType),
    policyAgreement: raw.policyAgreementKind && raw.policyAgreementAcceptedAt ? { kind: raw.policyAgreementKind, acceptedAt: String(raw.policyAgreementAcceptedAt) } : undefined,
    confirmationContactedAt: raw.confirmationContactedAt ? String(raw.confirmationContactedAt) : null,
    received: raw.receivedAt ? String(raw.receivedAt) : "",
  };
}

function toReservationChangeRequest(raw: Record<string, any>): ReservationChangeRequest {
  const reservation = raw.reservation;
  return {
    id: raw.id,
    reservationId: reservation.reservationCode,
    customer: reservation.reserverName,
    email: reservation.reserverEmail,
    phone: reservation.reserverPhone,
    currentDate: String(reservation.usageDate),
    currentStartTime: reservation.usageTime,
    currentPeople: reservation.expectedPeople,
    currentMenuItems: (reservation.reservationDetails_on_reservation ?? []).flatMap((detail: any) => Array(Math.max(1, detail.quantity ?? 1)).fill(detail.menu?.name)).filter(Boolean),
    requestedDate: String(raw.requestedDate),
    requestedStartTime: raw.requestedTime,
    requestedPeople: raw.requestedPeople,
    requestedMenuItems: safeParseStringArray(raw.requestedMenuItemsJson),
    reason: raw.reason ?? undefined,
    status: String(raw.status).toLowerCase() as ReservationChangeRequest["status"],
    requestedAt: String(raw.requestedAt),
    reviewedAt: raw.reviewedAt ? String(raw.reviewedAt) : null,
  };
}

function toMenu(raw: RawMenu): Menu {
  return { id: raw.id, name: raw.name, description: raw.description ?? "", price: raw.standardPrice, duration: raw.durationMinutes === 0 ? "来店後" : `${raw.durationMinutes}分`, displayOrder: raw.displayOrder ?? 0, active: raw.active ?? true };
}
function toStore(raw: RawStore): Store { return { id: raw.id, name: raw.name, displayOrder: raw.displayOrder ?? 0 }; }
function sortByDisplayOrderThenName<T extends { displayOrder?: number; name: string }>(items: T[]) { return [...items].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name, "ja-JP", { numeric: true })); }
function durationToMinutes(duration: string) { if (duration === "来店後") return 0; const match = duration.match(/\d+/); return match ? Number(match[0]) : 0; }
function menuVariables(id: string, input: SaveMenuInput, active: boolean) { return { id, name: input.name, description: input.description, standardPrice: input.price, durationMinutes: durationToMinutes(input.duration), displayOrder: input.displayOrder, active }; }
function safeParseStringArray(value: unknown) { try { const parsed = JSON.parse(String(value ?? "[]")); return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []; } catch { return []; } }
function normalizeContact(value: string | undefined) { return (value ?? "").replace(/[\s-]/g, "").toLowerCase(); }
function reservationMatchesContact(reservation: Reservation, input: { email?: string; phone?: string }) { return Boolean((input.email && normalizeContact(reservation.email) === normalizeContact(input.email)) || (input.phone && normalizeContact(reservation.phone) === normalizeContact(input.phone))); }
function assertCanRequestReservationChange(reservation: Reservation) {
  const allowed: readonly ReservationStatus[] = [reservationStatusCodes.temporaryRequested, reservationStatusCodes.temporaryConfirmed, reservationStatusCodes.confirmedRequested, reservationStatusCodes.confirmed, reservationStatusCodes.waitingForVisit];
  if (!allowed.includes(reservation.status)) throw new Error(`Reservation change cannot be requested for status: ${reservation.status}`);
}
