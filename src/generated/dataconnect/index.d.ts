import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export enum BillingStatus {
  UNBILLED = "UNBILLED",
  INVOICED = "INVOICED",
  PAID = "PAID",
  VOIDED = "VOIDED",
};

export enum BillingType {
  USAGE = "USAGE",
  CANCELLATION = "CANCELLATION",
};

export enum ReservationStatus {
  TEMPORARY_REQUESTED = "TEMPORARY_REQUESTED",
  TEMPORARY_CONFIRMED = "TEMPORARY_CONFIRMED",
  CONFIRMED_REQUESTED = "CONFIRMED_REQUESTED",
  CONFIRMED = "CONFIRMED",
  WAITING_FOR_VISIT = "WAITING_FOR_VISIT",
  VISITED = "VISITED",
  CANCELLATION_REQUESTED = "CANCELLATION_REQUESTED",
  CANCELLED = "CANCELLED",
};



export interface AddReservationDetailData {
  reservationDetail_insert: ReservationDetail_Key;
}

export interface AddReservationDetailVariables {
  reservationId: UUIDString;
  menuId: UUIDString;
  quantity: number;
  unitPrice: number;
}

export interface AssignStoreData {
  storeAssignment_insert: StoreAssignment_Key;
}

export interface AssignStoreVariables {
  reservationId: UUIDString;
  storeId: UUIDString;
  people: number;
}

export interface Billing_Key {
  id: UUIDString;
  __typename?: 'Billing_Key';
}

export interface CreateCustomerData {
  customer_insert: Customer_Key;
}

export interface CreateCustomerVariables {
  name: string;
  phone: string;
  email: string;
}

export interface CreateMenuData {
  menu_insert: Menu_Key;
}

export interface CreateMenuVariables {
  name: string;
  description?: string | null;
  standardPrice: number;
  durationMinutes: number;
  active: boolean;
}

export interface CreateReservationData {
  reservation_insert: Reservation_Key;
}

export interface CreateReservationVariables {
  reservationCode: string;
  customerId: UUIDString;
  usageDate: DateString;
  usageTime: string;
  expectedPeople: number;
  status: ReservationStatus;
  policyAgreementKind?: string | null;
  policyAgreementAcceptedAt?: TimestampString | null;
}

export interface Customer_Key {
  id: UUIDString;
  __typename?: 'Customer_Key';
}

export interface DeactivateCustomerData {
  customer_update?: Customer_Key | null;
}

export interface DeactivateCustomerVariables {
  id: UUIDString;
}

export interface DeactivateMenuData {
  menu_update?: Menu_Key | null;
}

export interface DeactivateMenuVariables {
  id: UUIDString;
}

export interface DeactivateStoreData {
  store_update?: Store_Key | null;
}

export interface DeactivateStoreVariables {
  id: UUIDString;
}

export interface DeleteReservationDetailData {
  reservationDetail_delete?: ReservationDetail_Key | null;
}

export interface DeleteReservationDetailVariables {
  id: UUIDString;
}

export interface DeleteStoreAssignmentData {
  storeAssignment_delete?: StoreAssignment_Key | null;
}

export interface DeleteStoreAssignmentVariables {
  id: UUIDString;
}

export interface GetCustomerByNameData {
  customers: ({
    id: UUIDString;
    name: string;
    phone: string;
    email: string;
    active: boolean;
  } & Customer_Key)[];
}

export interface GetCustomerByNameVariables {
  name: string;
}

export interface GetMenuByNameData {
  menus: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    standardPrice: number;
    durationMinutes: number;
    active: boolean;
  } & Menu_Key)[];
}

export interface GetMenuByNameVariables {
  name: string;
}

export interface GetReservationByCodeData {
  reservations: ({
    id: UUIDString;
    reservationCode: string;
    usageDate: DateString;
    usageTime: string;
    status: ReservationStatus;
    expectedPeople: number;
    policyAgreementKind?: string | null;
    policyAgreementAcceptedAt?: TimestampString | null;
    confirmationContactedAt?: TimestampString | null;
    receivedAt: TimestampString;
    updatedAt: TimestampString;
    customer: {
      id: UUIDString;
      name: string;
      phone: string;
      email: string;
    } & Customer_Key;
    reservationDetails_on_reservation: ({
      id: UUIDString;
      quantity: number;
      unitPrice: number;
      menu: {
        id: UUIDString;
        name: string;
        description?: string | null;
        standardPrice: number;
        durationMinutes: number;
      } & Menu_Key;
    } & ReservationDetail_Key)[];
    storeAssignments_on_reservation: ({
      id: UUIDString;
      people: number;
      assignedAt: TimestampString;
      store: {
        id: UUIDString;
        name: string;
        address?: string | null;
      } & Store_Key;
    } & StoreAssignment_Key)[];
  } & Reservation_Key)[];
}

