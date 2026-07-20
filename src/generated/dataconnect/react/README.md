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
  - [*ListCustomers*](#listcustomers)
  - [*GetCustomerByName*](#getcustomerbyname)
  - [*ListStores*](#liststores)
  - [*GetStoreByName*](#getstorebyname)
  - [*ListMenus*](#listmenus)
  - [*GetMenuByName*](#getmenubyname)
  - [*ListBillingRecords*](#listbillingrecords)
- [**Mutations**](#mutations)
  - [*CreateCustomer*](#createcustomer)
  - [*UpdateCustomer*](#updatecustomer)
  - [*DeactivateCustomer*](#deactivatecustomer)
  - [*CreateReservation*](#createreservation)
  - [*AddReservationDetail*](#addreservationdetail)
  - [*DeleteReservationDetail*](#deletereservationdetail)
  - [*UpdateReservation*](#updatereservation)
  - [*UpdateReservationStatus*](#updatereservationstatus)
  - [*UpdateConfirmationContact*](#updateconfirmationcontact)
  - [*AssignStore*](#assignstore)
  - [*DeleteStoreAssignment*](#deletestoreassignment)
  - [*UpdateStore*](#updatestore)
  - [*DeactivateStore*](#deactivatestore)
  - [*CreateMenu*](#createmenu)
  - [*UpdateMenu*](#updatemenu)
  - [*DeactivateMenu*](#deactivatemenu)
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

## ListCustomers
You can execute the `ListCustomers` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useListCustomers(dc: DataConnect, options?: useDataConnectQueryOptions<ListCustomersData>): UseDataConnectQueryResult<ListCustomersData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListCustomers(options?: useDataConnectQueryOptions<ListCustomersData>): UseDataConnectQueryResult<ListCustomersData, undefined>;
```

### Variables
The `ListCustomers` Query has no variables.
### Return Type
Recall that calling the `ListCustomers` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListCustomers` Query is of type `ListCustomersData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListCustomers`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@reservation-system/dataconnect';
import { useListCustomers } from '@reservation-system/dataconnect/react'

export default function ListCustomersComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListCustomers();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListCustomers(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListCustomers(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListCustomers(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.customers);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetCustomerByName
You can execute the `GetCustomerByName` Query using the following Query hook function, which is defined in [dataconnect/react/index.d.ts](./index.d.ts):

```javascript
useGetCustomerByName(dc: DataConnect, vars: GetCustomerByNameVariables, options?: useDataConnectQueryOptions<GetCustomerByNameData>): UseDataConnectQueryResult<GetCustomerByNameData, GetCustomerByNameVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetCustomerByName(vars: GetCustomerByNameVariables, options?: useDataConnectQueryOptions<GetCustomerByNameData>): UseDataConnectQueryResult<GetCustomerByNameData, GetCustomerByNameVariables>;
```

### Variables
The `GetCustomerByName` Query requires an argument of type `GetCustomerByNameVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetCustomerByNameVariables {
  name: string;
}
```
### Return Type
Recall that calling the `GetCustomerByName` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetCustomerByName` Query is of type `GetCustomerByNameData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetCustomerByNameData {
  customers: ({
    id: UUIDString;
    name: string;
    phone: string;
    email: string;
    active: boolean;
  } & Customer_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetCustomerByName`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetCustomerByNameVariables } from '@reservation-system/dataconnect';
import { useGetCustomerByName } from '@reservation-system/dataconnect/react'

export default function GetCustomerByNameComponent() {
  // The `useGetCustomerByName` Query hook requires an argument of type `GetCustomerByNameVariables`:
  const getCustomerByNameVars: GetCustomerByNameVariables = {
    name: ...,
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetCustomerByName(getCustomerByNameVars);
  // Variables can be defined inline as well.
  const query = useGetCustomerByName({ name: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetCustomerByName(dataConnect, getCustomerByNameVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetCustomerByName(getCustomerByNameVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetCustomerByName(dataConnect, getCustomerByNameVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.customers);
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
    address?: string | null;
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
    address?: string | null;
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

## CreateCustomer
You can execute the `CreateCustomer` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useCreateCustomer(options?: useDataConnectMutationOptions<CreateCustomerData, FirebaseError, CreateCustomerVariables>): UseDataConnectMutationResult<CreateCustomerData, CreateCustomerVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateCustomer(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCustomerData, FirebaseError, CreateCustomerVariables>): UseDataConnectMutationResult<CreateCustomerData, CreateCustomerVariables>;
```

### Variables
The `CreateCustomer` Mutation requires an argument of type `CreateCustomerVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateCustomerVariables {
  name: string;
  phone: string;
  email: string;
}
```
### Return Type
Recall that calling the `CreateCustomer` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateCustomer` Mutation is of type `CreateCustomerData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateCustomerData {
  customer_insert: Customer_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateCustomer`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateCustomerVariables } from '@reservation-system/dataconnect';
import { useCreateCustomer } from '@reservation-system/dataconnect/react'

export default function CreateCustomerComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateCustomer();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateCustomer(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateCustomer(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateCustomer(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateCustomer` Mutation requires an argument of type `CreateCustomerVariables`:
  const createCustomerVars: CreateCustomerVariables = {
    name: ...,
    phone: ...,
    email: ...,
  };
  mutation.mutate(createCustomerVars);
  // Variables can be defined inline as well.
  mutation.mutate({ name: ..., phone: ..., email: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createCustomerVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.customer_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpdateCustomer
You can execute the `UpdateCustomer` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useUpdateCustomer(options?: useDataConnectMutationOptions<UpdateCustomerData, FirebaseError, UpdateCustomerVariables>): UseDataConnectMutationResult<UpdateCustomerData, UpdateCustomerVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpdateCustomer(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateCustomerData, FirebaseError, UpdateCustomerVariables>): UseDataConnectMutationResult<UpdateCustomerData, UpdateCustomerVariables>;
```

### Variables
The `UpdateCustomer` Mutation requires an argument of type `UpdateCustomerVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface UpdateCustomerVariables {
  id: UUIDString;
  name: string;
  phone: string;
  email: string;
}
```
### Return Type
Recall that calling the `UpdateCustomer` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpdateCustomer` Mutation is of type `UpdateCustomerData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpdateCustomerData {
  customer_update?: Customer_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpdateCustomer`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpdateCustomerVariables } from '@reservation-system/dataconnect';
import { useUpdateCustomer } from '@reservation-system/dataconnect/react'

export default function UpdateCustomerComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpdateCustomer();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpdateCustomer(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateCustomer(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateCustomer(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpdateCustomer` Mutation requires an argument of type `UpdateCustomerVariables`:
  const updateCustomerVars: UpdateCustomerVariables = {
    id: ...,
    name: ...,
    phone: ...,
    email: ...,
  };
  mutation.mutate(updateCustomerVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., name: ..., phone: ..., email: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(updateCustomerVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.customer_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## DeactivateCustomer
You can execute the `DeactivateCustomer` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect/react/index.d.ts](./index.d.ts)):
```javascript
useDeactivateCustomer(options?: useDataConnectMutationOptions<DeactivateCustomerData, FirebaseError, DeactivateCustomerVariables>): UseDataConnectMutationResult<DeactivateCustomerData, DeactivateCustomerVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useDeactivateCustomer(dc: DataConnect, options?: useDataConnectMutationOptions<DeactivateCustomerData, FirebaseError, DeactivateCustomerVariables>): UseDataConnectMutationResult<DeactivateCustomerData, DeactivateCustomerVariables>;
```

### Variables
The `DeactivateCustomer` Mutation requires an argument of type `DeactivateCustomerVariables`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface DeactivateCustomerVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `DeactivateCustomer` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `DeactivateCustomer` Mutation is of type `DeactivateCustomerData`, which is defined in [dataconnect/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface DeactivateCustomerData {
  customer_update?: Customer_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `DeactivateCustomer`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, DeactivateCustomerVariables } from '@reservation-system/dataconnect';
import { useDeactivateCustomer } from '@reservation-system/dataconnect/react'

export default function DeactivateCustomerComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useDeactivateCustomer();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useDeactivateCustomer(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeactivateCustomer(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeactivateCustomer(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useDeactivateCustomer` Mutation requires an argument of type `DeactivateCustomerVariables`:
  const deactivateCustomerVars: DeactivateCustomerVariables = {
    id: ...,
  };
  mutation.mutate(deactivateCustomerVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(deactivateCustomerVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.customer_update);
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
  customerId: UUIDString;
  usageDate: DateString;
  usageTime: string;
  expectedPeople: number;
  status: ReservationStatus;
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
    customerId: ...,
    usageDate: ...,
    usageTime: ...,
    expectedPeople: ...,
    status: ...,
    policyAgreementKind: ..., // optional
    policyAgreementAcceptedAt: ..., // optional
  };
  mutation.mutate(createReservationVars);
  // Variables can be defined inline as well.
  mutation.mutate({ reservationCode: ..., customerId: ..., usageDate: ..., usageTime: ..., expectedPeople: ..., status: ..., policyAgreementKind: ..., policyAgreementAcceptedAt: ..., });

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
  usageDate: DateString;
  usageTime: string;
  expectedPeople: number;
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
    usageDate: ...,
    usageTime: ...,
    expectedPeople: ...,
  };
  mutation.mutate(updateReservationVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., usageDate: ..., usageTime: ..., expectedPeople: ..., });

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
  };
  mutation.mutate(updateReservationStatusVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., status: ..., });

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
  address?: string | null;
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
    address: ..., // optional
    active: ...,
  };
  mutation.mutate(updateStoreVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., name: ..., address: ..., active: ..., });

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
    active: ...,
  };
  mutation.mutate(createMenuVars);
  // Variables can be defined inline as well.
  mutation.mutate({ name: ..., description: ..., standardPrice: ..., durationMinutes: ..., active: ..., });

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
    active: ...,
  };
  mutation.mutate(updateMenuVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., name: ..., description: ..., standardPrice: ..., durationMinutes: ..., active: ..., });

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
