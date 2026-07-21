import { getDataConnect, type ConnectorConfig, type DataConnect } from "firebase-admin/data-connect";
import {
  addReservationDetail,
  assignStore,
  connectorConfig as generatedConnectorConfig,
  createCustomer,
  createStore as createDataConnectStore,
  createMenu as createDataConnectMenu,
  createReservation,
  deactivateCustomer,
  deactivateMenu,
  deactivateStore,
  deleteReservationDetail,
  deleteStoreAssignment,
  getCustomerByEmail,
  getCustomerByFirebaseUid,
  getCustomerById,
  getCustomerByName,
  getMenuByName,
  getReservationByCode,
  getStoreById,
  getStoreByName,
  listCustomers,
  listInactiveCustomers,
  listInactiveMenus,
  listInactiveStores,
  listMenus,
  listReservations,
  listStores,
  updateConfirmationContact,
  updateCustomer,
  updateCustomerIdentity,
  reactivateCustomer as reactivateDataConnectCustomer,
  reactivateMenu as reactivateDataConnectMenu,
  reactivateStore as reactivateDataConnectStore,
  updateMenu as updateDataConnectMenu,
  updateReservation,
  updateReservationStatus,
  updateStore,
  ReservationStatus as DataConnectSdkReservationStatus,
  type GetCustomerByNameData,
  type GetCustomerByEmailData,
  type GetCustomerByFirebaseUidData,
  type GetCustomerByIdData,
  type GetMenuByNameData,
  type GetReservationByCodeData,
  type GetStoreByIdData,
  type GetStoreByNameData,
  type ListCustomersData,
  type ListInactiveCustomersData,
  type ListInactiveMenusData,
  type ListInactiveStoresData,
  type ListMenusData,
  type ListReservationsData,
  type ListStoresData,
} from "@reservation-system/dataconnect-admin";
import {
  normalizeReservationStatus,
  toDataConnectReservationStatus,
  type CreateReservationInput,
  type Customer,
  type DataConnectReservationStatus,
  type Menu,
  type Reservation,
  type ReservationStatus,
  type SaveCustomerInput,
  type SaveMenuInput,
  type SaveStoreInput,
  type Store,
  type StoreAssignment,
  type UpdateReservationInput,
} from "../domain";
import { getFirebaseAdminApp } from "../auth";
import type { ReservationRepository } from "./reservation-repository";

type DataConnectReservation = ListReservationsData["reservations"][number] | GetReservationByCodeData["reservations"][number];
type DataConnectCustomer = ListCustomersData["customers"][number] | ListInactiveCustomersData["customers"][number] | NonNullable<GetCustomerByIdData["customer"]> | GetCustomerByNameData["customers"][number] | GetCustomerByEmailData["customers"][number] | GetCustomerByFirebaseUidData["customers"][number];
type DataConnectMenu = ListMenusData["menus"][number] | ListInactiveMenusData["menus"][number] | GetMenuByNameData["menus"][number];
type DataConnectStore = ListStoresData["stores"][number] | ListInactiveStoresData["stores"][number] | NonNullable<GetStoreByIdData["store"]> | GetStoreByNameData["stores"][number];
type ReservationWithDataConnectIds = Reservation & {
  dataConnectId: string;
  dataConnectCustomerId: string;
  dataConnectReservationDetails: { id: string }[];
  dataConnectStoreAssignments: { id: string }[];
  email: string;
};

const connectorConfig: ConnectorConfig = {
  ...generatedConnectorConfig,
  location: process.env.FIREBASE_DATACONNECT_LOCATION ?? "asia-northeast1",
  serviceId: process.env.FIREBASE_DATACONNECT_SERVICE_ID ?? "reservation-system",
  connector: process.env.FIREBASE_DATACONNECT_CONNECTOR ?? "reservation",
};

export class FirebaseSqlConnectReservationRepository implements ReservationRepository {
  private dataConnect?: DataConnect;

  async listReservations() {
    const { data } = await listReservations(this.connection());
    return data.reservations.map(toReservation);
  }