export interface GetReservationByCodeVariables {
  reservationCode: string;
}

export interface GetReservationData {
  reservation?: {
    id: UUIDString;
    reservationCode: string;
    usageDate: DateString;
    usageTime: string;
    status: ReservationStatus;
    expectedPeople: number;
    policyAgreementKind?: string | null;
    policyAgreementAcceptedAt?: TimestampString | null;
    confirmationContactedAt?: TimestampString | null;
    receivedAt: TimestampString;
    updatedAt: TimestampString;
    customer: {
      id: UUIDString;
      name: string;
      phone: string;
      email: string;
    } & Customer_Key;
    reservationDetails_on_reservation: ({
      id: UUIDString;
      quantity: number;
      unitPrice: number;
      menu: {
        id: UUIDString;
        name: string;
        description?: string | null;
        standardPrice: number;
        durationMinutes: number;
      } & Menu_Key;
    } & ReservationDetail_Key)[];
    storeAssignments_on_reservation: ({
      id: UUIDString;
      people: number;
      assignedAt: TimestampString;
      store: {
        id: UUIDString;
        name: string;
        address?: string | null;
      } & Store_Key;
    } & StoreAssignment_Key)[];
    visitRecord_on_reservation?: {
      id: UUIDString;
      visitedAt: TimestampString;
      actualPeople: number;
    } & VisitRecord_Key;
    billings_on_reservation: ({
      id: UUIDString;
      billingType: BillingType;
      amount: number;
      billingDate: DateString;
      status: BillingStatus;
    } & Billing_Key)[];
  } & Reservation_Key;
}

export interface GetReservationVariables {
  id: UUIDString;
}

export interface GetStoreByNameData {
  stores: ({
    id: UUIDString;
    name: string;
    address?: string | null;
    active: boolean;
  } & Store_Key)[];
}

export interface GetStoreByNameVariables {
  name: string;
}

export interface Invoice_Key {
  id: UUIDString;
  __typename?: 'Invoice_Key';
}

export interface ListBillingRecordsData {
  billings: ({
    id: UUIDString;
    billingType: BillingType;
    amount: number;
    billingDate: DateString;
    status: BillingStatus;
    reservation: {
      id: UUIDString;
      reservationCode: string;
      customer: {
        id: UUIDString;
        name: string;
      } & Customer_Key;
    } & Reservation_Key;
    invoice_on_billing?: {
      id: UUIDString;
      invoiceNumber: string;
      issuedAt: TimestampString;
    } & Invoice_Key;
  } & Billing_Key)[];
}

export interface ListCustomersData {
  customers: ({
    id: UUIDString;
    name: string;
    phone: string;
    email: string;
    firebaseUid?: string | null;
    active: boolean;
    createdAt: TimestampString;
    reservations_on_customer: ({
      id: UUIDString;
      reservationCode: string;
      usageDate: DateString;
      status: ReservationStatus;
    } & Reservation_Key)[];
  } & Customer_Key)[];
}

export interface ListMenusData {
  menus: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    standardPrice: number;
    durationMinutes: number;
    active: boolean;
  } & Menu_Key)[];
}

export interface ListReservationsData {
  reservations: ({
    id: UUIDString;
    reservationCode: string;
    usageDate: DateString;
    usageTime: string;
    status: ReservationStatus;
    expectedPeople: number;
    policyAgreementKind?: string | null;
    policyAgreementAcceptedAt?: TimestampString | null;
    confirmationContactedAt?: TimestampString | null;
    receivedAt: TimestampString;
    updatedAt: TimestampString;
    customer: {
      id: UUIDString;
      name: string;
      phone: string;
      email: string;
    } & Customer_Key;
    reservationDetails_on_reservation: ({
      id: UUIDString;
      quantity: number;
      unitPrice: number;
      menu: {
        id: UUIDString;
        name: string;
        description?: string | null;
        standardPrice: number;
        durationMinutes: number;
      } & Menu_Key;
    } & ReservationDetail_Key)[];
    storeAssignments_on_reservation: ({
      id: UUIDString;
      people: number;
      assignedAt: TimestampString;
      store: {
        id: UUIDString;
        name: string;
        address?: string | null;
      } & Store_Key;
    } & StoreAssignment_Key)[];
  } & Reservation_Key)[];
}

