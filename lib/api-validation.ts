import { normalizeReservationStatus, paymentConditions, reservationStatuses, type CreateReservationInput, type PaymentCondition, type ReservationStatus, type SaveCustomerInput, type SaveMenuInput, type SaveStoreInput, type StoreAssignment, type UpdateReservationInput } from "./domain";

import type { CreateReservationChangeRequestInput, CustomerAccountType, ReservationBookingType } from "./domain";

export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiValidationError";
  }
}

export function apiErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (error instanceof Error && "statusCode" in error && typeof error.statusCode === "number") {
    return Response.json({ error: message }, { status: error.statusCode });
  }
  if (error instanceof ApiValidationError) return Response.json({ error: message }, { status: 400 });
  if (/Invalid reservation status transition/i.test(message)) return Response.json({ error: message }, { status: 400 });
  if (/not found/i.test(message)) return Response.json({ error: message }, { status: 404 });
  if (/already exists/i.test(message)) return Response.json({ error: message }, { status: 409 });
  if (/Could not load the default credentials|invalid-credential|credential/i.test(message)) {
    console.error(error);
    return Response.json({ error: "Firebase Admin SDKの認証情報が未設定です。FIREBASE_SERVICE_ACCOUNT_KEY または Google Application Default Credentials を設定してください。" }, { status: 503 });
  }
  if (isDataConnectError(error)) {
    console.error(error);
    return Response.json({ error: `Data Connectの更新に失敗しました: ${dataConnectErrorMessage(error)}` }, { status: 502 });
  }
  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}

function isDataConnectError(error: unknown): error is Error {
  return error instanceof Error && /DataConnect|data connect|partial-error|unauthorized/i.test(`${error.name} ${error.message}`);
}

function dataConnectErrorMessage(error: Error) {
  const responseErrors = typeof error === "object" && error && "response" in error
    ? (error as { response?: { errors?: { message?: unknown }[] } }).response?.errors
    : undefined;
  const firstMessage = Array.isArray(responseErrors) ? responseErrors.find((item) => typeof item.message === "string")?.message : undefined;
  return firstMessage || error.message;
}

export async function readJsonObject(request: Request) {
  try {
    const body = await request.json();
    if (!isRecord(body)) throw new ApiValidationError("Request body must be a JSON object.");
    return body;
  } catch (error) {
    if (error instanceof ApiValidationError) throw error;
    throw new ApiValidationError("Request body must be valid JSON.");
  }
}

export function validateCreateReservationInput(body: Record<string, unknown>): CreateReservationInput {
  const menuItems = optionalStringArray(body.menuItems, "menuItems");
  const status = body.status === undefined ? undefined : validateReservationStatus(body.status);
  const bookingType = validateReservationBookingType(body.bookingType);
  const input: CreateReservationInput = {
    date: requireIsoDate(body.date, "date"),
    startTime: body.startTime === undefined ? undefined : requireTime(body.startTime, "startTime"),
    endTime: body.endTime === undefined ? undefined : requireTime(body.endTime, "endTime"),
    people: requireInteger(body.people, "people", { min: 1, max: 999 }),
    name: requireNonEmptyString(body.name, "name", 100),
    email: requireEmail(body.email, "email"),
    phone: requirePhone(body.phone, "phone"),
    address: optionalTrimmedString(body.address, "address", 500),
    accountType: validateCustomerAccountType(body.accountType),
    companyBranchName: optionalTrimmedString(body.companyBranchName, "companyBranchName", 100),
    contactPersonName: optionalTrimmedString(body.contactPersonName, "contactPersonName", 100),
    bookingType,
    bookingContactName: optionalTrimmedString(body.bookingContactName, "bookingContactName", 100),
    dayContactName: optionalTrimmedString(body.dayContactName, "dayContactName", 100),
    dayContactPhone: body.dayContactPhone === undefined || body.dayContactPhone === "" ? undefined : requirePhone(body.dayContactPhone, "dayContactPhone"),
    groupName: optionalTrimmedString(body.groupName, "groupName", 100),
    groupNameKana: optionalTrimmedString(body.groupNameKana, "groupNameKana", 100),
    groupType: optionalTrimmedString(body.groupType, "groupType", 100),
    groupTypeOther: optionalTrimmedString(body.groupTypeOther, "groupTypeOther", 100),
    tcCount: optionalInteger(body.tcCount, "tcCount", { min: 0, max: 999 }),
    dgCount: optionalInteger(body.dgCount, "dgCount", { min: 0, max: 999 }),
    paymentCondition: validatePaymentCondition(body.paymentCondition),
    remarks: optionalTrimmedString(body.remarks, "remarks", 1000),
    menu: body.menu === undefined ? undefined : requireNonEmptyString(body.menu, "menu", 100),
    menuItems,
    status,
    policyAgreement: validatePolicyAgreement(body.policyAgreement),
    customerAccountMode: validateCustomerAccountMode(body.customerAccountMode),
  };
  assertGroupReservationFields(input);
  return input;
}

