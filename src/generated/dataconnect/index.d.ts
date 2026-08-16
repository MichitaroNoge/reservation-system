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

export enum ReservationChangeRequestStatus {
  REQUESTED = "REQUESTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
};

export enum ReservationStatus {
  TEMPORARY_REQUESTED = "TEMPORARY_REQUESTED",
  TEMPORARY_CONFIRMED = "TEMPORARY_CONFIRMED",
  TEMPORARY_REJECTED = "TEMPORARY_REJECTED",
  CONFIRMED_REQUESTED = "CONFIRMED_REQUESTED",
  CONFIRMED = "CONFIRMED",
  CONFIRMED_REJECTED = "CONFIRMED_REJECTED",
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

export interface ClearConfirmationContactData {
  reservation_update?: Reservation_Key | null;
}

export interface ClearConfirmationContactVariables {
  id: UUIDString;
}

export interface CreateCustomerData {
  customer_insert: Customer_Key;
}

export interface CreateCustomerVariables {
  name: string;
  phone: string;
  email: string;
  address?: string | null;
  accountType?: string | null;
  companyBranchName?: string | null;
  contactPersonName?: string | null;
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

export interface CreateReservationChangeRequestData {
  reservationChangeRequest_insert: ReservationChangeRequest_Key;
}

export interface CreateReservationChangeRequestVariables {
  reservationId: UUIDString;
  requestedDate: DateString;
  requestedTime: string;
  requestedPeople: number;
  requestedMenuItemsJson: string;
  reason?: string | null;
}

export interface CreateReservationData {
  reservation_insert: Reservation_Key;
}

export interface CreateReservationVariables {
  reservationCode: string;
  customerId: UUIDString;
  usageDate: DateString;
  usageTime: string;
  usageEndTime?: string | null;
  expectedPeople: number;
  status: ReservationStatus;
  requestType?: string | null;
  bookingType?: string | null;
  bookingContactName?: string | null;
  dayContactName?: string | null;
  dayContactPhone?: string | null;
  groupName?: string | null;
  groupNameKana?: string | null;
  groupType?: string | null;
  groupTypeOther?: string | null;
  tcCount?: number | null;
  dgCount?: number | null;
  paymentCondition?: string | null;
  remarks?: string | null;
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
    address?: string | null;
    accountType?: string | null;
    companyBranchName?: string | null;
    contactPersonName?: string | null;
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
    address?: string | null;
    accountType?: string | null;
    companyBranchName?: string | null;
    contactPersonName?: string | null;
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
    address?: string | null;
    accountType?: string | null;
    companyBranchName?: string | null;
    contactPersonName?: string | null;
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
    address?: string | null;
    accountType?: string | null;
    companyBranchName?: string | null;
    contactPersonName?: string | null;
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
    usageEndTime?: string | null;
    status: ReservationStatus;
    requestType?: string | null;
    bookingType?: string | null;
    bookingContactName?: string | null;
    dayContactName?: string | null;
    dayContactPhone?: string | null;
    groupName?: string | null;
    groupNameKana?: string | null;
    groupType?: string | null;
    groupTypeOther?: string | null;
    tcCount: number;
    dgCount: number;
    paymentCondition?: string | null;
    remarks?: string | null;
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
      address?: string | null;
      accountType?: string | null;
      companyBranchName?: string | null;
      contactPersonName?: string | null;
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
    usageEndTime?: string | null;
    status: ReservationStatus;
    requestType?: string | null;
    bookingType?: string | null;
    bookingContactName?: string | null;
    dayContactName?: string | null;
    dayContactPhone?: string | null;
    groupName?: string | null;
    groupNameKana?: string | null;
    groupType?: string | null;
    groupTypeOther?: string | null;
    tcCount: number;
    dgCount: number;
    paymentCondition?: string | null;
    remarks?: string | null;
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
      address?: string | null;
      accountType?: string | null;
      companyBranchName?: string | null;
      contactPersonName?: string | null;
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
    address?: string | null;
    accountType?: string | null;
    companyBranchName?: string | null;
    contactPersonName?: string | null;
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
    address?: string | null;
    accountType?: string | null;
    companyBranchName?: string | null;
    contactPersonName?: string | null;
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

export interface ListReservationChangeRequestsData {
  reservationChangeRequests: ({
    id: UUIDString;
    requestedDate: DateString;
    requestedTime: string;
    requestedPeople: number;
    requestedMenuItemsJson: string;
    reason?: string | null;
    status: ReservationChangeRequestStatus;
    requestedAt: TimestampString;
    reviewedAt?: TimestampString | null;
    reservation: {
      id: UUIDString;
      reservationCode: string;
      usageDate: DateString;
      usageTime: string;
      expectedPeople: number;
      customer: {
        id: UUIDString;
        name: string;
        phone: string;
        email: string;
        address?: string | null;
        accountType?: string | null;
        companyBranchName?: string | null;
        contactPersonName?: string | null;
      } & Customer_Key;
      reservationDetails_on_reservation: ({
        quantity: number;
        menu: {
          name: string;
        };
      })[];
    } & Reservation_Key;
  } & ReservationChangeRequest_Key)[];
}

export interface ListReservationsData {
  reservations: ({
    id: UUIDString;
    reservationCode: string;
    usageDate: DateString;
    usageTime: string;
    usageEndTime?: string | null;
    status: ReservationStatus;
    requestType?: string | null;
    bookingType?: string | null;
    bookingContactName?: string | null;
    dayContactName?: string | null;
    dayContactPhone?: string | null;
    groupName?: string | null;
    groupNameKana?: string | null;
    groupType?: string | null;
    groupTypeOther?: string | null;
    tcCount: number;
    dgCount: number;
    paymentCondition?: string | null;
    remarks?: string | null;
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
      address?: string | null;
      accountType?: string | null;
      companyBranchName?: string | null;
      contactPersonName?: string | null;
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

export interface ReservationChangeRequest_Key {
  id: UUIDString;
  __typename?: 'ReservationChangeRequest_Key';
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
  address?: string | null;
  accountType?: string | null;
  companyBranchName?: string | null;
  contactPersonName?: string | null;
  firebaseUid?: string | null;
}

export interface UpdateCustomerVariables {
  id: UUIDString;
  name: string;
  phone: string;
  email: string;
  address?: string | null;
  accountType?: string | null;
  companyBranchName?: string | null;
  contactPersonName?: string | null;
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

export interface UpdateReservationChangeRequestStatusData {
  reservationChangeRequest_update?: ReservationChangeRequest_Key | null;
}

export interface UpdateReservationChangeRequestStatusVariables {
  id: UUIDString;
  status: ReservationChangeRequestStatus;
  reviewedAt?: TimestampString | null;
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
  requestType?: string | null;
}

export interface UpdateReservationVariables {
  id: UUIDString;
  usageDate: DateString;
  usageTime: string;
  usageEndTime?: string | null;
  expectedPeople: number;
  bookingType?: string | null;
  bookingContactName?: string | null;
  dayContactName?: string | null;
  dayContactPhone?: string | null;
  groupName?: string | null;
  groupNameKana?: string | null;
  groupType?: string | null;
  groupTypeOther?: string | null;
  tcCount?: number | null;
  dgCount?: number | null;
  paymentCondition?: string | null;
  remarks?: string | null;
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

interface UpdateCustomerIdentityRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateCustomerIdentityVariables): MutationRef<UpdateCustomerIdentityData, UpdateCustomerIdentityVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateCustomerIdentityVariables): MutationRef<UpdateCustomerIdentityData, UpdateCustomerIdentityVariables>;
  operationName: string;
}
export const updateCustomerIdentityRef: UpdateCustomerIdentityRef;

export function updateCustomerIdentity(vars: UpdateCustomerIdentityVariables): MutationPromise<UpdateCustomerIdentityData, UpdateCustomerIdentityVariables>;
export function updateCustomerIdentity(dc: DataConnect, vars: UpdateCustomerIdentityVariables): MutationPromise<UpdateCustomerIdentityData, UpdateCustomerIdentityVariables>;

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

interface ReactivateCustomerRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ReactivateCustomerVariables): MutationRef<ReactivateCustomerData, ReactivateCustomerVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ReactivateCustomerVariables): MutationRef<ReactivateCustomerData, ReactivateCustomerVariables>;
  operationName: string;
}
export const reactivateCustomerRef: ReactivateCustomerRef;

export function reactivateCustomer(vars: ReactivateCustomerVariables): MutationPromise<ReactivateCustomerData, ReactivateCustomerVariables>;
export function reactivateCustomer(dc: DataConnect, vars: ReactivateCustomerVariables): MutationPromise<ReactivateCustomerData, ReactivateCustomerVariables>;

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

interface ClearConfirmationContactRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ClearConfirmationContactVariables): MutationRef<ClearConfirmationContactData, ClearConfirmationContactVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ClearConfirmationContactVariables): MutationRef<ClearConfirmationContactData, ClearConfirmationContactVariables>;
  operationName: string;
}
export const clearConfirmationContactRef: ClearConfirmationContactRef;