export interface ListStoresData {
  stores: ({
    id: UUIDString;
    name: string;
    address?: string | null;
    active: boolean;
  } & Store_Key)[];
}

export interface Menu_Key {
  id: UUIDString;
  __typename?: 'Menu_Key';
}

export interface RecordVisitData {
  visitRecord_insert: VisitRecord_Key;
  reservation_update?: Reservation_Key | null;
}

export interface RecordVisitVariables {
  reservationId: UUIDString;
  visitedAt: TimestampString;
  actualPeople: number;
}

export interface ReservationDetail_Key {
  id: UUIDString;
  __typename?: 'ReservationDetail_Key';
}

export interface Reservation_Key {
  id: UUIDString;
  __typename?: 'Reservation_Key';
}

export interface StoreAssignment_Key {
  id: UUIDString;
  __typename?: 'StoreAssignment_Key';
}

export interface Store_Key {
  id: UUIDString;
  __typename?: 'Store_Key';
}

export interface UpdateConfirmationContactData {
  reservation_update?: Reservation_Key | null;
}

export interface UpdateConfirmationContactVariables {
  id: UUIDString;
  confirmationContactedAt?: TimestampString | null;
}

export interface UpdateCustomerData {
  customer_update?: Customer_Key | null;
}

export interface UpdateCustomerVariables {
  id: UUIDString;
  name: string;
  phone: string;
  email: string;
}

export interface UpdateMenuData {
  menu_update?: Menu_Key | null;
}

export interface UpdateMenuVariables {
  id: UUIDString;
  name: string;
  description?: string | null;
  standardPrice: number;
  durationMinutes: number;
  active: boolean;
}

export interface UpdateReservationData {
  reservation_update?: Reservation_Key | null;
}

export interface UpdateReservationStatusData {
  reservation_update?: Reservation_Key | null;
}

export interface UpdateReservationStatusVariables {
  id: UUIDString;
  status: ReservationStatus;
}

export interface UpdateReservationVariables {
  id: UUIDString;
  usageDate: DateString;
  usageTime: string;
  expectedPeople: number;
}

export interface UpdateStoreData {
  store_update?: Store_Key | null;
}

export interface UpdateStoreVariables {
  id: UUIDString;
  name: string;
  address?: string | null;
  active: boolean;
}

export interface VisitDetail_Key {
  id: UUIDString;
  __typename?: 'VisitDetail_Key';
}

export interface VisitRecord_Key {
  id: UUIDString;
  __typename?: 'VisitRecord_Key';
}

interface CreateCustomerRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCustomerVariables): MutationRef<CreateCustomerData, CreateCustomerVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateCustomerVariables): MutationRef<CreateCustomerData, CreateCustomerVariables>;
  operationName: string;
}
export const createCustomerRef: CreateCustomerRef;

export function createCustomer(vars: CreateCustomerVariables): MutationPromise<CreateCustomerData, CreateCustomerVariables>;
export function createCustomer(dc: DataConnect, vars: CreateCustomerVariables): MutationPromise<CreateCustomerData, CreateCustomerVariables>;

interface UpdateCustomerRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateCustomerVariables): MutationRef<UpdateCustomerData, UpdateCustomerVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateCustomerVariables): MutationRef<UpdateCustomerData, UpdateCustomerVariables>;
  operationName: string;
}
export const updateCustomerRef: UpdateCustomerRef;

export function updateCustomer(vars: UpdateCustomerVariables): MutationPromise<UpdateCustomerData, UpdateCustomerVariables>;
export function updateCustomer(dc: DataConnect, vars: UpdateCustomerVariables): MutationPromise<UpdateCustomerData, UpdateCustomerVariables>;

interface DeactivateCustomerRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeactivateCustomerVariables): MutationRef<DeactivateCustomerData, DeactivateCustomerVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeactivateCustomerVariables): MutationRef<DeactivateCustomerData, DeactivateCustomerVariables>;
  operationName: string;
}
export const deactivateCustomerRef: DeactivateCustomerRef;

