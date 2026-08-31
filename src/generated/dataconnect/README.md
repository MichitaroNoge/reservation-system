# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `reservation`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListReservations*](#listreservations)
  - [*GetReservation*](#getreservation)
  - [*GetReservationByCode*](#getreservationbycode)
  - [*ListReservationChangeRequests*](#listreservationchangerequests)
  - [*ListAccounts*](#listaccounts)
  - [*ListInactiveAccounts*](#listinactiveaccounts)
  - [*GetAccountById*](#getaccountbyid)
  - [*GetAccountByFirebaseUid*](#getaccountbyfirebaseuid)
  - [*ListStores*](#liststores)
  - [*ListInactiveStores*](#listinactivestores)
  - [*GetStoreByName*](#getstorebyname)
  - [*GetStoreById*](#getstorebyid)
  - [*ListMenus*](#listmenus)
  - [*ListInactiveMenus*](#listinactivemenus)
  - [*GetMenuByName*](#getmenubyname)
  - [*ListBillingRecords*](#listbillingrecords)
- [**Mutations**](#mutations)
  - [*CreateAccount*](#createaccount)
  - [*UpdateAccount*](#updateaccount)
  - [*DeactivateAccount*](#deactivateaccount)
  - [*ReactivateAccount*](#reactivateaccount)
  - [*CreateReservation*](#createreservation)
  - [*UpdateReservation*](#updatereservation)
  - [*AddReservationDetail*](#addreservationdetail)
  - [*DeleteReservationDetail*](#deletereservationdetail)
  - [*UpdateReservationStatus*](#updatereservationstatus)
  - [*UpdateConfirmationContact*](#updateconfirmationcontact)
  - [*ClearConfirmationContact*](#clearconfirmationcontact)
  - [*AssignStore*](#assignstore)
  - [*DeleteStoreAssignment*](#deletestoreassignment)
  - [*CreateReservationChangeRequest*](#createreservationchangerequest)
  - [*UpdateReservationChangeRequestStatus*](#updatereservationchangerequeststatus)
  - [*CreateStore*](#createstore)
  - [*UpdateStore*](#updatestore)
  - [*DeactivateStore*](#deactivatestore)
  - [*ReactivateStore*](#reactivatestore)
  - [*CreateMenu*](#createmenu)
  - [*UpdateMenu*](#updatemenu)
  - [*DeactivateMenu*](#deactivatemenu)
  - [*ReactivateMenu*](#reactivatemenu)
  - [*RecordVisit*](#recordvisit)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `reservation`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@reservation-system/dataconnect` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `reservation` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListReservations
You can execute the `ListReservations` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listReservations(options?: ExecuteQueryOptions): QueryPromise<ListReservationsData, undefined>;

interface ListReservationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListReservationsData, undefined>;
}
export const listReservationsRef: ListReservationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listReservations(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListReservationsData, undefined>;

interface ListReservationsRef {
  ...
  (dc: DataConnect): QueryRef<ListReservationsData, undefined>;
}
export const listReservationsRef: ListReservationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listReservationsRef:
```typescript
const name = listReservationsRef.operationName;
console.log(name);
```

### Variables
The `ListReservations` query has no variables.
### Return Type
Recall that executing the `ListReservations` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListReservationsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
    reserverName?: string | null;
    reserverEmail?: string | null;
    reserverPhone?: string | null;
    reserverAddress?: string | null;
    reserverAccountType?: string | null;
    reserverCompanyBranchName?: string | null;
    reserverContactPersonName?: string | null;
    account?: {
      id: UUIDString;
      firebaseUid: string;
      email: string;
      name: string;
      phone?: string | null;
      address?: string | null;
      accountType?: string | null;
      companyBranchName?: string | null;
      contactPersonName?: string | null;
      active: boolean;
    } & Account_Key;
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
```
### Using `ListReservations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listReservations } from '@reservation-system/dataconnect';


// Call the `listReservations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listReservations();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listReservations(dataConnect);

console.log(data.reservations);

// Or, you can use the `Promise` API.
listReservations().then((response) => {
  const data = response.data;
  console.log(data.reservations);
});
```

### Using `ListReservations`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listReservationsRef } from '@reservation-system/dataconnect';


// Call the `listReservationsRef()` function to get a reference to the query.
const ref = listReservationsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listReservationsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.reservations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.reservations);
});
```

## GetReservation
You can execute the `GetReservation` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getReservation(vars: GetReservationVariables, options?: ExecuteQueryOptions): QueryPromise<GetReservationData, GetReservationVariables>;

interface GetReservationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetReservationVariables): QueryRef<GetReservationData, GetReservationVariables>;
}
export const getReservationRef: GetReservationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getReservation(dc: DataConnect, vars: GetReservationVariables, options?: ExecuteQueryOptions): QueryPromise<GetReservationData, GetReservationVariables>;

interface GetReservationRef {
  ...
  (dc: DataConnect, vars: GetReservationVariables): QueryRef<GetReservationData, GetReservationVariables>;
}
export const getReservationRef: GetReservationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getReservationRef:
```typescript
const name = getReservationRef.operationName;
console.log(name);
```

### Variables
The `GetReservation` query requires an argument of type `GetReservationVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetReservationVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetReservation` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetReservationData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
    reserverName?: string | null;
    reserverEmail?: string | null;
    reserverPhone?: string | null;
    reserverAddress?: string | null;
    reserverAccountType?: string | null;
    reserverCompanyBranchName?: string | null;
    reserverContactPersonName?: string | null;
    account?: {
      id: UUIDString;
      firebaseUid: string;
      email: string;
      name: string;
      phone?: string | null;
      address?: string | null;
      accountType?: string | null;
      companyBranchName?: string | null;
      contactPersonName?: string | null;
      active: boolean;
    } & Account_Key;
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
```
### Using `GetReservation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getReservation, GetReservationVariables } from '@reservation-system/dataconnect';

// The `GetReservation` query requires an argument of type `GetReservationVariables`:
const getReservationVars: GetReservationVariables = {
  id: ..., 
};

// Call the `getReservation()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getReservation(getReservationVars);
// Variables can be defined inline as well.
const { data } = await getReservation({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getReservation(dataConnect, getReservationVars);

console.log(data.reservation);

// Or, you can use the `Promise` API.
getReservation(getReservationVars).then((response) => {
  const data = response.data;
  console.log(data.reservation);
});
```

### Using `GetReservation`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getReservationRef, GetReservationVariables } from '@reservation-system/dataconnect';

// The `GetReservation` query requires an argument of type `GetReservationVariables`:
const getReservationVars: GetReservationVariables = {
  id: ..., 
};

// Call the `getReservationRef()` function to get a reference to the query.
const ref = getReservationRef(getReservationVars);
// Variables can be defined inline as well.
const ref = getReservationRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getReservationRef(dataConnect, getReservationVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.reservation);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.reservation);
});
```

## GetReservationByCode
You can execute the `GetReservationByCode` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getReservationByCode(vars: GetReservationByCodeVariables, options?: ExecuteQueryOptions): QueryPromise<GetReservationByCodeData, GetReservationByCodeVariables>;

interface GetReservationByCodeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetReservationByCodeVariables): QueryRef<GetReservationByCodeData, GetReservationByCodeVariables>;
}
export const getReservationByCodeRef: GetReservationByCodeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getReservationByCode(dc: DataConnect, vars: GetReservationByCodeVariables, options?: ExecuteQueryOptions): QueryPromise<GetReservationByCodeData, GetReservationByCodeVariables>;

interface GetReservationByCodeRef {
  ...
  (dc: DataConnect, vars: GetReservationByCodeVariables): QueryRef<GetReservationByCodeData, GetReservationByCodeVariables>;
}
export const getReservationByCodeRef: GetReservationByCodeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getReservationByCodeRef:
```typescript
const name = getReservationByCodeRef.operationName;
console.log(name);
```

### Variables
The `GetReservationByCode` query requires an argument of type `GetReservationByCodeVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetReservationByCodeVariables {
  reservationCode: string;
}
```
### Return Type
Recall that executing the `GetReservationByCode` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetReservationByCodeData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
    reserverName?: string | null;
    reserverEmail?: string | null;
    reserverPhone?: string | null;
    reserverAddress?: string | null;
    reserverAccountType?: string | null;
    reserverCompanyBranchName?: string | null;
    reserverContactPersonName?: string | null;
    account?: {
      id: UUIDString;
      firebaseUid: string;
      email: string;
      name: string;
      phone?: string | null;
      address?: string | null;
      accountType?: string | null;
      companyBranchName?: string | null;
      contactPersonName?: string | null;
      active: boolean;
    } & Account_Key;
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
```
### Using `GetReservationByCode`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getReservationByCode, GetReservationByCodeVariables } from '@reservation-system/dataconnect';

// The `GetReservationByCode` query requires an argument of type `GetReservationByCodeVariables`:
const getReservationByCodeVars: GetReservationByCodeVariables = {
  reservationCode: ..., 
};

// Call the `getReservationByCode()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getReservationByCode(getReservationByCodeVars);
// Variables can be defined inline as well.
const { data } = await getReservationByCode({ reservationCode: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getReservationByCode(dataConnect, getReservationByCodeVars);

console.log(data.reservations);

// Or, you can use the `Promise` API.
getReservationByCode(getReservationByCodeVars).then((response) => {
  const data = response.data;
  console.log(data.reservations);
});
```

### Using `GetReservationByCode`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getReservationByCodeRef, GetReservationByCodeVariables } from '@reservation-system/dataconnect';

// The `GetReservationByCode` query requires an argument of type `GetReservationByCodeVariables`:
const getReservationByCodeVars: GetReservationByCodeVariables = {
  reservationCode: ..., 
};

// Call the `getReservationByCodeRef()` function to get a reference to the query.
const ref = getReservationByCodeRef(getReservationByCodeVars);
// Variables can be defined inline as well.
const ref = getReservationByCodeRef({ reservationCode: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getReservationByCodeRef(dataConnect, getReservationByCodeVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.reservations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.reservations);
});
```

## ListReservationChangeRequests
You can execute the `ListReservationChangeRequests` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listReservationChangeRequests(options?: ExecuteQueryOptions): QueryPromise<ListReservationChangeRequestsData, undefined>;

interface ListReservationChangeRequestsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListReservationChangeRequestsData, undefined>;
}
export const listReservationChangeRequestsRef: ListReservationChangeRequestsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listReservationChangeRequests(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListReservationChangeRequestsData, undefined>;

interface ListReservationChangeRequestsRef {
  ...
  (dc: DataConnect): QueryRef<ListReservationChangeRequestsData, undefined>;
}
export const listReservationChangeRequestsRef: ListReservationChangeRequestsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listReservationChangeRequestsRef:
```typescript
const name = listReservationChangeRequestsRef.operationName;
console.log(name);
```

### Variables
The `ListReservationChangeRequests` query has no variables.
### Return Type
Recall that executing the `ListReservationChangeRequests` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListReservationChangeRequestsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
      reserverName?: string | null;
      reserverEmail?: string | null;
      reserverPhone?: string | null;
      reserverAddress?: string | null;
      account?: {
        id: UUIDString;
        firebaseUid: string;
      } & Account_Key;
      reservationDetails_on_reservation: ({
        quantity: number;
        menu: {
          name: string;
        };
      })[];
    } & Reservation_Key;
  } & ReservationChangeRequest_Key)[];
}
```
### Using `ListReservationChangeRequests`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listReservationChangeRequests } from '@reservation-system/dataconnect';


// Call the `listReservationChangeRequests()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listReservationChangeRequests();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listReservationChangeRequests(dataConnect);

console.log(data.reservationChangeRequests);

// Or, you can use the `Promise` API.
listReservationChangeRequests().then((response) => {
  const data = response.data;
  console.log(data.reservationChangeRequests);
});
```

### Using `ListReservationChangeRequests`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listReservationChangeRequestsRef } from '@reservation-system/dataconnect';


// Call the `listReservationChangeRequestsRef()` function to get a reference to the query.
const ref = listReservationChangeRequestsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listReservationChangeRequestsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.reservationChangeRequests);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.reservationChangeRequests);
});
```

## ListAccounts
You can execute the `ListAccounts` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listAccounts(options?: ExecuteQueryOptions): QueryPromise<ListAccountsData, undefined>;

interface ListAccountsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAccountsData, undefined>;
}
export const listAccountsRef: ListAccountsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAccounts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAccountsData, undefined>;

interface ListAccountsRef {
  ...
  (dc: DataConnect): QueryRef<ListAccountsData, undefined>;
}
export const listAccountsRef: ListAccountsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAccountsRef:
```typescript
const name = listAccountsRef.operationName;
console.log(name);
```

### Variables
The `ListAccounts` query has no variables.
### Return Type
Recall that executing the `ListAccounts` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAccountsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAccountsData {
  accounts: ({
    id: UUIDString;
    firebaseUid: string;
    name: string;
    phone?: string | null;
    email: string;
    address?: string | null;
    accountType?: string | null;
    companyBranchName?: string | null;
    contactPersonName?: string | null;
    active: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    reservations_on_account: ({
      id: UUIDString;
      reservationCode: string;
      usageDate: DateString;
      status: ReservationStatus;
    } & Reservation_Key)[];
  } & Account_Key)[];
}
```
### Using `ListAccounts`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAccounts } from '@reservation-system/dataconnect';


// Call the `listAccounts()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAccounts();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAccounts(dataConnect);

console.log(data.accounts);

// Or, you can use the `Promise` API.
listAccounts().then((response) => {
  const data = response.data;
  console.log(data.accounts);
});
```

### Using `ListAccounts`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAccountsRef } from '@reservation-system/dataconnect';


// Call the `listAccountsRef()` function to get a reference to the query.
const ref = listAccountsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAccountsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.accounts);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.accounts);
});
```

## ListInactiveAccounts
You can execute the `ListInactiveAccounts` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listInactiveAccounts(options?: ExecuteQueryOptions): QueryPromise<ListInactiveAccountsData, undefined>;

interface ListInactiveAccountsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListInactiveAccountsData, undefined>;
}
export const listInactiveAccountsRef: ListInactiveAccountsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listInactiveAccounts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListInactiveAccountsData, undefined>;

interface ListInactiveAccountsRef {
  ...
  (dc: DataConnect): QueryRef<ListInactiveAccountsData, undefined>;
}
export const listInactiveAccountsRef: ListInactiveAccountsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listInactiveAccountsRef:
```typescript
const name = listInactiveAccountsRef.operationName;
console.log(name);
```

### Variables
The `ListInactiveAccounts` query has no variables.
### Return Type
Recall that executing the `ListInactiveAccounts` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListInactiveAccountsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListInactiveAccountsData {
  accounts: ({
    id: UUIDString;
    firebaseUid: string;
    name: string;
    phone?: string | null;
    email: string;
    address?: string | null;
    accountType?: string | null;
    companyBranchName?: string | null;
    contactPersonName?: string | null;
    active: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    reservations_on_account: ({
      id: UUIDString;
      reservationCode: string;
      usageDate: DateString;
      status: ReservationStatus;
    } & Reservation_Key)[];
  } & Account_Key)[];
}
```
### Using `ListInactiveAccounts`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listInactiveAccounts } from '@reservation-system/dataconnect';


// Call the `listInactiveAccounts()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listInactiveAccounts();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listInactiveAccounts(dataConnect);

console.log(data.accounts);

// Or, you can use the `Promise` API.
listInactiveAccounts().then((response) => {
  const data = response.data;
  console.log(data.accounts);
});
```

### Using `ListInactiveAccounts`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listInactiveAccountsRef } from '@reservation-system/dataconnect';


// Call the `listInactiveAccountsRef()` function to get a reference to the query.
const ref = listInactiveAccountsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listInactiveAccountsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.accounts);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.accounts);
});
```

## GetAccountById
You can execute the `GetAccountById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getAccountById(vars: GetAccountByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetAccountByIdData, GetAccountByIdVariables>;

interface GetAccountByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAccountByIdVariables): QueryRef<GetAccountByIdData, GetAccountByIdVariables>;
}
export const getAccountByIdRef: GetAccountByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAccountById(dc: DataConnect, vars: GetAccountByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetAccountByIdData, GetAccountByIdVariables>;

interface GetAccountByIdRef {
  ...
  (dc: DataConnect, vars: GetAccountByIdVariables): QueryRef<GetAccountByIdData, GetAccountByIdVariables>;
}
export const getAccountByIdRef: GetAccountByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAccountByIdRef:
```typescript
const name = getAccountByIdRef.operationName;
console.log(name);
```

### Variables
The `GetAccountById` query requires an argument of type `GetAccountByIdVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetAccountByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetAccountById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAccountByIdData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAccountByIdData {
  account?: {
    id: UUIDString;
    firebaseUid: string;
    name: string;
    phone?: string | null;
    email: string;
    address?: string | null;
    accountType?: string | null;
    companyBranchName?: string | null;
    contactPersonName?: string | null;
    active: boolean;
  } & Account_Key;
}
```
### Using `GetAccountById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAccountById, GetAccountByIdVariables } from '@reservation-system/dataconnect';

// The `GetAccountById` query requires an argument of type `GetAccountByIdVariables`:
const getAccountByIdVars: GetAccountByIdVariables = {
  id: ..., 
};

// Call the `getAccountById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAccountById(getAccountByIdVars);
// Variables can be defined inline as well.
const { data } = await getAccountById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAccountById(dataConnect, getAccountByIdVars);

console.log(data.account);

// Or, you can use the `Promise` API.
getAccountById(getAccountByIdVars).then((response) => {
  const data = response.data;
  console.log(data.account);
});
```

### Using `GetAccountById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAccountByIdRef, GetAccountByIdVariables } from '@reservation-system/dataconnect';

// The `GetAccountById` query requires an argument of type `GetAccountByIdVariables`:
const getAccountByIdVars: GetAccountByIdVariables = {
  id: ..., 
};

// Call the `getAccountByIdRef()` function to get a reference to the query.
const ref = getAccountByIdRef(getAccountByIdVars);
// Variables can be defined inline as well.
const ref = getAccountByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAccountByIdRef(dataConnect, getAccountByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.account);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.account);
});
```

## GetAccountByFirebaseUid
You can execute the `GetAccountByFirebaseUid` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getAccountByFirebaseUid(vars: GetAccountByFirebaseUidVariables, options?: ExecuteQueryOptions): QueryPromise<GetAccountByFirebaseUidData, GetAccountByFirebaseUidVariables>;

interface GetAccountByFirebaseUidRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAccountByFirebaseUidVariables): QueryRef<GetAccountByFirebaseUidData, GetAccountByFirebaseUidVariables>;
}
export const getAccountByFirebaseUidRef: GetAccountByFirebaseUidRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAccountByFirebaseUid(dc: DataConnect, vars: GetAccountByFirebaseUidVariables, options?: ExecuteQueryOptions): QueryPromise<GetAccountByFirebaseUidData, GetAccountByFirebaseUidVariables>;

interface GetAccountByFirebaseUidRef {
  ...
  (dc: DataConnect, vars: GetAccountByFirebaseUidVariables): QueryRef<GetAccountByFirebaseUidData, GetAccountByFirebaseUidVariables>;
}
export const getAccountByFirebaseUidRef: GetAccountByFirebaseUidRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAccountByFirebaseUidRef:
```typescript
const name = getAccountByFirebaseUidRef.operationName;
console.log(name);
```

### Variables
The `GetAccountByFirebaseUid` query requires an argument of type `GetAccountByFirebaseUidVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetAccountByFirebaseUidVariables {
  firebaseUid: string;
}
```
### Return Type
Recall that executing the `GetAccountByFirebaseUid` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAccountByFirebaseUidData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAccountByFirebaseUidData {
  accounts: ({
    id: UUIDString;
    firebaseUid: string;
    name: string;
    phone?: string | null;
    email: string;
    address?: string | null;
    accountType?: string | null;
    companyBranchName?: string | null;
    contactPersonName?: string | null;
    active: boolean;
  } & Account_Key)[];
}
```
### Using `GetAccountByFirebaseUid`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAccountByFirebaseUid, GetAccountByFirebaseUidVariables } from '@reservation-system/dataconnect';

// The `GetAccountByFirebaseUid` query requires an argument of type `GetAccountByFirebaseUidVariables`:
const getAccountByFirebaseUidVars: GetAccountByFirebaseUidVariables = {
  firebaseUid: ..., 
};

// Call the `getAccountByFirebaseUid()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAccountByFirebaseUid(getAccountByFirebaseUidVars);
// Variables can be defined inline as well.
const { data } = await getAccountByFirebaseUid({ firebaseUid: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAccountByFirebaseUid(dataConnect, getAccountByFirebaseUidVars);

console.log(data.accounts);

// Or, you can use the `Promise` API.
getAccountByFirebaseUid(getAccountByFirebaseUidVars).then((response) => {
  const data = response.data;
  console.log(data.accounts);
});
```

### Using `GetAccountByFirebaseUid`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAccountByFirebaseUidRef, GetAccountByFirebaseUidVariables } from '@reservation-system/dataconnect';

// The `GetAccountByFirebaseUid` query requires an argument of type `GetAccountByFirebaseUidVariables`:
const getAccountByFirebaseUidVars: GetAccountByFirebaseUidVariables = {
  firebaseUid: ..., 
};

// Call the `getAccountByFirebaseUidRef()` function to get a reference to the query.
const ref = getAccountByFirebaseUidRef(getAccountByFirebaseUidVars);
// Variables can be defined inline as well.
const ref = getAccountByFirebaseUidRef({ firebaseUid: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAccountByFirebaseUidRef(dataConnect, getAccountByFirebaseUidVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.accounts);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.accounts);
});
```

## ListStores
You can execute the `ListStores` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listStores(options?: ExecuteQueryOptions): QueryPromise<ListStoresData, undefined>;

interface ListStoresRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListStoresData, undefined>;
}
export const listStoresRef: ListStoresRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listStores(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListStoresData, undefined>;

interface ListStoresRef {
  ...
  (dc: DataConnect): QueryRef<ListStoresData, undefined>;
}
export const listStoresRef: ListStoresRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listStoresRef:
```typescript
const name = listStoresRef.operationName;
console.log(name);
```

### Variables
The `ListStores` query has no variables.
### Return Type
Recall that executing the `ListStores` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListStoresData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListStoresData {
  stores: ({
    id: UUIDString;
    name: string;
    displayOrder: number;
    active: boolean;
  } & Store_Key)[];
}
```
### Using `ListStores`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listStores } from '@reservation-system/dataconnect';


// Call the `listStores()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listStores();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listStores(dataConnect);

console.log(data.stores);

// Or, you can use the `Promise` API.
listStores().then((response) => {
  const data = response.data;
  console.log(data.stores);
});
```

### Using `ListStores`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listStoresRef } from '@reservation-system/dataconnect';


// Call the `listStoresRef()` function to get a reference to the query.
const ref = listStoresRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listStoresRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.stores);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.stores);
});
```

## ListInactiveStores
You can execute the `ListInactiveStores` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listInactiveStores(options?: ExecuteQueryOptions): QueryPromise<ListInactiveStoresData, undefined>;

interface ListInactiveStoresRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListInactiveStoresData, undefined>;
}
export const listInactiveStoresRef: ListInactiveStoresRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listInactiveStores(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListInactiveStoresData, undefined>;

interface ListInactiveStoresRef {
  ...
  (dc: DataConnect): QueryRef<ListInactiveStoresData, undefined>;
}
export const listInactiveStoresRef: ListInactiveStoresRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listInactiveStoresRef:
```typescript
const name = listInactiveStoresRef.operationName;
console.log(name);
```

### Variables
The `ListInactiveStores` query has no variables.
### Return Type
Recall that executing the `ListInactiveStores` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListInactiveStoresData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListInactiveStoresData {
  stores: ({
    id: UUIDString;
    name: string;
    displayOrder: number;
    active: boolean;
  } & Store_Key)[];
}
```
### Using `ListInactiveStores`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listInactiveStores } from '@reservation-system/dataconnect';


// Call the `listInactiveStores()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listInactiveStores();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listInactiveStores(dataConnect);

console.log(data.stores);

// Or, you can use the `Promise` API.
listInactiveStores().then((response) => {
  const data = response.data;
  console.log(data.stores);
});
```

### Using `ListInactiveStores`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listInactiveStoresRef } from '@reservation-system/dataconnect';


// Call the `listInactiveStoresRef()` function to get a reference to the query.
const ref = listInactiveStoresRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listInactiveStoresRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.stores);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.stores);
});
```

## GetStoreByName
You can execute the `GetStoreByName` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getStoreByName(vars: GetStoreByNameVariables, options?: ExecuteQueryOptions): QueryPromise<GetStoreByNameData, GetStoreByNameVariables>;

interface GetStoreByNameRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStoreByNameVariables): QueryRef<GetStoreByNameData, GetStoreByNameVariables>;
}
export const getStoreByNameRef: GetStoreByNameRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getStoreByName(dc: DataConnect, vars: GetStoreByNameVariables, options?: ExecuteQueryOptions): QueryPromise<GetStoreByNameData, GetStoreByNameVariables>;

interface GetStoreByNameRef {
  ...
  (dc: DataConnect, vars: GetStoreByNameVariables): QueryRef<GetStoreByNameData, GetStoreByNameVariables>;
}
export const getStoreByNameRef: GetStoreByNameRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getStoreByNameRef:
```typescript
const name = getStoreByNameRef.operationName;
console.log(name);
```

### Variables
The `GetStoreByName` query requires an argument of type `GetStoreByNameVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetStoreByNameVariables {
  name: string;
}
```
### Return Type
Recall that executing the `GetStoreByName` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetStoreByNameData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetStoreByNameData {
  stores: ({
    id: UUIDString;
    name: string;
    displayOrder: number;
    active: boolean;
  } & Store_Key)[];
}
```
### Using `GetStoreByName`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getStoreByName, GetStoreByNameVariables } from '@reservation-system/dataconnect';

// The `GetStoreByName` query requires an argument of type `GetStoreByNameVariables`:
const getStoreByNameVars: GetStoreByNameVariables = {
  name: ..., 
};

// Call the `getStoreByName()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getStoreByName(getStoreByNameVars);
// Variables can be defined inline as well.
const { data } = await getStoreByName({ name: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getStoreByName(dataConnect, getStoreByNameVars);

console.log(data.stores);

// Or, you can use the `Promise` API.
getStoreByName(getStoreByNameVars).then((response) => {
  const data = response.data;
  console.log(data.stores);
});
```

### Using `GetStoreByName`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getStoreByNameRef, GetStoreByNameVariables } from '@reservation-system/dataconnect';

// The `GetStoreByName` query requires an argument of type `GetStoreByNameVariables`:
const getStoreByNameVars: GetStoreByNameVariables = {
  name: ..., 
};

// Call the `getStoreByNameRef()` function to get a reference to the query.
const ref = getStoreByNameRef(getStoreByNameVars);
// Variables can be defined inline as well.
const ref = getStoreByNameRef({ name: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getStoreByNameRef(dataConnect, getStoreByNameVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.stores);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.stores);
});
```

## GetStoreById
You can execute the `GetStoreById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getStoreById(vars: GetStoreByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetStoreByIdData, GetStoreByIdVariables>;

interface GetStoreByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStoreByIdVariables): QueryRef<GetStoreByIdData, GetStoreByIdVariables>;
}
export const getStoreByIdRef: GetStoreByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getStoreById(dc: DataConnect, vars: GetStoreByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetStoreByIdData, GetStoreByIdVariables>;

interface GetStoreByIdRef {
  ...
  (dc: DataConnect, vars: GetStoreByIdVariables): QueryRef<GetStoreByIdData, GetStoreByIdVariables>;
}
export const getStoreByIdRef: GetStoreByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getStoreByIdRef:
```typescript
const name = getStoreByIdRef.operationName;
console.log(name);
```

### Variables
The `GetStoreById` query requires an argument of type `GetStoreByIdVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetStoreByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetStoreById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetStoreByIdData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetStoreByIdData {
  store?: {
    id: UUIDString;
    name: string;
    displayOrder: number;
    active: boolean;
  } & Store_Key;
}
```
### Using `GetStoreById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getStoreById, GetStoreByIdVariables } from '@reservation-system/dataconnect';

// The `GetStoreById` query requires an argument of type `GetStoreByIdVariables`:
const getStoreByIdVars: GetStoreByIdVariables = {
  id: ..., 
};

// Call the `getStoreById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getStoreById(getStoreByIdVars);
// Variables can be defined inline as well.
const { data } = await getStoreById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getStoreById(dataConnect, getStoreByIdVars);

console.log(data.store);

// Or, you can use the `Promise` API.
getStoreById(getStoreByIdVars).then((response) => {
  const data = response.data;
  console.log(data.store);
});
```

### Using `GetStoreById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getStoreByIdRef, GetStoreByIdVariables } from '@reservation-system/dataconnect';

// The `GetStoreById` query requires an argument of type `GetStoreByIdVariables`:
const getStoreByIdVars: GetStoreByIdVariables = {
  id: ..., 
};

// Call the `getStoreByIdRef()` function to get a reference to the query.
const ref = getStoreByIdRef(getStoreByIdVars);
// Variables can be defined inline as well.
const ref = getStoreByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getStoreByIdRef(dataConnect, getStoreByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.store);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.store);
});
```

## ListMenus
You can execute the `ListMenus` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listMenus(options?: ExecuteQueryOptions): QueryPromise<ListMenusData, undefined>;

interface ListMenusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMenusData, undefined>;
}
export const listMenusRef: ListMenusRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMenus(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMenusData, undefined>;

interface ListMenusRef {
  ...
  (dc: DataConnect): QueryRef<ListMenusData, undefined>;
}
export const listMenusRef: ListMenusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMenusRef:
```typescript
const name = listMenusRef.operationName;
console.log(name);
```

### Variables
The `ListMenus` query has no variables.
### Return Type
Recall that executing the `ListMenus` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMenusData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListMenus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMenus } from '@reservation-system/dataconnect';


// Call the `listMenus()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMenus();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMenus(dataConnect);

console.log(data.menus);

// Or, you can use the `Promise` API.
listMenus().then((response) => {
  const data = response.data;
  console.log(data.menus);
});
```

### Using `ListMenus`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMenusRef } from '@reservation-system/dataconnect';


// Call the `listMenusRef()` function to get a reference to the query.
const ref = listMenusRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMenusRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.menus);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.menus);
});
```

## ListInactiveMenus
You can execute the `ListInactiveMenus` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listInactiveMenus(options?: ExecuteQueryOptions): QueryPromise<ListInactiveMenusData, undefined>;

interface ListInactiveMenusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListInactiveMenusData, undefined>;
}
export const listInactiveMenusRef: ListInactiveMenusRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listInactiveMenus(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListInactiveMenusData, undefined>;

interface ListInactiveMenusRef {
  ...
  (dc: DataConnect): QueryRef<ListInactiveMenusData, undefined>;
}
export const listInactiveMenusRef: ListInactiveMenusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listInactiveMenusRef:
```typescript
const name = listInactiveMenusRef.operationName;
console.log(name);
```

### Variables
The `ListInactiveMenus` query has no variables.
### Return Type
Recall that executing the `ListInactiveMenus` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListInactiveMenusData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListInactiveMenus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listInactiveMenus } from '@reservation-system/dataconnect';


// Call the `listInactiveMenus()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listInactiveMenus();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listInactiveMenus(dataConnect);

console.log(data.menus);

// Or, you can use the `Promise` API.
listInactiveMenus().then((response) => {
  const data = response.data;
  console.log(data.menus);
});
```

### Using `ListInactiveMenus`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listInactiveMenusRef } from '@reservation-system/dataconnect';


// Call the `listInactiveMenusRef()` function to get a reference to the query.
const ref = listInactiveMenusRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listInactiveMenusRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.menus);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.menus);
});
```

## GetMenuByName
You can execute the `GetMenuByName` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getMenuByName(vars: GetMenuByNameVariables, options?: ExecuteQueryOptions): QueryPromise<GetMenuByNameData, GetMenuByNameVariables>;

interface GetMenuByNameRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMenuByNameVariables): QueryRef<GetMenuByNameData, GetMenuByNameVariables>;
}
export const getMenuByNameRef: GetMenuByNameRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMenuByName(dc: DataConnect, vars: GetMenuByNameVariables, options?: ExecuteQueryOptions): QueryPromise<GetMenuByNameData, GetMenuByNameVariables>;

interface GetMenuByNameRef {
  ...
  (dc: DataConnect, vars: GetMenuByNameVariables): QueryRef<GetMenuByNameData, GetMenuByNameVariables>;
}
export const getMenuByNameRef: GetMenuByNameRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMenuByNameRef:
```typescript
const name = getMenuByNameRef.operationName;
console.log(name);
```

### Variables
The `GetMenuByName` query requires an argument of type `GetMenuByNameVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMenuByNameVariables {
  name: string;
}
```
### Return Type
Recall that executing the `GetMenuByName` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMenuByNameData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetMenuByName`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMenuByName, GetMenuByNameVariables } from '@reservation-system/dataconnect';

// The `GetMenuByName` query requires an argument of type `GetMenuByNameVariables`:
const getMenuByNameVars: GetMenuByNameVariables = {
  name: ..., 
};

// Call the `getMenuByName()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMenuByName(getMenuByNameVars);
// Variables can be defined inline as well.
const { data } = await getMenuByName({ name: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMenuByName(dataConnect, getMenuByNameVars);

console.log(data.menus);

// Or, you can use the `Promise` API.
getMenuByName(getMenuByNameVars).then((response) => {
  const data = response.data;
  console.log(data.menus);
});
```

### Using `GetMenuByName`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMenuByNameRef, GetMenuByNameVariables } from '@reservation-system/dataconnect';

// The `GetMenuByName` query requires an argument of type `GetMenuByNameVariables`:
const getMenuByNameVars: GetMenuByNameVariables = {
  name: ..., 
};

// Call the `getMenuByNameRef()` function to get a reference to the query.
const ref = getMenuByNameRef(getMenuByNameVars);
// Variables can be defined inline as well.
const ref = getMenuByNameRef({ name: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMenuByNameRef(dataConnect, getMenuByNameVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.menus);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.menus);
});
```

## ListBillingRecords
You can execute the `ListBillingRecords` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listBillingRecords(options?: ExecuteQueryOptions): QueryPromise<ListBillingRecordsData, undefined>;

interface ListBillingRecordsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListBillingRecordsData, undefined>;
}
export const listBillingRecordsRef: ListBillingRecordsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listBillingRecords(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListBillingRecordsData, undefined>;

interface ListBillingRecordsRef {
  ...
  (dc: DataConnect): QueryRef<ListBillingRecordsData, undefined>;
}
export const listBillingRecordsRef: ListBillingRecordsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listBillingRecordsRef:
```typescript
const name = listBillingRecordsRef.operationName;
console.log(name);
```

### Variables
The `ListBillingRecords` query has no variables.
### Return Type
Recall that executing the `ListBillingRecords` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListBillingRecordsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
      reserverName?: string | null;
    } & Reservation_Key;
    invoice_on_billing?: {
      id: UUIDString;
      invoiceNumber: string;
      issuedAt: TimestampString;
    } & Invoice_Key;
  } & Billing_Key)[];
}
```
### Using `ListBillingRecords`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listBillingRecords } from '@reservation-system/dataconnect';


// Call the `listBillingRecords()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listBillingRecords();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listBillingRecords(dataConnect);

console.log(data.billings);

// Or, you can use the `Promise` API.
listBillingRecords().then((response) => {
  const data = response.data;
  console.log(data.billings);
});
```

### Using `ListBillingRecords`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listBillingRecordsRef } from '@reservation-system/dataconnect';


// Call the `listBillingRecordsRef()` function to get a reference to the query.
const ref = listBillingRecordsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listBillingRecordsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.billings);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.billings);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `reservation` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateAccount
You can execute the `CreateAccount` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createAccount(vars: CreateAccountVariables): MutationPromise<CreateAccountData, CreateAccountVariables>;

interface CreateAccountRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAccountVariables): MutationRef<CreateAccountData, CreateAccountVariables>;
}
export const createAccountRef: CreateAccountRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAccount(dc: DataConnect, vars: CreateAccountVariables): MutationPromise<CreateAccountData, CreateAccountVariables>;

interface CreateAccountRef {
  ...
  (dc: DataConnect, vars: CreateAccountVariables): MutationRef<CreateAccountData, CreateAccountVariables>;
}
export const createAccountRef: CreateAccountRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAccountRef:
```typescript
const name = createAccountRef.operationName;
console.log(name);
```

### Variables
The `CreateAccount` mutation requires an argument of type `CreateAccountVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAccountVariables {
  firebaseUid: string;
  name: string;
  phone?: string | null;
  email: string;
  address?: string | null;
  accountType?: string | null;
  companyBranchName?: string | null;
  contactPersonName?: string | null;
}
```
### Return Type
Recall that executing the `CreateAccount` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAccountData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAccountData {
  account_insert: Account_Key;
}
```
### Using `CreateAccount`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAccount, CreateAccountVariables } from '@reservation-system/dataconnect';

// The `CreateAccount` mutation requires an argument of type `CreateAccountVariables`:
const createAccountVars: CreateAccountVariables = {
  firebaseUid: ..., 
  name: ..., 
  phone: ..., // optional
  email: ..., 
  address: ..., // optional
  accountType: ..., // optional
  companyBranchName: ..., // optional
  contactPersonName: ..., // optional
};

// Call the `createAccount()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAccount(createAccountVars);
// Variables can be defined inline as well.
const { data } = await createAccount({ firebaseUid: ..., name: ..., phone: ..., email: ..., address: ..., accountType: ..., companyBranchName: ..., contactPersonName: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAccount(dataConnect, createAccountVars);

console.log(data.account_insert);

// Or, you can use the `Promise` API.
createAccount(createAccountVars).then((response) => {
  const data = response.data;
  console.log(data.account_insert);
});
```

### Using `CreateAccount`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAccountRef, CreateAccountVariables } from '@reservation-system/dataconnect';

// The `CreateAccount` mutation requires an argument of type `CreateAccountVariables`:
const createAccountVars: CreateAccountVariables = {
  firebaseUid: ..., 
  name: ..., 
  phone: ..., // optional
  email: ..., 
  address: ..., // optional
  accountType: ..., // optional
  companyBranchName: ..., // optional
  contactPersonName: ..., // optional
};

// Call the `createAccountRef()` function to get a reference to the mutation.
const ref = createAccountRef(createAccountVars);
// Variables can be defined inline as well.
const ref = createAccountRef({ firebaseUid: ..., name: ..., phone: ..., email: ..., address: ..., accountType: ..., companyBranchName: ..., contactPersonName: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAccountRef(dataConnect, createAccountVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.account_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.account_insert);
});
```

## UpdateAccount
You can execute the `UpdateAccount` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
updateAccount(vars: UpdateAccountVariables): MutationPromise<UpdateAccountData, UpdateAccountVariables>;

interface UpdateAccountRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateAccountVariables): MutationRef<UpdateAccountData, UpdateAccountVariables>;
}
export const updateAccountRef: UpdateAccountRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateAccount(dc: DataConnect, vars: UpdateAccountVariables): MutationPromise<UpdateAccountData, UpdateAccountVariables>;

interface UpdateAccountRef {
  ...
  (dc: DataConnect, vars: UpdateAccountVariables): MutationRef<UpdateAccountData, UpdateAccountVariables>;
}
export const updateAccountRef: UpdateAccountRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateAccountRef:
```typescript
const name = updateAccountRef.operationName;
console.log(name);
```

### Variables
The `UpdateAccount` mutation requires an argument of type `UpdateAccountVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateAccountVariables {
  id: UUIDString;
  name: string;
  phone?: string | null;
  email: string;
  address?: string | null;
  accountType?: string | null;
  companyBranchName?: string | null;
  contactPersonName?: string | null;
}
```
### Return Type
Recall that executing the `UpdateAccount` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateAccountData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateAccountData {
  account_update?: Account_Key | null;
}
```
### Using `UpdateAccount`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateAccount, UpdateAccountVariables } from '@reservation-system/dataconnect';

// The `UpdateAccount` mutation requires an argument of type `UpdateAccountVariables`:
const updateAccountVars: UpdateAccountVariables = {
  id: ..., 
  name: ..., 
  phone: ..., // optional
  email: ..., 
  address: ..., // optional
  accountType: ..., // optional
  companyBranchName: ..., // optional
  contactPersonName: ..., // optional
};

// Call the `updateAccount()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateAccount(updateAccountVars);
// Variables can be defined inline as well.
const { data } = await updateAccount({ id: ..., name: ..., phone: ..., email: ..., address: ..., accountType: ..., companyBranchName: ..., contactPersonName: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateAccount(dataConnect, updateAccountVars);

console.log(data.account_update);

// Or, you can use the `Promise` API.
updateAccount(updateAccountVars).then((response) => {
  const data = response.data;
  console.log(data.account_update);
});
```

### Using `UpdateAccount`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateAccountRef, UpdateAccountVariables } from '@reservation-system/dataconnect';

// The `UpdateAccount` mutation requires an argument of type `UpdateAccountVariables`:
const updateAccountVars: UpdateAccountVariables = {
  id: ..., 
  name: ..., 
  phone: ..., // optional
  email: ..., 
  address: ..., // optional
  accountType: ..., // optional
  companyBranchName: ..., // optional
  contactPersonName: ..., // optional
};

// Call the `updateAccountRef()` function to get a reference to the mutation.
const ref = updateAccountRef(updateAccountVars);
// Variables can be defined inline as well.
const ref = updateAccountRef({ id: ..., name: ..., phone: ..., email: ..., address: ..., accountType: ..., companyBranchName: ..., contactPersonName: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateAccountRef(dataConnect, updateAccountVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.account_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.account_update);
});
```

## DeactivateAccount
You can execute the `DeactivateAccount` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
deactivateAccount(vars: DeactivateAccountVariables): MutationPromise<DeactivateAccountData, DeactivateAccountVariables>;

interface DeactivateAccountRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeactivateAccountVariables): MutationRef<DeactivateAccountData, DeactivateAccountVariables>;
}
export const deactivateAccountRef: DeactivateAccountRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deactivateAccount(dc: DataConnect, vars: DeactivateAccountVariables): MutationPromise<DeactivateAccountData, DeactivateAccountVariables>;

interface DeactivateAccountRef {
  ...
  (dc: DataConnect, vars: DeactivateAccountVariables): MutationRef<DeactivateAccountData, DeactivateAccountVariables>;
}
export const deactivateAccountRef: DeactivateAccountRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deactivateAccountRef:
```typescript
const name = deactivateAccountRef.operationName;
console.log(name);
```

### Variables
The `DeactivateAccount` mutation requires an argument of type `DeactivateAccountVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeactivateAccountVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeactivateAccount` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeactivateAccountData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeactivateAccountData {
  account_update?: Account_Key | null;
}
```
### Using `DeactivateAccount`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deactivateAccount, DeactivateAccountVariables } from '@reservation-system/dataconnect';

// The `DeactivateAccount` mutation requires an argument of type `DeactivateAccountVariables`:
const deactivateAccountVars: DeactivateAccountVariables = {
  id: ..., 
};

// Call the `deactivateAccount()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deactivateAccount(deactivateAccountVars);
// Variables can be defined inline as well.
const { data } = await deactivateAccount({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deactivateAccount(dataConnect, deactivateAccountVars);

console.log(data.account_update);

// Or, you can use the `Promise` API.
deactivateAccount(deactivateAccountVars).then((response) => {
  const data = response.data;
  console.log(data.account_update);
});
```

### Using `DeactivateAccount`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deactivateAccountRef, DeactivateAccountVariables } from '@reservation-system/dataconnect';

// The `DeactivateAccount` mutation requires an argument of type `DeactivateAccountVariables`:
const deactivateAccountVars: DeactivateAccountVariables = {
  id: ..., 
};

// Call the `deactivateAccountRef()` function to get a reference to the mutation.
const ref = deactivateAccountRef(deactivateAccountVars);
// Variables can be defined inline as well.
const ref = deactivateAccountRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deactivateAccountRef(dataConnect, deactivateAccountVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.account_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.account_update);
});
```

## ReactivateAccount
You can execute the `ReactivateAccount` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
reactivateAccount(vars: ReactivateAccountVariables): MutationPromise<ReactivateAccountData, ReactivateAccountVariables>;

interface ReactivateAccountRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ReactivateAccountVariables): MutationRef<ReactivateAccountData, ReactivateAccountVariables>;
}
export const reactivateAccountRef: ReactivateAccountRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
reactivateAccount(dc: DataConnect, vars: ReactivateAccountVariables): MutationPromise<ReactivateAccountData, ReactivateAccountVariables>;

interface ReactivateAccountRef {
  ...
  (dc: DataConnect, vars: ReactivateAccountVariables): MutationRef<ReactivateAccountData, ReactivateAccountVariables>;
}
export const reactivateAccountRef: ReactivateAccountRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the reactivateAccountRef:
```typescript
const name = reactivateAccountRef.operationName;
console.log(name);
```

### Variables
The `ReactivateAccount` mutation requires an argument of type `ReactivateAccountVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ReactivateAccountVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `ReactivateAccount` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ReactivateAccountData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ReactivateAccountData {
  account_update?: Account_Key | null;
}
```
### Using `ReactivateAccount`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, reactivateAccount, ReactivateAccountVariables } from '@reservation-system/dataconnect';

// The `ReactivateAccount` mutation requires an argument of type `ReactivateAccountVariables`:
const reactivateAccountVars: ReactivateAccountVariables = {
  id: ..., 
};

// Call the `reactivateAccount()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await reactivateAccount(reactivateAccountVars);
// Variables can be defined inline as well.
const { data } = await reactivateAccount({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await reactivateAccount(dataConnect, reactivateAccountVars);

console.log(data.account_update);

// Or, you can use the `Promise` API.
reactivateAccount(reactivateAccountVars).then((response) => {
  const data = response.data;
  console.log(data.account_update);
});
```

### Using `ReactivateAccount`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, reactivateAccountRef, ReactivateAccountVariables } from '@reservation-system/dataconnect';

// The `ReactivateAccount` mutation requires an argument of type `ReactivateAccountVariables`:
const reactivateAccountVars: ReactivateAccountVariables = {
  id: ..., 
};

// Call the `reactivateAccountRef()` function to get a reference to the mutation.
const ref = reactivateAccountRef(reactivateAccountVars);
// Variables can be defined inline as well.
const ref = reactivateAccountRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = reactivateAccountRef(dataConnect, reactivateAccountVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.account_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.account_update);
});
```

## CreateReservation
You can execute the `CreateReservation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createReservation(vars: CreateReservationVariables): MutationPromise<CreateReservationData, CreateReservationVariables>;

interface CreateReservationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateReservationVariables): MutationRef<CreateReservationData, CreateReservationVariables>;
}
export const createReservationRef: CreateReservationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createReservation(dc: DataConnect, vars: CreateReservationVariables): MutationPromise<CreateReservationData, CreateReservationVariables>;

interface CreateReservationRef {
  ...
  (dc: DataConnect, vars: CreateReservationVariables): MutationRef<CreateReservationData, CreateReservationVariables>;
}
export const createReservationRef: CreateReservationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createReservationRef:
```typescript
const name = createReservationRef.operationName;
console.log(name);
```

### Variables
The `CreateReservation` mutation requires an argument of type `CreateReservationVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateReservationVariables {
  reservationCode: string;
  accountId?: UUIDString | null;
  reserverName?: string | null;
  reserverEmail?: string | null;
  reserverPhone?: string | null;
  reserverAddress?: string | null;
  reserverAccountType?: string | null;
  reserverCompanyBranchName?: string | null;
  reserverContactPersonName?: string | null;
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
```
### Return Type
Recall that executing the `CreateReservation` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateReservationData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateReservationData {
  reservation_insert: Reservation_Key;
}
```
### Using `CreateReservation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createReservation, CreateReservationVariables } from '@reservation-system/dataconnect';

// The `CreateReservation` mutation requires an argument of type `CreateReservationVariables`:
const createReservationVars: CreateReservationVariables = {
  reservationCode: ..., 
  accountId: ..., // optional
  reserverName: ..., // optional
  reserverEmail: ..., // optional
  reserverPhone: ..., // optional
  reserverAddress: ..., // optional
  reserverAccountType: ..., // optional
  reserverCompanyBranchName: ..., // optional
  reserverContactPersonName: ..., // optional
  usageDate: ..., 
  usageTime: ..., 
  usageEndTime: ..., // optional
  expectedPeople: ..., 
  status: ..., 
  requestType: ..., // optional
  bookingType: ..., // optional
  bookingContactName: ..., // optional
  dayContactName: ..., // optional
  dayContactPhone: ..., // optional
  groupName: ..., // optional
  groupNameKana: ..., // optional
  groupType: ..., // optional
  groupTypeOther: ..., // optional
  tcCount: ..., // optional
  dgCount: ..., // optional
  paymentCondition: ..., // optional
  remarks: ..., // optional
  policyAgreementKind: ..., // optional
  policyAgreementAcceptedAt: ..., // optional
};

// Call the `createReservation()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createReservation(createReservationVars);
// Variables can be defined inline as well.
const { data } = await createReservation({ reservationCode: ..., accountId: ..., reserverName: ..., reserverEmail: ..., reserverPhone: ..., reserverAddress: ..., reserverAccountType: ..., reserverCompanyBranchName: ..., reserverContactPersonName: ..., usageDate: ..., usageTime: ..., usageEndTime: ..., expectedPeople: ..., status: ..., requestType: ..., bookingType: ..., bookingContactName: ..., dayContactName: ..., dayContactPhone: ..., groupName: ..., groupNameKana: ..., groupType: ..., groupTypeOther: ..., tcCount: ..., dgCount: ..., paymentCondition: ..., remarks: ..., policyAgreementKind: ..., policyAgreementAcceptedAt: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createReservation(dataConnect, createReservationVars);

console.log(data.reservation_insert);

// Or, you can use the `Promise` API.
createReservation(createReservationVars).then((response) => {
  const data = response.data;
  console.log(data.reservation_insert);
});
```

### Using `CreateReservation`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createReservationRef, CreateReservationVariables } from '@reservation-system/dataconnect';

// The `CreateReservation` mutation requires an argument of type `CreateReservationVariables`:
const createReservationVars: CreateReservationVariables = {
  reservationCode: ..., 
  accountId: ..., // optional
  reserverName: ..., // optional
  reserverEmail: ..., // optional
  reserverPhone: ..., // optional
  reserverAddress: ..., // optional
  reserverAccountType: ..., // optional
  reserverCompanyBranchName: ..., // optional
  reserverContactPersonName: ..., // optional
  usageDate: ..., 
  usageTime: ..., 
  usageEndTime: ..., // optional
  expectedPeople: ..., 
  status: ..., 
  requestType: ..., // optional
  bookingType: ..., // optional
  bookingContactName: ..., // optional
  dayContactName: ..., // optional
  dayContactPhone: ..., // optional
  groupName: ..., // optional
  groupNameKana: ..., // optional
  groupType: ..., // optional
  groupTypeOther: ..., // optional
  tcCount: ..., // optional
  dgCount: ..., // optional
  paymentCondition: ..., // optional
  remarks: ..., // optional
  policyAgreementKind: ..., // optional
  policyAgreementAcceptedAt: ..., // optional
};

// Call the `createReservationRef()` function to get a reference to the mutation.
const ref = createReservationRef(createReservationVars);
// Variables can be defined inline as well.
const ref = createReservationRef({ reservationCode: ..., accountId: ..., reserverName: ..., reserverEmail: ..., reserverPhone: ..., reserverAddress: ..., reserverAccountType: ..., reserverCompanyBranchName: ..., reserverContactPersonName: ..., usageDate: ..., usageTime: ..., usageEndTime: ..., expectedPeople: ..., status: ..., requestType: ..., bookingType: ..., bookingContactName: ..., dayContactName: ..., dayContactPhone: ..., groupName: ..., groupNameKana: ..., groupType: ..., groupTypeOther: ..., tcCount: ..., dgCount: ..., paymentCondition: ..., remarks: ..., policyAgreementKind: ..., policyAgreementAcceptedAt: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createReservationRef(dataConnect, createReservationVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.reservation_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.reservation_insert);
});
```

## UpdateReservation
You can execute the `UpdateReservation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
updateReservation(vars: UpdateReservationVariables): MutationPromise<UpdateReservationData, UpdateReservationVariables>;

interface UpdateReservationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateReservationVariables): MutationRef<UpdateReservationData, UpdateReservationVariables>;
}
export const updateReservationRef: UpdateReservationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateReservation(dc: DataConnect, vars: UpdateReservationVariables): MutationPromise<UpdateReservationData, UpdateReservationVariables>;

interface UpdateReservationRef {
  ...
  (dc: DataConnect, vars: UpdateReservationVariables): MutationRef<UpdateReservationData, UpdateReservationVariables>;
}
export const updateReservationRef: UpdateReservationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateReservationRef:
```typescript
const name = updateReservationRef.operationName;
console.log(name);
```

### Variables
The `UpdateReservation` mutation requires an argument of type `UpdateReservationVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateReservationVariables {
  id: UUIDString;
  reserverName?: string | null;
  reserverEmail?: string | null;
  reserverPhone?: string | null;
  reserverAddress?: string | null;
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
```
### Return Type
Recall that executing the `UpdateReservation` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateReservationData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateReservationData {
  reservation_update?: Reservation_Key | null;
}
```
### Using `UpdateReservation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateReservation, UpdateReservationVariables } from '@reservation-system/dataconnect';

// The `UpdateReservation` mutation requires an argument of type `UpdateReservationVariables`:
const updateReservationVars: UpdateReservationVariables = {
  id: ..., 
  reserverName: ..., // optional
  reserverEmail: ..., // optional
  reserverPhone: ..., // optional
  reserverAddress: ..., // optional
  usageDate: ..., 
  usageTime: ..., 
  usageEndTime: ..., // optional
  expectedPeople: ..., 
  bookingType: ..., // optional
  bookingContactName: ..., // optional
  dayContactName: ..., // optional
  dayContactPhone: ..., // optional
  groupName: ..., // optional
  groupNameKana: ..., // optional
  groupType: ..., // optional
  groupTypeOther: ..., // optional
  tcCount: ..., // optional
  dgCount: ..., // optional
  paymentCondition: ..., // optional
  remarks: ..., // optional
};

// Call the `updateReservation()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateReservation(updateReservationVars);
// Variables can be defined inline as well.
const { data } = await updateReservation({ id: ..., reserverName: ..., reserverEmail: ..., reserverPhone: ..., reserverAddress: ..., usageDate: ..., usageTime: ..., usageEndTime: ..., expectedPeople: ..., bookingType: ..., bookingContactName: ..., dayContactName: ..., dayContactPhone: ..., groupName: ..., groupNameKana: ..., groupType: ..., groupTypeOther: ..., tcCount: ..., dgCount: ..., paymentCondition: ..., remarks: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateReservation(dataConnect, updateReservationVars);

console.log(data.reservation_update);

// Or, you can use the `Promise` API.
updateReservation(updateReservationVars).then((response) => {
  const data = response.data;
  console.log(data.reservation_update);
});
```

### Using `UpdateReservation`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateReservationRef, UpdateReservationVariables } from '@reservation-system/dataconnect';

// The `UpdateReservation` mutation requires an argument of type `UpdateReservationVariables`:
const updateReservationVars: UpdateReservationVariables = {
  id: ..., 
  reserverName: ..., // optional
  reserverEmail: ..., // optional
  reserverPhone: ..., // optional
  reserverAddress: ..., // optional
  usageDate: ..., 
  usageTime: ..., 
  usageEndTime: ..., // optional
  expectedPeople: ..., 
  bookingType: ..., // optional
  bookingContactName: ..., // optional
  dayContactName: ..., // optional
  dayContactPhone: ..., // optional
  groupName: ..., // optional
  groupNameKana: ..., // optional
  groupType: ..., // optional
  groupTypeOther: ..., // optional
  tcCount: ..., // optional
  dgCount: ..., // optional
  paymentCondition: ..., // optional
  remarks: ..., // optional
};

// Call the `updateReservationRef()` function to get a reference to the mutation.
const ref = updateReservationRef(updateReservationVars);
// Variables can be defined inline as well.
const ref = updateReservationRef({ id: ..., reserverName: ..., reserverEmail: ..., reserverPhone: ..., reserverAddress: ..., usageDate: ..., usageTime: ..., usageEndTime: ..., expectedPeople: ..., bookingType: ..., bookingContactName: ..., dayContactName: ..., dayContactPhone: ..., groupName: ..., groupNameKana: ..., groupType: ..., groupTypeOther: ..., tcCount: ..., dgCount: ..., paymentCondition: ..., remarks: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateReservationRef(dataConnect, updateReservationVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.reservation_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.reservation_update);
});
```

## AddReservationDetail
You can execute the `AddReservationDetail` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
addReservationDetail(vars: AddReservationDetailVariables): MutationPromise<AddReservationDetailData, AddReservationDetailVariables>;

interface AddReservationDetailRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddReservationDetailVariables): MutationRef<AddReservationDetailData, AddReservationDetailVariables>;
}
export const addReservationDetailRef: AddReservationDetailRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addReservationDetail(dc: DataConnect, vars: AddReservationDetailVariables): MutationPromise<AddReservationDetailData, AddReservationDetailVariables>;

interface AddReservationDetailRef {
  ...
  (dc: DataConnect, vars: AddReservationDetailVariables): MutationRef<AddReservationDetailData, AddReservationDetailVariables>;
}
export const addReservationDetailRef: AddReservationDetailRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addReservationDetailRef:
```typescript
const name = addReservationDetailRef.operationName;
console.log(name);
```

### Variables
The `AddReservationDetail` mutation requires an argument of type `AddReservationDetailVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddReservationDetailVariables {
  reservationId: UUIDString;
  menuId: UUIDString;
  quantity: number;
  unitPrice: number;
}
```
### Return Type
Recall that executing the `AddReservationDetail` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddReservationDetailData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddReservationDetailData {
  reservationDetail_insert: ReservationDetail_Key;
}
```
### Using `AddReservationDetail`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addReservationDetail, AddReservationDetailVariables } from '@reservation-system/dataconnect';

// The `AddReservationDetail` mutation requires an argument of type `AddReservationDetailVariables`:
const addReservationDetailVars: AddReservationDetailVariables = {
  reservationId: ..., 
  menuId: ..., 
  quantity: ..., 
  unitPrice: ..., 
};

// Call the `addReservationDetail()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addReservationDetail(addReservationDetailVars);
// Variables can be defined inline as well.
const { data } = await addReservationDetail({ reservationId: ..., menuId: ..., quantity: ..., unitPrice: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addReservationDetail(dataConnect, addReservationDetailVars);

console.log(data.reservationDetail_insert);

// Or, you can use the `Promise` API.
addReservationDetail(addReservationDetailVars).then((response) => {
  const data = response.data;
  console.log(data.reservationDetail_insert);
});
```

### Using `AddReservationDetail`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addReservationDetailRef, AddReservationDetailVariables } from '@reservation-system/dataconnect';

// The `AddReservationDetail` mutation requires an argument of type `AddReservationDetailVariables`:
const addReservationDetailVars: AddReservationDetailVariables = {
  reservationId: ..., 
  menuId: ..., 
  quantity: ..., 
  unitPrice: ..., 
};

// Call the `addReservationDetailRef()` function to get a reference to the mutation.
const ref = addReservationDetailRef(addReservationDetailVars);
// Variables can be defined inline as well.
const ref = addReservationDetailRef({ reservationId: ..., menuId: ..., quantity: ..., unitPrice: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addReservationDetailRef(dataConnect, addReservationDetailVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.reservationDetail_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.reservationDetail_insert);
});
```

## DeleteReservationDetail
You can execute the `DeleteReservationDetail` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
deleteReservationDetail(vars: DeleteReservationDetailVariables): MutationPromise<DeleteReservationDetailData, DeleteReservationDetailVariables>;

interface DeleteReservationDetailRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteReservationDetailVariables): MutationRef<DeleteReservationDetailData, DeleteReservationDetailVariables>;
}
export const deleteReservationDetailRef: DeleteReservationDetailRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteReservationDetail(dc: DataConnect, vars: DeleteReservationDetailVariables): MutationPromise<DeleteReservationDetailData, DeleteReservationDetailVariables>;

interface DeleteReservationDetailRef {
  ...
  (dc: DataConnect, vars: DeleteReservationDetailVariables): MutationRef<DeleteReservationDetailData, DeleteReservationDetailVariables>;
}
export const deleteReservationDetailRef: DeleteReservationDetailRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteReservationDetailRef:
```typescript
const name = deleteReservationDetailRef.operationName;
console.log(name);
```

### Variables
The `DeleteReservationDetail` mutation requires an argument of type `DeleteReservationDetailVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteReservationDetailVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteReservationDetail` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteReservationDetailData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteReservationDetailData {
  reservationDetail_delete?: ReservationDetail_Key | null;
}
```
### Using `DeleteReservationDetail`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteReservationDetail, DeleteReservationDetailVariables } from '@reservation-system/dataconnect';

// The `DeleteReservationDetail` mutation requires an argument of type `DeleteReservationDetailVariables`:
const deleteReservationDetailVars: DeleteReservationDetailVariables = {
  id: ..., 
};

// Call the `deleteReservationDetail()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteReservationDetail(deleteReservationDetailVars);
// Variables can be defined inline as well.
const { data } = await deleteReservationDetail({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteReservationDetail(dataConnect, deleteReservationDetailVars);

console.log(data.reservationDetail_delete);

// Or, you can use the `Promise` API.
deleteReservationDetail(deleteReservationDetailVars).then((response) => {
  const data = response.data;
  console.log(data.reservationDetail_delete);
});
```

### Using `DeleteReservationDetail`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteReservationDetailRef, DeleteReservationDetailVariables } from '@reservation-system/dataconnect';

// The `DeleteReservationDetail` mutation requires an argument of type `DeleteReservationDetailVariables`:
const deleteReservationDetailVars: DeleteReservationDetailVariables = {
  id: ..., 
};

// Call the `deleteReservationDetailRef()` function to get a reference to the mutation.
const ref = deleteReservationDetailRef(deleteReservationDetailVars);
// Variables can be defined inline as well.
const ref = deleteReservationDetailRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteReservationDetailRef(dataConnect, deleteReservationDetailVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.reservationDetail_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.reservationDetail_delete);
});
```

## UpdateReservationStatus
You can execute the `UpdateReservationStatus` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
updateReservationStatus(vars: UpdateReservationStatusVariables): MutationPromise<UpdateReservationStatusData, UpdateReservationStatusVariables>;

interface UpdateReservationStatusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateReservationStatusVariables): MutationRef<UpdateReservationStatusData, UpdateReservationStatusVariables>;
}
export const updateReservationStatusRef: UpdateReservationStatusRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateReservationStatus(dc: DataConnect, vars: UpdateReservationStatusVariables): MutationPromise<UpdateReservationStatusData, UpdateReservationStatusVariables>;

interface UpdateReservationStatusRef {
  ...
  (dc: DataConnect, vars: UpdateReservationStatusVariables): MutationRef<UpdateReservationStatusData, UpdateReservationStatusVariables>;
}
export const updateReservationStatusRef: UpdateReservationStatusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateReservationStatusRef:
```typescript
const name = updateReservationStatusRef.operationName;
console.log(name);
```

### Variables
The `UpdateReservationStatus` mutation requires an argument of type `UpdateReservationStatusVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateReservationStatusVariables {
  id: UUIDString;
  status: ReservationStatus;
  requestType?: string | null;
}
```
### Return Type
Recall that executing the `UpdateReservationStatus` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateReservationStatusData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateReservationStatusData {
  reservation_update?: Reservation_Key | null;
}
```
### Using `UpdateReservationStatus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateReservationStatus, UpdateReservationStatusVariables } from '@reservation-system/dataconnect';

// The `UpdateReservationStatus` mutation requires an argument of type `UpdateReservationStatusVariables`:
const updateReservationStatusVars: UpdateReservationStatusVariables = {
  id: ..., 
  status: ..., 
  requestType: ..., // optional
};

// Call the `updateReservationStatus()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateReservationStatus(updateReservationStatusVars);
// Variables can be defined inline as well.
const { data } = await updateReservationStatus({ id: ..., status: ..., requestType: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateReservationStatus(dataConnect, updateReservationStatusVars);

console.log(data.reservation_update);

// Or, you can use the `Promise` API.
updateReservationStatus(updateReservationStatusVars).then((response) => {
  const data = response.data;
  console.log(data.reservation_update);
});
```

### Using `UpdateReservationStatus`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateReservationStatusRef, UpdateReservationStatusVariables } from '@reservation-system/dataconnect';

// The `UpdateReservationStatus` mutation requires an argument of type `UpdateReservationStatusVariables`:
const updateReservationStatusVars: UpdateReservationStatusVariables = {
  id: ..., 
  status: ..., 
  requestType: ..., // optional
};

// Call the `updateReservationStatusRef()` function to get a reference to the mutation.
const ref = updateReservationStatusRef(updateReservationStatusVars);
// Variables can be defined inline as well.
const ref = updateReservationStatusRef({ id: ..., status: ..., requestType: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateReservationStatusRef(dataConnect, updateReservationStatusVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.reservation_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.reservation_update);
});
```

## UpdateConfirmationContact
You can execute the `UpdateConfirmationContact` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
updateConfirmationContact(vars: UpdateConfirmationContactVariables): MutationPromise<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;

interface UpdateConfirmationContactRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateConfirmationContactVariables): MutationRef<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;
}
export const updateConfirmationContactRef: UpdateConfirmationContactRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateConfirmationContact(dc: DataConnect, vars: UpdateConfirmationContactVariables): MutationPromise<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;

interface UpdateConfirmationContactRef {
  ...
  (dc: DataConnect, vars: UpdateConfirmationContactVariables): MutationRef<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;
}
export const updateConfirmationContactRef: UpdateConfirmationContactRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateConfirmationContactRef:
```typescript
const name = updateConfirmationContactRef.operationName;
console.log(name);
```

### Variables
The `UpdateConfirmationContact` mutation requires an argument of type `UpdateConfirmationContactVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateConfirmationContactVariables {
  id: UUIDString;
  confirmationContactedAt?: TimestampString | null;
}
```
### Return Type
Recall that executing the `UpdateConfirmationContact` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateConfirmationContactData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateConfirmationContactData {
  reservation_update?: Reservation_Key | null;
}
```
### Using `UpdateConfirmationContact`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateConfirmationContact, UpdateConfirmationContactVariables } from '@reservation-system/dataconnect';

// The `UpdateConfirmationContact` mutation requires an argument of type `UpdateConfirmationContactVariables`:
const updateConfirmationContactVars: UpdateConfirmationContactVariables = {
  id: ..., 
  confirmationContactedAt: ..., // optional
};

// Call the `updateConfirmationContact()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateConfirmationContact(updateConfirmationContactVars);
// Variables can be defined inline as well.
const { data } = await updateConfirmationContact({ id: ..., confirmationContactedAt: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateConfirmationContact(dataConnect, updateConfirmationContactVars);

console.log(data.reservation_update);

// Or, you can use the `Promise` API.
updateConfirmationContact(updateConfirmationContactVars).then((response) => {
  const data = response.data;
  console.log(data.reservation_update);
});
```

### Using `UpdateConfirmationContact`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateConfirmationContactRef, UpdateConfirmationContactVariables } from '@reservation-system/dataconnect';

// The `UpdateConfirmationContact` mutation requires an argument of type `UpdateConfirmationContactVariables`:
const updateConfirmationContactVars: UpdateConfirmationContactVariables = {
  id: ..., 
  confirmationContactedAt: ..., // optional
};

// Call the `updateConfirmationContactRef()` function to get a reference to the mutation.
const ref = updateConfirmationContactRef(updateConfirmationContactVars);
// Variables can be defined inline as well.
const ref = updateConfirmationContactRef({ id: ..., confirmationContactedAt: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateConfirmationContactRef(dataConnect, updateConfirmationContactVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.reservation_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.reservation_update);
});
```

## ClearConfirmationContact
You can execute the `ClearConfirmationContact` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
clearConfirmationContact(vars: ClearConfirmationContactVariables): MutationPromise<ClearConfirmationContactData, ClearConfirmationContactVariables>;

interface ClearConfirmationContactRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ClearConfirmationContactVariables): MutationRef<ClearConfirmationContactData, ClearConfirmationContactVariables>;
}
export const clearConfirmationContactRef: ClearConfirmationContactRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
clearConfirmationContact(dc: DataConnect, vars: ClearConfirmationContactVariables): MutationPromise<ClearConfirmationContactData, ClearConfirmationContactVariables>;

interface ClearConfirmationContactRef {
  ...
  (dc: DataConnect, vars: ClearConfirmationContactVariables): MutationRef<ClearConfirmationContactData, ClearConfirmationContactVariables>;
}
export const clearConfirmationContactRef: ClearConfirmationContactRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the clearConfirmationContactRef:
```typescript
const name = clearConfirmationContactRef.operationName;
console.log(name);
```

### Variables
The `ClearConfirmationContact` mutation requires an argument of type `ClearConfirmationContactVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ClearConfirmationContactVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `ClearConfirmationContact` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ClearConfirmationContactData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ClearConfirmationContactData {
  reservation_update?: Reservation_Key | null;
}
```
### Using `ClearConfirmationContact`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, clearConfirmationContact, ClearConfirmationContactVariables } from '@reservation-system/dataconnect';

// The `ClearConfirmationContact` mutation requires an argument of type `ClearConfirmationContactVariables`:
const clearConfirmationContactVars: ClearConfirmationContactVariables = {
  id: ..., 
};

// Call the `clearConfirmationContact()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await clearConfirmationContact(clearConfirmationContactVars);
// Variables can be defined inline as well.
const { data } = await clearConfirmationContact({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await clearConfirmationContact(dataConnect, clearConfirmationContactVars);

console.log(data.reservation_update);

// Or, you can use the `Promise` API.
clearConfirmationContact(clearConfirmationContactVars).then((response) => {
  const data = response.data;
  console.log(data.reservation_update);
});
```

### Using `ClearConfirmationContact`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, clearConfirmationContactRef, ClearConfirmationContactVariables } from '@reservation-system/dataconnect';

// The `ClearConfirmationContact` mutation requires an argument of type `ClearConfirmationContactVariables`:
const clearConfirmationContactVars: ClearConfirmationContactVariables = {
  id: ..., 
};

// Call the `clearConfirmationContactRef()` function to get a reference to the mutation.
const ref = clearConfirmationContactRef(clearConfirmationContactVars);
// Variables can be defined inline as well.
const ref = clearConfirmationContactRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = clearConfirmationContactRef(dataConnect, clearConfirmationContactVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.reservation_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.reservation_update);
});
```

## AssignStore
You can execute the `AssignStore` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
assignStore(vars: AssignStoreVariables): MutationPromise<AssignStoreData, AssignStoreVariables>;

interface AssignStoreRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AssignStoreVariables): MutationRef<AssignStoreData, AssignStoreVariables>;
}
export const assignStoreRef: AssignStoreRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
assignStore(dc: DataConnect, vars: AssignStoreVariables): MutationPromise<AssignStoreData, AssignStoreVariables>;

interface AssignStoreRef {
  ...
  (dc: DataConnect, vars: AssignStoreVariables): MutationRef<AssignStoreData, AssignStoreVariables>;
}
export const assignStoreRef: AssignStoreRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the assignStoreRef:
```typescript
const name = assignStoreRef.operationName;
console.log(name);
```

### Variables
The `AssignStore` mutation requires an argument of type `AssignStoreVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AssignStoreVariables {
  reservationId: UUIDString;
  storeId: UUIDString;
  people: number;
}
```
### Return Type
Recall that executing the `AssignStore` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AssignStoreData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AssignStoreData {
  storeAssignment_insert: StoreAssignment_Key;
}
```
### Using `AssignStore`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, assignStore, AssignStoreVariables } from '@reservation-system/dataconnect';

// The `AssignStore` mutation requires an argument of type `AssignStoreVariables`:
const assignStoreVars: AssignStoreVariables = {
  reservationId: ..., 
  storeId: ..., 
  people: ..., 
};

// Call the `assignStore()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await assignStore(assignStoreVars);
// Variables can be defined inline as well.
const { data } = await assignStore({ reservationId: ..., storeId: ..., people: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await assignStore(dataConnect, assignStoreVars);

console.log(data.storeAssignment_insert);

// Or, you can use the `Promise` API.
assignStore(assignStoreVars).then((response) => {
  const data = response.data;
  console.log(data.storeAssignment_insert);
});
```

### Using `AssignStore`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, assignStoreRef, AssignStoreVariables } from '@reservation-system/dataconnect';

// The `AssignStore` mutation requires an argument of type `AssignStoreVariables`:
const assignStoreVars: AssignStoreVariables = {
  reservationId: ..., 
  storeId: ..., 
  people: ..., 
};

// Call the `assignStoreRef()` function to get a reference to the mutation.
const ref = assignStoreRef(assignStoreVars);
// Variables can be defined inline as well.
const ref = assignStoreRef({ reservationId: ..., storeId: ..., people: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = assignStoreRef(dataConnect, assignStoreVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.storeAssignment_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.storeAssignment_insert);
});
```

## DeleteStoreAssignment
You can execute the `DeleteStoreAssignment` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
deleteStoreAssignment(vars: DeleteStoreAssignmentVariables): MutationPromise<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;

interface DeleteStoreAssignmentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteStoreAssignmentVariables): MutationRef<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;
}
export const deleteStoreAssignmentRef: DeleteStoreAssignmentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteStoreAssignment(dc: DataConnect, vars: DeleteStoreAssignmentVariables): MutationPromise<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;

interface DeleteStoreAssignmentRef {
  ...
  (dc: DataConnect, vars: DeleteStoreAssignmentVariables): MutationRef<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;
}
export const deleteStoreAssignmentRef: DeleteStoreAssignmentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteStoreAssignmentRef:
```typescript
const name = deleteStoreAssignmentRef.operationName;
console.log(name);
```

### Variables
The `DeleteStoreAssignment` mutation requires an argument of type `DeleteStoreAssignmentVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteStoreAssignmentVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteStoreAssignment` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteStoreAssignmentData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteStoreAssignmentData {
  storeAssignment_delete?: StoreAssignment_Key | null;
}
```
### Using `DeleteStoreAssignment`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteStoreAssignment, DeleteStoreAssignmentVariables } from '@reservation-system/dataconnect';

// The `DeleteStoreAssignment` mutation requires an argument of type `DeleteStoreAssignmentVariables`:
const deleteStoreAssignmentVars: DeleteStoreAssignmentVariables = {
  id: ..., 
};

// Call the `deleteStoreAssignment()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteStoreAssignment(deleteStoreAssignmentVars);
// Variables can be defined inline as well.
const { data } = await deleteStoreAssignment({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteStoreAssignment(dataConnect, deleteStoreAssignmentVars);

console.log(data.storeAssignment_delete);

// Or, you can use the `Promise` API.
deleteStoreAssignment(deleteStoreAssignmentVars).then((response) => {
  const data = response.data;
  console.log(data.storeAssignment_delete);
});
```

### Using `DeleteStoreAssignment`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteStoreAssignmentRef, DeleteStoreAssignmentVariables } from '@reservation-system/dataconnect';

// The `DeleteStoreAssignment` mutation requires an argument of type `DeleteStoreAssignmentVariables`:
const deleteStoreAssignmentVars: DeleteStoreAssignmentVariables = {
  id: ..., 
};

// Call the `deleteStoreAssignmentRef()` function to get a reference to the mutation.
const ref = deleteStoreAssignmentRef(deleteStoreAssignmentVars);
// Variables can be defined inline as well.
const ref = deleteStoreAssignmentRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteStoreAssignmentRef(dataConnect, deleteStoreAssignmentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.storeAssignment_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.storeAssignment_delete);
});
```

## CreateReservationChangeRequest
You can execute the `CreateReservationChangeRequest` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createReservationChangeRequest(vars: CreateReservationChangeRequestVariables): MutationPromise<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;

interface CreateReservationChangeRequestRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateReservationChangeRequestVariables): MutationRef<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;
}
export const createReservationChangeRequestRef: CreateReservationChangeRequestRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createReservationChangeRequest(dc: DataConnect, vars: CreateReservationChangeRequestVariables): MutationPromise<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;

interface CreateReservationChangeRequestRef {
  ...
  (dc: DataConnect, vars: CreateReservationChangeRequestVariables): MutationRef<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;
}
export const createReservationChangeRequestRef: CreateReservationChangeRequestRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createReservationChangeRequestRef:
```typescript
const name = createReservationChangeRequestRef.operationName;
console.log(name);
```

### Variables
The `CreateReservationChangeRequest` mutation requires an argument of type `CreateReservationChangeRequestVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateReservationChangeRequestVariables {
  reservationId: UUIDString;
  requestedDate: DateString;
  requestedTime: string;
  requestedPeople: number;
  requestedMenuItemsJson: string;
  reason?: string | null;
}
```
### Return Type
Recall that executing the `CreateReservationChangeRequest` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateReservationChangeRequestData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateReservationChangeRequestData {
  reservationChangeRequest_insert: ReservationChangeRequest_Key;
}
```
### Using `CreateReservationChangeRequest`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createReservationChangeRequest, CreateReservationChangeRequestVariables } from '@reservation-system/dataconnect';

// The `CreateReservationChangeRequest` mutation requires an argument of type `CreateReservationChangeRequestVariables`:
const createReservationChangeRequestVars: CreateReservationChangeRequestVariables = {
  reservationId: ..., 
  requestedDate: ..., 
  requestedTime: ..., 
  requestedPeople: ..., 
  requestedMenuItemsJson: ..., 
  reason: ..., // optional
};

// Call the `createReservationChangeRequest()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createReservationChangeRequest(createReservationChangeRequestVars);
// Variables can be defined inline as well.
const { data } = await createReservationChangeRequest({ reservationId: ..., requestedDate: ..., requestedTime: ..., requestedPeople: ..., requestedMenuItemsJson: ..., reason: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createReservationChangeRequest(dataConnect, createReservationChangeRequestVars);

console.log(data.reservationChangeRequest_insert);

// Or, you can use the `Promise` API.
createReservationChangeRequest(createReservationChangeRequestVars).then((response) => {
  const data = response.data;
  console.log(data.reservationChangeRequest_insert);
});
```

### Using `CreateReservationChangeRequest`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createReservationChangeRequestRef, CreateReservationChangeRequestVariables } from '@reservation-system/dataconnect';

// The `CreateReservationChangeRequest` mutation requires an argument of type `CreateReservationChangeRequestVariables`:
const createReservationChangeRequestVars: CreateReservationChangeRequestVariables = {
  reservationId: ..., 
  requestedDate: ..., 
  requestedTime: ..., 
  requestedPeople: ..., 
  requestedMenuItemsJson: ..., 
  reason: ..., // optional
};

// Call the `createReservationChangeRequestRef()` function to get a reference to the mutation.
const ref = createReservationChangeRequestRef(createReservationChangeRequestVars);
// Variables can be defined inline as well.
const ref = createReservationChangeRequestRef({ reservationId: ..., requestedDate: ..., requestedTime: ..., requestedPeople: ..., requestedMenuItemsJson: ..., reason: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createReservationChangeRequestRef(dataConnect, createReservationChangeRequestVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.reservationChangeRequest_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.reservationChangeRequest_insert);
});
```

## UpdateReservationChangeRequestStatus
You can execute the `UpdateReservationChangeRequestStatus` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
updateReservationChangeRequestStatus(vars: UpdateReservationChangeRequestStatusVariables): MutationPromise<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;

interface UpdateReservationChangeRequestStatusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateReservationChangeRequestStatusVariables): MutationRef<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;
}
export const updateReservationChangeRequestStatusRef: UpdateReservationChangeRequestStatusRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateReservationChangeRequestStatus(dc: DataConnect, vars: UpdateReservationChangeRequestStatusVariables): MutationPromise<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;

interface UpdateReservationChangeRequestStatusRef {
  ...
  (dc: DataConnect, vars: UpdateReservationChangeRequestStatusVariables): MutationRef<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;
}
export const updateReservationChangeRequestStatusRef: UpdateReservationChangeRequestStatusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateReservationChangeRequestStatusRef:
```typescript
const name = updateReservationChangeRequestStatusRef.operationName;
console.log(name);
```

### Variables
The `UpdateReservationChangeRequestStatus` mutation requires an argument of type `UpdateReservationChangeRequestStatusVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateReservationChangeRequestStatusVariables {
  id: UUIDString;
  status: ReservationChangeRequestStatus;
  reviewedAt?: TimestampString | null;
}
```
### Return Type
Recall that executing the `UpdateReservationChangeRequestStatus` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateReservationChangeRequestStatusData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateReservationChangeRequestStatusData {
  reservationChangeRequest_update?: ReservationChangeRequest_Key | null;
}
```
### Using `UpdateReservationChangeRequestStatus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateReservationChangeRequestStatus, UpdateReservationChangeRequestStatusVariables } from '@reservation-system/dataconnect';

// The `UpdateReservationChangeRequestStatus` mutation requires an argument of type `UpdateReservationChangeRequestStatusVariables`:
const updateReservationChangeRequestStatusVars: UpdateReservationChangeRequestStatusVariables = {
  id: ..., 
  status: ..., 
  reviewedAt: ..., // optional
};

// Call the `updateReservationChangeRequestStatus()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateReservationChangeRequestStatus(updateReservationChangeRequestStatusVars);
// Variables can be defined inline as well.
const { data } = await updateReservationChangeRequestStatus({ id: ..., status: ..., reviewedAt: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateReservationChangeRequestStatus(dataConnect, updateReservationChangeRequestStatusVars);

console.log(data.reservationChangeRequest_update);

// Or, you can use the `Promise` API.
updateReservationChangeRequestStatus(updateReservationChangeRequestStatusVars).then((response) => {
  const data = response.data;
  console.log(data.reservationChangeRequest_update);
});
```

### Using `UpdateReservationChangeRequestStatus`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateReservationChangeRequestStatusRef, UpdateReservationChangeRequestStatusVariables } from '@reservation-system/dataconnect';

// The `UpdateReservationChangeRequestStatus` mutation requires an argument of type `UpdateReservationChangeRequestStatusVariables`:
const updateReservationChangeRequestStatusVars: UpdateReservationChangeRequestStatusVariables = {
  id: ..., 
  status: ..., 
  reviewedAt: ..., // optional
};

// Call the `updateReservationChangeRequestStatusRef()` function to get a reference to the mutation.
const ref = updateReservationChangeRequestStatusRef(updateReservationChangeRequestStatusVars);
// Variables can be defined inline as well.
const ref = updateReservationChangeRequestStatusRef({ id: ..., status: ..., reviewedAt: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateReservationChangeRequestStatusRef(dataConnect, updateReservationChangeRequestStatusVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.reservationChangeRequest_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.reservationChangeRequest_update);
});
```

## CreateStore
You can execute the `CreateStore` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createStore(vars: CreateStoreVariables): MutationPromise<CreateStoreData, CreateStoreVariables>;

interface CreateStoreRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStoreVariables): MutationRef<CreateStoreData, CreateStoreVariables>;
}
export const createStoreRef: CreateStoreRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createStore(dc: DataConnect, vars: CreateStoreVariables): MutationPromise<CreateStoreData, CreateStoreVariables>;

interface CreateStoreRef {
  ...
  (dc: DataConnect, vars: CreateStoreVariables): MutationRef<CreateStoreData, CreateStoreVariables>;
}
export const createStoreRef: CreateStoreRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createStoreRef:
```typescript
const name = createStoreRef.operationName;
console.log(name);
```

### Variables
The `CreateStore` mutation requires an argument of type `CreateStoreVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateStoreVariables {
  name: string;
  displayOrder?: number | null;
  active: boolean;
}
```
### Return Type
Recall that executing the `CreateStore` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateStoreData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateStoreData {
  store_insert: Store_Key;
}
```
### Using `CreateStore`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createStore, CreateStoreVariables } from '@reservation-system/dataconnect';

// The `CreateStore` mutation requires an argument of type `CreateStoreVariables`:
const createStoreVars: CreateStoreVariables = {
  name: ..., 
  displayOrder: ..., // optional
  active: ..., 
};

// Call the `createStore()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createStore(createStoreVars);
// Variables can be defined inline as well.
const { data } = await createStore({ name: ..., displayOrder: ..., active: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createStore(dataConnect, createStoreVars);

console.log(data.store_insert);

// Or, you can use the `Promise` API.
createStore(createStoreVars).then((response) => {
  const data = response.data;
  console.log(data.store_insert);
});
```

### Using `CreateStore`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createStoreRef, CreateStoreVariables } from '@reservation-system/dataconnect';

// The `CreateStore` mutation requires an argument of type `CreateStoreVariables`:
const createStoreVars: CreateStoreVariables = {
  name: ..., 
  displayOrder: ..., // optional
  active: ..., 
};

// Call the `createStoreRef()` function to get a reference to the mutation.
const ref = createStoreRef(createStoreVars);
// Variables can be defined inline as well.
const ref = createStoreRef({ name: ..., displayOrder: ..., active: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createStoreRef(dataConnect, createStoreVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.store_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.store_insert);
});
```

## UpdateStore
You can execute the `UpdateStore` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
updateStore(vars: UpdateStoreVariables): MutationPromise<UpdateStoreData, UpdateStoreVariables>;

interface UpdateStoreRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateStoreVariables): MutationRef<UpdateStoreData, UpdateStoreVariables>;
}
export const updateStoreRef: UpdateStoreRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateStore(dc: DataConnect, vars: UpdateStoreVariables): MutationPromise<UpdateStoreData, UpdateStoreVariables>;

interface UpdateStoreRef {
  ...
  (dc: DataConnect, vars: UpdateStoreVariables): MutationRef<UpdateStoreData, UpdateStoreVariables>;
}
export const updateStoreRef: UpdateStoreRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateStoreRef:
```typescript
const name = updateStoreRef.operationName;
console.log(name);
```

### Variables
The `UpdateStore` mutation requires an argument of type `UpdateStoreVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateStoreVariables {
  id: UUIDString;
  name: string;
  displayOrder?: number | null;
  active: boolean;
}
```
### Return Type
Recall that executing the `UpdateStore` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateStoreData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateStoreData {
  store_update?: Store_Key | null;
}
```
### Using `UpdateStore`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateStore, UpdateStoreVariables } from '@reservation-system/dataconnect';

// The `UpdateStore` mutation requires an argument of type `UpdateStoreVariables`:
const updateStoreVars: UpdateStoreVariables = {
  id: ..., 
  name: ..., 
  displayOrder: ..., // optional
  active: ..., 
};

// Call the `updateStore()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateStore(updateStoreVars);
// Variables can be defined inline as well.
const { data } = await updateStore({ id: ..., name: ..., displayOrder: ..., active: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateStore(dataConnect, updateStoreVars);

console.log(data.store_update);

// Or, you can use the `Promise` API.
updateStore(updateStoreVars).then((response) => {
  const data = response.data;
  console.log(data.store_update);
});
```

### Using `UpdateStore`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateStoreRef, UpdateStoreVariables } from '@reservation-system/dataconnect';

// The `UpdateStore` mutation requires an argument of type `UpdateStoreVariables`:
const updateStoreVars: UpdateStoreVariables = {
  id: ..., 
  name: ..., 
  displayOrder: ..., // optional
  active: ..., 
};

// Call the `updateStoreRef()` function to get a reference to the mutation.
const ref = updateStoreRef(updateStoreVars);
// Variables can be defined inline as well.
const ref = updateStoreRef({ id: ..., name: ..., displayOrder: ..., active: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateStoreRef(dataConnect, updateStoreVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.store_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.store_update);
});
```

## DeactivateStore
You can execute the `DeactivateStore` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
deactivateStore(vars: DeactivateStoreVariables): MutationPromise<DeactivateStoreData, DeactivateStoreVariables>;

interface DeactivateStoreRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeactivateStoreVariables): MutationRef<DeactivateStoreData, DeactivateStoreVariables>;
}
export const deactivateStoreRef: DeactivateStoreRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deactivateStore(dc: DataConnect, vars: DeactivateStoreVariables): MutationPromise<DeactivateStoreData, DeactivateStoreVariables>;

interface DeactivateStoreRef {
  ...
  (dc: DataConnect, vars: DeactivateStoreVariables): MutationRef<DeactivateStoreData, DeactivateStoreVariables>;
}
export const deactivateStoreRef: DeactivateStoreRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deactivateStoreRef:
```typescript
const name = deactivateStoreRef.operationName;
console.log(name);
```

### Variables
The `DeactivateStore` mutation requires an argument of type `DeactivateStoreVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeactivateStoreVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeactivateStore` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeactivateStoreData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeactivateStoreData {
  store_update?: Store_Key | null;
}
```
### Using `DeactivateStore`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deactivateStore, DeactivateStoreVariables } from '@reservation-system/dataconnect';

// The `DeactivateStore` mutation requires an argument of type `DeactivateStoreVariables`:
const deactivateStoreVars: DeactivateStoreVariables = {
  id: ..., 
};

// Call the `deactivateStore()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deactivateStore(deactivateStoreVars);
// Variables can be defined inline as well.
const { data } = await deactivateStore({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deactivateStore(dataConnect, deactivateStoreVars);

console.log(data.store_update);

// Or, you can use the `Promise` API.
deactivateStore(deactivateStoreVars).then((response) => {
  const data = response.data;
  console.log(data.store_update);
});
```

### Using `DeactivateStore`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deactivateStoreRef, DeactivateStoreVariables } from '@reservation-system/dataconnect';

// The `DeactivateStore` mutation requires an argument of type `DeactivateStoreVariables`:
const deactivateStoreVars: DeactivateStoreVariables = {
  id: ..., 
};

// Call the `deactivateStoreRef()` function to get a reference to the mutation.
const ref = deactivateStoreRef(deactivateStoreVars);
// Variables can be defined inline as well.
const ref = deactivateStoreRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deactivateStoreRef(dataConnect, deactivateStoreVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.store_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.store_update);
});
```

## ReactivateStore
You can execute the `ReactivateStore` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
reactivateStore(vars: ReactivateStoreVariables): MutationPromise<ReactivateStoreData, ReactivateStoreVariables>;

interface ReactivateStoreRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ReactivateStoreVariables): MutationRef<ReactivateStoreData, ReactivateStoreVariables>;
}
export const reactivateStoreRef: ReactivateStoreRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
reactivateStore(dc: DataConnect, vars: ReactivateStoreVariables): MutationPromise<ReactivateStoreData, ReactivateStoreVariables>;

interface ReactivateStoreRef {
  ...
  (dc: DataConnect, vars: ReactivateStoreVariables): MutationRef<ReactivateStoreData, ReactivateStoreVariables>;
}
export const reactivateStoreRef: ReactivateStoreRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the reactivateStoreRef:
```typescript
const name = reactivateStoreRef.operationName;
console.log(name);
```

### Variables
The `ReactivateStore` mutation requires an argument of type `ReactivateStoreVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ReactivateStoreVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `ReactivateStore` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ReactivateStoreData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ReactivateStoreData {
  store_update?: Store_Key | null;
}
```
### Using `ReactivateStore`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, reactivateStore, ReactivateStoreVariables } from '@reservation-system/dataconnect';

// The `ReactivateStore` mutation requires an argument of type `ReactivateStoreVariables`:
const reactivateStoreVars: ReactivateStoreVariables = {
  id: ..., 
};

// Call the `reactivateStore()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await reactivateStore(reactivateStoreVars);
// Variables can be defined inline as well.
const { data } = await reactivateStore({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await reactivateStore(dataConnect, reactivateStoreVars);

console.log(data.store_update);

// Or, you can use the `Promise` API.
reactivateStore(reactivateStoreVars).then((response) => {
  const data = response.data;
  console.log(data.store_update);
});
```

### Using `ReactivateStore`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, reactivateStoreRef, ReactivateStoreVariables } from '@reservation-system/dataconnect';

// The `ReactivateStore` mutation requires an argument of type `ReactivateStoreVariables`:
const reactivateStoreVars: ReactivateStoreVariables = {
  id: ..., 
};

// Call the `reactivateStoreRef()` function to get a reference to the mutation.
const ref = reactivateStoreRef(reactivateStoreVars);
// Variables can be defined inline as well.
const ref = reactivateStoreRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = reactivateStoreRef(dataConnect, reactivateStoreVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.store_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.store_update);
});
```

## CreateMenu
You can execute the `CreateMenu` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createMenu(vars: CreateMenuVariables): MutationPromise<CreateMenuData, CreateMenuVariables>;

interface CreateMenuRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMenuVariables): MutationRef<CreateMenuData, CreateMenuVariables>;
}
export const createMenuRef: CreateMenuRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createMenu(dc: DataConnect, vars: CreateMenuVariables): MutationPromise<CreateMenuData, CreateMenuVariables>;

interface CreateMenuRef {
  ...
  (dc: DataConnect, vars: CreateMenuVariables): MutationRef<CreateMenuData, CreateMenuVariables>;
}
export const createMenuRef: CreateMenuRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createMenuRef:
```typescript
const name = createMenuRef.operationName;
console.log(name);
```

### Variables
The `CreateMenu` mutation requires an argument of type `CreateMenuVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateMenuVariables {
  name: string;
  description?: string | null;
  standardPrice: number;
  durationMinutes: number;
  displayOrder?: number | null;
  active: boolean;
}
```
### Return Type
Recall that executing the `CreateMenu` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateMenuData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMenuData {
  menu_insert: Menu_Key;
}
```
### Using `CreateMenu`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMenu, CreateMenuVariables } from '@reservation-system/dataconnect';

// The `CreateMenu` mutation requires an argument of type `CreateMenuVariables`:
const createMenuVars: CreateMenuVariables = {
  name: ..., 
  description: ..., // optional
  standardPrice: ..., 
  durationMinutes: ..., 
  displayOrder: ..., // optional
  active: ..., 
};

// Call the `createMenu()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createMenu(createMenuVars);
// Variables can be defined inline as well.
const { data } = await createMenu({ name: ..., description: ..., standardPrice: ..., durationMinutes: ..., displayOrder: ..., active: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createMenu(dataConnect, createMenuVars);

console.log(data.menu_insert);

// Or, you can use the `Promise` API.
createMenu(createMenuVars).then((response) => {
  const data = response.data;
  console.log(data.menu_insert);
});
```

### Using `CreateMenu`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createMenuRef, CreateMenuVariables } from '@reservation-system/dataconnect';

// The `CreateMenu` mutation requires an argument of type `CreateMenuVariables`:
const createMenuVars: CreateMenuVariables = {
  name: ..., 
  description: ..., // optional
  standardPrice: ..., 
  durationMinutes: ..., 
  displayOrder: ..., // optional
  active: ..., 
};

// Call the `createMenuRef()` function to get a reference to the mutation.
const ref = createMenuRef(createMenuVars);
// Variables can be defined inline as well.
const ref = createMenuRef({ name: ..., description: ..., standardPrice: ..., durationMinutes: ..., displayOrder: ..., active: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createMenuRef(dataConnect, createMenuVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.menu_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.menu_insert);
});
```

## UpdateMenu
You can execute the `UpdateMenu` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
updateMenu(vars: UpdateMenuVariables): MutationPromise<UpdateMenuData, UpdateMenuVariables>;

interface UpdateMenuRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMenuVariables): MutationRef<UpdateMenuData, UpdateMenuVariables>;
}
export const updateMenuRef: UpdateMenuRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateMenu(dc: DataConnect, vars: UpdateMenuVariables): MutationPromise<UpdateMenuData, UpdateMenuVariables>;

interface UpdateMenuRef {
  ...
  (dc: DataConnect, vars: UpdateMenuVariables): MutationRef<UpdateMenuData, UpdateMenuVariables>;
}
export const updateMenuRef: UpdateMenuRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateMenuRef:
```typescript
const name = updateMenuRef.operationName;
console.log(name);
```

### Variables
The `UpdateMenu` mutation requires an argument of type `UpdateMenuVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateMenuVariables {
  id: UUIDString;
  name: string;
  description?: string | null;
  standardPrice: number;
  durationMinutes: number;
  displayOrder?: number | null;
  active: boolean;
}
```
### Return Type
Recall that executing the `UpdateMenu` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateMenuData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateMenuData {
  menu_update?: Menu_Key | null;
}
```
### Using `UpdateMenu`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateMenu, UpdateMenuVariables } from '@reservation-system/dataconnect';

// The `UpdateMenu` mutation requires an argument of type `UpdateMenuVariables`:
const updateMenuVars: UpdateMenuVariables = {
  id: ..., 
  name: ..., 
  description: ..., // optional
  standardPrice: ..., 
  durationMinutes: ..., 
  displayOrder: ..., // optional
  active: ..., 
};

// Call the `updateMenu()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateMenu(updateMenuVars);
// Variables can be defined inline as well.
const { data } = await updateMenu({ id: ..., name: ..., description: ..., standardPrice: ..., durationMinutes: ..., displayOrder: ..., active: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateMenu(dataConnect, updateMenuVars);

console.log(data.menu_update);

// Or, you can use the `Promise` API.
updateMenu(updateMenuVars).then((response) => {
  const data = response.data;
  console.log(data.menu_update);
});
```

### Using `UpdateMenu`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateMenuRef, UpdateMenuVariables } from '@reservation-system/dataconnect';

// The `UpdateMenu` mutation requires an argument of type `UpdateMenuVariables`:
const updateMenuVars: UpdateMenuVariables = {
  id: ..., 
  name: ..., 
  description: ..., // optional
  standardPrice: ..., 
  durationMinutes: ..., 
  displayOrder: ..., // optional
  active: ..., 
};

// Call the `updateMenuRef()` function to get a reference to the mutation.
const ref = updateMenuRef(updateMenuVars);
// Variables can be defined inline as well.
const ref = updateMenuRef({ id: ..., name: ..., description: ..., standardPrice: ..., durationMinutes: ..., displayOrder: ..., active: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateMenuRef(dataConnect, updateMenuVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.menu_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.menu_update);
});
```

## DeactivateMenu
You can execute the `DeactivateMenu` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
deactivateMenu(vars: DeactivateMenuVariables): MutationPromise<DeactivateMenuData, DeactivateMenuVariables>;

interface DeactivateMenuRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeactivateMenuVariables): MutationRef<DeactivateMenuData, DeactivateMenuVariables>;
}
export const deactivateMenuRef: DeactivateMenuRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deactivateMenu(dc: DataConnect, vars: DeactivateMenuVariables): MutationPromise<DeactivateMenuData, DeactivateMenuVariables>;

interface DeactivateMenuRef {
  ...
  (dc: DataConnect, vars: DeactivateMenuVariables): MutationRef<DeactivateMenuData, DeactivateMenuVariables>;
}
export const deactivateMenuRef: DeactivateMenuRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deactivateMenuRef:
```typescript
const name = deactivateMenuRef.operationName;
console.log(name);
```

### Variables
The `DeactivateMenu` mutation requires an argument of type `DeactivateMenuVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeactivateMenuVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeactivateMenu` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeactivateMenuData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeactivateMenuData {
  menu_update?: Menu_Key | null;
}
```
### Using `DeactivateMenu`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deactivateMenu, DeactivateMenuVariables } from '@reservation-system/dataconnect';

// The `DeactivateMenu` mutation requires an argument of type `DeactivateMenuVariables`:
const deactivateMenuVars: DeactivateMenuVariables = {
  id: ..., 
};

// Call the `deactivateMenu()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deactivateMenu(deactivateMenuVars);
// Variables can be defined inline as well.
const { data } = await deactivateMenu({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deactivateMenu(dataConnect, deactivateMenuVars);

console.log(data.menu_update);

// Or, you can use the `Promise` API.
deactivateMenu(deactivateMenuVars).then((response) => {
  const data = response.data;
  console.log(data.menu_update);
});
```

### Using `DeactivateMenu`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deactivateMenuRef, DeactivateMenuVariables } from '@reservation-system/dataconnect';

// The `DeactivateMenu` mutation requires an argument of type `DeactivateMenuVariables`:
const deactivateMenuVars: DeactivateMenuVariables = {
  id: ..., 
};

// Call the `deactivateMenuRef()` function to get a reference to the mutation.
const ref = deactivateMenuRef(deactivateMenuVars);
// Variables can be defined inline as well.
const ref = deactivateMenuRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deactivateMenuRef(dataConnect, deactivateMenuVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.menu_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.menu_update);
});
```

## ReactivateMenu
You can execute the `ReactivateMenu` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
reactivateMenu(vars: ReactivateMenuVariables): MutationPromise<ReactivateMenuData, ReactivateMenuVariables>;

interface ReactivateMenuRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ReactivateMenuVariables): MutationRef<ReactivateMenuData, ReactivateMenuVariables>;
}
export const reactivateMenuRef: ReactivateMenuRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
reactivateMenu(dc: DataConnect, vars: ReactivateMenuVariables): MutationPromise<ReactivateMenuData, ReactivateMenuVariables>;

interface ReactivateMenuRef {
  ...
  (dc: DataConnect, vars: ReactivateMenuVariables): MutationRef<ReactivateMenuData, ReactivateMenuVariables>;
}
export const reactivateMenuRef: ReactivateMenuRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the reactivateMenuRef:
```typescript
const name = reactivateMenuRef.operationName;
console.log(name);
```

### Variables
The `ReactivateMenu` mutation requires an argument of type `ReactivateMenuVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ReactivateMenuVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `ReactivateMenu` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ReactivateMenuData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ReactivateMenuData {
  menu_update?: Menu_Key | null;
}
```
### Using `ReactivateMenu`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, reactivateMenu, ReactivateMenuVariables } from '@reservation-system/dataconnect';

// The `ReactivateMenu` mutation requires an argument of type `ReactivateMenuVariables`:
const reactivateMenuVars: ReactivateMenuVariables = {
  id: ..., 
};

// Call the `reactivateMenu()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await reactivateMenu(reactivateMenuVars);
// Variables can be defined inline as well.
const { data } = await reactivateMenu({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await reactivateMenu(dataConnect, reactivateMenuVars);

console.log(data.menu_update);

// Or, you can use the `Promise` API.
reactivateMenu(reactivateMenuVars).then((response) => {
  const data = response.data;
  console.log(data.menu_update);
});
```

### Using `ReactivateMenu`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, reactivateMenuRef, ReactivateMenuVariables } from '@reservation-system/dataconnect';

// The `ReactivateMenu` mutation requires an argument of type `ReactivateMenuVariables`:
const reactivateMenuVars: ReactivateMenuVariables = {
  id: ..., 
};

// Call the `reactivateMenuRef()` function to get a reference to the mutation.
const ref = reactivateMenuRef(reactivateMenuVars);
// Variables can be defined inline as well.
const ref = reactivateMenuRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = reactivateMenuRef(dataConnect, reactivateMenuVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.menu_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.menu_update);
});
```

## RecordVisit
You can execute the `RecordVisit` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
recordVisit(vars: RecordVisitVariables): MutationPromise<RecordVisitData, RecordVisitVariables>;

interface RecordVisitRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: RecordVisitVariables): MutationRef<RecordVisitData, RecordVisitVariables>;
}
export const recordVisitRef: RecordVisitRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
recordVisit(dc: DataConnect, vars: RecordVisitVariables): MutationPromise<RecordVisitData, RecordVisitVariables>;

interface RecordVisitRef {
  ...
  (dc: DataConnect, vars: RecordVisitVariables): MutationRef<RecordVisitData, RecordVisitVariables>;
}
export const recordVisitRef: RecordVisitRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the recordVisitRef:
```typescript
const name = recordVisitRef.operationName;
console.log(name);
```

### Variables
The `RecordVisit` mutation requires an argument of type `RecordVisitVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface RecordVisitVariables {
  reservationId: UUIDString;
  visitedAt: TimestampString;
  actualPeople: number;
}
```
### Return Type
Recall that executing the `RecordVisit` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `RecordVisitData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface RecordVisitData {
  visitRecord_insert: VisitRecord_Key;
  reservation_update?: Reservation_Key | null;
}
```
### Using `RecordVisit`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, recordVisit, RecordVisitVariables } from '@reservation-system/dataconnect';

// The `RecordVisit` mutation requires an argument of type `RecordVisitVariables`:
const recordVisitVars: RecordVisitVariables = {
  reservationId: ..., 
  visitedAt: ..., 
  actualPeople: ..., 
};

// Call the `recordVisit()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await recordVisit(recordVisitVars);
// Variables can be defined inline as well.
const { data } = await recordVisit({ reservationId: ..., visitedAt: ..., actualPeople: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await recordVisit(dataConnect, recordVisitVars);

console.log(data.visitRecord_insert);
console.log(data.reservation_update);

// Or, you can use the `Promise` API.
recordVisit(recordVisitVars).then((response) => {
  const data = response.data;
  console.log(data.visitRecord_insert);
  console.log(data.reservation_update);
});
```

### Using `RecordVisit`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, recordVisitRef, RecordVisitVariables } from '@reservation-system/dataconnect';

// The `RecordVisit` mutation requires an argument of type `RecordVisitVariables`:
const recordVisitVars: RecordVisitVariables = {
  reservationId: ..., 
  visitedAt: ..., 
  actualPeople: ..., 
};

// Call the `recordVisitRef()` function to get a reference to the mutation.
const ref = recordVisitRef(recordVisitVars);
// Variables can be defined inline as well.
const ref = recordVisitRef({ reservationId: ..., visitedAt: ..., actualPeople: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = recordVisitRef(dataConnect, recordVisitVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.visitRecord_insert);
console.log(data.reservation_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.visitRecord_insert);
  console.log(data.reservation_update);
});
```

