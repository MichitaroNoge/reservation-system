// Local PostgreSQL model translated from dataconnect/schema/schema.gql.
// Existing Cloud SQL physical names must be verified against a schema-only dump before a future migration.
import { relations } from "drizzle-orm";
import { pgTable, pgEnum, uuid, jsonb, text, varchar, integer, boolean, date, timestamp, index, primaryKey } from "drizzle-orm/pg-core";

// One administrator-owned calendar. Tokens never leave the server and are encrypted at rest.
export const googleCalendarConnection = pgTable("google_calendar_connection", {
  key: text("key").primaryKey(),
  googleSub: text("google_sub").notNull(),
  email: text("email").notNull(),
  refreshToken: text("refresh_token").notNull(),
  calendarId: text("calendar_id"),
  enabled: boolean("enabled").notNull().default(true),
  connectedBy: text("connected_by").notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true, mode: "string" }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true, mode: "string" }),
  lastError: text("last_error"),
});
export const googleCalendarFlow = pgTable("google_calendar_flow", {
  stateHash: text("state_hash").primaryKey(),
  browserHash: text("browser_hash").notNull(),
  uid: text("uid").notNull(),
  verifier: text("verifier").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
});
// Transactional outbox, populated by DB triggers even while the connection is paused/offline.
export const googleCalendarSync = pgTable("google_calendar_sync", {
  reservationId: uuid("reservation_id").primaryKey().references(() => reservation.id),
  approvedKind: text("approved_kind"),
  revision: integer("revision").notNull().default(1),
  status: text("status").notNull().default("pending"),
  eventId: uuid("event_id").notNull().defaultRandom(),
  remotePresent: boolean("remote_present").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  syncedAt: timestamp("synced_at", { withTimezone: true, mode: "string" }),
  lastError: text("last_error"),
}, table => [index("google_calendar_sync_due_idx").on(table.status, table.nextAttemptAt)]);

export const abuseLimit = pgTable("abuse_limit", {
  bucketKey: varchar("bucket_key", { length: 64 }).primaryKey(),
  count: integer("count").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
}, table => [index("abuse_limit_expires_at_idx").on(table.expiresAt)]);