export function deactivateCustomer(vars: DeactivateCustomerVariables): MutationPromise<DeactivateCustomerData, DeactivateCustomerVariables>;
export function deactivateCustomer(dc: DataConnect, vars: DeactivateCustomerVariables): MutationPromise<DeactivateCustomerData, DeactivateCustomerVariables>;

interface CreateReservationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateReservationVariables): MutationRef<CreateReservationData, CreateReservationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateReservationVariables): MutationRef<CreateReservationData, CreateReservationVariables>;
  operationName: string;
}
export const createReservationRef: CreateReservationRef;

export function createReservation(vars: CreateReservationVariables): MutationPromise<CreateReservationData, CreateReservationVariables>;
export function createReservation(dc: DataConnect, vars: CreateReservationVariables): MutationPromise<CreateReservationData, CreateReservationVariables>;

interface AddReservationDetailRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddReservationDetailVariables): MutationRef<AddReservationDetailData, AddReservationDetailVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddReservationDetailVariables): MutationRef<AddReservationDetailData, AddReservationDetailVariables>;
  operationName: string;
}
export const addReservationDetailRef: AddReservationDetailRef;

export function addReservationDetail(vars: AddReservationDetailVariables): MutationPromise<AddReservationDetailData, AddReservationDetailVariables>;
export function addReservationDetail(dc: DataConnect, vars: AddReservationDetailVariables): MutationPromise<AddReservationDetailData, AddReservationDetailVariables>;

interface DeleteReservationDetailRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteReservationDetailVariables): MutationRef<DeleteReservationDetailData, DeleteReservationDetailVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteReservationDetailVariables): MutationRef<DeleteReservationDetailData, DeleteReservationDetailVariables>;
  operationName: string;
}
export const deleteReservationDetailRef: DeleteReservationDetailRef;

export function deleteReservationDetail(vars: DeleteReservationDetailVariables): MutationPromise<DeleteReservationDetailData, DeleteReservationDetailVariables>;
export function deleteReservationDetail(dc: DataConnect, vars: DeleteReservationDetailVariables): MutationPromise<DeleteReservationDetailData, DeleteReservationDetailVariables>;

interface UpdateReservationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateReservationVariables): MutationRef<UpdateReservationData, UpdateReservationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateReservationVariables): MutationRef<UpdateReservationData, UpdateReservationVariables>;
  operationName: string;
}
export const updateReservationRef: UpdateReservationRef;

export function updateReservation(vars: UpdateReservationVariables): MutationPromise<UpdateReservationData, UpdateReservationVariables>;
export function updateReservation(dc: DataConnect, vars: UpdateReservationVariables): MutationPromise<UpdateReservationData, UpdateReservationVariables>;

interface UpdateReservationStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateReservationStatusVariables): MutationRef<UpdateReservationStatusData, UpdateReservationStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateReservationStatusVariables): MutationRef<UpdateReservationStatusData, UpdateReservationStatusVariables>;
  operationName: string;
}
export const updateReservationStatusRef: UpdateReservationStatusRef;

export function updateReservationStatus(vars: UpdateReservationStatusVariables): MutationPromise<UpdateReservationStatusData, UpdateReservationStatusVariables>;
export function updateReservationStatus(dc: DataConnect, vars: UpdateReservationStatusVariables): MutationPromise<UpdateReservationStatusData, UpdateReservationStatusVariables>;

interface UpdateConfirmationContactRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateConfirmationContactVariables): MutationRef<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateConfirmationContactVariables): MutationRef<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;
  operationName: string;
}
export const updateConfirmationContactRef: UpdateConfirmationContactRef;

export function updateConfirmationContact(vars: UpdateConfirmationContactVariables): MutationPromise<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;
export function updateConfirmationContact(dc: DataConnect, vars: UpdateConfirmationContactVariables): MutationPromise<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;

interface AssignStoreRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AssignStoreVariables): MutationRef<AssignStoreData, AssignStoreVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AssignStoreVariables): MutationRef<AssignStoreData, AssignStoreVariables>;
  operationName: string;
}
export const assignStoreRef: AssignStoreRef;

export function assignStore(vars: AssignStoreVariables): MutationPromise<AssignStoreData, AssignStoreVariables>;
export function assignStore(dc: DataConnect, vars: AssignStoreVariables): MutationPromise<AssignStoreData, AssignStoreVariables>;