export function clearConfirmationContact(vars: ClearConfirmationContactVariables): MutationPromise<ClearConfirmationContactData, ClearConfirmationContactVariables>;
export function clearConfirmationContact(dc: DataConnect, vars: ClearConfirmationContactVariables): MutationPromise<ClearConfirmationContactData, ClearConfirmationContactVariables>;

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

interface CreateReservationChangeRequestRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateReservationChangeRequestVariables): MutationRef<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateReservationChangeRequestVariables): MutationRef<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;
  operationName: string;
}
export const createReservationChangeRequestRef: CreateReservationChangeRequestRef;

export function createReservationChangeRequest(vars: CreateReservationChangeRequestVariables): MutationPromise<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;
export function createReservationChangeRequest(dc: DataConnect, vars: CreateReservationChangeRequestVariables): MutationPromise<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;

interface UpdateReservationChangeRequestStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateReservationChangeRequestStatusVariables): MutationRef<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateReservationChangeRequestStatusVariables): MutationRef<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;
  operationName: string;
}
export const updateReservationChangeRequestStatusRef: UpdateReservationChangeRequestStatusRef;

export function updateReservationChangeRequestStatus(vars: UpdateReservationChangeRequestStatusVariables): MutationPromise<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;
export function updateReservationChangeRequestStatus(dc: DataConnect, vars: UpdateReservationChangeRequestStatusVariables): MutationPromise<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;

