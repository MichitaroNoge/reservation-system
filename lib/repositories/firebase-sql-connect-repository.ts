import { getDataConnect, type ConnectorConfig, type DataConnect } from "firebase-admin/data-connect";
import {
  addReservationDetail,
  assignStore,
  connectorConfig as generatedConnectorConfig,
  createCustomer,
  createMenu as createDataConnectMenu,
  createReservation,
  deactivateCustomer,
  deactivateMenu,
  deactivateStore,
  deleteReservationDetail,
  deleteStoreAssignment,
  getCustomerByName,
  getMenuByName,
  getReservationByCode,
  getStoreByName,
  listCustomers,
  listMenus,
  listReservations,
  listStores,
  updateConfirmationContact,
  updateCustomer,
  updateMenu as updateDataConnectMenu,
  updateReservation,
  updateReservationStatus,
  updateStore,
  ReservationStatus as DataConnectSdkReservationStatus,
  type GetCustomerByNameData,
  type GetMenuByNameData,
  type GetReservationByCodeData,
  type GetStoreByNameData,
  type ListCustomersData,
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
type DataConnectCustomer = ListCustomersData["customers"][number] | GetCustomerByNameData["customers"][number];
type DataConnectMenu = ListMenusData["menus"][number] | GetMenuByNameData["menus"][number];
type DataConnectStore = ListStoresData["stores"][number] | GetStoreByNameData["stores"][number];
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
    const customer = await this.createDataConnectCustomer(input);
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

  async updateCustomer(name: string, input: SaveCustomerInput) {
    const customer = await this.getDataConnectCustomerByName(name);
    await updateCustomer(this.connection(), {
      id: customer.id,
      name: input.name,
      phone: input.phone,
      email: input.contact,
    });
    return { name: input.name, contact: input.contact, phone: input.phone, count: 0, last: "-" };
  }

  async deleteCustomer(name: string) {
    const customer = await this.getDataConnectCustomerByName(name);
    await deactivateCustomer(this.connection(), { id: customer.id });
  }

  async listStores() {
    const { data } = await listStores(this.connection());
    return data.stores.map(toStore);
  }

  async updateStore(name: string, input: SaveStoreInput) {
    const store = await this.getDataConnectStoreByName(name);
    await updateStore(this.connection(), {
      id: store.id,
      name: input.name,
      address: input.area,
      active: input.state === "営業中",
    });
    return input;
  }

  async deleteStore(name: string) {
    const store = await this.getDataConnectStoreByName(name);
    await deactivateStore(this.connection(), { id: store.id });
  }

  async listMenus() {
    const menus = await this.listDataConnectMenus();
    return menus.map(toMenu);
  }

  async createMenu(input: SaveMenuInput) {
    const existing = await this.findDataConnectMenuByName(input.name);
    if (existing) throw new Error(`Menu already exists: ${input.name}`);
    await createDataConnectMenu(this.connection(), {
      name: input.name,
      description: input.description,
      standardPrice: input.price,
      durationMinutes: durationToMinutes(input.duration),
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
      active: true,
    });
    return input;
  }

  async deleteMenu(name: string) {
    const menu = await this.getDataConnectMenuByName(name);
    await deactivateMenu(this.connection(), { id: menu.id });
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
    });
    return data.customer_insert;
  }

  private async getDataConnectCustomerByName(name: string) {
    const { data } = await getCustomerByName(this.connection(), { name });
    const customer = data.customers[0];
    if (!customer) throw new Error(`Customer not found: ${name}`);
    return customer;
  }

  private async getDataConnectStoreByName(name: string) {
    const { data } = await getStoreByName(this.connection(), { name });
    const store = data.stores[0];
    if (!store) throw new Error(`Store not found: ${name}`);
    return store;
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
    name: customer.name,
    contact: customer.email,
    phone: customer.phone,
    count: reservations.length,
    last: reservations.map((reservation) => reservation.usageDate).sort().at(-1) ?? "-",
  };
}

function toStore(store: DataConnectStore): Store {
  return {
    name: store.name,
    area: store.address ?? "",
    today: 0,
    month: 0,
    state: store.active === false ? "休業中" : "営業中",
  };
}

function toMenu(menu: DataConnectMenu): Menu {
  return {
    name: menu.name,
    description: menu.description ?? "",
    price: menu.standardPrice,
    duration: menu.durationMinutes > 0 ? `${menu.durationMinutes}分` : "来店後",
  };
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