  async createReservation(input: CreateReservationInput) {
    const menuItems = input.menuItems ?? (input.menu ? [input.menu] : []);
    const reservationCode = await this.nextReservationCode();
    const customer = await this.resolveDataConnectCustomer(input);
    const status = toSdkReservationStatus(normalizeReservationStatus(input.status));
    const { data } = await createReservation(this.connection(), {
      reservationCode,
      customerId: customer.id,
      usageDate: input.date,
      usageTime: input.startTime ?? "10:00",
      expectedPeople: input.people,
      status,
      policyAgreementKind: input.policyAgreement?.kind,
      policyAgreementAcceptedAt: input.policyAgreement?.acceptedAt,
    });
    const menus = await this.listDataConnectMenus();
    for (const menuName of menuItems) {
      const menu = menus.find((item) => item.name === menuName);
      if (!menu) continue;
      await addReservationDetail(this.connection(), {
        reservationId: data.reservation_insert.id,
        menuId: menu.id,
        quantity: 1,
        unitPrice: menu.standardPrice,
      });
    }
    return this.getReservationWithInternalId(reservationCode);
  }

  async updateReservation(id: string, input: UpdateReservationInput) {
    const current = await this.getReservationWithInternalId(id);
    if (input.customer !== undefined || input.email !== undefined || input.phone !== undefined) {
      await updateCustomer(this.connection(), {
        id: current.dataConnectCustomerId,
        name: input.customer ?? current.customer,
        phone: input.phone ?? current.phone,
        email: input.email ?? current.email,
      });
    }
    await updateReservation(this.connection(), {
      id: current.dataConnectId,
      usageDate: input.date ?? current.date,
      usageTime: input.startTime ?? current.startTime ?? "10:00",
      expectedPeople: input.people ?? current.people,
    });
    if (input.menuItems !== undefined) {
      await this.replaceReservationDetails(current.dataConnectId, current.dataConnectReservationDetails, input.menuItems);
    }
    return this.getReservationWithInternalId(id);
  }

  async updateReservationStatus(id: string, status: ReservationStatus) {
    const current = await this.getReservationWithInternalId(id);
    await updateReservationStatus(this.connection(), {
      id: current.dataConnectId,
      status: toSdkReservationStatus(status),
    });
    return { ...current, status };
  }

  async updateConfirmationContact(id: string, contactedAt: string | null) {
    const current = await this.getReservationWithInternalId(id);
    await updateConfirmationContact(this.connection(), {
      id: current.dataConnectId,
      confirmationContactedAt: contactedAt,
    });
    return this.getReservationWithInternalId(id);
  }

  async assignStores(id: string, assignments: StoreAssignment[]) {
    const reservation = await this.getReservationWithInternalId(id);
    const validAssignments = assignments
      .filter((assignment) => assignment.store && assignment.people > 0)
      .map((assignment) => ({ store: assignment.store, people: Number(assignment.people) }));
    const assignedPeople = validAssignments.reduce((total, assignment) => total + assignment.people, 0);
    if (validAssignments.length > 0 && assignedPeople !== reservation.people) {
      throw new Error(`Assigned people must equal reservation people: ${reservation.people}`);
    }
    for (const assignment of reservation.dataConnectStoreAssignments) {
      await deleteStoreAssignment(this.connection(), { id: assignment.id });
    }
    for (const assignment of validAssignments) {
      const store = await this.getDataConnectStoreByName(assignment.store);
      await assignStore(this.connection(), {
        reservationId: reservation.dataConnectId,
        storeId: store.id,
        people: assignment.people,
      });
    }
    return this.getReservationWithInternalId(id);
  }

  async listCustomers() {
    const { data } = await listCustomers(this.connection());
    return data.customers.map(toCustomer);
  }

  async listInactiveCustomers() {
    const { data } = await listInactiveCustomers(this.connection());
    return data.customers.map(toCustomer);
  }

  async findCustomerForReservationAccount(firebaseUid: string, email: string) {
    const customerByUid = await this.findDataConnectCustomerByFirebaseUid(firebaseUid);
    const customer = customerByUid ?? await this.findDataConnectCustomerByEmail(email);
    return customer ? toCustomer(customer) : null;
  }

  async createCustomer(input: SaveCustomerInput) {
    const existing = await this.findDataConnectCustomerByEmail(input.contact);
    if (existing) throw new Error(`Customer already exists: ${input.contact}`);

    const inactive = (await this.listInactiveCustomers())
      .find((customer) => customer.contact.toLowerCase() === input.contact.toLowerCase());
    if (inactive?.id) {
      await updateCustomer(this.connection(), {
        id: inactive.id,
        name: input.name,
        phone: input.phone,
        email: input.contact,
      });
      await reactivateDataConnectCustomer(this.connection(), { id: inactive.id });
      const restored = await this.getDataConnectCustomerById(inactive.id);
      return toCustomer(restored);
    }

    const { data } = await createCustomer(this.connection(), {
      name: input.name,
      phone: input.phone,
      email: input.contact,
      firebaseUid: null,
    });
    return { id: data.customer_insert.id, name: input.name, contact: input.contact, phone: input.phone, count: 0, last: "-" };
  }