interface CreateStoreRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStoreVariables): MutationRef<CreateStoreData, CreateStoreVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateStoreVariables): MutationRef<CreateStoreData, CreateStoreVariables>;
  operationName: string;
}
export const createStoreRef: CreateStoreRef;

export function createStore(vars: CreateStoreVariables): MutationPromise<CreateStoreData, CreateStoreVariables>;
export function createStore(dc: DataConnect, vars: CreateStoreVariables): MutationPromise<CreateStoreData, CreateStoreVariables>;

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

interface ReactivateStoreRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ReactivateStoreVariables): MutationRef<ReactivateStoreData, ReactivateStoreVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ReactivateStoreVariables): MutationRef<ReactivateStoreData, ReactivateStoreVariables>;
  operationName: string;
}
export const reactivateStoreRef: ReactivateStoreRef;

export function reactivateStore(vars: ReactivateStoreVariables): MutationPromise<ReactivateStoreData, ReactivateStoreVariables>;
export function reactivateStore(dc: DataConnect, vars: ReactivateStoreVariables): MutationPromise<ReactivateStoreData, ReactivateStoreVariables>;

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

interface ReactivateMenuRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ReactivateMenuVariables): MutationRef<ReactivateMenuData, ReactivateMenuVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ReactivateMenuVariables): MutationRef<ReactivateMenuData, ReactivateMenuVariables>;
  operationName: string;
}
export const reactivateMenuRef: ReactivateMenuRef;

export function reactivateMenu(vars: ReactivateMenuVariables): MutationPromise<ReactivateMenuData, ReactivateMenuVariables>;
export function reactivateMenu(dc: DataConnect, vars: ReactivateMenuVariables): MutationPromise<ReactivateMenuData, ReactivateMenuVariables>;

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

interface ListReservationChangeRequestsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListReservationChangeRequestsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListReservationChangeRequestsData, undefined>;
  operationName: string;
}
export const listReservationChangeRequestsRef: ListReservationChangeRequestsRef;