function validateCustomerAccountMode(value: unknown) {
  if (value === undefined) return undefined;
  if (value === "account" || value === "guest" || value === "admin") return value;
  throw new ApiValidationError("customerAccountMode must be account, guest, or admin.");
}

export function validateUpdateReservationInput(body: Record<string, unknown>): UpdateReservationInput {
  const input: UpdateReservationInput = {};
  if (body.date !== undefined) input.date = requireIsoDate(body.date, "date");
  if (body.startTime !== undefined) input.startTime = requireTime(body.startTime, "startTime");
  if (body.endTime !== undefined) input.endTime = requireTime(body.endTime, "endTime");
  if (body.people !== undefined) input.people = requireInteger(body.people, "people", { min: 1, max: 999 });
  if (body.menuItems !== undefined) input.menuItems = optionalStringArray(body.menuItems, "menuItems") ?? [];
  if (body.customer !== undefined) input.customer = requireNonEmptyString(body.customer, "customer", 100);
  if (body.email !== undefined) input.email = requireEmail(body.email, "email");
  if (body.phone !== undefined) input.phone = requirePhone(body.phone, "phone");
  if (body.address !== undefined) input.address = optionalTrimmedString(body.address, "address", 500);
  if (body.bookingType !== undefined) input.bookingType = validateReservationBookingType(body.bookingType);
  if (body.bookingContactName !== undefined) input.bookingContactName = optionalTrimmedString(body.bookingContactName, "bookingContactName", 100);
  if (body.dayContactName !== undefined) input.dayContactName = optionalTrimmedString(body.dayContactName, "dayContactName", 100);
  if (body.dayContactPhone !== undefined) input.dayContactPhone = body.dayContactPhone === "" ? undefined : requirePhone(body.dayContactPhone, "dayContactPhone");
  if (body.groupName !== undefined) input.groupName = optionalTrimmedString(body.groupName, "groupName", 100);
  if (body.groupNameKana !== undefined) input.groupNameKana = optionalTrimmedString(body.groupNameKana, "groupNameKana", 100);
  if (body.groupType !== undefined) input.groupType = optionalTrimmedString(body.groupType, "groupType", 100);
  if (body.groupTypeOther !== undefined) input.groupTypeOther = optionalTrimmedString(body.groupTypeOther, "groupTypeOther", 100);
  if (body.tcCount !== undefined) input.tcCount = optionalInteger(body.tcCount, "tcCount", { min: 0, max: 999 }) ?? 0;
  if (body.dgCount !== undefined) input.dgCount = optionalInteger(body.dgCount, "dgCount", { min: 0, max: 999 }) ?? 0;
  if (body.paymentCondition !== undefined) input.paymentCondition = validatePaymentCondition(body.paymentCondition);
  if (body.remarks !== undefined) input.remarks = requireString(body.remarks, "remarks", 1000).trim();
  if (!Object.keys(input).length) throw new ApiValidationError("At least one reservation field is required.");
  return input;
}

export function validateCancellationRequestInput(body: Record<string, unknown>, options?: { allowMissingContact?: boolean }) {
  const reservationId = requireNonEmptyString(body.reservationId, "reservationId", 30);
  const email = body.email === undefined || body.email === "" ? undefined : requireEmail(body.email, "email");
  const phone = body.phone === undefined || body.phone === "" ? undefined : requirePhone(body.phone, "phone");
  if (!options?.allowMissingContact && !email && !phone) throw new ApiValidationError("email or phone is required.");
  return { reservationId, email, phone };
}

export function validateConfirmedReservationRequestInput(body: Record<string, unknown>, options?: { allowMissingContact?: boolean }) {
  const reservationId = requireNonEmptyString(body.reservationId, "reservationId", 30);
  const email = body.email === undefined || body.email === "" ? undefined : requireEmail(body.email, "email");
  const phone = body.phone === undefined || body.phone === "" ? undefined : requirePhone(body.phone, "phone");
  if (!options?.allowMissingContact && !email && !phone) throw new ApiValidationError("email or phone is required.");
  return { reservationId, email, phone };
}