// Kept separately from profiles so a Firebase-only registration can be deleted safely.
export const accountDeletion = pgTable("account_deletion", {
  firebaseUid: text("firebase_uid").primaryKey(),
  requestedAt: timestamp("requested_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
});

export const reservationStatusEnum = pgEnum("reservation_status", ["TEMPORARY_REQUESTED","TEMPORARY_CONFIRMED","TEMPORARY_REJECTED","CONFIRMED_REQUESTED","CONFIRMED","CONFIRMED_REJECTED","WAITING_FOR_VISIT","VISITED","CANCELLATION_REQUESTED","CANCELLED"] as const);
export const billingTypeEnum = pgEnum("billing_type", ["USAGE","CANCELLATION"] as const);
export const billingStatusEnum = pgEnum("billing_status", ["UNBILLED","INVOICED","PAID","VOIDED"] as const);
export const reservationChangeRequestStatusEnum = pgEnum("reservation_change_request_status", ["REQUESTED","APPROVED","REJECTED"] as const);

export const customer = pgTable("customer", {
  id: uuid("id").primaryKey().defaultRandom(),
  firebaseUid: text("firebase_uid").unique(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }),
  accountType: varchar("account_type", { length: 30 }),
  companyBranchName: varchar("company_branch_name", { length: 100 }),
  contactPersonName: varchar("contact_person_name", { length: 100 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: uuid("id").primaryKey().defaultRandom(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  address: varchar("address", { length: 500 }),
  accountType: varchar("account_type", { length: 30 }),
  companyBranchName: varchar("company_branch_name", { length: 100 }),
  contactPersonName: varchar("contact_person_name", { length: 100 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const accountContactEmail = pgTable("account_contact_email", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").references(() => account.id).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "string" }),
  verificationTokenHash: varchar("verification_token_hash", { length: 64 }).notNull().unique(),
  verificationExpiresAt: timestamp("verification_expires_at", { withTimezone: true, mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [index("account_contact_email_account_id_idx").on(table.accountId)]);

export const store = pgTable("store", {
  id: uuid("id").primaryKey().defaultRandom(),
  capacity: integer("capacity"),
  name: varchar("name", { length: 100 }).notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const menu = pgTable("menu", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  standardPrice: integer("standard_price").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const reservation = pgTable("reservation", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationCode: varchar("reservation_code", { length: 30 }).notNull().unique(),
  customerId: uuid("customer_id").references(() => customer.id),
  accountId: uuid("account_id").references(() => account.id),
  reserverName: varchar("reserver_name", { length: 100 }),
  reserverEmail: varchar("reserver_email", { length: 255 }),
  reserverPhone: varchar("reserver_phone", { length: 30 }),
  reserverAddress: varchar("reserver_address", { length: 500 }),
  reserverAccountType: varchar("reserver_account_type", { length: 30 }),
  reserverCompanyBranchName: varchar("reserver_company_branch_name", { length: 100 }),
  reserverContactPersonName: varchar("reserver_contact_person_name", { length: 100 }),
  usageDate: date("usage_date", { mode: "string" }).notNull(),
  usageTime: varchar("usage_time", { length: 5 }).notNull(),
  usageEndTime: varchar("usage_end_time", { length: 5 }),
  status: reservationStatusEnum("status").notNull(),
  requestType: varchar("request_type", { length: 50 }),
  bookingType: varchar("booking_type", { length: 30 }),
  bookingContactName: varchar("booking_contact_name", { length: 100 }),
  dayContactName: varchar("day_contact_name", { length: 100 }),
  dayContactPhone: varchar("day_contact_phone", { length: 30 }),
  groupName: varchar("group_name", { length: 100 }),
  groupNameKana: varchar("group_name_kana", { length: 100 }),
  groupType: varchar("group_type", { length: 100 }),
  groupTypeOther: varchar("group_type_other", { length: 100 }),
  tcCount: integer("tc_count").notNull().default(0),
  dgCount: integer("dg_count").notNull().default(0),
  paymentCondition: varchar("payment_condition", { length: 30 }),
  remarks: text("remarks"),
  expectedPeople: integer("expected_people").notNull(),
  initialConfirmedPeople: integer("initial_confirmed_people"),
  revision: integer("revision").notNull().default(0),
  cancellationPreviousStatus: varchar("cancellation_previous_status", { length: 40 }),
  receiptEmailNextAttemptAt: timestamp("receipt_email_next_attempt_at", { withTimezone: true, mode: "string" }),
  policyAgreementKind: varchar("policy_agreement_kind", { length: 20 }),
  policyAgreementAcceptedAt: timestamp("policy_agreement_accepted_at", { withTimezone: true, mode: "string" }),
  confirmationContactedAt: timestamp("confirmation_contacted_at", { withTimezone: true, mode: "string" }),
  receiptEmailRequestedAt: timestamp("receipt_email_requested_at", { withTimezone: true, mode: "string" }),
  receiptEmailSentAt: timestamp("receipt_email_sent_at", { withTimezone: true, mode: "string" }),
  receiptEmailLastAttemptAt: timestamp("receipt_email_last_attempt_at", { withTimezone: true, mode: "string" }),
  receiptEmailRetryCount: integer("receipt_email_retry_count").notNull().default(0),
  receiptEmailLastError: text("receipt_email_last_error"),
  receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [index("reservation_customer_id_idx").on(table.customerId), index("reservation_account_id_idx").on(table.accountId), index("reservation_received_at_idx").on(table.receivedAt), index("reservation_usage_date_idx").on(table.usageDate)]);

export const reservationPolicyConsent = pgTable("reservation_policy_consent", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").references(() => reservation.id).notNull(),
  acceptedByFirebaseUid: text("accepted_by_firebase_uid").notNull(),
  source: varchar("source", { length: 40 }).notNull(),
  policyVersion: varchar("policy_version", { length: 64 }).notNull(),
  policyText: text("policy_text").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "string" }).notNull(),
  people: integer("people").notNull(),
}, table => [index("reservation_policy_consent_reservation_id_idx").on(table.reservationId)]);

export const reservationChangeRequest = pgTable("reservation_change_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").references(() => reservation.id).notNull(),
  requestedDate: date("requested_date", { mode: "string" }).notNull(),
  requestedTime: varchar("requested_time", { length: 5 }).notNull(),
  requestedPeople: integer("requested_people").notNull(),
  baseRevision: integer("base_revision").notNull().default(0),
  requestedMenuItemsJson: text("requested_menu_items_json").notNull(),
  feeAcknowledgement: jsonb("fee_acknowledgement").$type<import("../domain").ReservationChangeFeeAcknowledgement>(),
  reason: text("reason"),
  status: reservationChangeRequestStatusEnum("status").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }),
}, (table) => [index("reservation_change_request_reservation_id_idx").on(table.reservationId), index("reservation_change_request_requested_at_idx").on(table.requestedAt)]);

export const approvalEmailDelivery = pgTable("approval_email_delivery", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryKey: varchar("delivery_key", { length: 180 }).notNull().unique(),
  reservationId: uuid("reservation_id").references(() => reservation.id).notNull(),
  emailType: varchar("email_type", { length: 50 }).notNull(),
  snapshotKey: text("snapshot_key"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true, mode: "string" }),
  stoppedAt: timestamp("stopped_at", { withTimezone: true, mode: "string" }),
  referenceId: varchar("reference_id", { length: 100 }),
  requestedAt: timestamp("requested_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true, mode: "string" }),
  retryCount: integer("retry_count").notNull().default(0),
  lastError: text("last_error"),
}, (table) => [index("approval_email_delivery_reservation_id_idx").on(table.reservationId)]);

export const emailTemplate = pgTable("email_template", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateKey: varchar("template_key", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const emailDelivery = pgTable("email_delivery", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryKey: varchar("delivery_key", { length: 240 }).notNull().unique(),
  reservationId: uuid("reservation_id").references(() => reservation.id),
  templateKey: varchar("template_key", { length: 80 }).notNull(),
  recipient: text("recipient").notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
  lastError: text("last_error"),
}, (table) => [index("email_delivery_reservation_id_idx").on(table.reservationId)]);

export const emailSenderSetting = pgTable("email_sender_setting", {
  id: uuid("id").primaryKey().defaultRandom(),
  settingKey: varchar("setting_key", { length: 40 }).notNull().unique(),
  senderName: varchar("sender_name", { length: 100 }).notNull(),
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  replyToEnabled: boolean("reply_to_enabled").notNull().default(false),
  replyToEmail: varchar("reply_to_email", { length: 255 }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const reservationDetail = pgTable("reservation_detail", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").references(() => reservation.id).notNull(),
  menuId: uuid("menu_id").references(() => menu.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
}, (table) => [index("reservation_detail_reservation_id_idx").on(table.reservationId), index("reservation_detail_menu_id_idx").on(table.menuId)]);

export const storeAssignment = pgTable("store_assignment", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").references(() => reservation.id).notNull(),
  storeId: uuid("store_id").references(() => store.id).notNull(),
  people: integer("people").notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [index("store_assignment_reservation_id_idx").on(table.reservationId), index("store_assignment_store_id_idx").on(table.storeId)]);

export const visitRecord = pgTable("visit_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").references(() => reservation.id).notNull().unique(),
  visitedAt: timestamp("visited_at", { withTimezone: true, mode: "string" }).notNull(),
  actualPeople: integer("actual_people").notNull(),
}, (table) => [index("visit_record_reservation_id_idx").on(table.reservationId)]);

export const visitDetail = pgTable("visit_detail", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitRecordId: uuid("visit_record_id").references(() => visitRecord.id).notNull(),
  menuId: uuid("menu_id").references(() => menu.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  amount: integer("amount").notNull(),
}, (table) => [index("visit_detail_visit_record_id_idx").on(table.visitRecordId), index("visit_detail_menu_id_idx").on(table.menuId)]);

export const billing = pgTable("billing", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").references(() => reservation.id).notNull(),
  visitDetailId: uuid("visit_detail_id").references(() => visitDetail.id),
  billingType: billingTypeEnum("billing_type").notNull(),
  amount: integer("amount").notNull(),
  billingDate: date("billing_date", { mode: "string" }).notNull(),
  status: billingStatusEnum("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [index("billing_reservation_id_idx").on(table.reservationId), index("billing_visit_detail_id_idx").on(table.visitDetailId)]);

export const invoice = pgTable("invoice", {
  id: uuid("id").primaryKey().defaultRandom(),
  billingId: uuid("billing_id").references(() => billing.id).notNull().unique(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  issuedAt: timestamp("issued_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [index("invoice_billing_id_idx").on(table.billingId)]);

export const customerRelations = relations(customer, ({ many }) => ({
  reservations: many(reservation),
}));

export const accountRelations = relations(account, ({ many }) => ({
  accountContactEmails: many(accountContactEmail),
  reservations: many(reservation),
}));

export const accountContactEmailRelations = relations(accountContactEmail, ({ one }) => ({
  account: one(account, { fields: [accountContactEmail.accountId], references: [account.id] }),
}));

export const storeRelations = relations(store, ({ many }) => ({
  storeAssignments: many(storeAssignment),
}));

export const menuRelations = relations(menu, ({ many }) => ({
  reservationDetails: many(reservationDetail),
  visitDetails: many(visitDetail),
}));

export const reservationRelations = relations(reservation, ({ one, many }) => ({
  customer: one(customer, { fields: [reservation.customerId], references: [customer.id] }),
  account: one(account, { fields: [reservation.accountId], references: [account.id] }),
  policyConsents: many(reservationPolicyConsent),
  reservationChangeRequests: many(reservationChangeRequest),
  approvalEmailDeliveries: many(approvalEmailDelivery),
  emailDeliveries: many(emailDelivery),
  reservationDetails: many(reservationDetail),
  storeAssignments: many(storeAssignment),
  visitRecords: many(visitRecord),
  billings: many(billing),
}));

export const reservationPolicyConsentRelations = relations(reservationPolicyConsent, ({ one }) => ({
  reservation: one(reservation, { fields: [reservationPolicyConsent.reservationId], references: [reservation.id] }),
}));

export const reservationChangeRequestRelations = relations(reservationChangeRequest, ({ one }) => ({
  reservation: one(reservation, { fields: [reservationChangeRequest.reservationId], references: [reservation.id] }),
}));

export const approvalEmailDeliveryRelations = relations(approvalEmailDelivery, ({ one }) => ({
  reservation: one(reservation, { fields: [approvalEmailDelivery.reservationId], references: [reservation.id] }),
}));

export const emailDeliveryRelations = relations(emailDelivery, ({ one }) => ({
  reservation: one(reservation, { fields: [emailDelivery.reservationId], references: [reservation.id] }),
}));

export const reservationDetailRelations = relations(reservationDetail, ({ one }) => ({
  reservation: one(reservation, { fields: [reservationDetail.reservationId], references: [reservation.id] }),
  menu: one(menu, { fields: [reservationDetail.menuId], references: [menu.id] }),
}));

export const storeAssignmentRelations = relations(storeAssignment, ({ one }) => ({
  reservation: one(reservation, { fields: [storeAssignment.reservationId], references: [reservation.id] }),
  store: one(store, { fields: [storeAssignment.storeId], references: [store.id] }),
}));

export const visitRecordRelations = relations(visitRecord, ({ one, many }) => ({
  reservation: one(reservation, { fields: [visitRecord.reservationId], references: [reservation.id] }),
  visitDetails: many(visitDetail),
}));

export const visitDetailRelations = relations(visitDetail, ({ one, many }) => ({
  visitRecord: one(visitRecord, { fields: [visitDetail.visitRecordId], references: [visitRecord.id] }),
  menu: one(menu, { fields: [visitDetail.menuId], references: [menu.id] }),
  billings: many(billing),
}));

export const billingRelations = relations(billing, ({ one, many }) => ({
  reservation: one(reservation, { fields: [billing.reservationId], references: [reservation.id] }),
  visitDetail: one(visitDetail, { fields: [billing.visitDetailId], references: [visitDetail.id] }),
  invoices: many(invoice),
}));

export const invoiceRelations = relations(invoice, ({ one }) => ({
  billing: one(billing, { fields: [invoice.billingId], references: [billing.id] }),
}));

export const reservationSubmission = pgTable("reservation_submission", {
  firebaseUid: text("firebase_uid").notNull(),
  requestKey: varchar("request_key", { length: 128 }).notNull(),
  requestHash: varchar("request_hash", { length: 64 }).notNull(),
  reservationCode: varchar("reservation_code", { length: 30 }).notNull().references(() => reservation.reservationCode),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.firebaseUid, table.requestKey] })]);

export const systemSettings = pgTable("system_settings", { settingKey: text("setting_key").primaryKey(), revision: integer("revision").notNull().default(0), acceptanceCapacity: integer("acceptance_capacity"), reservationLeadDays: integer("reservation_lead_days").notNull().default(3), blockedPeriods: jsonb("blocked_periods").$type<import("../domain").AcceptanceBlock[]>().notNull().default([]) });

// Inquiries are independent of reservation workflows; contact snapshots never follow profile edits.
export const inquiryCategoryEnum = pgEnum("inquiry_category", ["reservation", "service", "other"]);
export const inquiryStatusEnum = pgEnum("inquiry_status", ["unhandled", "in_progress", "answered", "closed"]);
export const inquiry = pgTable("inquiry", {
  id: uuid("id").primaryKey().defaultRandom(),
  inquiryNumber: integer("inquiry_number").generatedAlwaysAsIdentity({startWith:1001}).notNull().unique(),
  firebaseUid: text("firebase_uid"),
  reservationId: uuid("reservation_id").references(()=>reservation.id),
  name: varchar("name",{length:100}).notNull(), email: varchar("email",{length:255}).notNull(),
  category: inquiryCategoryEnum("category").notNull(), subject: varchar("subject",{length:200}).notNull(), body:text("body").notNull(),
  status: inquiryStatusEnum("status").notNull().default("unhandled"), revision:integer("revision").notNull().default(1),
  requestKey: uuid("request_key").notNull().unique(), requestHash:varchar("request_hash",{length:64}).notNull(),
  createdAt:timestamp("created_at",{withTimezone:true,mode:"string"}).notNull().defaultNow(), updatedAt:timestamp("updated_at",{withTimezone:true,mode:"string"}).notNull().defaultNow(),
  receiptEmailStatus:varchar("receipt_email_status",{length:20}).$type<import("../inquiries/types").InquiryMailStatus>().notNull().default("pending"),
  receiptMessageId:text("receipt_message_id"),receiptFirstAttemptAt:timestamp("receipt_first_attempt_at",{withTimezone:true,mode:"string"}),
  receiptLastAttemptAt:timestamp("receipt_last_attempt_at",{withTimezone:true,mode:"string"}),receiptAttempts:integer("receipt_attempts").notNull().default(0),
  receiptLeaseUntil:timestamp("receipt_lease_until",{withTimezone:true,mode:"string"}),receiptLeaseToken:uuid("receipt_lease_token"),
  receiptSender:jsonb("receipt_sender").$type<import("../inquiries/types").SenderSnapshot>(),
},t=>[index("inquiry_owner_created_idx").on(t.firebaseUid,t.createdAt,t.id),index("inquiry_status_created_idx").on(t.status,t.createdAt,t.id),index("inquiry_category_created_idx").on(t.category,t.createdAt,t.id),index("inquiry_created_idx").on(t.createdAt,t.id),index("inquiry_reservation_created_idx").on(t.reservationId,t.createdAt,t.id)]);
export const inquiryReply = pgTable("inquiry_reply", {
  id:uuid("id").primaryKey().defaultRandom(), inquiryId:uuid("inquiry_id").references(()=>inquiry.id).notNull(),
  adminFirebaseUid:text("admin_firebase_uid").notNull(),adminLabel:text("admin_label"),
  subject:varchar("subject",{length:200}).notNull(),body:text("body").notNull(),
  emailStatus:varchar("email_status",{length:20}).$type<import("../inquiries/types").InquiryMailStatus>().notNull().default("pending"),
  resendMessageId:text("resend_message_id"),sentAt:timestamp("sent_at",{withTimezone:true,mode:"string"}),createdAt:timestamp("created_at",{withTimezone:true,mode:"string"}).notNull().defaultNow(),
  requestKey:uuid("request_key").notNull().unique(),requestHash:varchar("request_hash",{length:64}).notNull(),
  firstAttemptAt:timestamp("first_attempt_at",{withTimezone:true,mode:"string"}),lastAttemptAt:timestamp("last_attempt_at",{withTimezone:true,mode:"string"}),attempts:integer("attempts").notNull().default(0),
  leaseUntil:timestamp("lease_until",{withTimezone:true,mode:"string"}),leaseToken:uuid("lease_token"),lastError:varchar("last_error",{length:50}),
  resolution: jsonb("resolution").$type<{ outcome: "sent" | "not_sent"; resolvedAt: string; adminUid: string }>(),
  sender:jsonb("sender").$type<import("../inquiries/types").SenderSnapshot>(),
},t=>[index("inquiry_reply_inquiry_created_idx").on(t.inquiryId,t.createdAt)]);