  async updateCustomer(name: string, input: SaveCustomerInput) {
    const customer = input.id ? { id: input.id } : input.originalContact
      ? await this.findDataConnectCustomerByEmail(input.originalContact) ?? await this.getDataConnectCustomerByName(name)
      : await this.getDataConnectCustomerByName(name);
    await updateCustomer(this.connection(), {
      id: customer.id,
      name: input.name,
      phone: input.phone,
      email: input.contact,
    });
    return { id: customer.id, name: input.name, contact: input.contact, phone: input.phone, count: 0, last: "-" };
  }

  async deleteCustomer(name: string) {
    const customer = await this.getDataConnectCustomerByName(name);
    await deactivateCustomer(this.connection(), { id: customer.id });
  }

  async reactivateCustomer(id: string) {
    await reactivateDataConnectCustomer(this.connection(), { id });
    const customer = await this.getDataConnectCustomerById(id);
    return toCustomer(customer);
  }

  async listStores() {
    const { data } = await listStores(this.connection());
    return sortByDisplayOrderThenName(data.stores.map(toStore));
  }

  async listInactiveStores() {
    const { data } = await listInactiveStores(this.connection());
    return sortByDisplayOrderThenName(data.stores.map(toStore));
  }

  async createStore(input: SaveStoreInput) {
    const existing = await this.findDataConnectStoreByName(input.name);
    if (existing?.active) throw new Error(`Store already exists: ${input.name}`);
    if (existing) {
      await updateStore(this.connection(), {
        id: existing.id,
        name: input.name,
        displayOrder: input.displayOrder,
        active: true,
      });
      await reactivateDataConnectStore(this.connection(), { id: existing.id });
      const restored = await this.getDataConnectStoreById(existing.id);
      return toStore(restored);
    }
    await createDataConnectStore(this.connection(), {
      name: input.name,
      displayOrder: input.displayOrder,
      active: true,
    });
    return input;
  }

  async updateStore(name: string, input: SaveStoreInput) {
    const store = await this.getDataConnectStoreByName(name);
    await updateStore(this.connection(), {
      id: store.id,
      name: input.name,
      displayOrder: input.displayOrder,
      active: true,
    });
    return { ...input, id: store.id };
  }

  async deleteStore(name: string) {
    const store = await this.getDataConnectStoreByName(name);
    await deactivateStore(this.connection(), { id: store.id });
  }

  async reactivateStore(id: string) {
    await reactivateDataConnectStore(this.connection(), { id });
    const store = await this.getDataConnectStoreById(id);
    return toStore(store);
  }

  async listMenus() {
    const menus = await this.listDataConnectMenus();
    return sortByDisplayOrderThenName(menus.map(toMenu));
  }

  async listInactiveMenus() {
    const { data } = await listInactiveMenus(this.connection());
    return sortByDisplayOrderThenName(data.menus.map(toMenu));
  }

  async createMenu(input: SaveMenuInput) {
    const existing = await this.findDataConnectMenuByName(input.name);
    if (existing?.active) throw new Error(`Menu already exists: ${input.name}`);
    if (existing) {
      await updateDataConnectMenu(this.connection(), {
        id: existing.id,
        name: input.name,
        description: input.description,
        standardPrice: input.price,
        durationMinutes: durationToMinutes(input.duration),
        displayOrder: input.displayOrder,
        active: true,
      });
      await reactivateDataConnectMenu(this.connection(), { id: existing.id });
      const restored = await this.getDataConnectMenuByName(input.name);
      return toMenu(restored);
    }
    await createDataConnectMenu(this.connection(), {
      name: input.name,
      description: input.description,
      standardPrice: input.price,
      durationMinutes: durationToMinutes(input.duration),
      displayOrder: input.displayOrder,
      active: true,
    });
    return input;
  }

  async updateMenu(name: string, input: SaveMenuInput) {
    const menu = await this.getDataConnectMenuByName(name);
    await updateDataConnectMenu(this.connection(), {
      id: menu.id,
      name: input.name,
      description: input.description,
      standardPrice: input.price,
      durationMinutes: durationToMinutes(input.duration),
      displayOrder: input.displayOrder,
      active: true,
    });
    return input;
  }

  async deleteMenu(name: string) {
    const menu = await this.getDataConnectMenuByName(name);
    await deactivateMenu(this.connection(), { id: menu.id });
  }