export function validateReservationChangeRequestInput(body: Record<string, unknown>, options?: { allowMissingContact?: boolean }): CreateReservationChangeRequestInput {
  const reservationId = requireNonEmptyString(body.reservationId, "reservationId", 30);
  const email = body.email === undefined || body.email === "" ? undefined : requireEmail(body.email, "email");
  const phone = body.phone === undefined || body.phone === "" ? undefined : requirePhone(body.phone, "phone");
  if (!options?.allowMissingContact && !email && !phone) throw new ApiValidationError("email or phone is required.");
  return {
    reservationId,
    email,
    phone,
    requestedDate: requireIsoDate(body.requestedDate, "requestedDate"),
    requestedStartTime: requireTime(body.requestedStartTime, "requestedStartTime"),
    requestedPeople: requireInteger(body.requestedPeople, "requestedPeople", { min: 1, max: 999 }),
    requestedMenuItems: optionalStringArray(body.requestedMenuItems, "requestedMenuItems") ?? [],
    reason: body.reason === undefined || body.reason === "" ? undefined : requireString(body.reason, "reason", 1000).trim(),
  };
}

export function validateReservationStatus(value: unknown): ReservationStatus {
  if (typeof value !== "string" || !reservationStatuses.includes(value as ReservationStatus)) {
    throw new ApiValidationError("status must be a valid reservation status code.");
  }
  return normalizeReservationStatus(value);
}

export function validateConfirmationContactedAt(value: unknown) {
  if (value === null || value === undefined) return null;
  return requireIsoDateTime(value, "contactedAt");
}

export function validateStoreAssignments(body: Record<string, unknown>, expectedPeople: number): StoreAssignment[] {
  const rawAssignments = body.assignments ?? (body.store ? [{ store: body.store, people: body.people ?? expectedPeople }] : []);
  if (!Array.isArray(rawAssignments)) throw new ApiValidationError("assignments must be an array.");
  const assignments = rawAssignments.map((item, index) => {
    if (!isRecord(item)) throw new ApiValidationError(`assignments[${index}] must be an object.`);
    return {
      store: requireNonEmptyString(item.store, `assignments[${index}].store`, 100),
      people: requireInteger(item.people, `assignments[${index}].people`, { min: 1, max: 999 }),
    };
  });
  const assignedPeople = assignments.reduce((total, assignment) => total + assignment.people, 0);
  if (assignments.length > 0 && assignedPeople !== expectedPeople) {
    throw new ApiValidationError(`Assigned people must equal reservation people: ${expectedPeople}.`);
  }
  return assignments;
}

export function validateCustomerInput(body: Record<string, unknown>): SaveCustomerInput {
  return {
    id: body.id === undefined ? undefined : requireNonEmptyString(body.id, "id", 64),
    name: requireNonEmptyString(body.name, "name", 100),
    contact: requireEmail(body.contact, "contact"),
    phone: requirePhone(body.phone, "phone"),
    address: optionalTrimmedString(body.address, "address", 500),
    accountType: validateCustomerAccountType(body.accountType),
    companyBranchName: optionalTrimmedString(body.companyBranchName, "companyBranchName", 100),
    contactPersonName: optionalTrimmedString(body.contactPersonName, "contactPersonName", 100),
    originalContact: body.originalContact === undefined ? undefined : requireEmail(body.originalContact, "originalContact"),
  };
}

function validateCustomerAccountType(value: unknown): CustomerAccountType | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === "individual" || value === "travel_agency") return value;
  throw new ApiValidationError("accountType must be individual or travel_agency.");
}

function validateReservationBookingType(value: unknown): ReservationBookingType | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === "individual" || value === "travel_agency_group") return value;
  throw new ApiValidationError("bookingType must be individual or travel_agency_group.");
}

function validatePaymentCondition(value: unknown): PaymentCondition | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string" && paymentConditions.includes(value as PaymentCondition)) return value as PaymentCondition;
  throw new ApiValidationError("paymentCondition must be a valid payment condition code.");
}

