import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;

export enum BillingStatus {
  UNBILLED = "UNBILLED",
  INVOICED = "INVOICED",
  PAID = "PAID",
  VOIDED = "VOIDED",
}
export enum BillingType {
  USAGE = "USAGE",
  CANCELLATION = "CANCELLATION",
}
export enum ReservationStatus {
  TEMPORARY_REQUESTED = "TEMPORARY_REQUESTED",
  TEMPORARY_CONFIRMED = "TEMPORARY_CONFIRMED",
  CONFIRMED_REQUESTED = "CONFIRMED_REQUESTED",
  CONFIRMED = "CONFIRMED",
  WAITING_FOR_VISIT = "WAITING_FOR_VISIT",
  VISITED = "VISITED",
  CANCELLATION_REQUESTED = "CANCELLATION_REQUESTED",
  CANCELLED = "CANCELLED",
}

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
  firebaseUid?: string | null;
}

export interface CreateMenuData {
  menu_insert: Menu_Key;
}

export interface CreateMenuVariables {
  name: string;
  description?: string | null;
  standardPrice: number;
  durationMinutes: number;
  displayOrder?: number | null;
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

export interface CreateStoreData {
  store_insert: Store_Key;
}

export interface CreateStoreVariables {
  name: string;
  displayOrder?: number | null;
  active: boolean;
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

export interface GetCustomerByEmailData {
  customers: ({
    id: UUIDString;
    name: string;
    phone: string;
    email: string;
    firebaseUid?: string | null;
    active: boolean;
  } & Customer_Key)[];
}

export interface GetCustomerByEmailVariables {
  email: string;
}

export interface GetCustomerByFirebaseUidData {
  customers: ({
    id: UUIDString;
    name: string;
    phone: string;
    email: string;
    firebaseUid?: string | null;
    active: boolean;
  } & Customer_Key)[];
}

export interface GetCustomerByFirebaseUidVariables {
  firebaseUid: string;
}

export interface GetCustomerByIdData {
  customer?: {
    id: UUIDString;
    name: string;
    phone: string;
    email: string;
    active: boolean;
  } & Customer_Key;
}

export interface GetCustomerByIdVariables {
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
    displayOrder: number;
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
        displayOrder: number;
      } & Menu_Key;
    } & ReservationDetail_Key)[];
    storeAssignments_on_reservation: ({
      id: UUIDString;
      people: number;
      assignedAt: TimestampString;
      store: {
        id: UUIDString;
        name: string;
        displayOrder: number;
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
        displayOrder: number;
      } & Menu_Key;
    } & ReservationDetail_Key)[];
    storeAssignments_on_reservation: ({
      id: UUIDString;
      people: number;
      assignedAt: TimestampString;
      store: {
        id: UUIDString;
        name: string;
        displayOrder: number;
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

export interface GetStoreByIdData {
  store?: {
    id: UUIDString;
    name: string;
    displayOrder: number;
    active: boolean;
  } & Store_Key;
}

export interface GetStoreByIdVariables {
  id: UUIDString;
}

export interface GetStoreByNameData {
  stores: ({
    id: UUIDString;
    name: string;
    displayOrder: number;
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

export interface ListInactiveCustomersData {
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

export interface ListInactiveMenusData {
  menus: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    standardPrice: number;
    durationMinutes: number;
    displayOrder: number;
    active: boolean;
  } & Menu_Key)[];
}

export interface ListInactiveStoresData {
  stores: ({
    id: UUIDString;
    name: string;
    displayOrder: number;
    active: boolean;
  } & Store_Key)[];
}

export interface ListMenusData {
  menus: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    standardPrice: number;
    durationMinutes: number;
    displayOrder: number;
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
        displayOrder: number;
      } & Menu_Key;
    } & ReservationDetail_Key)[];
    storeAssignments_on_reservation: ({
      id: UUIDString;
      people: number;
      assignedAt: TimestampString;
      store: {
        id: UUIDString;
        name: string;
        displayOrder: number;
      } & Store_Key;
    } & StoreAssignment_Key)[];
  } & Reservation_Key)[];
}

export interface ListStoresData {
  stores: ({
    id: UUIDString;
    name: string;
    displayOrder: number;
    active: boolean;
  } & Store_Key)[];
}