  async reactivateMenu(id: string) {
    await reactivateDataConnectMenu(this.connection(), { id });
    const menus = await this.listDataConnectInactiveAndActiveMenus();
    const menu = menus.find((item) => item.id === id);
    if (!menu) throw new Error(`Menu not found: ${id}`);
    return toMenu(menu);
  }

  private connection() {
    this.dataConnect ??= getDataConnect(connectorConfig, getFirebaseAdminApp());
    return this.dataConnect;
  }

  private async getReservationWithInternalId(reservationCode: string): Promise<ReservationWithDataConnectIds> {
    const { data } = await getReservationByCode(this.connection(), { reservationCode });
    const reservation = data.reservations[0];
    if (!reservation) throw new Error(`Reservation not found: ${reservationCode}`);
    return {
      ...toReservation(reservation),
      email: reservation.customer.email,
      dataConnectId: reservation.id,
      dataConnectCustomerId: reservation.customer.id,
      dataConnectReservationDetails: reservation.reservationDetails_on_reservation.map((detail) => ({ id: detail.id })),
      dataConnectStoreAssignments: reservation.storeAssignments_on_reservation.map((assignment) => ({ id: assignment.id })),
    };
  }

  private async createDataConnectCustomer(input: CreateReservationInput) {
    const { data } = await createCustomer(this.connection(), {
      name: input.name,
      phone: input.phone,
      email: input.email,
      firebaseUid: input.customerFirebaseUid ?? null,
    });
    return data.customer_insert;
  }

  private async resolveDataConnectCustomer(input: CreateReservationInput) {
    if (input.customerFirebaseUid) {
      const customerByUid = await this.findDataConnectCustomerByFirebaseUid(input.customerFirebaseUid);
      if (customerByUid) return this.updateDataConnectCustomerIdentity(customerByUid.id, input);

      const customerByEmail = await this.findDataConnectCustomerByEmail(input.email);
      if (customerByEmail?.firebaseUid && customerByEmail.firebaseUid !== input.customerFirebaseUid) {
        throw new Error("Customer email is already linked to another account.");
      }
      if (customerByEmail) return this.updateDataConnectCustomerIdentity(customerByEmail.id, input);

      return this.createDataConnectCustomer(input);
    }

    if (input.customerAccountMode === "guest") {
      const customerByEmail = await this.findDataConnectCustomerByEmail(input.email);
      if (customerByEmail) return { id: customerByEmail.id };
      return this.createDataConnectCustomer(input);
    }

    const customerByEmail = await this.findDataConnectCustomerByEmail(input.email);
    if (customerByEmail) return this.updateDataConnectCustomerProfile(customerByEmail.id, input);

    return this.createDataConnectCustomer(input);
  }

  private async updateDataConnectCustomerIdentity(customerId: string, input: CreateReservationInput) {
    await updateCustomerIdentity(this.connection(), {
      id: customerId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      firebaseUid: input.customerFirebaseUid,
    });
    return { id: customerId };
  }

  private async updateDataConnectCustomerProfile(customerId: string, input: CreateReservationInput) {
    await updateCustomer(this.connection(), {
      id: customerId,
      name: input.name,
      phone: input.phone,
      email: input.email,
    });
    return { id: customerId };
  }

  private async findDataConnectCustomerByFirebaseUid(firebaseUid: string) {
    const { data } = await getCustomerByFirebaseUid(this.connection(), { firebaseUid });
    return data.customers[0];
  }

  private async findDataConnectCustomerByEmail(email: string) {
    const { data } = await getCustomerByEmail(this.connection(), { email });
    return data.customers[0];
  }

  private async getDataConnectCustomerById(id: string) {
    const { data } = await getCustomerById(this.connection(), { id });
    if (!data.customer) throw new Error(`Customer not found: ${id}`);
    return data.customer;
  }

  private async getDataConnectCustomerByName(name: string) {
    const { data } = await getCustomerByName(this.connection(), { name });
    const customer = data.customers[0];
    if (!customer) throw new Error(`Customer not found: ${name}`);
    return customer;
  }

  private async getDataConnectStoreByName(name: string) {
    const store = await this.findDataConnectStoreByName(name);
    if (!store) throw new Error(`Store not found: ${name}`);
    return store;
  }

  private async getDataConnectStoreById(id: string) {
    const { data } = await getStoreById(this.connection(), { id });
    if (!data.store) throw new Error(`Store not found: ${id}`);
    return data.store;
  }

  private async findDataConnectStoreByName(name: string) {
    const { data } = await getStoreByName(this.connection(), { name });
    return data.stores[0];
  }

