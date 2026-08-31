# Generated React README
This README will guide you through the process of using the generated React SDK package for the connector `reservation`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `JavaScript README`, you can find it at [`dataconnect/README.md`](../README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

You can use this generated SDK by importing from the package `@reservation-system/dataconnect/react` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#react).

# Table of Contents
- [**Overview**](#generated-react-readme)
- [**TanStack Query Firebase & TanStack React Query**](#tanstack-query-firebase-tanstack-react-query)
  - [*Package Installation*](#installing-tanstack-query-firebase-and-tanstack-react-query-packages)
  - [*Configuring TanStack Query*](#configuring-tanstack-query)
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

# TanStack Query Firebase & TanStack React Query
This SDK provides [React](https://react.dev/) hooks generated specific to your application, for the operations found in the connector `reservation`. These hooks are generated using [TanStack Query Firebase](https://react-query-firebase.invertase.dev/) by our partners at Invertase, a library built on top of [TanStack React Query v5](https://tanstack.com/query/v5/docs/framework/react/overview).

***You do not need to be familiar with Tanstack Query or Tanstack Query Firebase to use this SDK.*** However, you may find it useful to learn more about them, as they will empower you as a user of this Generated React SDK.

## Installing TanStack Query Firebase and TanStack React Query Packages
In order to use the React generated SDK, you must install the `TanStack React Query` and `TanStack Query Firebase` packages.
```bash
npm i --save @tanstack/react-query @tanstack-query-firebase/react
```
```bash
npm i --save firebase@latest # Note: React has a peer dependency on ^11.3.0
```

You can also follow the installation instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#tanstack-install), or the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react) and [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/installation).

## Configuring TanStack Query
In order to use the React generated SDK in your application, you must wrap your application's component tree in a `QueryClientProvider` component from TanStack React Query. None of your generated React SDK hooks will work without this provider.

```javascript
import { QueryClientProvider } from '@tanstack/react-query';

// Create a TanStack Query client instance
const queryClient = new QueryClient()

function App() {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <MyApplication />
    </QueryClientProvider>
  )
}
```

To learn more about `QueryClientProvider`, see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/quick-start) and the [TanStack Query Firebase documentation](https://invertase.docs.page/tanstack-query-firebase/react#usage).

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `reservation`.

You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#emulator-react-angular).

```javascript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) using the hooks provided from your generated React SDK.

# Queries

The React generated SDK provides Query hook functions that call and return [`useDataConnectQuery`](https://react-query-firebase.invertase.dev/react/data-connect/querying) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and the most recent data returned by the Query, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/querying).

TanStack React Query caches the results of your Queries, so using the same Query hook function in multiple places in your application allows the entire application to automatically see updates to that Query's data.

Query hooks execute their Queries automatically when called, and periodically refresh, unless you change the `queryOptions` for the Query. To learn how to stop a Query from automatically executing, including how to make a query "lazy", see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries).

To learn more about TanStack React Query's Queries, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/queries).

## Using Query Hooks
Here's a general overview of how to use the generated Query hooks in your code:

- If the Query has no variables, the Query hook function does not require arguments.
- If the Query has any required variables, the Query hook function will require at least one argument: an object that contains all the required variables for the Query.
- If the Query has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Query's variables are optional, the Query hook function does not require any arguments.
- Query hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Query hooks functions can be called with or without passing in an `options` argument of type `useDataConnectQueryOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/query-options).
  - ***Special case:***  If the Query has all optional variables and you would like to provide an `options` argument to the Query hook function without providing any variables, you must pass `undefined` where you would normally pass the Query's variables, and then may provide the `options` argument.

Below are examples of how to use the `reservation` connector's generated Query hook functions to execute each Query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## ListReservations
You can execute the `ListReservations` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useListReservations(dc: DataConnect, options?: useDataConnectQueryOptions<ListReservationsData>): UseDataConnectQueryResult<ListReservationsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListReservations(options?: useDataConnectQueryOptions<ListReservationsData>): UseDataConnectQueryResult<ListReservationsData, undefined>;
```

### Variables
The `ListReservations` Query has no variables.
### Return Type
Recall that calling the `ListReservations` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListReservations` Query is of type `ListReservationsData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListReservations`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';
import { useListReservations } from '@reservation-system/dataconnect/react'

export default function ListReservationsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListReservations();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListReservations(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListReservations(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListReservations(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.reservations);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetReservation
You can execute the `GetReservation` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useGetReservation(dc: DataConnect, vars: GetReservationVariables, options?: useDataConnectQueryOptions<GetReservationData>): UseDataConnectQueryResult<GetReservationData, GetReservationVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetReservation(vars: GetReservationVariables, options?: useDataConnectQueryOptions<GetReservationData>): UseDataConnectQueryResult<GetReservationData, GetReservationVariables>;
```

### Variables
The `GetReservation` Query requires an argument of type `GetReservationVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetReservationVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `GetReservation` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetReservation` Query is of type `GetReservationData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetReservation`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetReservationVariables } from '@reservation-system/dataconnect';
import { useGetReservation } from '@reservation-system/dataconnect/react'

export default function GetReservationComponent() {
  // The `useGetReservation` Query hook requires an argument of type `GetReservationVariables`:
  const getReservationVars: GetReservationVariables = {
    id: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetReservation(getReservationVars);
  // Variables can be defined inline as well.
  const query = useGetReservation({ id: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetReservation(dataConnect, getReservationVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetReservation(getReservationVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetReservation(dataConnect, getReservationVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.reservation);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetReservationByCode
You can execute the `GetReservationByCode` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useGetReservationByCode(dc: DataConnect, vars: GetReservationByCodeVariables, options?: useDataConnectQueryOptions<GetReservationByCodeData>): UseDataConnectQueryResult<GetReservationByCodeData, GetReservationByCodeVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetReservationByCode(vars: GetReservationByCodeVariables, options?: useDataConnectQueryOptions<GetReservationByCodeData>): UseDataConnectQueryResult<GetReservationByCodeData, GetReservationByCodeVariables>;
```

### Variables
The `GetReservationByCode` Query requires an argument of type `GetReservationByCodeVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetReservationByCodeVariables {
  reservationCode: string;
}
```
### Return Type
Recall that calling the `GetReservationByCode` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetReservationByCode` Query is of type `GetReservationByCodeData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetReservationByCode`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetReservationByCodeVariables } from '@reservation-system/dataconnect';
import { useGetReservationByCode } from '@reservation-system/dataconnect/react'

export default function GetReservationByCodeComponent() {
  // The `useGetReservationByCode` Query hook requires an argument of type `GetReservationByCodeVariables`:
  const getReservationByCodeVars: GetReservationByCodeVariables = {
    reservationCode: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetReservationByCode(getReservationByCodeVars);
  // Variables can be defined inline as well.
  const query = useGetReservationByCode({ reservationCode: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetReservationByCode(dataConnect, getReservationByCodeVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetReservationByCode(getReservationByCodeVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetReservationByCode(dataConnect, getReservationByCodeVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.reservations);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListReservationChangeRequests
You can execute the `ListReservationChangeRequests` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useListReservationChangeRequests(dc: DataConnect, options?: useDataConnectQueryOptions<ListReservationChangeRequestsData>): UseDataConnectQueryResult<ListReservationChangeRequestsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListReservationChangeRequests(options?: useDataConnectQueryOptions<ListReservationChangeRequestsData>): UseDataConnectQueryResult<ListReservationChangeRequestsData, undefined>;
```

### Variables
The `ListReservationChangeRequests` Query has no variables.
### Return Type
Recall that calling the `ListReservationChangeRequests` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListReservationChangeRequests` Query is of type `ListReservationChangeRequestsData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListReservationChangeRequests`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';
import { useListReservationChangeRequests } from '@reservation-system/dataconnect/react'

export default function ListReservationChangeRequestsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListReservationChangeRequests();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListReservationChangeRequests(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListReservationChangeRequests(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListReservationChangeRequests(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.reservationChangeRequests);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListAccounts
You can execute the `ListAccounts` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useListAccounts(dc: DataConnect, options?: useDataConnectQueryOptions<ListAccountsData>): UseDataConnectQueryResult<ListAccountsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListAccounts(options?: useDataConnectQueryOptions<ListAccountsData>): UseDataConnectQueryResult<ListAccountsData, undefined>;
```

### Variables
The `ListAccounts` Query has no variables.
### Return Type
Recall that calling the `ListAccounts` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListAccounts` Query is of type `ListAccountsData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListAccounts`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';
import { useListAccounts } from '@reservation-system/dataconnect/react'

export default function ListAccountsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListAccounts();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListAccounts(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListAccounts(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListAccounts(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.accounts);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListInactiveAccounts
You can execute the `ListInactiveAccounts` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useListInactiveAccounts(dc: DataConnect, options?: useDataConnectQueryOptions<ListInactiveAccountsData>): UseDataConnectQueryResult<ListInactiveAccountsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListInactiveAccounts(options?: useDataConnectQueryOptions<ListInactiveAccountsData>): UseDataConnectQueryResult<ListInactiveAccountsData, undefined>;
```

### Variables
The `ListInactiveAccounts` Query has no variables.
### Return Type
Recall that calling the `ListInactiveAccounts` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListInactiveAccounts` Query is of type `ListInactiveAccountsData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListInactiveAccounts`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';
import { useListInactiveAccounts } from '@reservation-system/dataconnect/react'

export default function ListInactiveAccountsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListInactiveAccounts();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListInactiveAccounts(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListInactiveAccounts(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListInactiveAccounts(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.accounts);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetAccountById
You can execute the `GetAccountById` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useGetAccountById(dc: DataConnect, vars: GetAccountByIdVariables, options?: useDataConnectQueryOptions<GetAccountByIdData>): UseDataConnectQueryResult<GetAccountByIdData, GetAccountByIdVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetAccountById(vars: GetAccountByIdVariables, options?: useDataConnectQueryOptions<GetAccountByIdData>): UseDataConnectQueryResult<GetAccountByIdData, GetAccountByIdVariables>;
```

### Variables
The `GetAccountById` Query requires an argument of type `GetAccountByIdVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAccountByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `GetAccountById` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetAccountById` Query is of type `GetAccountByIdData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetAccountById`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetAccountByIdVariables } from '@reservation-system/dataconnect';
import { useGetAccountById } from '@reservation-system/dataconnect/react'

export default function GetAccountByIdComponent() {
  // The `useGetAccountById` Query hook requires an argument of type `GetAccountByIdVariables`:
  const getAccountByIdVars: GetAccountByIdVariables = {
    id: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetAccountById(getAccountByIdVars);
  // Variables can be defined inline as well.
  const query = useGetAccountById({ id: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetAccountById(dataConnect, getAccountByIdVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetAccountById(getAccountByIdVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetAccountById(dataConnect, getAccountByIdVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.account);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetAccountByFirebaseUid
You can execute the `GetAccountByFirebaseUid` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useGetAccountByFirebaseUid(dc: DataConnect, vars: GetAccountByFirebaseUidVariables, options?: useDataConnectQueryOptions<GetAccountByFirebaseUidData>): UseDataConnectQueryResult<GetAccountByFirebaseUidData, GetAccountByFirebaseUidVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetAccountByFirebaseUid(vars: GetAccountByFirebaseUidVariables, options?: useDataConnectQueryOptions<GetAccountByFirebaseUidData>): UseDataConnectQueryResult<GetAccountByFirebaseUidData, GetAccountByFirebaseUidVariables>;
```

### Variables
The `GetAccountByFirebaseUid` Query requires an argument of type `GetAccountByFirebaseUidVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAccountByFirebaseUidVariables {
  firebaseUid: string;
}
```
### Return Type
Recall that calling the `GetAccountByFirebaseUid` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetAccountByFirebaseUid` Query is of type `GetAccountByFirebaseUidData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetAccountByFirebaseUid`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetAccountByFirebaseUidVariables } from '@reservation-system/dataconnect';
import { useGetAccountByFirebaseUid } from '@reservation-system/dataconnect/react'

export default function GetAccountByFirebaseUidComponent() {
  // The `useGetAccountByFirebaseUid` Query hook requires an argument of type `GetAccountByFirebaseUidVariables`:
  const getAccountByFirebaseUidVars: GetAccountByFirebaseUidVariables = {
    firebaseUid: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetAccountByFirebaseUid(getAccountByFirebaseUidVars);
  // Variables can be defined inline as well.
  const query = useGetAccountByFirebaseUid({ firebaseUid: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetAccountByFirebaseUid(dataConnect, getAccountByFirebaseUidVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetAccountByFirebaseUid(getAccountByFirebaseUidVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetAccountByFirebaseUid(dataConnect, getAccountByFirebaseUidVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.accounts);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListStores
You can execute the `ListStores` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useListStores(dc: DataConnect, options?: useDataConnectQueryOptions<ListStoresData>): UseDataConnectQueryResult<ListStoresData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListStores(options?: useDataConnectQueryOptions<ListStoresData>): UseDataConnectQueryResult<ListStoresData, undefined>;
```

### Variables
The `ListStores` Query has no variables.
### Return Type
Recall that calling the `ListStores` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListStores` Query is of type `ListStoresData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListStoresData {
  stores: ({
    id: UUIDString;
    name: string;
    displayOrder: number;
    active: boolean;
  } & Store_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListStores`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';
import { useListStores } from '@reservation-system/dataconnect/react'

export default function ListStoresComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListStores();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListStores(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListStores(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListStores(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.stores);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListInactiveStores
You can execute the `ListInactiveStores` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useListInactiveStores(dc: DataConnect, options?: useDataConnectQueryOptions<ListInactiveStoresData>): UseDataConnectQueryResult<ListInactiveStoresData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListInactiveStores(options?: useDataConnectQueryOptions<ListInactiveStoresData>): UseDataConnectQueryResult<ListInactiveStoresData, undefined>;
```

### Variables
The `ListInactiveStores` Query has no variables.
### Return Type
Recall that calling the `ListInactiveStores` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListInactiveStores` Query is of type `ListInactiveStoresData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListInactiveStoresData {
  stores: ({
    id: UUIDString;
    name: string;
    displayOrder: number;
    active: boolean;
  } & Store_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListInactiveStores`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';
import { useListInactiveStores } from '@reservation-system/dataconnect/react'

export default function ListInactiveStoresComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListInactiveStores();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListInactiveStores(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListInactiveStores(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListInactiveStores(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.stores);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetStoreByName
You can execute the `GetStoreByName` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useGetStoreByName(dc: DataConnect, vars: GetStoreByNameVariables, options?: useDataConnectQueryOptions<GetStoreByNameData>): UseDataConnectQueryResult<GetStoreByNameData, GetStoreByNameVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetStoreByName(vars: GetStoreByNameVariables, options?: useDataConnectQueryOptions<GetStoreByNameData>): UseDataConnectQueryResult<GetStoreByNameData, GetStoreByNameVariables>;
```

### Variables
The `GetStoreByName` Query requires an argument of type `GetStoreByNameVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetStoreByNameVariables {
  name: string;
}
```
### Return Type
Recall that calling the `GetStoreByName` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetStoreByName` Query is of type `GetStoreByNameData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetStoreByNameData {
  stores: ({
    id: UUIDString;
    name: string;
    displayOrder: number;
    active: boolean;
  } & Store_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetStoreByName`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetStoreByNameVariables } from '@reservation-system/dataconnect';
import { useGetStoreByName } from '@reservation-system/dataconnect/react'

export default function GetStoreByNameComponent() {
  // The `useGetStoreByName` Query hook requires an argument of type `GetStoreByNameVariables`:
  const getStoreByNameVars: GetStoreByNameVariables = {
    name: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetStoreByName(getStoreByNameVars);
  // Variables can be defined inline as well.
  const query = useGetStoreByName({ name: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetStoreByName(dataConnect, getStoreByNameVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetStoreByName(getStoreByNameVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetStoreByName(dataConnect, getStoreByNameVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.stores);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetStoreById
You can execute the `GetStoreById` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useGetStoreById(dc: DataConnect, vars: GetStoreByIdVariables, options?: useDataConnectQueryOptions<GetStoreByIdData>): UseDataConnectQueryResult<GetStoreByIdData, GetStoreByIdVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetStoreById(vars: GetStoreByIdVariables, options?: useDataConnectQueryOptions<GetStoreByIdData>): UseDataConnectQueryResult<GetStoreByIdData, GetStoreByIdVariables>;
```

### Variables
The `GetStoreById` Query requires an argument of type `GetStoreByIdVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetStoreByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `GetStoreById` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetStoreById` Query is of type `GetStoreByIdData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetStoreByIdData {
  store?: {
    id: UUIDString;
    name: string;
    displayOrder: number;
    active: boolean;
  } & Store_Key;
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetStoreById`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetStoreByIdVariables } from '@reservation-system/dataconnect';
import { useGetStoreById } from '@reservation-system/dataconnect/react'

export default function GetStoreByIdComponent() {
  // The `useGetStoreById` Query hook requires an argument of type `GetStoreByIdVariables`:
  const getStoreByIdVars: GetStoreByIdVariables = {
    id: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetStoreById(getStoreByIdVars);
  // Variables can be defined inline as well.
  const query = useGetStoreById({ id: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetStoreById(dataConnect, getStoreByIdVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetStoreById(getStoreByIdVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetStoreById(dataConnect, getStoreByIdVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.store);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListMenus
You can execute the `ListMenus` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useListMenus(dc: DataConnect, options?: useDataConnectQueryOptions<ListMenusData>): UseDataConnectQueryResult<ListMenusData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListMenus(options?: useDataConnectQueryOptions<ListMenusData>): UseDataConnectQueryResult<ListMenusData, undefined>;
```

### Variables
The `ListMenus` Query has no variables.
### Return Type
Recall that calling the `ListMenus` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListMenus` Query is of type `ListMenusData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListMenus`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';
import { useListMenus } from '@reservation-system/dataconnect/react'

export default function ListMenusComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListMenus();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListMenus(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListMenus(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListMenus(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.menus);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListInactiveMenus
You can execute the `ListInactiveMenus` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useListInactiveMenus(dc: DataConnect, options?: useDataConnectQueryOptions<ListInactiveMenusData>): UseDataConnectQueryResult<ListInactiveMenusData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListInactiveMenus(options?: useDataConnectQueryOptions<ListInactiveMenusData>): UseDataConnectQueryResult<ListInactiveMenusData, undefined>;
```

### Variables
The `ListInactiveMenus` Query has no variables.
### Return Type
Recall that calling the `ListInactiveMenus` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListInactiveMenus` Query is of type `ListInactiveMenusData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListInactiveMenus`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';
import { useListInactiveMenus } from '@reservation-system/dataconnect/react'

export default function ListInactiveMenusComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListInactiveMenus();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListInactiveMenus(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListInactiveMenus(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListInactiveMenus(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.menus);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetMenuByName
You can execute the `GetMenuByName` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useGetMenuByName(dc: DataConnect, vars: GetMenuByNameVariables, options?: useDataConnectQueryOptions<GetMenuByNameData>): UseDataConnectQueryResult<GetMenuByNameData, GetMenuByNameVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetMenuByName(vars: GetMenuByNameVariables, options?: useDataConnectQueryOptions<GetMenuByNameData>): UseDataConnectQueryResult<GetMenuByNameData, GetMenuByNameVariables>;
```

### Variables
The `GetMenuByName` Query requires an argument of type `GetMenuByNameVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetMenuByNameVariables {
  name: string;
}
```
### Return Type
Recall that calling the `GetMenuByName` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetMenuByName` Query is of type `GetMenuByNameData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetMenuByName`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetMenuByNameVariables } from '@reservation-system/dataconnect';
import { useGetMenuByName } from '@reservation-system/dataconnect/react'

export default function GetMenuByNameComponent() {
  // The `useGetMenuByName` Query hook requires an argument of type `GetMenuByNameVariables`:
  const getMenuByNameVars: GetMenuByNameVariables = {
    name: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetMenuByName(getMenuByNameVars);
  // Variables can be defined inline as well.
  const query = useGetMenuByName({ name: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetMenuByName(dataConnect, getMenuByNameVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetMenuByName(getMenuByNameVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetMenuByName(dataConnect, getMenuByNameVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.menus);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListBillingRecords
You can execute the `ListBillingRecords` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useListBillingRecords(dc: DataConnect, options?: useDataConnectQueryOptions<ListBillingRecordsData>): UseDataConnectQueryResult<ListBillingRecordsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListBillingRecords(options?: useDataConnectQueryOptions<ListBillingRecordsData>): UseDataConnectQueryResult<ListBillingRecordsData, undefined>;
```

### Variables
The `ListBillingRecords` Query has no variables.
### Return Type
Recall that calling the `ListBillingRecords` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListBillingRecords` Query is of type `ListBillingRecordsData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListBillingRecords`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';
import { useListBillingRecords } from '@reservation-system/dataconnect/react'

export default function ListBillingRecordsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListBillingRecords();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListBillingRecords(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListBillingRecords(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListBillingRecords(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.billings);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

# Mutations

The React generated SDK provides Mutations hook functions that call and return [`useDataConnectMutation`](https://react-query-firebase.invertase.dev/react/data-connect/mutations) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, and the most recent data returned by the Mutation, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/mutations).

Mutation hooks do not execute their Mutations automatically when called. Rather, after calling the Mutation hook function and getting a `UseMutationResult` object, you must call the `UseMutationResult.mutate()` function to execute the Mutation.

To learn more about TanStack React Query's Mutations, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations).

## Using Mutation Hooks
Here's a general overview of how to use the generated Mutation hooks in your code:

- Mutation hook functions are not called with the arguments to the Mutation. Instead, arguments are passed to `UseMutationResult.mutate()`.
- If the Mutation has no variables, the `mutate()` function does not require arguments.
- If the Mutation has any required variables, the `mutate()` function will require at least one argument: an object that contains all the required variables for the Mutation.
- If the Mutation has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Mutation's variables are optional, the Mutation hook function does not require any arguments.
- Mutation hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Mutation hooks also accept an `options` argument of type `useDataConnectMutationOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-side-effects).
  - `UseMutationResult.mutate()` also accepts an `options` argument of type `useDataConnectMutationOptions`.
  - ***Special case:*** If the Mutation has no arguments (or all optional arguments and you wish to provide none), and you want to pass `options` to `UseMutationResult.mutate()`, you must pass `undefined` where you would normally pass the Mutation's arguments, and then may provide the options argument.

Below are examples of how to use the `reservation` connector's generated Mutation hook functions to execute each Mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## CreateAccount
You can execute the `CreateAccount` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useCreateAccount(options?: useDataConnectMutationOptions<CreateAccountData, FirebaseError, CreateAccountVariables>): UseDataConnectMutationResult<CreateAccountData, CreateAccountVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateAccount(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAccountData, FirebaseError, CreateAccountVariables>): UseDataConnectMutationResult<CreateAccountData, CreateAccountVariables>;
```

### Variables
The `CreateAccount` Mutation requires an argument of type `CreateAccountVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateAccount` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateAccount` Mutation is of type `CreateAccountData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateAccountData {
  account_insert: Account_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateAccount`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateAccountVariables } from '@reservation-system/dataconnect';
import { useCreateAccount } from '@reservation-system/dataconnect/react'

export default function CreateAccountComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateAccount();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateAccount(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAccount(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAccount(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateAccount` Mutation requires an argument of type `CreateAccountVariables`:
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
  mutation.mutate(createAccountVars);
  // Variables can be defined inline as well.
  mutation.mutate({ firebaseUid: ..., name: ..., phone: ..., email: ..., address: ..., accountType: ..., companyBranchName: ..., contactPersonName: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createAccountVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.account_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpdateAccount
You can execute the `UpdateAccount` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useUpdateAccount(options?: useDataConnectMutationOptions<UpdateAccountData, FirebaseError, UpdateAccountVariables>): UseDataConnectMutationResult<UpdateAccountData, UpdateAccountVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpdateAccount(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateAccountData, FirebaseError, UpdateAccountVariables>): UseDataConnectMutationResult<UpdateAccountData, UpdateAccountVariables>;
```

### Variables
The `UpdateAccount` Mutation requires an argument of type `UpdateAccountVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `UpdateAccount` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpdateAccount` Mutation is of type `UpdateAccountData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpdateAccountData {
  account_update?: Account_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpdateAccount`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpdateAccountVariables } from '@reservation-system/dataconnect';
import { useUpdateAccount } from '@reservation-system/dataconnect/react'

export default function UpdateAccountComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpdateAccount();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpdateAccount(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateAccount(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateAccount(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpdateAccount` Mutation requires an argument of type `UpdateAccountVariables`:
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
  mutation.mutate(updateAccountVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., name: ..., phone: ..., email: ..., address: ..., accountType: ..., companyBranchName: ..., contactPersonName: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(updateAccountVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.account_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## DeactivateAccount
You can execute the `DeactivateAccount` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useDeactivateAccount(options?: useDataConnectMutationOptions<DeactivateAccountData, FirebaseError, DeactivateAccountVariables>): UseDataConnectMutationResult<DeactivateAccountData, DeactivateAccountVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useDeactivateAccount(dc: DataConnect, options?: useDataConnectMutationOptions<DeactivateAccountData, FirebaseError, DeactivateAccountVariables>): UseDataConnectMutationResult<DeactivateAccountData, DeactivateAccountVariables>;
```

### Variables
The `DeactivateAccount` Mutation requires an argument of type `DeactivateAccountVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface DeactivateAccountVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `DeactivateAccount` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `DeactivateAccount` Mutation is of type `DeactivateAccountData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface DeactivateAccountData {
  account_update?: Account_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `DeactivateAccount`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, DeactivateAccountVariables } from '@reservation-system/dataconnect';
import { useDeactivateAccount } from '@reservation-system/dataconnect/react'

export default function DeactivateAccountComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useDeactivateAccount();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useDeactivateAccount(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeactivateAccount(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeactivateAccount(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useDeactivateAccount` Mutation requires an argument of type `DeactivateAccountVariables`:
  const deactivateAccountVars: DeactivateAccountVariables = {
    id: ..., 
  };
  mutation.mutate(deactivateAccountVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(deactivateAccountVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.account_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ReactivateAccount
You can execute the `ReactivateAccount` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useReactivateAccount(options?: useDataConnectMutationOptions<ReactivateAccountData, FirebaseError, ReactivateAccountVariables>): UseDataConnectMutationResult<ReactivateAccountData, ReactivateAccountVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useReactivateAccount(dc: DataConnect, options?: useDataConnectMutationOptions<ReactivateAccountData, FirebaseError, ReactivateAccountVariables>): UseDataConnectMutationResult<ReactivateAccountData, ReactivateAccountVariables>;
```

### Variables
The `ReactivateAccount` Mutation requires an argument of type `ReactivateAccountVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ReactivateAccountVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `ReactivateAccount` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `ReactivateAccount` Mutation is of type `ReactivateAccountData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ReactivateAccountData {
  account_update?: Account_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `ReactivateAccount`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ReactivateAccountVariables } from '@reservation-system/dataconnect';
import { useReactivateAccount } from '@reservation-system/dataconnect/react'

export default function ReactivateAccountComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useReactivateAccount();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useReactivateAccount(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useReactivateAccount(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useReactivateAccount(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useReactivateAccount` Mutation requires an argument of type `ReactivateAccountVariables`:
  const reactivateAccountVars: ReactivateAccountVariables = {
    id: ..., 
  };
  mutation.mutate(reactivateAccountVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(reactivateAccountVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.account_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateReservation
You can execute the `CreateReservation` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useCreateReservation(options?: useDataConnectMutationOptions<CreateReservationData, FirebaseError, CreateReservationVariables>): UseDataConnectMutationResult<CreateReservationData, CreateReservationVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateReservation(dc: DataConnect, options?: useDataConnectMutationOptions<CreateReservationData, FirebaseError, CreateReservationVariables>): UseDataConnectMutationResult<CreateReservationData, CreateReservationVariables>;
```

### Variables
The `CreateReservation` Mutation requires an argument of type `CreateReservationVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateReservation` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateReservation` Mutation is of type `CreateReservationData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateReservationData {
  reservation_insert: Reservation_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateReservation`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateReservationVariables } from '@reservation-system/dataconnect';
import { useCreateReservation } from '@reservation-system/dataconnect/react'

export default function CreateReservationComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateReservation();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateReservation(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateReservation(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateReservation(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateReservation` Mutation requires an argument of type `CreateReservationVariables`:
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
  mutation.mutate(createReservationVars);
  // Variables can be defined inline as well.
  mutation.mutate({ reservationCode: ..., accountId: ..., reserverName: ..., reserverEmail: ..., reserverPhone: ..., reserverAddress: ..., reserverAccountType: ..., reserverCompanyBranchName: ..., reserverContactPersonName: ..., usageDate: ..., usageTime: ..., usageEndTime: ..., expectedPeople: ..., status: ..., requestType: ..., bookingType: ..., bookingContactName: ..., dayContactName: ..., dayContactPhone: ..., groupName: ..., groupNameKana: ..., groupType: ..., groupTypeOther: ..., tcCount: ..., dgCount: ..., paymentCondition: ..., remarks: ..., policyAgreementKind: ..., policyAgreementAcceptedAt: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createReservationVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.reservation_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpdateReservation
You can execute the `UpdateReservation` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useUpdateReservation(options?: useDataConnectMutationOptions<UpdateReservationData, FirebaseError, UpdateReservationVariables>): UseDataConnectMutationResult<UpdateReservationData, UpdateReservationVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpdateReservation(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateReservationData, FirebaseError, UpdateReservationVariables>): UseDataConnectMutationResult<UpdateReservationData, UpdateReservationVariables>;
```

### Variables
The `UpdateReservation` Mutation requires an argument of type `UpdateReservationVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `UpdateReservation` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpdateReservation` Mutation is of type `UpdateReservationData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpdateReservationData {
  reservation_update?: Reservation_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpdateReservation`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpdateReservationVariables } from '@reservation-system/dataconnect';
import { useUpdateReservation } from '@reservation-system/dataconnect/react'

export default function UpdateReservationComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpdateReservation();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpdateReservation(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateReservation(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateReservation(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpdateReservation` Mutation requires an argument of type `UpdateReservationVariables`:
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
  mutation.mutate(updateReservationVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., reserverName: ..., reserverEmail: ..., reserverPhone: ..., reserverAddress: ..., usageDate: ..., usageTime: ..., usageEndTime: ..., expectedPeople: ..., bookingType: ..., bookingContactName: ..., dayContactName: ..., dayContactPhone: ..., groupName: ..., groupNameKana: ..., groupType: ..., groupTypeOther: ..., tcCount: ..., dgCount: ..., paymentCondition: ..., remarks: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(updateReservationVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.reservation_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## AddReservationDetail
You can execute the `AddReservationDetail` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useAddReservationDetail(options?: useDataConnectMutationOptions<AddReservationDetailData, FirebaseError, AddReservationDetailVariables>): UseDataConnectMutationResult<AddReservationDetailData, AddReservationDetailVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useAddReservationDetail(dc: DataConnect, options?: useDataConnectMutationOptions<AddReservationDetailData, FirebaseError, AddReservationDetailVariables>): UseDataConnectMutationResult<AddReservationDetailData, AddReservationDetailVariables>;
```

### Variables
The `AddReservationDetail` Mutation requires an argument of type `AddReservationDetailVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface AddReservationDetailVariables {
  reservationId: UUIDString;
  menuId: UUIDString;
  quantity: number;
  unitPrice: number;
}
```
### Return Type
Recall that calling the `AddReservationDetail` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `AddReservationDetail` Mutation is of type `AddReservationDetailData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface AddReservationDetailData {
  reservationDetail_insert: ReservationDetail_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `AddReservationDetail`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, AddReservationDetailVariables } from '@reservation-system/dataconnect';
import { useAddReservationDetail } from '@reservation-system/dataconnect/react'

export default function AddReservationDetailComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useAddReservationDetail();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useAddReservationDetail(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useAddReservationDetail(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useAddReservationDetail(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useAddReservationDetail` Mutation requires an argument of type `AddReservationDetailVariables`:
  const addReservationDetailVars: AddReservationDetailVariables = {
    reservationId: ..., 
    menuId: ..., 
    quantity: ..., 
    unitPrice: ..., 
  };
  mutation.mutate(addReservationDetailVars);
  // Variables can be defined inline as well.
  mutation.mutate({ reservationId: ..., menuId: ..., quantity: ..., unitPrice: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(addReservationDetailVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.reservationDetail_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## DeleteReservationDetail
You can execute the `DeleteReservationDetail` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useDeleteReservationDetail(options?: useDataConnectMutationOptions<DeleteReservationDetailData, FirebaseError, DeleteReservationDetailVariables>): UseDataConnectMutationResult<DeleteReservationDetailData, DeleteReservationDetailVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useDeleteReservationDetail(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteReservationDetailData, FirebaseError, DeleteReservationDetailVariables>): UseDataConnectMutationResult<DeleteReservationDetailData, DeleteReservationDetailVariables>;
```

### Variables
The `DeleteReservationDetail` Mutation requires an argument of type `DeleteReservationDetailVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface DeleteReservationDetailVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `DeleteReservationDetail` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `DeleteReservationDetail` Mutation is of type `DeleteReservationDetailData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface DeleteReservationDetailData {
  reservationDetail_delete?: ReservationDetail_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `DeleteReservationDetail`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, DeleteReservationDetailVariables } from '@reservation-system/dataconnect';
import { useDeleteReservationDetail } from '@reservation-system/dataconnect/react'

export default function DeleteReservationDetailComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useDeleteReservationDetail();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useDeleteReservationDetail(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeleteReservationDetail(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeleteReservationDetail(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useDeleteReservationDetail` Mutation requires an argument of type `DeleteReservationDetailVariables`:
  const deleteReservationDetailVars: DeleteReservationDetailVariables = {
    id: ..., 
  };
  mutation.mutate(deleteReservationDetailVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(deleteReservationDetailVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.reservationDetail_delete);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpdateReservationStatus
You can execute the `UpdateReservationStatus` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useUpdateReservationStatus(options?: useDataConnectMutationOptions<UpdateReservationStatusData, FirebaseError, UpdateReservationStatusVariables>): UseDataConnectMutationResult<UpdateReservationStatusData, UpdateReservationStatusVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpdateReservationStatus(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateReservationStatusData, FirebaseError, UpdateReservationStatusVariables>): UseDataConnectMutationResult<UpdateReservationStatusData, UpdateReservationStatusVariables>;
```

### Variables
The `UpdateReservationStatus` Mutation requires an argument of type `UpdateReservationStatusVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface UpdateReservationStatusVariables {
  id: UUIDString;
  status: ReservationStatus;
  requestType?: string | null;
}
```
### Return Type
Recall that calling the `UpdateReservationStatus` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpdateReservationStatus` Mutation is of type `UpdateReservationStatusData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpdateReservationStatusData {
  reservation_update?: Reservation_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpdateReservationStatus`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpdateReservationStatusVariables } from '@reservation-system/dataconnect';
import { useUpdateReservationStatus } from '@reservation-system/dataconnect/react'

export default function UpdateReservationStatusComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpdateReservationStatus();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpdateReservationStatus(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateReservationStatus(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateReservationStatus(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpdateReservationStatus` Mutation requires an argument of type `UpdateReservationStatusVariables`:
  const updateReservationStatusVars: UpdateReservationStatusVariables = {
    id: ..., 
    status: ..., 
    requestType: ..., // optional
  };
  mutation.mutate(updateReservationStatusVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., status: ..., requestType: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(updateReservationStatusVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.reservation_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpdateConfirmationContact
You can execute the `UpdateConfirmationContact` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useUpdateConfirmationContact(options?: useDataConnectMutationOptions<UpdateConfirmationContactData, FirebaseError, UpdateConfirmationContactVariables>): UseDataConnectMutationResult<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpdateConfirmationContact(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateConfirmationContactData, FirebaseError, UpdateConfirmationContactVariables>): UseDataConnectMutationResult<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;
```

### Variables
The `UpdateConfirmationContact` Mutation requires an argument of type `UpdateConfirmationContactVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface UpdateConfirmationContactVariables {
  id: UUIDString;
  confirmationContactedAt?: TimestampString | null;
}
```
### Return Type
Recall that calling the `UpdateConfirmationContact` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpdateConfirmationContact` Mutation is of type `UpdateConfirmationContactData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpdateConfirmationContactData {
  reservation_update?: Reservation_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpdateConfirmationContact`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpdateConfirmationContactVariables } from '@reservation-system/dataconnect';
import { useUpdateConfirmationContact } from '@reservation-system/dataconnect/react'

export default function UpdateConfirmationContactComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpdateConfirmationContact();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpdateConfirmationContact(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateConfirmationContact(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateConfirmationContact(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpdateConfirmationContact` Mutation requires an argument of type `UpdateConfirmationContactVariables`:
  const updateConfirmationContactVars: UpdateConfirmationContactVariables = {
    id: ..., 
    confirmationContactedAt: ..., // optional
  };
  mutation.mutate(updateConfirmationContactVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., confirmationContactedAt: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(updateConfirmationContactVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.reservation_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ClearConfirmationContact
You can execute the `ClearConfirmationContact` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useClearConfirmationContact(options?: useDataConnectMutationOptions<ClearConfirmationContactData, FirebaseError, ClearConfirmationContactVariables>): UseDataConnectMutationResult<ClearConfirmationContactData, ClearConfirmationContactVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useClearConfirmationContact(dc: DataConnect, options?: useDataConnectMutationOptions<ClearConfirmationContactData, FirebaseError, ClearConfirmationContactVariables>): UseDataConnectMutationResult<ClearConfirmationContactData, ClearConfirmationContactVariables>;
```

### Variables
The `ClearConfirmationContact` Mutation requires an argument of type `ClearConfirmationContactVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ClearConfirmationContactVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `ClearConfirmationContact` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `ClearConfirmationContact` Mutation is of type `ClearConfirmationContactData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ClearConfirmationContactData {
  reservation_update?: Reservation_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `ClearConfirmationContact`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ClearConfirmationContactVariables } from '@reservation-system/dataconnect';
import { useClearConfirmationContact } from '@reservation-system/dataconnect/react'

export default function ClearConfirmationContactComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useClearConfirmationContact();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useClearConfirmationContact(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useClearConfirmationContact(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useClearConfirmationContact(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useClearConfirmationContact` Mutation requires an argument of type `ClearConfirmationContactVariables`:
  const clearConfirmationContactVars: ClearConfirmationContactVariables = {
    id: ..., 
  };
  mutation.mutate(clearConfirmationContactVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(clearConfirmationContactVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.reservation_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## AssignStore
You can execute the `AssignStore` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useAssignStore(options?: useDataConnectMutationOptions<AssignStoreData, FirebaseError, AssignStoreVariables>): UseDataConnectMutationResult<AssignStoreData, AssignStoreVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useAssignStore(dc: DataConnect, options?: useDataConnectMutationOptions<AssignStoreData, FirebaseError, AssignStoreVariables>): UseDataConnectMutationResult<AssignStoreData, AssignStoreVariables>;
```

### Variables
The `AssignStore` Mutation requires an argument of type `AssignStoreVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface AssignStoreVariables {
  reservationId: UUIDString;
  storeId: UUIDString;
  people: number;
}
```
### Return Type
Recall that calling the `AssignStore` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `AssignStore` Mutation is of type `AssignStoreData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface AssignStoreData {
  storeAssignment_insert: StoreAssignment_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `AssignStore`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, AssignStoreVariables } from '@reservation-system/dataconnect';
import { useAssignStore } from '@reservation-system/dataconnect/react'

export default function AssignStoreComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useAssignStore();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useAssignStore(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useAssignStore(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useAssignStore(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useAssignStore` Mutation requires an argument of type `AssignStoreVariables`:
  const assignStoreVars: AssignStoreVariables = {
    reservationId: ..., 
    storeId: ..., 
    people: ..., 
  };
  mutation.mutate(assignStoreVars);
  // Variables can be defined inline as well.
  mutation.mutate({ reservationId: ..., storeId: ..., people: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(assignStoreVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.storeAssignment_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## DeleteStoreAssignment
You can execute the `DeleteStoreAssignment` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useDeleteStoreAssignment(options?: useDataConnectMutationOptions<DeleteStoreAssignmentData, FirebaseError, DeleteStoreAssignmentVariables>): UseDataConnectMutationResult<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useDeleteStoreAssignment(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteStoreAssignmentData, FirebaseError, DeleteStoreAssignmentVariables>): UseDataConnectMutationResult<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;
```

### Variables
The `DeleteStoreAssignment` Mutation requires an argument of type `DeleteStoreAssignmentVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface DeleteStoreAssignmentVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `DeleteStoreAssignment` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `DeleteStoreAssignment` Mutation is of type `DeleteStoreAssignmentData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface DeleteStoreAssignmentData {
  storeAssignment_delete?: StoreAssignment_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `DeleteStoreAssignment`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, DeleteStoreAssignmentVariables } from '@reservation-system/dataconnect';
import { useDeleteStoreAssignment } from '@reservation-system/dataconnect/react'

export default function DeleteStoreAssignmentComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useDeleteStoreAssignment();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useDeleteStoreAssignment(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeleteStoreAssignment(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeleteStoreAssignment(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useDeleteStoreAssignment` Mutation requires an argument of type `DeleteStoreAssignmentVariables`:
  const deleteStoreAssignmentVars: DeleteStoreAssignmentVariables = {
    id: ..., 
  };
  mutation.mutate(deleteStoreAssignmentVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(deleteStoreAssignmentVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.storeAssignment_delete);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateReservationChangeRequest
You can execute the `CreateReservationChangeRequest` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useCreateReservationChangeRequest(options?: useDataConnectMutationOptions<CreateReservationChangeRequestData, FirebaseError, CreateReservationChangeRequestVariables>): UseDataConnectMutationResult<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateReservationChangeRequest(dc: DataConnect, options?: useDataConnectMutationOptions<CreateReservationChangeRequestData, FirebaseError, CreateReservationChangeRequestVariables>): UseDataConnectMutationResult<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;
```

### Variables
The `CreateReservationChangeRequest` Mutation requires an argument of type `CreateReservationChangeRequestVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateReservationChangeRequest` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateReservationChangeRequest` Mutation is of type `CreateReservationChangeRequestData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateReservationChangeRequestData {
  reservationChangeRequest_insert: ReservationChangeRequest_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateReservationChangeRequest`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateReservationChangeRequestVariables } from '@reservation-system/dataconnect';
import { useCreateReservationChangeRequest } from '@reservation-system/dataconnect/react'

export default function CreateReservationChangeRequestComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateReservationChangeRequest();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateReservationChangeRequest(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateReservationChangeRequest(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateReservationChangeRequest(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateReservationChangeRequest` Mutation requires an argument of type `CreateReservationChangeRequestVariables`:
  const createReservationChangeRequestVars: CreateReservationChangeRequestVariables = {
    reservationId: ..., 
    requestedDate: ..., 
    requestedTime: ..., 
    requestedPeople: ..., 
    requestedMenuItemsJson: ..., 
    reason: ..., // optional
  };
  mutation.mutate(createReservationChangeRequestVars);
  // Variables can be defined inline as well.
  mutation.mutate({ reservationId: ..., requestedDate: ..., requestedTime: ..., requestedPeople: ..., requestedMenuItemsJson: ..., reason: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createReservationChangeRequestVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.reservationChangeRequest_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpdateReservationChangeRequestStatus
You can execute the `UpdateReservationChangeRequestStatus` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useUpdateReservationChangeRequestStatus(options?: useDataConnectMutationOptions<UpdateReservationChangeRequestStatusData, FirebaseError, UpdateReservationChangeRequestStatusVariables>): UseDataConnectMutationResult<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpdateReservationChangeRequestStatus(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateReservationChangeRequestStatusData, FirebaseError, UpdateReservationChangeRequestStatusVariables>): UseDataConnectMutationResult<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;
```

### Variables
The `UpdateReservationChangeRequestStatus` Mutation requires an argument of type `UpdateReservationChangeRequestStatusVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface UpdateReservationChangeRequestStatusVariables {
  id: UUIDString;
  status: ReservationChangeRequestStatus;
  reviewedAt?: TimestampString | null;
}
```
### Return Type
Recall that calling the `UpdateReservationChangeRequestStatus` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpdateReservationChangeRequestStatus` Mutation is of type `UpdateReservationChangeRequestStatusData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpdateReservationChangeRequestStatusData {
  reservationChangeRequest_update?: ReservationChangeRequest_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpdateReservationChangeRequestStatus`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpdateReservationChangeRequestStatusVariables } from '@reservation-system/dataconnect';
import { useUpdateReservationChangeRequestStatus } from '@reservation-system/dataconnect/react'

export default function UpdateReservationChangeRequestStatusComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpdateReservationChangeRequestStatus();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpdateReservationChangeRequestStatus(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateReservationChangeRequestStatus(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateReservationChangeRequestStatus(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpdateReservationChangeRequestStatus` Mutation requires an argument of type `UpdateReservationChangeRequestStatusVariables`:
  const updateReservationChangeRequestStatusVars: UpdateReservationChangeRequestStatusVariables = {
    id: ..., 
    status: ..., 
    reviewedAt: ..., // optional
  };
  mutation.mutate(updateReservationChangeRequestStatusVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., status: ..., reviewedAt: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(updateReservationChangeRequestStatusVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.reservationChangeRequest_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateStore
You can execute the `CreateStore` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useCreateStore(options?: useDataConnectMutationOptions<CreateStoreData, FirebaseError, CreateStoreVariables>): UseDataConnectMutationResult<CreateStoreData, CreateStoreVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateStore(dc: DataConnect, options?: useDataConnectMutationOptions<CreateStoreData, FirebaseError, CreateStoreVariables>): UseDataConnectMutationResult<CreateStoreData, CreateStoreVariables>;
```

### Variables
The `CreateStore` Mutation requires an argument of type `CreateStoreVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateStoreVariables {
  name: string;
  displayOrder?: number | null;
  active: boolean;
}
```
### Return Type
Recall that calling the `CreateStore` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateStore` Mutation is of type `CreateStoreData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateStoreData {
  store_insert: Store_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateStore`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateStoreVariables } from '@reservation-system/dataconnect';
import { useCreateStore } from '@reservation-system/dataconnect/react'

export default function CreateStoreComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateStore();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateStore(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateStore(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateStore(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateStore` Mutation requires an argument of type `CreateStoreVariables`:
  const createStoreVars: CreateStoreVariables = {
    name: ..., 
    displayOrder: ..., // optional
    active: ..., 
  };
  mutation.mutate(createStoreVars);
  // Variables can be defined inline as well.
  mutation.mutate({ name: ..., displayOrder: ..., active: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createStoreVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.store_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpdateStore
You can execute the `UpdateStore` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useUpdateStore(options?: useDataConnectMutationOptions<UpdateStoreData, FirebaseError, UpdateStoreVariables>): UseDataConnectMutationResult<UpdateStoreData, UpdateStoreVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpdateStore(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateStoreData, FirebaseError, UpdateStoreVariables>): UseDataConnectMutationResult<UpdateStoreData, UpdateStoreVariables>;
```

### Variables
The `UpdateStore` Mutation requires an argument of type `UpdateStoreVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface UpdateStoreVariables {
  id: UUIDString;
  name: string;
  displayOrder?: number | null;
  active: boolean;
}
```
### Return Type
Recall that calling the `UpdateStore` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpdateStore` Mutation is of type `UpdateStoreData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpdateStoreData {
  store_update?: Store_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpdateStore`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpdateStoreVariables } from '@reservation-system/dataconnect';
import { useUpdateStore } from '@reservation-system/dataconnect/react'

export default function UpdateStoreComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpdateStore();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpdateStore(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateStore(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateStore(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpdateStore` Mutation requires an argument of type `UpdateStoreVariables`:
  const updateStoreVars: UpdateStoreVariables = {
    id: ..., 
    name: ..., 
    displayOrder: ..., // optional
    active: ..., 
  };
  mutation.mutate(updateStoreVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., name: ..., displayOrder: ..., active: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(updateStoreVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.store_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## DeactivateStore
You can execute the `DeactivateStore` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useDeactivateStore(options?: useDataConnectMutationOptions<DeactivateStoreData, FirebaseError, DeactivateStoreVariables>): UseDataConnectMutationResult<DeactivateStoreData, DeactivateStoreVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useDeactivateStore(dc: DataConnect, options?: useDataConnectMutationOptions<DeactivateStoreData, FirebaseError, DeactivateStoreVariables>): UseDataConnectMutationResult<DeactivateStoreData, DeactivateStoreVariables>;
```

### Variables
The `DeactivateStore` Mutation requires an argument of type `DeactivateStoreVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface DeactivateStoreVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `DeactivateStore` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `DeactivateStore` Mutation is of type `DeactivateStoreData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface DeactivateStoreData {
  store_update?: Store_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `DeactivateStore`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, DeactivateStoreVariables } from '@reservation-system/dataconnect';
import { useDeactivateStore } from '@reservation-system/dataconnect/react'

export default function DeactivateStoreComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useDeactivateStore();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useDeactivateStore(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeactivateStore(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeactivateStore(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useDeactivateStore` Mutation requires an argument of type `DeactivateStoreVariables`:
  const deactivateStoreVars: DeactivateStoreVariables = {
    id: ..., 
  };
  mutation.mutate(deactivateStoreVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(deactivateStoreVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.store_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ReactivateStore
You can execute the `ReactivateStore` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useReactivateStore(options?: useDataConnectMutationOptions<ReactivateStoreData, FirebaseError, ReactivateStoreVariables>): UseDataConnectMutationResult<ReactivateStoreData, ReactivateStoreVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useReactivateStore(dc: DataConnect, options?: useDataConnectMutationOptions<ReactivateStoreData, FirebaseError, ReactivateStoreVariables>): UseDataConnectMutationResult<ReactivateStoreData, ReactivateStoreVariables>;
```

### Variables
The `ReactivateStore` Mutation requires an argument of type `ReactivateStoreVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ReactivateStoreVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `ReactivateStore` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `ReactivateStore` Mutation is of type `ReactivateStoreData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ReactivateStoreData {
  store_update?: Store_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `ReactivateStore`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ReactivateStoreVariables } from '@reservation-system/dataconnect';
import { useReactivateStore } from '@reservation-system/dataconnect/react'

export default function ReactivateStoreComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useReactivateStore();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useReactivateStore(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useReactivateStore(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useReactivateStore(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useReactivateStore` Mutation requires an argument of type `ReactivateStoreVariables`:
  const reactivateStoreVars: ReactivateStoreVariables = {
    id: ..., 
  };
  mutation.mutate(reactivateStoreVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(reactivateStoreVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.store_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateMenu
You can execute the `CreateMenu` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useCreateMenu(options?: useDataConnectMutationOptions<CreateMenuData, FirebaseError, CreateMenuVariables>): UseDataConnectMutationResult<CreateMenuData, CreateMenuVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateMenu(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMenuData, FirebaseError, CreateMenuVariables>): UseDataConnectMutationResult<CreateMenuData, CreateMenuVariables>;
```

### Variables
The `CreateMenu` Mutation requires an argument of type `CreateMenuVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateMenu` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateMenu` Mutation is of type `CreateMenuData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateMenuData {
  menu_insert: Menu_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateMenu`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateMenuVariables } from '@reservation-system/dataconnect';
import { useCreateMenu } from '@reservation-system/dataconnect/react'

export default function CreateMenuComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateMenu();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateMenu(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateMenu(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateMenu(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateMenu` Mutation requires an argument of type `CreateMenuVariables`:
  const createMenuVars: CreateMenuVariables = {
    name: ..., 
    description: ..., // optional
    standardPrice: ..., 
    durationMinutes: ..., 
    displayOrder: ..., // optional
    active: ..., 
  };
  mutation.mutate(createMenuVars);
  // Variables can be defined inline as well.
  mutation.mutate({ name: ..., description: ..., standardPrice: ..., durationMinutes: ..., displayOrder: ..., active: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createMenuVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.menu_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpdateMenu
You can execute the `UpdateMenu` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useUpdateMenu(options?: useDataConnectMutationOptions<UpdateMenuData, FirebaseError, UpdateMenuVariables>): UseDataConnectMutationResult<UpdateMenuData, UpdateMenuVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpdateMenu(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateMenuData, FirebaseError, UpdateMenuVariables>): UseDataConnectMutationResult<UpdateMenuData, UpdateMenuVariables>;
```

### Variables
The `UpdateMenu` Mutation requires an argument of type `UpdateMenuVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `UpdateMenu` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpdateMenu` Mutation is of type `UpdateMenuData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpdateMenuData {
  menu_update?: Menu_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpdateMenu`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpdateMenuVariables } from '@reservation-system/dataconnect';
import { useUpdateMenu } from '@reservation-system/dataconnect/react'

export default function UpdateMenuComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpdateMenu();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpdateMenu(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateMenu(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateMenu(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpdateMenu` Mutation requires an argument of type `UpdateMenuVariables`:
  const updateMenuVars: UpdateMenuVariables = {
    id: ..., 
    name: ..., 
    description: ..., // optional
    standardPrice: ..., 
    durationMinutes: ..., 
    displayOrder: ..., // optional
    active: ..., 
  };
  mutation.mutate(updateMenuVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., name: ..., description: ..., standardPrice: ..., durationMinutes: ..., displayOrder: ..., active: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(updateMenuVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.menu_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## DeactivateMenu
You can execute the `DeactivateMenu` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useDeactivateMenu(options?: useDataConnectMutationOptions<DeactivateMenuData, FirebaseError, DeactivateMenuVariables>): UseDataConnectMutationResult<DeactivateMenuData, DeactivateMenuVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useDeactivateMenu(dc: DataConnect, options?: useDataConnectMutationOptions<DeactivateMenuData, FirebaseError, DeactivateMenuVariables>): UseDataConnectMutationResult<DeactivateMenuData, DeactivateMenuVariables>;
```

### Variables
The `DeactivateMenu` Mutation requires an argument of type `DeactivateMenuVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface DeactivateMenuVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `DeactivateMenu` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `DeactivateMenu` Mutation is of type `DeactivateMenuData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface DeactivateMenuData {
  menu_update?: Menu_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `DeactivateMenu`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, DeactivateMenuVariables } from '@reservation-system/dataconnect';
import { useDeactivateMenu } from '@reservation-system/dataconnect/react'

export default function DeactivateMenuComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useDeactivateMenu();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useDeactivateMenu(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeactivateMenu(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeactivateMenu(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useDeactivateMenu` Mutation requires an argument of type `DeactivateMenuVariables`:
  const deactivateMenuVars: DeactivateMenuVariables = {
    id: ..., 
  };
  mutation.mutate(deactivateMenuVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(deactivateMenuVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.menu_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ReactivateMenu
You can execute the `ReactivateMenu` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useReactivateMenu(options?: useDataConnectMutationOptions<ReactivateMenuData, FirebaseError, ReactivateMenuVariables>): UseDataConnectMutationResult<ReactivateMenuData, ReactivateMenuVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useReactivateMenu(dc: DataConnect, options?: useDataConnectMutationOptions<ReactivateMenuData, FirebaseError, ReactivateMenuVariables>): UseDataConnectMutationResult<ReactivateMenuData, ReactivateMenuVariables>;
```

### Variables
The `ReactivateMenu` Mutation requires an argument of type `ReactivateMenuVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ReactivateMenuVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `ReactivateMenu` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `ReactivateMenu` Mutation is of type `ReactivateMenuData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ReactivateMenuData {
  menu_update?: Menu_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `ReactivateMenu`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ReactivateMenuVariables } from '@reservation-system/dataconnect';
import { useReactivateMenu } from '@reservation-system/dataconnect/react'

export default function ReactivateMenuComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useReactivateMenu();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useReactivateMenu(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useReactivateMenu(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useReactivateMenu(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useReactivateMenu` Mutation requires an argument of type `ReactivateMenuVariables`:
  const reactivateMenuVars: ReactivateMenuVariables = {
    id: ..., 
  };
  mutation.mutate(reactivateMenuVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(reactivateMenuVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.menu_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## RecordVisit
You can execute the `RecordVisit` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useRecordVisit(options?: useDataConnectMutationOptions<RecordVisitData, FirebaseError, RecordVisitVariables>): UseDataConnectMutationResult<RecordVisitData, RecordVisitVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useRecordVisit(dc: DataConnect, options?: useDataConnectMutationOptions<RecordVisitData, FirebaseError, RecordVisitVariables>): UseDataConnectMutationResult<RecordVisitData, RecordVisitVariables>;
```

### Variables
The `RecordVisit` Mutation requires an argument of type `RecordVisitVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface RecordVisitVariables {
  reservationId: UUIDString;
  visitedAt: TimestampString;
  actualPeople: number;
}
```
### Return Type
Recall that calling the `RecordVisit` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `RecordVisit` Mutation is of type `RecordVisitData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface RecordVisitData {
  visitRecord_insert: VisitRecord_Key;
  reservation_update?: Reservation_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `RecordVisit`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, RecordVisitVariables } from '@reservation-system/dataconnect';
import { useRecordVisit } from '@reservation-system/dataconnect/react'

export default function RecordVisitComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useRecordVisit();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useRecordVisit(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useRecordVisit(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useRecordVisit(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useRecordVisit` Mutation requires an argument of type `RecordVisitVariables`:
  const recordVisitVars: RecordVisitVariables = {
    reservationId: ..., 
    visitedAt: ..., 
    actualPeople: ..., 
  };
  mutation.mutate(recordVisitVars);
  // Variables can be defined inline as well.
  mutation.mutate({ reservationId: ..., visitedAt: ..., actualPeople: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(recordVisitVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.visitRecord_insert);
    console.log(mutation.data.reservation_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

