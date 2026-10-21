import { reservationNotificationSnapshot } from "../services/reservation-notification-state";
import { assertReservationChangeAllowed } from "../domain";
import { assertReservationChangeApproval } from "../services/reservation-change-approval-service";
import { isCompletedBooking } from "../cancellation-policy";
import { calculateReservationEndTime, defaultReservationStatus, getAutomaticReservationStatus, normalizePaymentCondition, normalizeReservationRequestType, normalizeReservationStatus, reservationStatusCodes, shouldResetConfirmationContact, shouldResetConfirmationContactForAssignments, type Account, type AccountContactEmail, type ApprovalEmailDelivery, type ApprovalEmailType, type CreateReservationChangeRequestInput, type CreateReservationInput, type EmailDelivery, type EmailSettings, type EmailTemplate, type Menu, type Reservation, type ReservationChangeRequest, type ReservationStatus, type SaveAccountInput, type SaveMenuInput, type SaveStoreInput, type Store, type StoreAssignment, type UpdateReservationInput } from "../domain";
import { defaultEmailTemplates } from "../email/email-template-catalog";
import { seedMenus, seedReservations, seedStores } from "../seed-data";
import type { ReservationRepository } from "./reservation-repository";

export type InMemoryReservationDatabase = {
  reservations: Reservation[];
  reservationChangeRequests?: ReservationChangeRequest[];
  menus: Menu[];
  stores: Store[];
  accounts?: Account[];
  approvalEmailDeliveries?: ApprovalEmailDelivery[];
  emailTemplates?: EmailTemplate[];
  emailDeliveries?: EmailDelivery[];
  systemSettings?: import("../domain").SystemSettings;
  emailSettings?: EmailSettings;
  accountContactEmails?: AccountContactEmail[];
};

const defaultStartTime = "10:00";

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

export class InMemoryReservationRepository implements ReservationRepository {
  private database: InMemoryReservationDatabase;

  constructor(initial?: Partial<InMemoryReservationDatabase>) {
    this.database = structuredClone({
      reservations: initial?.reservations ?? seedReservations,
      reservationChangeRequests: initial?.reservationChangeRequests ?? [],
      menus: initial?.menus ?? seedMenus,
      stores: initial?.stores ?? seedStores,
      accounts: initial?.accounts ?? [],
      approvalEmailDeliveries: initial?.approvalEmailDeliveries ?? [],
    });
    this.database.reservations = this.database.reservations.map((reservation) => normalizeReservation(reservation, this.database.menus));
  }

  private async readDatabase() { return this.database; }
  private async writeDatabase(database: InMemoryReservationDatabase) { this.database = database; }