  private async findDataConnectMenuByName(name: string) {
    const { data } = await getMenuByName(this.connection(), { name });
    return data.menus[0];
  }

  private async getDataConnectMenuByName(name: string) {
    const menu = await this.findDataConnectMenuByName(name);
    if (!menu) throw new Error(`Menu not found: ${name}`);
    return menu;
  }

  private async replaceReservationDetails(reservationId: string, currentDetails: { id: string }[], menuItems: string[]) {
    for (const detail of currentDetails) {
      await deleteReservationDetail(this.connection(), { id: detail.id });
    }
    const menus = await this.listDataConnectMenus();
    for (const menuName of menuItems) {
      const menu = menus.find((item) => item.name === menuName);
      if (!menu) throw new Error(`Menu not found: ${menuName}`);
      await addReservationDetail(this.connection(), {
        reservationId,
        menuId: menu.id,
        quantity: 1,
        unitPrice: menu.standardPrice,
      });
    }
  }

  private async listDataConnectMenus() {
    const { data } = await listMenus(this.connection());
    return data.menus;
  }

  private async listDataConnectInactiveAndActiveMenus() {
    const activeMenus = await this.listDataConnectMenus();
    const { data } = await listInactiveMenus(this.connection());
    return [...activeMenus, ...data.menus];
  }

  private async nextReservationCode() {
    const reservations = await this.listReservations();
    const maxNumber = reservations.reduce((max, reservation) => {
      const match = reservation.id.match(/^RSV-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 1043);
    return `RSV-${maxNumber + 1}`;
  }
}

function toReservation(reservation: DataConnectReservation): Reservation {
  const menuItems = (reservation.reservationDetails_on_reservation ?? []).flatMap((detail) =>
    Array.from({ length: detail.quantity }, () => detail.menu.name),
  );
  const storeAssignments = (reservation.storeAssignments_on_reservation ?? []).map((assignment) => ({
    store: assignment.store.name,
    people: assignment.people ?? reservation.expectedPeople,
  }));
  const totalAmount = (reservation.reservationDetails_on_reservation ?? []).reduce(
    (total, detail) => total + detail.quantity * detail.unitPrice,
    0,
  );
  return {
    id: reservation.reservationCode,
    customer: reservation.customer.name,
    email: reservation.customer.email,
    date: reservation.usageDate,
    startTime: reservation.usageTime,
    people: reservation.expectedPeople,
    menuItems,
    totalAmount,
    store: storeAssignments.length === 1 ? storeAssignments[0].store : storeAssignments.length > 1 ? "複数店舗" : null,
    storeAssignments,
    status: normalizeReservationStatus(reservation.status),
    policyAgreement: reservation.policyAgreementKind && reservation.policyAgreementAcceptedAt
      ? { kind: reservation.policyAgreementKind === "temporary" ? "temporary" : "confirmed", acceptedAt: reservation.policyAgreementAcceptedAt }
      : undefined,
    confirmationContactedAt: reservation.confirmationContactedAt ?? null,
    received: formatReceivedLabel(reservation.receivedAt),
    phone: reservation.customer.phone,
  };
}

function toCustomer(customer: DataConnectCustomer): Customer {
  const reservations = "reservations_on_customer" in customer ? customer.reservations_on_customer ?? [] : [];
  return {
    id: customer.id,
    name: customer.name,
    contact: customer.email,
    phone: customer.phone,
    count: reservations.length,
    last: reservations.map((reservation) => reservation.usageDate).sort().at(-1) ?? "-",
  };
}

function toStore(store: DataConnectStore): Store {
  return {
    id: store.id,
    name: store.name,
    displayOrder: store.displayOrder ?? 0,
  };
}

function toMenu(menu: DataConnectMenu): Menu {
  return {
    id: menu.id,
    name: menu.name,
    description: menu.description ?? "",
    price: menu.standardPrice,
    duration: menu.durationMinutes > 0 ? `${menu.durationMinutes}分` : "来店後",
    displayOrder: menu.displayOrder ?? 0,
    active: menu.active,
  };
}

function sortByDisplayOrderThenName<T extends { displayOrder: number; name: string }>(items: T[]) {
  return [...items].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "ja-JP", { numeric: true }));
}

function durationToMinutes(duration: string) {
  if (duration === "来店後") return 0;
  const match = duration.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function formatReceivedLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function toSdkReservationStatus(status: ReservationStatus) {
  return DataConnectSdkReservationStatus[toDataConnectReservationStatus(status)];
}