function assertGroupReservationFields(input: CreateReservationInput) {
  if (input.bookingType !== "travel_agency_group") return;
  if (!input.companyBranchName && !input.name) throw new ApiValidationError("companyBranchName is required for travel agency group reservations.");
  if (!input.bookingContactName) throw new ApiValidationError("bookingContactName is required for travel agency group reservations.");
  if (!input.dayContactName) throw new ApiValidationError("dayContactName is required for travel agency group reservations.");
  if (!input.dayContactPhone) throw new ApiValidationError("dayContactPhone is required for travel agency group reservations.");
  if (!input.groupName) throw new ApiValidationError("groupName is required for travel agency group reservations.");
  if (!input.groupType) throw new ApiValidationError("groupType is required for travel agency group reservations.");
}

export function validateStoreInput(body: Record<string, unknown>): SaveStoreInput {
  return {
    id: body.id === undefined ? undefined : requireNonEmptyString(body.id, "id", 64),
    name: requireNonEmptyString(body.name, "name", 100),
    displayOrder: body.displayOrder === undefined ? 0 : requireInteger(body.displayOrder, "displayOrder", { min: 0, max: 9999 }),
  };
}

export function validateMenuInput(body: Record<string, unknown>): SaveMenuInput {
  return {
    name: requireNonEmptyString(body.name, "name", 100),
    description: body.description === undefined ? "" : requireString(body.description, "description", 1000),
    price: requireInteger(body.price, "price", { min: 0, max: 9999999 }),
    duration: body.duration === undefined ? "来店後" : requireNonEmptyString(body.duration, "duration", 30),
    displayOrder: body.displayOrder === undefined ? 0 : requireInteger(body.displayOrder, "displayOrder", { min: 0, max: 9999 }),
  };
}

function validatePolicyAgreement(value: unknown): CreateReservationInput["policyAgreement"] {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new ApiValidationError("policyAgreement must be an object.");
  return {
    kind: requireOneOf(value.kind, "policyAgreement.kind", ["temporary", "confirmed"]),
    acceptedAt: requireIsoDateTime(value.acceptedAt, "policyAgreement.acceptedAt"),
  };
}

function requireString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") throw new ApiValidationError(`${field} must be a string.`);
  if (value.length > maxLength) throw new ApiValidationError(`${field} must be ${maxLength} characters or fewer.`);
  return value;
}

function requireNonEmptyString(value: unknown, field: string, maxLength: number) {
  const text = requireString(value, field, maxLength).trim();
  if (!text) throw new ApiValidationError(`${field} is required.`);
  return text;
}

function optionalTrimmedString(value: unknown, field: string, maxLength: number) {
  if (value === undefined || value === null) return undefined;
  const text = requireString(value, field, maxLength).trim();
  return text || undefined;
}

function optionalStringArray(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ApiValidationError(`${field} must be an array.`);
  return value.map((item, index) => requireNonEmptyString(item, `${field}[${index}]`, 100));
}

function optionalInteger(value: unknown, field: string, options: { min: number; max: number }) {
  if (value === undefined || value === null || value === "") return undefined;
  return requireInteger(value, field, options);
}

function requireInteger(value: unknown, field: string, options: { min: number; max: number }) {
  if (typeof value !== "number" || !Number.isInteger(value)) throw new ApiValidationError(`${field} must be an integer.`);
  if (value < options.min || value > options.max) throw new ApiValidationError(`${field} must be between ${options.min} and ${options.max}.`);
  return value;
}

function requireEmail(value: unknown, field: string) {
  const email = requireNonEmptyString(value, field, 255);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiValidationError(`${field} must be a valid email address.`);
  return email;
}

function requirePhone(value: unknown, field: string) {
  const phone = requireNonEmptyString(value, field, 30);
  if (!/^[0-9+\-()\s]{8,30}$/.test(phone)) throw new ApiValidationError(`${field} must be a valid phone number.`);
  return phone;
}

function requireIsoDate(value: unknown, field: string) {
  const date = requireNonEmptyString(value, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiValidationError(`${field} must be YYYY-MM-DD.`);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new ApiValidationError(`${field} must be a valid date.`);
  return date;
}

function requireTime(value: unknown, field: string) {
  const time = requireNonEmptyString(value, field, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new ApiValidationError(`${field} must be HH:mm.`);
  return time;
}

function requireIsoDateTime(value: unknown, field: string) {
  const dateTime = requireNonEmptyString(value, field, 50);
  if (Number.isNaN(new Date(dateTime).getTime())) throw new ApiValidationError(`${field} must be a valid ISO date time.`);
  return dateTime;
}

function requireOneOf<const T extends readonly string[]>(value: unknown, field: string, values: T): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw new ApiValidationError(`${field} must be one of: ${values.join(", ")}.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