interface DeleteStoreAssignmentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteStoreAssignmentVariables): MutationRef<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteStoreAssignmentVariables): MutationRef<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;
  operationName: string;
}
export const deleteStoreAssignmentRef: DeleteStoreAssignmentRef;

export function deleteStoreAssignment(vars: DeleteStoreAssignmentVariables): MutationPromise<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;
export function deleteStoreAssignment(dc: DataConnect, vars: DeleteStoreAssignmentVariables): MutationPromise<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;

interface UpdateStoreRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateStoreVariables): MutationRef<UpdateStoreData, UpdateStoreVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateStoreVariables): MutationRef<UpdateStoreData, UpdateStoreVariables>;
  operationName: string;
}
export const updateStoreRef: UpdateStoreRef;

export function updateStore(vars: UpdateStoreVariables): MutationPromise<UpdateStoreData, UpdateStoreVariables>;
export function updateStore(dc: DataConnect, vars: UpdateStoreVariables): MutationPromise<UpdateStoreData, UpdateStoreVariables>;

interface DeactivateStoreRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeactivateStoreVariables): MutationRef<DeactivateStoreData, DeactivateStoreVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeactivateStoreVariables): MutationRef<DeactivateStoreData, DeactivateStoreVariables>;
  operationName: string;
}
export const deactivateStoreRef: DeactivateStoreRef;

export function deactivateStore(vars: DeactivateStoreVariables): MutationPromise<DeactivateStoreData, DeactivateStoreVariables>;
export function deactivateStore(dc: DataConnect, vars: DeactivateStoreVariables): MutationPromise<DeactivateStoreData, DeactivateStoreVariables>;

interface CreateMenuRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMenuVariables): MutationRef<CreateMenuData, CreateMenuVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMenuVariables): MutationRef<CreateMenuData, CreateMenuVariables>;
  operationName: string;
}
export const createMenuRef: CreateMenuRef;

export function createMenu(vars: CreateMenuVariables): MutationPromise<CreateMenuData, CreateMenuVariables>;
export function createMenu(dc: DataConnect, vars: CreateMenuVariables): MutationPromise<CreateMenuData, CreateMenuVariables>;

interface UpdateMenuRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMenuVariables): MutationRef<UpdateMenuData, UpdateMenuVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateMenuVariables): MutationRef<UpdateMenuData, UpdateMenuVariables>;
  operationName: string;
}
export const updateMenuRef: UpdateMenuRef;

export function updateMenu(vars: UpdateMenuVariables): MutationPromise<UpdateMenuData, UpdateMenuVariables>;
export function updateMenu(dc: DataConnect, vars: UpdateMenuVariables): MutationPromise<UpdateMenuData, UpdateMenuVariables>;

interface DeactivateMenuRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeactivateMenuVariables): MutationRef<DeactivateMenuData, DeactivateMenuVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeactivateMenuVariables): MutationRef<DeactivateMenuData, DeactivateMenuVariables>;
  operationName: string;
}
export const deactivateMenuRef: DeactivateMenuRef;

export function deactivateMenu(vars: DeactivateMenuVariables): MutationPromise<DeactivateMenuData, DeactivateMenuVariables>;
export function deactivateMenu(dc: DataConnect, vars: DeactivateMenuVariables): MutationPromise<DeactivateMenuData, DeactivateMenuVariables>;

interface RecordVisitRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: RecordVisitVariables): MutationRef<RecordVisitData, RecordVisitVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: RecordVisitVariables): MutationRef<RecordVisitData, RecordVisitVariables>;
  operationName: string;
}
export const recordVisitRef: RecordVisitRef;

export function recordVisit(vars: RecordVisitVariables): MutationPromise<RecordVisitData, RecordVisitVariables>;
export function recordVisit(dc: DataConnect, vars: RecordVisitVariables): MutationPromise<RecordVisitData, RecordVisitVariables>;

interface ListReservationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListReservationsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListReservationsData, undefined>;
  operationName: string;
}
export const listReservationsRef: ListReservationsRef;

export function listReservations(options?: ExecuteQueryOptions): QueryPromise<ListReservationsData, undefined>;
export function listReservations(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListReservationsData, undefined>;

interface GetReservationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetReservationVariables): QueryRef<GetReservationData, GetReservationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetReservationVariables): QueryRef<GetReservationData, GetReservationVariables>;
  operationName: string;
}
export const getReservationRef: GetReservationRef;

