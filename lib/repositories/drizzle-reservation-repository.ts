import { consumeDatabaseLimits } from "../db/abuse-limit-store";
import { reservationNotificationSnapshot } from "../services/reservation-notification-state";
import { assertReservationChangeAllowed } from "../domain";
import { assertReservationChangeApproval } from "../services/reservation-change-approval-service";
import { isCompletedBooking } from "../cancellation-policy";
import "server-only";
import { and, asc, desc, eq, sql, gte, lte, lt, gt, or, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as s from "../db/schema";
import {
  calculateReservationEndTime, getAutomaticReservationStatus, normalizePaymentCondition,
  normalizeReservationRequestType, normalizeReservationStatus, reservationStatusCodes,
  shouldResetConfirmationContact, shouldResetConfirmationContactForAssignments, toDataConnectReservationStatus,
  type Account, type AccountContactEmail, type ApprovalEmailDelivery, type CreateReservationInput,
  type CreateReservationChangeRequestInput, type EmailDelivery, type EmailSettings, type EmailTemplate,
  type Menu, type Reservation, type ReservationChangeRequest, type SaveAccountInput,
  type SaveMenuInput, type SaveStoreInput, type Store, type StoreAssignment, type UpdateReservationInput,
} from "../domain";
import type { ReservationRepository } from "./reservation-repository";
import { planReservationDetails } from "../reservation-details";

export type ReservationDatabase = NodePgDatabase<typeof s>;
const reservationRelations = { policyConsents: { columns: { acceptedByFirebaseUid: false } }, account: true, reservationDetails: { with: { menu: true } }, storeAssignments: { with: { store: true } } } as const;
const now = () => new Date().toISOString();
const iso = (value: string | null) => value ? new Date(value).toISOString() : null;
const profile = (input: SaveAccountInput) => ({ name: input.name, email: input.contact, phone: input.phone ?? null, address: input.address ?? null, accountType: input.accountType ?? "individual", companyBranchName: input.companyBranchName ?? null, contactPersonName: input.contactPersonName ?? null });
const accountModel = (raw: typeof s.account.$inferSelect): Account => ({ id: raw.id, firebaseUid: raw.firebaseUid, name: raw.name, contact: raw.email, phone: raw.phone ?? undefined, address: raw.address ?? undefined, accountType: raw.accountType as Account["accountType"], companyBranchName: raw.companyBranchName ?? undefined, contactPersonName: raw.contactPersonName ?? undefined, active: raw.active });
const contactModel = (raw: typeof s.accountContactEmail.$inferSelect): AccountContactEmail => ({ ...raw, verifiedAt: iso(raw.verifiedAt), verificationExpiresAt: iso(raw.verificationExpiresAt)!, createdAt: iso(raw.createdAt)!, verificationTokenHash: raw.verificationTokenHash });
const menuModel = (raw: typeof s.menu.$inferSelect): Menu => ({ id: raw.id, name: raw.name, description: raw.description ?? "", price: raw.standardPrice, duration: raw.durationMinutes === 0 ? "来店後" : `${raw.durationMinutes}分`, displayOrder: raw.displayOrder, active: raw.active });
const storeModel = (raw: typeof s.store.$inferSelect): Store => ({ id: raw.id, name: raw.name, displayOrder: raw.displayOrder, capacity: raw.capacity });
function sorted<T extends { displayOrder: number; name: string }>(items: T[]) { return items.sort((a,b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "ja-JP", { numeric: true })); }

/** Server-side only: instantiated by lib/db/client's server-only runtime factory, or isolated DB tests. */
export class DrizzleReservationRepository implements ReservationRepository {
  constructor(private readonly db: ReservationDatabase, private readonly inTransaction = false) {}

  consumeEmailLimits(limits: import("../abuse-limits").Limit[]) { return consumeDatabaseLimits(this.db, limits); }

  async getSystemSettings() {
    // The development pool survives hot reloads; its relational schema can predate new columns.
    // Select with the current table definition so saved periods cannot appear as an empty list.
    const [row] = await this.db.select({
      revision: s.systemSettings.revision,
      acceptanceCapacity: s.systemSettings.acceptanceCapacity,
      reservationLeadDays: s.systemSettings.reservationLeadDays,
      blockedPeriods: s.systemSettings.blockedPeriods,
    }).from(s.systemSettings).where(eq(s.systemSettings.settingKey, "default")).limit(1);
    return { revision: row?.revision ?? 0, reservationLeadDays: row?.reservationLeadDays ?? 3, acceptanceCapacity: row?.acceptanceCapacity ?? null, blockedPeriods: row?.blockedPeriods ?? [] };
  }
  async saveSystemSettings(input: import("../domain").SystemSettings) {
    return this.atomic("system-settings", async repo => {
      const current = await repo.getSystemSettings();
      if (input.revision !== undefined && input.revision !== current.revision) throw Object.assign(new Error("他の画面で設定が更新されました。入力内容を確認し、再読み込みしてから保存してください。"), { statusCode: 409 });
      const values = { ...input, revision: current.revision + 1 };
      await repo.db.insert(s.systemSettings).values({ settingKey: "default", ...values }).onConflictDoUpdate({ target: s.systemSettings.settingKey, set: values });
      return repo.getSystemSettings();
    });
  }
  async getAccountDeletion(firebaseUid: string) {
    return await this.db.query.accountDeletion.findFirst({ where: eq(s.accountDeletion.firebaseUid, firebaseUid), columns: { completedAt: true } }) ?? null;
  }
  async recordAccountDeletion(firebaseUid: string, completedAt?: string) {
    await this.db.insert(s.accountDeletion).values({ firebaseUid, completedAt: completedAt ?? null }).onConflictDoUpdate({ target: s.accountDeletion.firebaseUid, set: { completedAt: completedAt ?? null } });
  }
  async clearAccountDeletion(firebaseUid: string) {
    await this.db.delete(s.accountDeletion).where(eq(s.accountDeletion.firebaseUid, firebaseUid));
  }
  async getReservationSubmission(firebaseUid: string, requestKey: string) {
    return await this.db.query.reservationSubmission.findFirst({ where: and(eq(s.reservationSubmission.firebaseUid, firebaseUid), eq(s.reservationSubmission.requestKey, requestKey)), columns: { requestHash: true, reservationCode: true } }) ?? null;
  }
  async recordReservationSubmission(input: { firebaseUid: string; requestKey: string; requestHash: string; reservationCode: string }) {
    await this.db.insert(s.reservationSubmission).values(input);
  }

  withTransaction<T>(key: string, work: (repository: ReservationRepository) => Promise<T>): Promise<T> {
    return this.atomic(key, work);
  }

  // Lock keys use PostgreSQL transaction-scoped advisory locks. Related updates share a reservation key.
  private async atomic<T>(key: string, work: (repository: DrizzleReservationRepository) => Promise<T>): Promise<T> {
    if (this.inTransaction) return work(this);
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
      return work(new DrizzleReservationRepository(tx as unknown as ReservationDatabase, true));
    });
  }

  private async rawReservation(code: string) {
    const raw = await this.db.query.reservation.findFirst({ where: eq(s.reservation.reservationCode, code), with: reservationRelations });
    if (!raw) throw new Error(`Reservation not found: ${code}`);
    return raw;
  }

  async recordCancellationPolicyConsent(id: string, input: Omit<import("../cancellation-policy-consent").CancellationPolicyConsent, "people"> & { firebaseUid: string }): Promise<Reservation> {
    if (!this.inTransaction) return this.atomic(`reservation:${id}`, repo => repo.recordCancellationPolicyConsent(id, input));
    const current = await this.rawReservation(id);
    await this.db.insert(s.reservationPolicyConsent).values({ reservationId: current.id, acceptedByFirebaseUid: input.firebaseUid, source: input.source, policyVersion: input.version, policyText: input.policyText, acceptedAt: input.acceptedAt, people: current.expectedPeople });
    await this.db.update(s.reservation).set({ policyAgreementKind: "confirmed", policyAgreementAcceptedAt: input.acceptedAt }).where(eq(s.reservation.id, current.id));
    return reservationModel(await this.rawReservation(id));
  }

  async listReservations(): Promise<Reservation[]> {
    return (await this.db.query.reservation.findMany({ orderBy: desc(s.reservation.receivedAt), with: reservationRelations })).map(reservationModel);
  }
  async scanReservationsForExport(query: import("../reservation-search").ReservationSearch, consume: (rows: Reservation[]) => void, signal: AbortSignal, deadline: number) {
    const { normalizedDateRange } = await import("../reservation-search");
    const { ExportError, checkExportDeadline, exportBatchSize, exportMaxScanned } = await import("../reservation-export-policy");
    const range = normalizedDateRange(query);
    checkExportDeadline(signal, deadline);
    await this.db.transaction(async tx => {
      await tx.execute(sql`set transaction isolation level repeatable read read only`);
      let cursor: { received: string; id: string } | undefined;
      let scanned = 0;
      while (true) {
        checkExportDeadline(signal, deadline);
        const remaining = Math.max(1, deadline - Date.now());
        await tx.execute(sql`select set_config('statement_timeout', ${String(remaining)}, true)`);
        const rows = await tx.query.reservation.findMany({
          where: and(
            range.from ? gte(s.reservation.usageDate, range.from) : undefined,
            range.to ? lte(s.reservation.usageDate, range.to) : undefined,
            query.statuses.length ? inArray(s.reservation.status, query.statuses.map(toDataConnectReservationStatus)) : undefined,
            cursor ? or(lt(s.reservation.receivedAt, cursor.received), and(eq(s.reservation.receivedAt, cursor.received), gt(s.reservation.id, cursor.id))) : undefined,
          ),
          orderBy: [desc(s.reservation.receivedAt), asc(s.reservation.id)], limit: exportBatchSize,
          with: { reservationDetails: { with: { menu: true } }, storeAssignments: { with: { store: true } } },
        });
        if (!rows.length) break;
        scanned += rows.length;
        if (scanned > exportMaxScanned) throw new ExportError(413, "SCAN_LIMIT", "検索対象が多すぎます。利用日の範囲を絞ってください。");
        checkExportDeadline(signal, deadline);
        consume(rows.map(row => reservationModel({ ...row, account: null })));
        const last = rows[rows.length - 1];
        cursor = { received: last.receivedAt, id: last.id };
        if (rows.length < exportBatchSize) break;
      }
    });
  }
  async listReservationsForReservationAccount(firebaseUid: string): Promise<Reservation[]> {
    const account = await this.findAccountByFirebaseUid(firebaseUid);
    if (!account?.id) return [];
    return (await this.db.query.reservation.findMany({ where: eq(s.reservation.accountId, account.id), orderBy: desc(s.reservation.receivedAt), with: reservationRelations })).map(reservationModel);
  }

  async createReservation(input: CreateReservationInput): Promise<Reservation> {
    if (!this.inTransaction) return this.atomic("reservation-code-allocation", repo => repo.createReservation(input));
    await this.db.execute(sql`select pg_advisory_xact_lock(hashtextextended('reservation-code-allocation', 0))`);
    const menuItems = input.menuItems ?? (input.menu ? [input.menu] : []);
    const firebaseUid = input.accountFirebaseUid ?? input.customerFirebaseUid;
    const account = firebaseUid ? await this.findAccountByFirebaseUid(firebaseUid) : null;
    if (firebaseUid && !account) throw new Error(`Account not found for Firebase UID: ${firebaseUid}`);
    // Lock prevents concurrent max+1 allocation and preserves the existing public code format.
    const [maximum] = await this.db.select({ value: sql<number>`greatest(1000, coalesce(max(case when reservation_code ~ '^RSV-[0-9]+$' then substring(reservation_code from 5)::bigint end), 1000))` }).from(s.reservation);
    const reservationCode = `RSV-${Number(maximum.value) + 1}`;
    const startTime = input.startTime ?? "10:00";
    const menus = await this.listMenus();
    const [created] = await this.db.insert(s.reservation).values({
      reservationCode, accountId: account?.id ?? null, reserverName: input.name, reserverEmail: input.email, reserverPhone: input.phone,
      reserverAddress: input.address ?? null, reserverAccountType: input.accountType ?? (input.bookingType === "travel_agency_group" ? "travel_agency" : "individual"),
      reserverCompanyBranchName: input.companyBranchName ?? null, reserverContactPersonName: input.contactPersonName ?? null,
      usageDate: input.date, usageTime: startTime, usageEndTime: input.endTime ?? calculateReservationEndTime(startTime, menuItems, menus),
      initialConfirmedPeople: isCompletedBooking(normalizeReservationStatus(input.status)) ? input.people : null,
      expectedPeople: input.people, status: toDataConnectReservationStatus(normalizeReservationStatus(input.status)), requestType: input.requestType ?? null,
      bookingType: input.bookingType ?? "individual", bookingContactName: input.bookingContactName ?? null, dayContactName: input.dayContactName ?? null, dayContactPhone: input.dayContactPhone ?? null,
      groupName: input.groupName ?? null, groupNameKana: input.groupNameKana ?? null, groupType: input.groupType ?? null, groupTypeOther: input.groupTypeOther ?? null,
      tcCount: input.tcCount ?? 0, dgCount: input.dgCount ?? 0, paymentCondition: normalizePaymentCondition(input.paymentCondition), remarks: input.remarks ?? null,
      policyAgreementKind: input.policyAgreement?.kind ?? null, policyAgreementAcceptedAt: input.policyAgreement?.acceptedAt ?? null, receiptEmailRequestedAt: input.receiptEmailRequestedAt ?? null,
    }).returning();
    await this.replaceDetails(created.id, menuItems);
    return reservationModel(await this.rawReservation(reservationCode));
  }

  private async replaceDetails(reservationId: string, menuItems: string[]) {
    const existing = await this.db.select().from(s.reservationDetail).where(eq(s.reservationDetail.reservationId, reservationId));
    const menus = await this.db.select().from(s.menu);
    const details = planReservationDetails(existing, menus.map(menu => ({ id: menu.id, name: menu.name, price: menu.standardPrice, active: menu.active })), menuItems);
    await this.db.delete(s.reservationDetail).where(eq(s.reservationDetail.reservationId, reservationId));
    for (const detail of details) {
      await this.db.insert(s.reservationDetail).values({ reservationId, ...detail });
    }
  }

  async updateReservation(id: string, input: UpdateReservationInput): Promise<Reservation> {
    if (!this.inTransaction) return this.atomic(`reservation:${id}`, repo => repo.updateReservation(id, input));
    const raw = await this.rawReservation(id);
    const current = reservationModel(raw);
    const calculateEnd = input.endTime === undefined && (input.startTime !== undefined || input.menuItems !== undefined || !current.endTime);
    await this.db.update(s.reservation).set({
      revision: sql`${s.reservation.revision} + 1`,
      reserverName: input.customer ?? current.customer, reserverEmail: input.email ?? current.email ?? "", reserverPhone: input.phone ?? current.phone,
      reserverAddress: input.address ?? current.address ?? null, usageDate: input.date ?? current.date, usageTime: input.startTime ?? current.startTime ?? "10:00",
      usageEndTime: input.endTime ?? (calculateEnd ? calculateReservationEndTime(input.startTime ?? current.startTime, input.menuItems ?? current.menuItems, await this.listMenus()) : current.endTime ?? null),
      expectedPeople: input.people ?? current.people, bookingType: input.bookingType ?? current.bookingType ?? "individual",
      bookingContactName: input.bookingContactName ?? current.bookingContactName ?? null, dayContactName: input.dayContactName ?? current.dayContactName ?? null, dayContactPhone: input.dayContactPhone ?? current.dayContactPhone ?? null,
      groupName: input.groupName ?? current.groupName ?? null, groupNameKana: input.groupNameKana ?? current.groupNameKana ?? null, groupType: input.groupType ?? current.groupType ?? null, groupTypeOther: input.groupTypeOther ?? current.groupTypeOther ?? null,
      tcCount: input.tcCount ?? current.tcCount ?? 0, dgCount: input.dgCount ?? current.dgCount ?? 0, paymentCondition: normalizePaymentCondition(input.paymentCondition ?? current.paymentCondition), remarks: input.remarks ?? current.remarks ?? null,
      ...(shouldResetConfirmationContact(current, input) ? { confirmationContactedAt: null } : {}), updatedAt: now(),
    }).where(eq(s.reservation.id, raw.id));
    if (input.menuItems !== undefined) await this.replaceDetails(raw.id, input.menuItems);
    return reservationModel(await this.rawReservation(id));
  }

  async updateReservationStatus(id: string, status: Reservation["status"], options?: { requestType?: Reservation["requestType"] }): Promise<Reservation> {
    if (!this.inTransaction) return this.atomic(`reservation:${id}`, repo => repo.updateReservationStatus(id, status, options));
    const current = reservationModel(await this.rawReservation(id));
    const requestType = options && "requestType" in options ? options.requestType ?? null : current.status === reservationStatusCodes.temporaryConfirmed && status === reservationStatusCodes.confirmedRequested ? "confirmed_from_temporary" : status === reservationStatusCodes.confirmedRequested ? current.requestType ?? null : null;
    await this.db.update(s.reservation).set({ status: toDataConnectReservationStatus(status), requestType, ...(status === "cancellation_requested" && current.status !== status ? { cancellationPreviousStatus: current.status === "confirmed_requested" && current.requestType === "confirmed_from_temporary" ? "temporary_confirmed" : current.status } : {}), ...(!isCompletedBooking(current.status) && isCompletedBooking(status) && current.initialConfirmedPeople == null ? { initialConfirmedPeople: current.people } : {}), updatedAt: now() }).where(eq(s.reservation.reservationCode, id));
    return reservationModel(await this.rawReservation(id));
  }

  async updateConfirmationContact(id: string, contactedAt: string | null): Promise<Reservation> {
    if (!this.inTransaction) return this.atomic(`reservation:${id}`, repo => repo.updateConfirmationContact(id, contactedAt));
    await this.rawReservation(id);
    await this.db.update(s.reservation).set({ confirmationContactedAt: contactedAt, updatedAt: now() }).where(eq(s.reservation.reservationCode, id));
    return reservationModel(await this.rawReservation(id));
  }
  async updateReceiptEmailDelivery(id: string, input: { sentAt?: string | null; lastAttemptAt: string; retryCount: number; lastError?: string | null; nextAttemptAt?: string | null }): Promise<Reservation> {
    await this.rawReservation(id);
    await this.db.update(s.reservation).set({ receiptEmailSentAt: input.sentAt ?? null, receiptEmailLastAttemptAt: input.lastAttemptAt, receiptEmailRetryCount: input.retryCount, receiptEmailLastError: input.lastError ?? null, receiptEmailNextAttemptAt: input.nextAttemptAt ?? null, updatedAt: now() }).where(eq(s.reservation.reservationCode, id));
    return reservationModel(await this.rawReservation(id));
  }
  async assignStores(id: string, assignments: StoreAssignment[]): Promise<Reservation> {
    if (!this.inTransaction) return this.atomic(`reservation:${id}`, repo => repo.assignStores(id, assignments));
    const raw = await this.rawReservation(id);
    const current = reservationModel(raw);
    const valid = assignments.filter(item => item.store && item.people > 0).map(item => ({ store: item.store, people: Number(item.people) }));
    if (valid.length && valid.reduce((total, item) => total + item.people, 0) !== current.people) throw new Error(`Assigned people must equal reservation people: ${current.people}`);
    await this.db.delete(s.storeAssignment).where(eq(s.storeAssignment.reservationId, raw.id));
    for (const assignment of valid) {
      const store = await this.db.query.store.findFirst({ where: eq(s.store.name, assignment.store) });
      if (!store) throw new Error(`Store not found: ${assignment.store}`);
      await this.db.insert(s.storeAssignment).values({ reservationId: raw.id, storeId: store.id, people: assignment.people });
    }
    if (shouldResetConfirmationContactForAssignments(current, valid)) await this.updateConfirmationContact(id, null);
    return reservationModel(await this.rawReservation(id));
  }

  async listReservationChangeRequests(): Promise<ReservationChangeRequest[]> {
    return (await this.db.query.reservationChangeRequest.findMany({ orderBy: desc(s.reservationChangeRequest.requestedAt), with: { reservation: { with: reservationRelations } } })).map(raw => {
      const reservation = reservationModel(raw.reservation);
      let requestedMenuItems: string[] = [];
      try { const parsed: unknown = JSON.parse(raw.requestedMenuItemsJson); if (Array.isArray(parsed)) requestedMenuItems = parsed.filter((value): value is string => typeof value === "string"); } catch { /* Legacy invalid JSON is displayed as an empty selection. */ }
      return { id: raw.id, reservationId: reservation.id, customer: reservation.customer, email: reservation.email, phone: reservation.phone, currentDate: reservation.date, currentStartTime: reservation.startTime ?? "10:00", currentPeople: reservation.people, currentMenuItems: reservation.menuItems, requestedDate: raw.requestedDate, requestedStartTime: raw.requestedTime, requestedPeople: raw.requestedPeople, requestedMenuItems, reason: raw.reason ?? undefined, baseRevision: raw.baseRevision, status: raw.status.toLowerCase() as ReservationChangeRequest["status"], requestedAt: iso(raw.requestedAt)!, reviewedAt: iso(raw.reviewedAt), feeAcknowledgement: raw.feeAcknowledgement };
    });
  }
  async createReservationChangeRequest(input: CreateReservationChangeRequestInput): Promise<ReservationChangeRequest> {
    if (!this.inTransaction) return this.atomic(`reservation:${input.reservationId}`, repo => repo.createReservationChangeRequest(input));
    const raw = await this.rawReservation(input.reservationId);
    const current = reservationModel(raw);
    const normalize = (value?: string) => (value ?? "").replace(/[\s-]/g, "").toLowerCase();
    if (!((input.email && normalize(input.email) === normalize(current.email)) || (input.phone && normalize(input.phone) === normalize(current.phone)))) throw new Error(`Reservation not found: ${input.reservationId}`);
    const allowed: Reservation["status"][] = ["temporary_requested", "temporary_confirmed", "confirmed_requested", "confirmed", "waiting_for_visit"];
    if (!allowed.includes(current.status)) throw new Error(`Reservation change cannot be requested for status: ${current.status}`);
    if (input.expectedRevision !== undefined && input.expectedRevision !== (current.revision ?? 0)) throw Object.assign(new Error("予約内容が更新されています。予約一覧を再読み込みし、現在の内容を確認してから変更申請してください。"), { statusCode: 409 });
    const existing = (await this.listReservationChangeRequests()).find(item => item.reservationId === input.reservationId && item.status === "requested" && item.requestedDate === input.requestedDate && item.requestedStartTime === input.requestedStartTime && item.requestedPeople === input.requestedPeople && JSON.stringify([...item.requestedMenuItems].sort()) === JSON.stringify([...input.requestedMenuItems].sort()) && (item.reason ?? "") === (input.reason ?? ""));
    if (existing) {
      if (existing.baseRevision !== (current.revision ?? 0) && input.expectedRevision !== (current.revision ?? 0)) throw Object.assign(new Error("予約内容が更新されています。予約一覧を再読み込みし、現在の内容を確認してから再申請してください。"), { statusCode: 409 });
      if (existing.baseRevision !== (current.revision ?? 0) || (input.feeAcknowledgement && existing.feeAcknowledgement?.context !== input.feeAcknowledgement.context)) {
        await this.db.update(s.reservationChangeRequest).set({ feeAcknowledgement: input.feeAcknowledgement ?? null, baseRevision: current.revision ?? 0 }).where(eq(s.reservationChangeRequest.id, existing.id));
        return { ...existing, feeAcknowledgement: input.feeAcknowledgement ?? null, baseRevision: current.revision ?? 0 };
      }
      return existing;
    }
    const [created] = await this.db.insert(s.reservationChangeRequest).values({ reservationId: raw.id, baseRevision: current.revision ?? 0, requestedDate: input.requestedDate, requestedTime: input.requestedStartTime, requestedPeople: input.requestedPeople, requestedMenuItemsJson: JSON.stringify(input.requestedMenuItems), reason: input.reason ?? null, feeAcknowledgement: input.feeAcknowledgement ?? null, status: "REQUESTED" }).returning();
    return (await this.listReservationChangeRequests()).find(item => item.id === created.id)!;
  }
  private async changeRequest(id: string) {
    const request = (await this.listReservationChangeRequests()).find(item => item.id === id);
    if (!request) throw new Error(`Reservation change request not found: ${id}`);
    return request;
  }
  async approveReservationChangeRequest(id: string): Promise<{ request: ReservationChangeRequest; reservation: Reservation }> {
    const initial = await this.changeRequest(id);
    if (!this.inTransaction) return this.atomic(`reservation:${initial.reservationId}`, repo => repo.approveReservationChangeRequest(id));
    const request = await this.changeRequest(id);
    if (request.status !== "requested") throw new Error(`Reservation change request already reviewed: ${id}`);
    const current = reservationModel(await this.rawReservation(request.reservationId));
    assertReservationChangeAllowed(current.status);
    await assertReservationChangeApproval(this, current, request);
    const resetAssignments = current.date !== request.requestedDate || (current.startTime ?? "10:00") !== request.requestedStartTime || current.people !== request.requestedPeople;
    await this.updateReservation(current.id, { date: request.requestedDate, startTime: request.requestedStartTime, people: request.requestedPeople, menuItems: request.requestedMenuItems });
    if (resetAssignments) await this.assignStores(current.id, []);
    let reservation = reservationModel(await this.rawReservation(current.id));
    const automatic = getAutomaticReservationStatus(reservation);
    if (automatic !== reservation.status) reservation = await this.updateReservationStatus(reservation.id, automatic);
    const reviewedAt = now();
    await this.db.update(s.reservationChangeRequest).set({ status: "APPROVED", reviewedAt }).where(eq(s.reservationChangeRequest.id, id));
    return { request: { ...request, status: "approved", reviewedAt }, reservation };
  }
  async rejectReservationChangeRequest(id: string): Promise<ReservationChangeRequest> {
    const initial = await this.changeRequest(id);
    if (!this.inTransaction) return this.atomic(`reservation:${initial.reservationId}`, repo => repo.rejectReservationChangeRequest(id));
    const request = await this.changeRequest(id);
    if (request.status !== "requested") throw new Error(`Reservation change request already reviewed: ${id}`);
    const reviewedAt = now();
    await this.db.update(s.reservationChangeRequest).set({ status: "REJECTED", reviewedAt }).where(eq(s.reservationChangeRequest.id, id));
    return { ...request, status: "rejected", reviewedAt };
  }

  async listAccounts() { return (await this.db.select().from(s.account).where(eq(s.account.active, true)).orderBy(desc(s.account.createdAt))).map(accountModel); }
  async listInactiveAccounts() { return (await this.db.select().from(s.account).where(eq(s.account.active, false)).orderBy(desc(s.account.updatedAt))).map(accountModel); }
  async findAccountByFirebaseUid(firebaseUid: string): Promise<Account | null> {
    const raw = await this.db.query.account.findFirst({ where: and(eq(s.account.firebaseUid, firebaseUid), eq(s.account.active, true)) });
    return raw ? accountModel(raw) : null;
  }
  async createAccount(input: SaveAccountInput & { firebaseUid: string }): Promise<Account> {
    if (!this.inTransaction) return this.atomic(`account:${input.firebaseUid}`, repo => repo.createAccount(input));
    if (await this.getAccountDeletion(input.firebaseUid)) throw Object.assign(new Error("このアカウントは削除手続き中または削除済みです。"), { statusCode: 403 });
    if (await this.findAccountByFirebaseUid(input.firebaseUid)) throw new Error(`Account already exists for Firebase UID: ${input.firebaseUid}`);
    const [raw] = await this.db.insert(s.account).values({ ...profile(input), firebaseUid: input.firebaseUid }).returning();
    return accountModel(raw);
  }
  async updateAccount(id: string, input: SaveAccountInput): Promise<Account> {
    if (!this.inTransaction) return this.accountAtomic(id, repo => repo.updateAccount(id, input));
    await this.assertAccountWritable(id);
    const [raw] = await this.db.update(s.account).set({ ...profile(input), updatedAt: now() }).where(eq(s.account.id, id)).returning();
    if (!raw) throw new Error(`Account not found: ${id}`);
    return accountModel(raw);
  }
  private async accountAtomic<T>(id: string, work: (repository: DrizzleReservationRepository) => Promise<T>) {
    const account = await this.db.query.account.findFirst({ where: eq(s.account.id, id) });
    if (!account) throw Object.assign(new Error("アカウントが見つかりません。"), { statusCode: 404 });
    return this.atomic(`account:${account.firebaseUid}`, work);
  }
  private async assertAccountWritable(id: string) {
    const account = await this.db.query.account.findFirst({ where: eq(s.account.id, id) });
    if (!account) throw Object.assign(new Error("アカウントが見つかりません。"), { statusCode: 404 });
    if (await this.getAccountDeletion(account.firebaseUid)) throw Object.assign(new Error("このアカウントは削除手続き中または削除済みです。"), { statusCode: 403 });
  }
  async deactivateAccount(id: string): Promise<void> {
    if (!this.inTransaction) return this.accountAtomic(id, repo => repo.deactivateAccount(id));
    await this.db.update(s.account).set({ active: false, updatedAt: now() }).where(eq(s.account.id, id));
  }
  async reactivateAccount(id: string): Promise<Account> {
    if (!this.inTransaction) return this.accountAtomic(id, repo => repo.reactivateAccount(id));
    await this.assertAccountWritable(id);
    const [raw] = await this.db.update(s.account).set({ active: true, updatedAt: now() }).where(eq(s.account.id, id)).returning();
    if (!raw) throw new Error(`Account not found: ${id}`);
    return accountModel(raw);
  }
  async listAccountContactEmails(accountId: string) { return (await this.db.select().from(s.accountContactEmail).where(eq(s.accountContactEmail.accountId, accountId)).orderBy(asc(s.accountContactEmail.createdAt))).map(contactModel); }
  async findAccountContactEmailByToken(tokenHash: string) {
    const raw = await this.db.query.accountContactEmail.findFirst({ where: eq(s.accountContactEmail.verificationTokenHash, tokenHash), with: { account: true } });
    return raw ? { ...contactModel(raw), firebaseUid: raw.account.firebaseUid, accountEmail: raw.account.email, accountName: raw.account.name } : null;
  }
  async createAccountContactEmail(input: Parameters<ReservationRepository["createAccountContactEmail"]>[0]): Promise<AccountContactEmail> {
    if (!this.inTransaction) return this.atomic(`contact-emails:${input.accountId}`, repo => repo.createAccountContactEmail(input));
    const contacts = await this.listAccountContactEmails(input.accountId);
    const account = await this.db.query.account.findFirst({ where: eq(s.account.id, input.accountId) });
    if (!account || !account.active || await this.getAccountDeletion(account.firebaseUid)) throw Object.assign(new Error("有効なアカウントが見つかりません。"), { statusCode: 403 });
    if (contacts.length >= 5) throw Object.assign(new Error("追加連絡先は5件まで登録できます。"), { statusCode: 400 });
    if (account.email.toLowerCase() === input.email.toLowerCase() || contacts.some(item => item.email.toLowerCase() === input.email.toLowerCase())) throw Object.assign(new Error("このメールアドレスは登録済みです。"), { statusCode: 409 });
    const [raw] = await this.db.insert(s.accountContactEmail).values(input).returning();
    return contactModel(raw);
  }
  async verifyAccountContactEmail(id: string, verifiedAt: string) { await this.db.update(s.accountContactEmail).set({ verifiedAt }).where(eq(s.accountContactEmail.id, id)); }
  async deleteAccountContactEmail(id: string) { await this.db.delete(s.accountContactEmail).where(eq(s.accountContactEmail.id, id)); }

  async listStores() { return sorted((await this.db.select().from(s.store).where(eq(s.store.active, true))).map(storeModel)); }
  async listInactiveStores() { return sorted((await this.db.select().from(s.store).where(eq(s.store.active, false))).map(storeModel)); }
  async createStore(input: SaveStoreInput): Promise<Store> {
    if (!this.inTransaction) return this.atomic("store-catalog", repo => repo.createStore(input));
    const existing = await this.db.query.store.findFirst({ where: eq(s.store.name, input.name) });
    if (existing?.active) throw new Error(`Store already exists: ${input.name}`);
    const [raw] = existing ? await this.db.update(s.store).set({ ...input, id: existing.id, active: true, updatedAt: now() }).where(eq(s.store.id, existing.id)).returning() : await this.db.insert(s.store).values({ name: input.name, displayOrder: input.displayOrder, capacity: input.capacity, active: true }).returning();
    return storeModel(raw);
  }
  async updateStore(name: string, input: SaveStoreInput): Promise<Store> {
    const existing = await this.db.query.store.findFirst({ where: eq(s.store.name, name) });
    if (!existing) throw new Error(`Store not found: ${name}`);
    const [raw] = await this.db.update(s.store).set({ name: input.name, displayOrder: input.displayOrder, capacity: input.capacity, active: true, updatedAt: now() }).where(eq(s.store.id, existing.id)).returning();
    return storeModel(raw);
  }
  async deleteStore(name: string) {
    const existing = await this.db.query.store.findFirst({ where: eq(s.store.name, name) });
    if (!existing) throw new Error(`Store not found: ${name}`);
    await this.db.update(s.store).set({ active: false, updatedAt: now() }).where(eq(s.store.id, existing.id));
  }
  async reactivateStore(id: string): Promise<Store> {
    const [raw] = await this.db.update(s.store).set({ active: true, updatedAt: now() }).where(eq(s.store.id, id)).returning();
    if (!raw) throw new Error(`Store not found: ${id}`);
    return storeModel(raw);
  }
  async listMenus() { return sorted((await this.db.select().from(s.menu).where(eq(s.menu.active, true))).map(menuModel)); }
  async listInactiveMenus() { return sorted((await this.db.select().from(s.menu).where(eq(s.menu.active, false))).map(menuModel)); }
  async createMenu(input: SaveMenuInput): Promise<Menu> {
    if (!this.inTransaction) return this.atomic("menu-catalog", repo => repo.createMenu(input));
    const existing = await this.db.query.menu.findFirst({ where: eq(s.menu.name, input.name) });
    if (existing?.active) throw new Error(`Menu already exists: ${input.name}`);
    const [raw] = existing ? await this.db.update(s.menu).set({ ...menuValues(input), active: true, updatedAt: now() }).where(eq(s.menu.id, existing.id)).returning() : await this.db.insert(s.menu).values({ ...menuValues(input), active: true }).returning();
    return menuModel(raw);
  }
  async updateMenu(name: string, input: SaveMenuInput): Promise<Menu> {
    const existing = await this.db.query.menu.findFirst({ where: eq(s.menu.name, name) });
    if (!existing) throw new Error(`Menu not found: ${name}`);
    const [raw] = await this.db.update(s.menu).set({ ...menuValues(input), active: true, updatedAt: now() }).where(eq(s.menu.id, existing.id)).returning();
    return menuModel(raw);
  }
  async deleteMenu(name: string) {
    const existing = await this.db.query.menu.findFirst({ where: eq(s.menu.name, name) });
    if (!existing) throw new Error(`Menu not found: ${name}`);
    await this.db.update(s.menu).set({ active: false, updatedAt: now() }).where(eq(s.menu.id, existing.id));
  }
  async reactivateMenu(id: string): Promise<Menu> {
    const [raw] = await this.db.update(s.menu).set({ active: true, updatedAt: now() }).where(eq(s.menu.id, id)).returning();
    if (!raw) throw new Error(`Menu not found: ${id}`);
    return menuModel(raw);
  }

  async listApprovalEmailDeliveries(): Promise<ApprovalEmailDelivery[]> {
    return (await this.db.query.approvalEmailDelivery.findMany({ with: { reservation: true }, orderBy: asc(s.approvalEmailDelivery.requestedAt) })).map(raw => ({ id: raw.id, deliveryKey: raw.deliveryKey, reservationId: raw.reservation.reservationCode, type: raw.emailType as ApprovalEmailDelivery["type"], referenceId: raw.referenceId, snapshotKey: raw.snapshotKey, stoppedAt: iso(raw.stoppedAt), nextAttemptAt: iso(raw.nextAttemptAt), retryCount: raw.retryCount, lastError: raw.lastError, requestedAt: iso(raw.requestedAt)!, sentAt: iso(raw.sentAt), lastAttemptAt: iso(raw.lastAttemptAt) }));
  }
  async createApprovalEmailDelivery(input: Parameters<ReservationRepository["createApprovalEmailDelivery"]>[0]): Promise<ApprovalEmailDelivery> {
    const reservation = await this.rawReservation(input.reservationId);
    await this.db.insert(s.approvalEmailDelivery).values({ deliveryKey: input.deliveryKey, reservationId: reservation.id, snapshotKey: input.snapshotKey ?? reservationNotificationSnapshot(reservationModel(reservation)), emailType: input.type, referenceId: input.referenceId ?? null, requestedAt: input.requestedAt }).onConflictDoNothing({ target: s.approvalEmailDelivery.deliveryKey });
    return (await this.listApprovalEmailDeliveries()).find(item => item.deliveryKey === input.deliveryKey)!;
  }
  async updateApprovalEmailDelivery(deliveryKey: string, input: Parameters<ReservationRepository["updateApprovalEmailDelivery"]>[1]): Promise<ApprovalEmailDelivery> {
    const [raw] = await this.db.update(s.approvalEmailDelivery).set({ sentAt: input.sentAt ?? null, lastAttemptAt: input.lastAttemptAt, retryCount: input.retryCount, lastError: input.lastError ?? null, nextAttemptAt: input.nextAttemptAt ?? null, stoppedAt: input.stoppedAt ?? null }).where(eq(s.approvalEmailDelivery.deliveryKey, deliveryKey)).returning();
    if (!raw) throw new Error(`Approval email delivery not found: ${deliveryKey}`);
    return (await this.listApprovalEmailDeliveries()).find(item => item.deliveryKey === deliveryKey)!;
  }
  async listEmailTemplates(): Promise<EmailTemplate[]> { return (await this.db.select().from(s.emailTemplate).orderBy(asc(s.emailTemplate.name))).map(templateModel); }
  async getEmailTemplate(templateKey: string): Promise<EmailTemplate | null> { const raw = await this.db.query.emailTemplate.findFirst({ where: eq(s.emailTemplate.templateKey, templateKey) }); return raw ? templateModel(raw) : null; }
  async upsertEmailTemplate(input: EmailTemplate): Promise<EmailTemplate> {
    const values = { templateKey: input.templateKey, name: input.name, subject: input.subject, body: input.body, isActive: input.isActive };
    const [raw] = await this.db.insert(s.emailTemplate).values(values).onConflictDoUpdate({ target: s.emailTemplate.templateKey, set: { ...values, updatedAt: now() } }).returning();
    return templateModel(raw);
  }
  async getEmailDelivery(deliveryKey: string): Promise<EmailDelivery | null> {
    const raw = await this.db.query.emailDelivery.findFirst({ where: eq(s.emailDelivery.deliveryKey, deliveryKey), with: { reservation: true } });
    return raw ? { id: raw.id, deliveryKey: raw.deliveryKey, templateKey: raw.templateKey, recipient: raw.recipient, subject: raw.subject, body: raw.body, status: raw.status as EmailDelivery["status"], reservationId: raw.reservation?.reservationCode ?? null, requestedAt: iso(raw.requestedAt)!, sentAt: iso(raw.sentAt), lastError: raw.lastError } : null;
  }
  async createEmailDelivery(input: EmailDelivery): Promise<EmailDelivery> {
    const reservationId = input.reservationId ? (await this.rawReservation(input.reservationId)).id : null;
    await this.db.insert(s.emailDelivery).values({ deliveryKey: input.deliveryKey, reservationId, templateKey: input.templateKey, recipient: input.recipient, subject: input.subject, body: input.body, status: input.status, requestedAt: input.requestedAt }).onConflictDoNothing({ target: s.emailDelivery.deliveryKey });
    return (await this.getEmailDelivery(input.deliveryKey))!;
  }
  async updateEmailDelivery(deliveryKey: string, input: Pick<EmailDelivery, "status" | "sentAt" | "lastError">): Promise<EmailDelivery> {
    const [raw] = await this.db.update(s.emailDelivery).set({ status: input.status, sentAt: input.sentAt ?? null, lastError: input.lastError ?? null }).where(eq(s.emailDelivery.deliveryKey, deliveryKey)).returning();
    if (!raw) throw new Error(`Email delivery not found: ${deliveryKey}`);
    return (await this.getEmailDelivery(deliveryKey))!;
  }
  async getEmailSettings(): Promise<EmailSettings | null> {
    const raw = await this.db.query.emailSenderSetting.findFirst({ where: eq(s.emailSenderSetting.settingKey, "default") });
    return raw ? { ...raw, settingKey: "default", updatedAt: iso(raw.updatedAt)! } : null;
  }
  async upsertEmailSettings(input: EmailSettings): Promise<EmailSettings> {
    const values = { settingKey: "default", senderName: input.senderName, fromEmail: input.fromEmail, replyToEnabled: input.replyToEnabled, replyToEmail: input.replyToEmail ?? null };
    await this.db.insert(s.emailSenderSetting).values(values).onConflictDoUpdate({ target: s.emailSenderSetting.settingKey, set: { ...values, updatedAt: now() } });
    return (await this.getEmailSettings())!;
  }
}