  async recordCancellationPolicyConsent(id: string, input: Omit<import("../cancellation-policy-consent").CancellationPolicyConsent, "people"> & { firebaseUid: string }) {
    const reservation = this.database.reservations.find(item => item.id === id);
    if (!reservation) throw new Error("Reservation not found: " + id);
    reservation.policyConsents = [...(reservation.policyConsents ?? []), { source: input.source, acceptedAt: input.acceptedAt, version: input.version, policyText: input.policyText, people: reservation.people }];
    reservation.policyAgreement = { kind: "confirmed", acceptedAt: input.acceptedAt };
    return reservation;
  }
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
      accountType: input.accountType, companyBranchName: input.companyBranchName, contactPersonName: input.contactPersonName,
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
      initialConfirmedPeople: isCompletedBooking(normalizeReservationStatus(input.status)) ? input.people : null,
      menuItems,
      totalAmount: calculateTotalAmount(menuItems, database.menus),
      store: null,
      storeAssignments: [],
      status: input.status ? normalizeReservationStatus(input.status) : defaultReservationStatus,
      requestType: input.requestType ?? null,
      policyAgreement: input.policyAgreement,
      confirmationContactedAt: null,
      receiptEmailRequestedAt: input.receiptEmailRequestedAt ?? null,
      receiptEmailSentAt: null,
      receiptEmailLastAttemptAt: null,
      receiptEmailRetryCount: 0,
      receiptEmailLastError: null,
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
    reservation.revision = (reservation.revision ?? 0) + 1;
    const resetConfirmationContact = shouldResetConfirmationContact(reservation, input);
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
    if (resetConfirmationContact) reservation.confirmationContactedAt = null;
    await this.writeDatabase(database);
    return reservation;
  }

  async updateReservationStatus(id: string, status: ReservationStatus, options?: { requestType?: Reservation["requestType"] }) {
    const database = await this.readDatabase();
    const reservation = database.reservations.find((item) => item.id === id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    const previousStatus = reservation.status;
    const nextStatus = normalizeReservationStatus(status);
    if (!isCompletedBooking(previousStatus) && isCompletedBooking(nextStatus) && reservation.initialConfirmedPeople == null) reservation.initialConfirmedPeople = reservation.people;
    if (nextStatus === "cancellation_requested" && previousStatus !== nextStatus) reservation.cancellationPreviousStatus = previousStatus === "confirmed_requested" && reservation.requestType === "confirmed_from_temporary" ? "temporary_confirmed" : previousStatus;
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

  async updateReceiptEmailDelivery(id: string, input: { sentAt?: string | null; lastAttemptAt: string; retryCount: number; lastError?: string | null; nextAttemptAt?: string | null; stoppedAt?: string | null }) {
    const database = await this.readDatabase();
    const reservation = database.reservations.find((item) => item.id === id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    reservation.receiptEmailSentAt = input.sentAt ?? null;
    reservation.receiptEmailLastAttemptAt = input.lastAttemptAt;
    reservation.receiptEmailRetryCount = input.retryCount;
    reservation.receiptEmailLastError = input.lastError ?? null;
    reservation.receiptEmailNextAttemptAt = input.nextAttemptAt ?? null;
    await this.writeDatabase(database);
    return reservation;
  }

  async listApprovalEmailDeliveries() { return (await this.readDatabase()).approvalEmailDeliveries ?? []; }

  async createApprovalEmailDelivery(input: { deliveryKey: string; reservationId: string; type: ApprovalEmailType; referenceId?: string | null; requestedAt: string; snapshotKey?: string | null }) {
    const database = await this.readDatabase();
    database.approvalEmailDeliveries ??= [];
    const existing = database.approvalEmailDeliveries.find((item) => item.deliveryKey === input.deliveryKey);
    if (existing) return existing;
    const delivery: ApprovalEmailDelivery = { ...input, snapshotKey: input.snapshotKey ?? reservationNotificationSnapshot(database.reservations.find(r => r.id === input.reservationId)!), id: `AED-${database.approvalEmailDeliveries.length + 1}`, retryCount: 0, sentAt: null, lastAttemptAt: null, lastError: null };
    database.approvalEmailDeliveries.push(delivery);
    await this.writeDatabase(database);
    return delivery;
  }

  async updateApprovalEmailDelivery(deliveryKey: string, input: Parameters<ReservationRepository["updateApprovalEmailDelivery"]>[1]) {
    const database = await this.readDatabase();
    const delivery = (database.approvalEmailDeliveries ?? []).find((item) => item.deliveryKey === deliveryKey);
    if (!delivery) throw new Error(`Approval email delivery not found: ${deliveryKey}`);
    Object.assign(delivery, { sentAt: input.sentAt ?? null, lastAttemptAt: input.lastAttemptAt, retryCount: input.retryCount, lastError: input.lastError ?? null, nextAttemptAt: input.nextAttemptAt ?? null, stoppedAt: input.stoppedAt ?? null });
    await this.writeDatabase(database);
    return delivery;
  }

  async listEmailTemplates() {
    const database = await this.readDatabase();
    return database.emailTemplates?.length ? database.emailTemplates : defaultEmailTemplates();
  }

  async getEmailTemplate(templateKey: string) {
    return (await this.listEmailTemplates()).find((item) => item.templateKey === templateKey) ?? null;
  }

  async upsertEmailTemplate(input: EmailTemplate) {
    const database = await this.readDatabase();
    database.emailTemplates ??= defaultEmailTemplates();
    const index = database.emailTemplates.findIndex((item) => item.templateKey === input.templateKey);
    const now = new Date().toISOString();
    const saved = { ...input, id: input.id ?? `ET-${index >= 0 ? index + 1 : database.emailTemplates.length + 1}`, createdAt: input.createdAt ?? now, updatedAt: now };
    if (index >= 0) database.emailTemplates[index] = saved;
    else database.emailTemplates.push(saved);
    await this.writeDatabase(database);
    return saved;
  }

  async getEmailDelivery(deliveryKey: string) {
    return (await this.readDatabase()).emailDeliveries?.find((item) => item.deliveryKey === deliveryKey) ?? null;
  }

  async createEmailDelivery(input: EmailDelivery) {
    const database = await this.readDatabase();
    database.emailDeliveries ??= [];
    const existing = database.emailDeliveries.find((item) => item.deliveryKey === input.deliveryKey);
    if (existing) return existing;
    const delivery = { ...input, id: `ED-${database.emailDeliveries.length + 1}` };
    database.emailDeliveries.push(delivery);
    await this.writeDatabase(database);
    return delivery;
  }

  async updateEmailDelivery(deliveryKey: string, input: Pick<EmailDelivery, "status" | "sentAt" | "lastError">) {
    const database = await this.readDatabase();
    const delivery = database.emailDeliveries?.find((item) => item.deliveryKey === deliveryKey);
    if (!delivery) throw new Error(`Email delivery not found: ${deliveryKey}`);
    Object.assign(delivery, input);
    await this.writeDatabase(database);
    return delivery;
  }

  async getSystemSettings() { const settings=(await this.readDatabase()).systemSettings; return {revision:settings?.revision ?? 0,reservationLeadDays:settings?.reservationLeadDays ?? 3,acceptanceCapacity:settings?.acceptanceCapacity ?? null,blockedPeriods:settings?.blockedPeriods ?? []}; }
  async saveSystemSettings(input: import("../domain").SystemSettings) { const database=await this.readDatabase(); if (input.revision !== undefined && input.revision !== (database.systemSettings?.revision ?? 0)) throw Object.assign(new Error("他の画面で設定が更新されました。再読み込みしてから保存してください。"), { statusCode: 409 }); database.systemSettings={...database.systemSettings,...input, revision:(database.systemSettings?.revision ?? 0)+1}; await this.writeDatabase(database); return database.systemSettings; }
  async getEmailSettings() {
    return (await this.readDatabase()).emailSettings ?? null;
  }

  async upsertEmailSettings(input: EmailSettings) {
    const database = await this.readDatabase();
    database.emailSettings = { ...input, id: database.emailSettings?.id ?? "ES-default", updatedAt: new Date().toISOString() };
    await this.writeDatabase(database);
    return database.emailSettings;
  }

  async assignStores(id: string, assignments: StoreAssignment[]) {
    const database = await this.readDatabase();
    const reservation = database.reservations.find((item) => item.id === id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    const validAssignments = assignments.filter((assignment) => assignment.store && assignment.people > 0).map((assignment) => ({ store: assignment.store, people: Number(assignment.people) }));
    const assignedPeople = validAssignments.reduce((total, assignment) => total + assignment.people, 0);
    if (validAssignments.length > 0 && assignedPeople !== reservation.people) throw new Error(`Assigned people must equal reservation people: ${reservation.people}`);
    const resetConfirmationContact = shouldResetConfirmationContactForAssignments(reservation, validAssignments);
    reservation.storeAssignments = validAssignments;
    reservation.store = validAssignments.length === 1 ? validAssignments[0].store : validAssignments.length > 1 ? "複数店舗" : null;
    if (resetConfirmationContact) reservation.confirmationContactedAt = null;
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
    if (input.expectedRevision !== undefined && input.expectedRevision !== (reservation.revision ?? 0)) throw Object.assign(new Error("予約内容が更新されています。予約一覧を再読み込みし、現在の内容を確認してから変更申請してください。"), { statusCode: 409 });
    const existing = database.reservationChangeRequests.find(item => item.reservationId === reservation.id && item.status === "requested" && item.requestedDate === input.requestedDate && item.requestedStartTime === input.requestedStartTime && item.requestedPeople === input.requestedPeople && JSON.stringify([...item.requestedMenuItems].sort()) === JSON.stringify([...input.requestedMenuItems].sort()) && (item.reason ?? "") === (input.reason ?? ""));
    if (existing) {
      if (existing.baseRevision !== (reservation.revision ?? 0) && input.expectedRevision !== (reservation.revision ?? 0)) throw Object.assign(new Error("予約内容が更新されています。予約一覧を再読み込みし、現在の内容を確認してから再申請してください。"), { statusCode: 409 });
      if (existing.baseRevision !== (reservation.revision ?? 0) || (input.feeAcknowledgement && existing.feeAcknowledgement?.context !== input.feeAcknowledgement.context)) {
        existing.feeAcknowledgement = input.feeAcknowledgement ?? null;
        existing.baseRevision = reservation.revision ?? 0;
        await this.writeDatabase(database);
      }
      return existing;
    }
    const request: ReservationChangeRequest = {
      id: nextChangeRequestId(database.reservationChangeRequests), reservationId: reservation.id, customer: reservation.customer, email: reservation.email, phone: reservation.phone,
      currentDate: reservation.date, currentStartTime: reservation.startTime ?? defaultStartTime, currentPeople: reservation.people, currentMenuItems: reservation.menuItems ?? [],
      requestedDate: input.requestedDate, requestedStartTime: input.requestedStartTime, requestedPeople: input.requestedPeople, requestedMenuItems: input.requestedMenuItems,
      reason: input.reason, baseRevision: reservation.revision ?? 0, feeAcknowledgement: input.feeAcknowledgement ?? null, status: "requested", requestedAt: new Date().toISOString(), reviewedAt: null,
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
    assertReservationChangeAllowed(reservation.status);
    await assertReservationChangeApproval(this, reservation, request);
    const resetConfirmationContact = shouldResetConfirmationContact(reservation, { date: request.requestedDate, startTime: request.requestedStartTime, people: request.requestedPeople, menuItems: request.requestedMenuItems });
    const shouldResetAssignments = reservation.date !== request.requestedDate || (reservation.startTime ?? defaultStartTime) !== request.requestedStartTime || reservation.people !== request.requestedPeople;
    reservation.revision = (reservation.revision ?? 0) + 1;
    reservation.date = request.requestedDate;
    reservation.startTime = request.requestedStartTime;
    reservation.people = request.requestedPeople;
    reservation.menuItems = request.requestedMenuItems;
    reservation.endTime = calculateReservationEndTime(reservation.startTime, reservation.menuItems, database.menus);
    reservation.totalAmount = calculateTotalAmount(request.requestedMenuItems, database.menus);
    if (resetConfirmationContact) reservation.confirmationContactedAt = null;
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
    const account: Account = { ...input, id: `memory-account-${input.firebaseUid}`, active: true };
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

  async listAccountContactEmails(accountId: string) { return ((await this.readDatabase()).accountContactEmails ?? []).filter((item) => item.accountId === accountId); }
  async findAccountContactEmailByToken(tokenHash: string) {
    const database = await this.readDatabase();
    const item = database.accountContactEmails?.find((entry) => entry.verificationTokenHash === tokenHash);
    if (!item) return null;
    const account = database.accounts?.find((entry) => entry.id === item.accountId);
    return { ...item, firebaseUid: account?.firebaseUid, accountEmail: account?.contact, accountName: account?.name };
  }
  async createAccountContactEmail(input: { accountId: string; email: string; verificationTokenHash: string; verificationExpiresAt: string }) {
    const database = await this.readDatabase(); database.accountContactEmails ??= [];
    if (database.accountContactEmails.some((item) => item.email === input.email)) throw new Error("Contact email already exists");
    const item: AccountContactEmail = { ...input, id: `ACE-${database.accountContactEmails.length + 1}`, verifiedAt: null, createdAt: new Date().toISOString() };
    database.accountContactEmails.push(item); await this.writeDatabase(database); return item;
  }
  async verifyAccountContactEmail(id: string, verifiedAt: string) { const database = await this.readDatabase(); const item = database.accountContactEmails?.find((entry) => entry.id === id); if (!item) throw new Error("Contact email not found"); item.verifiedAt = verifiedAt; await this.writeDatabase(database); }
  async deleteAccountContactEmail(id: string) { const database = await this.readDatabase(); database.accountContactEmails = (database.accountContactEmails ?? []).filter((item) => item.id !== id); await this.writeDatabase(database); }

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
    database.stores[index] = normalizeStore({ ...database.stores[index], ...input });
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
    database.menus = database.menus.map((menu) => menu.name === name ? normalizeMenu({ ...menu, id: menu.id ?? `memory-menu-${encodeURIComponent(menu.name)}`, active: false }) : menu);
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
