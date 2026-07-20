# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useCreateCustomer, useUpdateCustomer, useDeactivateCustomer, useCreateReservation, useAddReservationDetail, useUpdateReservation, useUpdateReservationStatus, useUpdateConfirmationContact, useAssignStore, useDeleteStoreAssignment } from '@reservation-system/dataconnect/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useCreateCustomer(createCustomerVars);

const { data, isPending, isSuccess, isError, error } = useUpdateCustomer(updateCustomerVars);

const { data, isPending, isSuccess, isError, error } = useDeactivateCustomer(deactivateCustomerVars);

const { data, isPending, isSuccess, isError, error } = useCreateReservation(createReservationVars);

const { data, isPending, isSuccess, isError, error } = useAddReservationDetail(addReservationDetailVars);

const { data, isPending, isSuccess, isError, error } = useUpdateReservation(updateReservationVars);

const { data, isPending, isSuccess, isError, error } = useUpdateReservationStatus(updateReservationStatusVars);

const { data, isPending, isSuccess, isError, error } = useUpdateConfirmationContact(updateConfirmationContactVars);

const { data, isPending, isSuccess, isError, error } = useAssignStore(assignStoreVars);

const { data, isPending, isSuccess, isError, error } = useDeleteStoreAssignment(deleteStoreAssignmentVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createCustomer, updateCustomer, deactivateCustomer, createReservation, addReservationDetail, updateReservation, updateReservationStatus, updateConfirmationContact, assignStore, deleteStoreAssignment } from '@reservation-system/dataconnect';


// Operation CreateCustomer:  For variables, look at type CreateCustomerVars in ../index.d.ts
const { data } = await CreateCustomer(dataConnect, createCustomerVars);

// Operation UpdateCustomer:  For variables, look at type UpdateCustomerVars in ../index.d.ts
const { data } = await UpdateCustomer(dataConnect, updateCustomerVars);

// Operation DeactivateCustomer:  For variables, look at type DeactivateCustomerVars in ../index.d.ts
const { data } = await DeactivateCustomer(dataConnect, deactivateCustomerVars);

// Operation CreateReservation:  For variables, look at type CreateReservationVars in ../index.d.ts
const { data } = await CreateReservation(dataConnect, createReservationVars);

// Operation AddReservationDetail:  For variables, look at type AddReservationDetailVars in ../index.d.ts
const { data } = await AddReservationDetail(dataConnect, addReservationDetailVars);

// Operation UpdateReservation:  For variables, look at type UpdateReservationVars in ../index.d.ts
const { data } = await UpdateReservation(dataConnect, updateReservationVars);

// Operation UpdateReservationStatus:  For variables, look at type UpdateReservationStatusVars in ../index.d.ts
const { data } = await UpdateReservationStatus(dataConnect, updateReservationStatusVars);

// Operation UpdateConfirmationContact:  For variables, look at type UpdateConfirmationContactVars in ../index.d.ts
const { data } = await UpdateConfirmationContact(dataConnect, updateConfirmationContactVars);

// Operation AssignStore:  For variables, look at type AssignStoreVars in ../index.d.ts
const { data } = await AssignStore(dataConnect, assignStoreVars);

// Operation DeleteStoreAssignment:  For variables, look at type DeleteStoreAssignmentVars in ../index.d.ts
const { data } = await DeleteStoreAssignment(dataConnect, deleteStoreAssignmentVars);


```