type RawReservation = typeof s.reservation.$inferSelect & {
  policyConsents?: Omit<typeof s.reservationPolicyConsent.$inferSelect, "acceptedByFirebaseUid">[];
  account: typeof s.account.$inferSelect | null;
  reservationDetails: (typeof s.reservationDetail.$inferSelect & { menu: typeof s.menu.$inferSelect })[];
  storeAssignments: (typeof s.storeAssignment.$inferSelect & { store: typeof s.store.$inferSelect })[];
};
function reservationModel(raw: RawReservation): Reservation {
  const menuItems = raw.reservationDetails.flatMap(detail => Array(Math.max(1, detail.quantity)).fill(detail.menu.name)) as string[];
  const assignments = raw.storeAssignments.map(item => ({ store: item.store.name, people: item.people }));
  return {
    id: raw.reservationCode, accountType: raw.reserverAccountType as Reservation["accountType"], companyBranchName: raw.reserverCompanyBranchName ?? undefined, contactPersonName: raw.reserverContactPersonName ?? undefined, accountId: raw.accountId, customer: raw.reserverName ?? "", email: raw.reserverEmail ?? "", phone: raw.reserverPhone ?? "", address: raw.reserverAddress ?? undefined,
    revision: raw.revision, cancellationPreviousStatus: raw.cancellationPreviousStatus ? normalizeReservationStatus(raw.cancellationPreviousStatus) : null, receiptEmailNextAttemptAt: iso(raw.receiptEmailNextAttemptAt),
    date: raw.usageDate, startTime: raw.usageTime, endTime: raw.usageEndTime ?? undefined, people: raw.expectedPeople, initialConfirmedPeople: raw.initialConfirmedPeople,
    bookingType: raw.bookingType as Reservation["bookingType"], bookingContactName: raw.bookingContactName ?? undefined, dayContactName: raw.dayContactName ?? undefined, dayContactPhone: raw.dayContactPhone ?? undefined,
    groupName: raw.groupName ?? undefined, groupNameKana: raw.groupNameKana ?? undefined, groupType: raw.groupType ?? undefined, groupTypeOther: raw.groupTypeOther ?? undefined,
    tcCount: raw.tcCount, dgCount: raw.dgCount, paymentCondition: normalizePaymentCondition(raw.paymentCondition), remarks: raw.remarks ?? undefined, menuItems,
    totalAmount: raw.reservationDetails.reduce((total, detail) => total + detail.quantity * detail.unitPrice, 0), store: assignments.length === 1 ? assignments[0].store : assignments.length > 1 ? "複数店舗" : null, storeAssignments: assignments,
    status: normalizeReservationStatus(raw.status), requestType: normalizeReservationRequestType(raw.requestType),
    policyConsents: (raw.policyConsents ?? []).map(item => ({ source: item.source as "confirmed_request" | "confirmed_change_request", version: item.policyVersion, policyText: item.policyText, acceptedAt: iso(item.acceptedAt)!, people: item.people })).sort((a,b) => a.acceptedAt.localeCompare(b.acceptedAt)),
    policyAgreement: raw.policyAgreementKind && raw.policyAgreementAcceptedAt ? { kind: raw.policyAgreementKind as "temporary" | "confirmed", acceptedAt: iso(raw.policyAgreementAcceptedAt)! } : undefined,
    confirmationContactedAt: iso(raw.confirmationContactedAt), receiptEmailRequestedAt: iso(raw.receiptEmailRequestedAt), receiptEmailSentAt: iso(raw.receiptEmailSentAt), receiptEmailLastAttemptAt: iso(raw.receiptEmailLastAttemptAt), receiptEmailRetryCount: raw.receiptEmailRetryCount, receiptEmailLastError: raw.receiptEmailLastError, received: iso(raw.receivedAt)!,
  };
}
function menuValues(input: SaveMenuInput) {
  return { name: input.name, description: input.description, standardPrice: input.price, durationMinutes: input.duration === "来店後" ? 0 : Number(input.duration.match(/\d+/)?.[0] ?? 0), displayOrder: input.displayOrder };
}
function templateModel(raw: typeof s.emailTemplate.$inferSelect): EmailTemplate {
  return { ...raw, createdAt: iso(raw.createdAt)!, updatedAt: iso(raw.updatedAt)! };
}