export function getReservation(vars: GetReservationVariables, options?: ExecuteQueryOptions): QueryPromise<GetReservationData, GetReservationVariables>;
export function getReservation(dc: DataConnect, vars: GetReservationVariables, options?: ExecuteQueryOptions): QueryPromise<GetReservationData, GetReservationVariables>;

interface GetReservationByCodeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetReservationByCodeVariables): QueryRef<GetReservationByCodeData, GetReservationByCodeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetReservationByCodeVariables): QueryRef<GetReservationByCodeData, GetReservationByCodeVariables>;
  operationName: string;
}
export const getReservationByCodeRef: GetReservationByCodeRef;

export function getReservationByCode(vars: GetReservationByCodeVariables, options?: ExecuteQueryOptions): QueryPromise<GetReservationByCodeData, GetReservationByCodeVariables>;
export function getReservationByCode(dc: DataConnect, vars: GetReservationByCodeVariables, options?: ExecuteQueryOptions): QueryPromise<GetReservationByCodeData, GetReservationByCodeVariables>;

interface ListCustomersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCustomersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCustomersData, undefined>;
  operationName: string;
}
export const listCustomersRef: ListCustomersRef;

export function listCustomers(options?: ExecuteQueryOptions): QueryPromise<ListCustomersData, undefined>;
export function listCustomers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCustomersData, undefined>;

interface GetCustomerByNameRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCustomerByNameVariables): QueryRef<GetCustomerByNameData, GetCustomerByNameVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetCustomerByNameVariables): QueryRef<GetCustomerByNameData, GetCustomerByNameVariables>;
  operationName: string;
}
export const getCustomerByNameRef: GetCustomerByNameRef;

export function getCustomerByName(vars: GetCustomerByNameVariables, options?: ExecuteQueryOptions): QueryPromise<GetCustomerByNameData, GetCustomerByNameVariables>;
export function getCustomerByName(dc: DataConnect, vars: GetCustomerByNameVariables, options?: ExecuteQueryOptions): QueryPromise<GetCustomerByNameData, GetCustomerByNameVariables>;

interface ListStoresRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListStoresData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListStoresData, undefined>;
  operationName: string;
}
export const listStoresRef: ListStoresRef;

export function listStores(options?: ExecuteQueryOptions): QueryPromise<ListStoresData, undefined>;
export function listStores(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListStoresData, undefined>;

interface GetStoreByNameRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStoreByNameVariables): QueryRef<GetStoreByNameData, GetStoreByNameVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetStoreByNameVariables): QueryRef<GetStoreByNameData, GetStoreByNameVariables>;
  operationName: string;
}
export const getStoreByNameRef: GetStoreByNameRef;

export function getStoreByName(vars: GetStoreByNameVariables, options?: ExecuteQueryOptions): QueryPromise<GetStoreByNameData, GetStoreByNameVariables>;
export function getStoreByName(dc: DataConnect, vars: GetStoreByNameVariables, options?: ExecuteQueryOptions): QueryPromise<GetStoreByNameData, GetStoreByNameVariables>;

interface ListMenusRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMenusData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMenusData, undefined>;
  operationName: string;
}
export const listMenusRef: ListMenusRef;

export function listMenus(options?: ExecuteQueryOptions): QueryPromise<ListMenusData, undefined>;
export function listMenus(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMenusData, undefined>;

interface GetMenuByNameRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMenuByNameVariables): QueryRef<GetMenuByNameData, GetMenuByNameVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMenuByNameVariables): QueryRef<GetMenuByNameData, GetMenuByNameVariables>;
  operationName: string;
}
export const getMenuByNameRef: GetMenuByNameRef;

export function getMenuByName(vars: GetMenuByNameVariables, options?: ExecuteQueryOptions): QueryPromise<GetMenuByNameData, GetMenuByNameVariables>;
export function getMenuByName(dc: DataConnect, vars: GetMenuByNameVariables, options?: ExecuteQueryOptions): QueryPromise<GetMenuByNameData, GetMenuByNameVariables>;

interface ListBillingRecordsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListBillingRecordsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListBillingRecordsData, undefined>;
  operationName: string;
}
export const listBillingRecordsRef: ListBillingRecordsRef;

export function listBillingRecords(options?: ExecuteQueryOptions): QueryPromise<ListBillingRecordsData, undefined>;
export function listBillingRecords(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListBillingRecordsData, undefined>;