export interface Menu_Key {
  id: UUIDString;
  __typename?: 'Menu_Key';
}

export interface ReactivateCustomerData {
  customer_update?: Customer_Key | null;
}

export interface ReactivateCustomerVariables {
  id: UUIDString;
}

export interface ReactivateMenuData {
  menu_update?: Menu_Key | null;
}

export interface ReactivateMenuVariables {
  id: UUIDString;
}

export interface ReactivateStoreData {
  store_update?: Store_Key | null;
}

export interface ReactivateStoreVariables {
  id: UUIDString;
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

export interface UpdateCustomerIdentityData {
  customer_update?: Customer_Key | null;
}

export interface UpdateCustomerIdentityVariables {
  id: UUIDString;
  name: string;
  phone: string;
  email: string;
  firebaseUid?: string | null;
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
  displayOrder?: number | null;
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
  displayOrder?: number | null;
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

/** Generated Node Admin SDK operation action function for the 'CreateCustomer' Mutation. Allow users to execute without passing in DataConnect. */
export function createCustomer(dc: DataConnect, vars: CreateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateCustomerData>>;
/** Generated Node Admin SDK operation action function for the 'CreateCustomer' Mutation. Allow users to pass in custom DataConnect instances. */
export function createCustomer(vars: CreateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateCustomerData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateCustomer' Mutation. Allow users to execute without passing in DataConnect. */
export function updateCustomer(dc: DataConnect, vars: UpdateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateCustomerData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateCustomer' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateCustomer(vars: UpdateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateCustomerData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateCustomerIdentity' Mutation. Allow users to execute without passing in DataConnect. */
export function updateCustomerIdentity(dc: DataConnect, vars: UpdateCustomerIdentityVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateCustomerIdentityData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateCustomerIdentity' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateCustomerIdentity(vars: UpdateCustomerIdentityVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateCustomerIdentityData>>;

/** Generated Node Admin SDK operation action function for the 'DeactivateCustomer' Mutation. Allow users to execute without passing in DataConnect. */
export function deactivateCustomer(dc: DataConnect, vars: DeactivateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeactivateCustomerData>>;
/** Generated Node Admin SDK operation action function for the 'DeactivateCustomer' Mutation. Allow users to pass in custom DataConnect instances. */
export function deactivateCustomer(vars: DeactivateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeactivateCustomerData>>;

/** Generated Node Admin SDK operation action function for the 'ReactivateCustomer' Mutation. Allow users to execute without passing in DataConnect. */
export function reactivateCustomer(dc: DataConnect, vars: ReactivateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ReactivateCustomerData>>;
/** Generated Node Admin SDK operation action function for the 'ReactivateCustomer' Mutation. Allow users to pass in custom DataConnect instances. */
export function reactivateCustomer(vars: ReactivateCustomerVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ReactivateCustomerData>>;

/** Generated Node Admin SDK operation action function for the 'CreateReservation' Mutation. Allow users to execute without passing in DataConnect. */
export function createReservation(dc: DataConnect, vars: CreateReservationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateReservationData>>;
/** Generated Node Admin SDK operation action function for the 'CreateReservation' Mutation. Allow users to pass in custom DataConnect instances. */
export function createReservation(vars: CreateReservationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateReservationData>>;

/** Generated Node Admin SDK operation action function for the 'AddReservationDetail' Mutation. Allow users to execute without passing in DataConnect. */
export function addReservationDetail(dc: DataConnect, vars: AddReservationDetailVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddReservationDetailData>>;
/** Generated Node Admin SDK operation action function for the 'AddReservationDetail' Mutation. Allow users to pass in custom DataConnect instances. */
export function addReservationDetail(vars: AddReservationDetailVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddReservationDetailData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteReservationDetail' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteReservationDetail(dc: DataConnect, vars: DeleteReservationDetailVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteReservationDetailData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteReservationDetail' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteReservationDetail(vars: DeleteReservationDetailVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteReservationDetailData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateReservation' Mutation. Allow users to execute without passing in DataConnect. */
export function updateReservation(dc: DataConnect, vars: UpdateReservationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateReservationData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateReservation' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateReservation(vars: UpdateReservationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateReservationData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateReservationStatus' Mutation. Allow users to execute without passing in DataConnect. */
export function updateReservationStatus(dc: DataConnect, vars: UpdateReservationStatusVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateReservationStatusData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateReservationStatus' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateReservationStatus(vars: UpdateReservationStatusVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateReservationStatusData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateConfirmationContact' Mutation. Allow users to execute without passing in DataConnect. */
export function updateConfirmationContact(dc: DataConnect, vars: UpdateConfirmationContactVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateConfirmationContactData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateConfirmationContact' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateConfirmationContact(vars: UpdateConfirmationContactVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateConfirmationContactData>>;

/** Generated Node Admin SDK operation action function for the 'AssignStore' Mutation. Allow users to execute without passing in DataConnect. */
export function assignStore(dc: DataConnect, vars: AssignStoreVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AssignStoreData>>;
/** Generated Node Admin SDK operation action function for the 'AssignStore' Mutation. Allow users to pass in custom DataConnect instances. */
export function assignStore(vars: AssignStoreVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AssignStoreData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteStoreAssignment' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteStoreAssignment(dc: DataConnect, vars: DeleteStoreAssignmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteStoreAssignmentData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteStoreAssignment' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteStoreAssignment(vars: DeleteStoreAssignmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteStoreAssignmentData>>;

/** Generated Node Admin SDK operation action function for the 'CreateStore' Mutation. Allow users to execute without passing in DataConnect. */
export function createStore(dc: DataConnect, vars: CreateStoreVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateStoreData>>;
/** Generated Node Admin SDK operation action function for the 'CreateStore' Mutation. Allow users to pass in custom DataConnect instances. */
export function createStore(vars: CreateStoreVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateStoreData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateStore' Mutation. Allow users to execute without passing in DataConnect. */
export function updateStore(dc: DataConnect, vars: UpdateStoreVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateStoreData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateStore' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateStore(vars: UpdateStoreVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateStoreData>>;

/** Generated Node Admin SDK operation action function for the 'DeactivateStore' Mutation. Allow users to execute without passing in DataConnect. */
export function deactivateStore(dc: DataConnect, vars: DeactivateStoreVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeactivateStoreData>>;
/** Generated Node Admin SDK operation action function for the 'DeactivateStore' Mutation. Allow users to pass in custom DataConnect instances. */
export function deactivateStore(vars: DeactivateStoreVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeactivateStoreData>>;

/** Generated Node Admin SDK operation action function for the 'ReactivateStore' Mutation. Allow users to execute without passing in DataConnect. */
export function reactivateStore(dc: DataConnect, vars: ReactivateStoreVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ReactivateStoreData>>;
/** Generated Node Admin SDK operation action function for the 'ReactivateStore' Mutation. Allow users to pass in custom DataConnect instances. */
export function reactivateStore(vars: ReactivateStoreVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ReactivateStoreData>>;

/** Generated Node Admin SDK operation action function for the 'CreateMenu' Mutation. Allow users to execute without passing in DataConnect. */
export function createMenu(dc: DataConnect, vars: CreateMenuVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateMenuData>>;
/** Generated Node Admin SDK operation action function for the 'CreateMenu' Mutation. Allow users to pass in custom DataConnect instances. */
export function createMenu(vars: CreateMenuVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateMenuData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateMenu' Mutation. Allow users to execute without passing in DataConnect. */
export function updateMenu(dc: DataConnect, vars: UpdateMenuVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateMenuData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateMenu' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateMenu(vars: UpdateMenuVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateMenuData>>;

/** Generated Node Admin SDK operation action function for the 'DeactivateMenu' Mutation. Allow users to execute without passing in DataConnect. */
export function deactivateMenu(dc: DataConnect, vars: DeactivateMenuVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeactivateMenuData>>;
/** Generated Node Admin SDK operation action function for the 'DeactivateMenu' Mutation. Allow users to pass in custom DataConnect instances. */
export function deactivateMenu(vars: DeactivateMenuVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeactivateMenuData>>;

/** Generated Node Admin SDK operation action function for the 'ReactivateMenu' Mutation. Allow users to execute without passing in DataConnect. */
export function reactivateMenu(dc: DataConnect, vars: ReactivateMenuVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ReactivateMenuData>>;
/** Generated Node Admin SDK operation action function for the 'ReactivateMenu' Mutation. Allow users to pass in custom DataConnect instances. */
export function reactivateMenu(vars: ReactivateMenuVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ReactivateMenuData>>;

/** Generated Node Admin SDK operation action function for the 'RecordVisit' Mutation. Allow users to execute without passing in DataConnect. */
export function recordVisit(dc: DataConnect, vars: RecordVisitVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RecordVisitData>>;
/** Generated Node Admin SDK operation action function for the 'RecordVisit' Mutation. Allow users to pass in custom DataConnect instances. */
export function recordVisit(vars: RecordVisitVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RecordVisitData>>;

/** Generated Node Admin SDK operation action function for the 'ListReservations' Query. Allow users to execute without passing in DataConnect. */
export function listReservations(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListReservationsData>>;
/** Generated Node Admin SDK operation action function for the 'ListReservations' Query. Allow users to pass in custom DataConnect instances. */
export function listReservations(options?: OperationOptions): Promise<ExecuteOperationResponse<ListReservationsData>>;

/** Generated Node Admin SDK operation action function for the 'GetReservation' Query. Allow users to execute without passing in DataConnect. */
export function getReservation(dc: DataConnect, vars: GetReservationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetReservationData>>;
/** Generated Node Admin SDK operation action function for the 'GetReservation' Query. Allow users to pass in custom DataConnect instances. */
export function getReservation(vars: GetReservationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetReservationData>>;

/** Generated Node Admin SDK operation action function for the 'GetReservationByCode' Query. Allow users to execute without passing in DataConnect. */
export function getReservationByCode(dc: DataConnect, vars: GetReservationByCodeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetReservationByCodeData>>;
/** Generated Node Admin SDK operation action function for the 'GetReservationByCode' Query. Allow users to pass in custom DataConnect instances. */
export function getReservationByCode(vars: GetReservationByCodeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetReservationByCodeData>>;

/** Generated Node Admin SDK operation action function for the 'ListCustomers' Query. Allow users to execute without passing in DataConnect. */
export function listCustomers(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListCustomersData>>;
/** Generated Node Admin SDK operation action function for the 'ListCustomers' Query. Allow users to pass in custom DataConnect instances. */
export function listCustomers(options?: OperationOptions): Promise<ExecuteOperationResponse<ListCustomersData>>;

/** Generated Node Admin SDK operation action function for the 'ListInactiveCustomers' Query. Allow users to execute without passing in DataConnect. */
export function listInactiveCustomers(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListInactiveCustomersData>>;
/** Generated Node Admin SDK operation action function for the 'ListInactiveCustomers' Query. Allow users to pass in custom DataConnect instances. */
export function listInactiveCustomers(options?: OperationOptions): Promise<ExecuteOperationResponse<ListInactiveCustomersData>>;

/** Generated Node Admin SDK operation action function for the 'GetCustomerByName' Query. Allow users to execute without passing in DataConnect. */
export function getCustomerByName(dc: DataConnect, vars: GetCustomerByNameVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCustomerByNameData>>;
/** Generated Node Admin SDK operation action function for the 'GetCustomerByName' Query. Allow users to pass in custom DataConnect instances. */
export function getCustomerByName(vars: GetCustomerByNameVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCustomerByNameData>>;

/** Generated Node Admin SDK operation action function for the 'GetCustomerById' Query. Allow users to execute without passing in DataConnect. */
export function getCustomerById(dc: DataConnect, vars: GetCustomerByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCustomerByIdData>>;
/** Generated Node Admin SDK operation action function for the 'GetCustomerById' Query. Allow users to pass in custom DataConnect instances. */
export function getCustomerById(vars: GetCustomerByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCustomerByIdData>>;

/** Generated Node Admin SDK operation action function for the 'GetCustomerByFirebaseUid' Query. Allow users to execute without passing in DataConnect. */
export function getCustomerByFirebaseUid(dc: DataConnect, vars: GetCustomerByFirebaseUidVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCustomerByFirebaseUidData>>;
/** Generated Node Admin SDK operation action function for the 'GetCustomerByFirebaseUid' Query. Allow users to pass in custom DataConnect instances. */
export function getCustomerByFirebaseUid(vars: GetCustomerByFirebaseUidVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCustomerByFirebaseUidData>>;

/** Generated Node Admin SDK operation action function for the 'GetCustomerByEmail' Query. Allow users to execute without passing in DataConnect. */
export function getCustomerByEmail(dc: DataConnect, vars: GetCustomerByEmailVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCustomerByEmailData>>;
/** Generated Node Admin SDK operation action function for the 'GetCustomerByEmail' Query. Allow users to pass in custom DataConnect instances. */
export function getCustomerByEmail(vars: GetCustomerByEmailVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCustomerByEmailData>>;

/** Generated Node Admin SDK operation action function for the 'ListStores' Query. Allow users to execute without passing in DataConnect. */
export function listStores(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStoresData>>;
/** Generated Node Admin SDK operation action function for the 'ListStores' Query. Allow users to pass in custom DataConnect instances. */
export function listStores(options?: OperationOptions): Promise<ExecuteOperationResponse<ListStoresData>>;

/** Generated Node Admin SDK operation action function for the 'ListInactiveStores' Query. Allow users to execute without passing in DataConnect. */
export function listInactiveStores(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListInactiveStoresData>>;
/** Generated Node Admin SDK operation action function for the 'ListInactiveStores' Query. Allow users to pass in custom DataConnect instances. */
export function listInactiveStores(options?: OperationOptions): Promise<ExecuteOperationResponse<ListInactiveStoresData>>;

/** Generated Node Admin SDK operation action function for the 'GetStoreByName' Query. Allow users to execute without passing in DataConnect. */
export function getStoreByName(dc: DataConnect, vars: GetStoreByNameVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStoreByNameData>>;
/** Generated Node Admin SDK operation action function for the 'GetStoreByName' Query. Allow users to pass in custom DataConnect instances. */
export function getStoreByName(vars: GetStoreByNameVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStoreByNameData>>;

/** Generated Node Admin SDK operation action function for the 'GetStoreById' Query. Allow users to execute without passing in DataConnect. */
export function getStoreById(dc: DataConnect, vars: GetStoreByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStoreByIdData>>;
/** Generated Node Admin SDK operation action function for the 'GetStoreById' Query. Allow users to pass in custom DataConnect instances. */
export function getStoreById(vars: GetStoreByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStoreByIdData>>;

/** Generated Node Admin SDK operation action function for the 'ListMenus' Query. Allow users to execute without passing in DataConnect. */
export function listMenus(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMenusData>>;
/** Generated Node Admin SDK operation action function for the 'ListMenus' Query. Allow users to pass in custom DataConnect instances. */
export function listMenus(options?: OperationOptions): Promise<ExecuteOperationResponse<ListMenusData>>;

/** Generated Node Admin SDK operation action function for the 'ListInactiveMenus' Query. Allow users to execute without passing in DataConnect. */
export function listInactiveMenus(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListInactiveMenusData>>;
/** Generated Node Admin SDK operation action function for the 'ListInactiveMenus' Query. Allow users to pass in custom DataConnect instances. */
export function listInactiveMenus(options?: OperationOptions): Promise<ExecuteOperationResponse<ListInactiveMenusData>>;

/** Generated Node Admin SDK operation action function for the 'GetMenuByName' Query. Allow users to execute without passing in DataConnect. */
export function getMenuByName(dc: DataConnect, vars: GetMenuByNameVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMenuByNameData>>;
/** Generated Node Admin SDK operation action function for the 'GetMenuByName' Query. Allow users to pass in custom DataConnect instances. */
export function getMenuByName(vars: GetMenuByNameVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMenuByNameData>>;

/** Generated Node Admin SDK operation action function for the 'ListBillingRecords' Query. Allow users to execute without passing in DataConnect. */
export function listBillingRecords(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListBillingRecordsData>>;
/** Generated Node Admin SDK operation action function for the 'ListBillingRecords' Query. Allow users to pass in custom DataConnect instances. */
export function listBillingRecords(options?: OperationOptions): Promise<ExecuteOperationResponse<ListBillingRecordsData>>;