export function listReservationChangeRequests(options?: ExecuteQueryOptions): QueryPromise<ListReservationChangeRequestsData, undefined>;
export function listReservationChangeRequests(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListReservationChangeRequestsData, undefined>;

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

interface ListInactiveCustomersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListInactiveCustomersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListInactiveCustomersData, undefined>;
  operationName: string;
}
export const listInactiveCustomersRef: ListInactiveCustomersRef;

export function listInactiveCustomers(options?: ExecuteQueryOptions): QueryPromise<ListInactiveCustomersData, undefined>;
export function listInactiveCustomers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListInactiveCustomersData, undefined>;

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

interface GetCustomerByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCustomerByIdVariables): QueryRef<GetCustomerByIdData, GetCustomerByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetCustomerByIdVariables): QueryRef<GetCustomerByIdData, GetCustomerByIdVariables>;
  operationName: string;
}
export const getCustomerByIdRef: GetCustomerByIdRef;

export function getCustomerById(vars: GetCustomerByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetCustomerByIdData, GetCustomerByIdVariables>;
export function getCustomerById(dc: DataConnect, vars: GetCustomerByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetCustomerByIdData, GetCustomerByIdVariables>;

interface GetCustomerByFirebaseUidRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCustomerByFirebaseUidVariables): QueryRef<GetCustomerByFirebaseUidData, GetCustomerByFirebaseUidVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetCustomerByFirebaseUidVariables): QueryRef<GetCustomerByFirebaseUidData, GetCustomerByFirebaseUidVariables>;
  operationName: string;
}
export const getCustomerByFirebaseUidRef: GetCustomerByFirebaseUidRef;

export function getCustomerByFirebaseUid(vars: GetCustomerByFirebaseUidVariables, options?: ExecuteQueryOptions): QueryPromise<GetCustomerByFirebaseUidData, GetCustomerByFirebaseUidVariables>;
export function getCustomerByFirebaseUid(dc: DataConnect, vars: GetCustomerByFirebaseUidVariables, options?: ExecuteQueryOptions): QueryPromise<GetCustomerByFirebaseUidData, GetCustomerByFirebaseUidVariables>;

interface GetCustomerByEmailRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCustomerByEmailVariables): QueryRef<GetCustomerByEmailData, GetCustomerByEmailVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetCustomerByEmailVariables): QueryRef<GetCustomerByEmailData, GetCustomerByEmailVariables>;
  operationName: string;
}
export const getCustomerByEmailRef: GetCustomerByEmailRef;

export function getCustomerByEmail(vars: GetCustomerByEmailVariables, options?: ExecuteQueryOptions): QueryPromise<GetCustomerByEmailData, GetCustomerByEmailVariables>;
export function getCustomerByEmail(dc: DataConnect, vars: GetCustomerByEmailVariables, options?: ExecuteQueryOptions): QueryPromise<GetCustomerByEmailData, GetCustomerByEmailVariables>;

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

interface ListInactiveStoresRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListInactiveStoresData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListInactiveStoresData, undefined>;
  operationName: string;
}
export const listInactiveStoresRef: ListInactiveStoresRef;

export function listInactiveStores(options?: ExecuteQueryOptions): QueryPromise<ListInactiveStoresData, undefined>;
export function listInactiveStores(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListInactiveStoresData, undefined>;

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

interface GetStoreByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStoreByIdVariables): QueryRef<GetStoreByIdData, GetStoreByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetStoreByIdVariables): QueryRef<GetStoreByIdData, GetStoreByIdVariables>;
  operationName: string;
}
export const getStoreByIdRef: GetStoreByIdRef;

export function getStoreById(vars: GetStoreByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetStoreByIdData, GetStoreByIdVariables>;
export function getStoreById(dc: DataConnect, vars: GetStoreByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetStoreByIdData, GetStoreByIdVariables>;

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

interface ListInactiveMenusRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListInactiveMenusData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListInactiveMenusData, undefined>;
  operationName: string;
}
export const listInactiveMenusRef: ListInactiveMenusRef;

export function listInactiveMenus(options?: ExecuteQueryOptions): QueryPromise<ListInactiveMenusData, undefined>;
export function listInactiveMenus(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListInactiveMenusData, undefined>;

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

