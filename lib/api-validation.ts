import { normalizeReservationStatus, reservationStatuses, type CreateReservationInput, type ReservationStatus, type SaveCustomerInput, type SaveMenuInput, type SaveStoreInput, type StoreAssignment, type UpdateReservationInput } from "./domain";

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
  if (/not found/i.test(message)) return Response.json({ error: message }, { status: 404 });
  if (/already exists/i.test(message)) return Response.json({ error: message }, { status: 409 });
  if (/Could not load the default credentials|invalid-credential|credential/i.test(message)) {
    console.error(error);
    return Response.json({ error: "Firebase Admin SDKの認証情報が未設定です。FIREBASE_SERVICE_ACCOUNT_KEY または Google Application Default Credentials を設定してください。" }, { status: 503 });
  }
  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
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
  return {
    date: requireIsoDate(body.date, "date"),
    startTime: body.startTime === undefined ? undefined : requireTime(body.startTime, "startTime"),
    people: requireInteger(body.people, "people", { min: 1, max: 999 }),
    name: requireNonEmptyString(body.name, "name", 100),
    email: requireEmail(body.email, "email"),
    phone: requirePhone(body.phone, "phone"),
    menu: body.menu === undefined ? undefined : requireNonEmptyString(body.menu, "menu", 100),
    menuItems,
    status,
    policyAgreement: validatePolicyAgreement(body.policyAgreement),
    customerAccountMode: validateCustomerAccountMode(body.customerAccountMode),
  };
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
  if (body.people !== undefined) input.people = requireInteger(body.people, "people", { min: 1, max: 999 });
  if (body.menuItems !== undefined) input.menuItems = optionalStringArray(body.menuItems, "menuItems") ?? [];
  if (body.customer !== undefined) input.customer = requireNonEmptyString(body.customer, "customer", 100);
  if (body.email !== undefined) input.email = requireEmail(body.email, "email");
  if (body.phone !== undefined) input.phone = requirePhone(body.phone, "phone");
  if (!Object.keys(input).length) throw new ApiValidationError("At least one reservation field is required.");
  return input;
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
    originalContact: body.originalContact === undefined ? undefined : requireEmail(body.originalContact, "originalContact"),
  };
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

function optionalStringArray(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ApiValidationError(`${field} must be an array.`);
  return value.map((item, index) => requireNonEmptyString(item, `${field}[${index}]`, 100));
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
