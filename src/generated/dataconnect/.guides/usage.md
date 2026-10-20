# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useCreateAccount, useUpdateAccount, useCreateAccountContactEmail, useVerifyAccountContactEmail, useDeleteAccountContactEmail, useDeactivateAccount, useReactivateAccount, useCreateReservation, useUpdateReservation, useAddReservationDetail } from '@reservation-system/dataconnect/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useCreateAccount(createAccountVars);

const { data, isPending, isSuccess, isError, error } = useUpdateAccount(updateAccountVars);

const { data, isPending, isSuccess, isError, error } = useCreateAccountContactEmail(createAccountContactEmailVars);

const { data, isPending, isSuccess, isError, error } = useVerifyAccountContactEmail(verifyAccountContactEmailVars);

const { data, isPending, isSuccess, isError, error } = useDeleteAccountContactEmail(deleteAccountContactEmailVars);

const { data, isPending, isSuccess, isError, error } = useDeactivateAccount(deactivateAccountVars);

const { data, isPending, isSuccess, isError, error } = useReactivateAccount(reactivateAccountVars);

const { data, isPending, isSuccess, isError, error } = useCreateReservation(createReservationVars);

const { data, isPending, isSuccess, isError, error } = useUpdateReservation(updateReservationVars);

const { data, isPending, isSuccess, isError, error } = useAddReservationDetail(addReservationDetailVars);

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
import { createAccount, updateAccount, createAccountContactEmail, verifyAccountContactEmail, deleteAccountContactEmail, deactivateAccount, reactivateAccount, createReservation, updateReservation, addReservationDetail } from '@reservation-system/dataconnect';


// Operation CreateAccount:  For variables, look at type CreateAccountVars in ../index.d.ts
const { data } = await CreateAccount(dataConnect, createAccountVars);

// Operation UpdateAccount:  For variables, look at type UpdateAccountVars in ../index.d.ts
const { data } = await UpdateAccount(dataConnect, updateAccountVars);

// Operation CreateAccountContactEmail:  For variables, look at type CreateAccountContactEmailVars in ../index.d.ts
const { data } = await CreateAccountContactEmail(dataConnect, createAccountContactEmailVars);

// Operation VerifyAccountContactEmail:  For variables, look at type VerifyAccountContactEmailVars in ../index.d.ts
const { data } = await VerifyAccountContactEmail(dataConnect, verifyAccountContactEmailVars);

// Operation DeleteAccountContactEmail:  For variables, look at type DeleteAccountContactEmailVars in ../index.d.ts
const { data } = await DeleteAccountContactEmail(dataConnect, deleteAccountContactEmailVars);

// Operation DeactivateAccount:  For variables, look at type DeactivateAccountVars in ../index.d.ts
const { data } = await DeactivateAccount(dataConnect, deactivateAccountVars);

// Operation ReactivateAccount:  For variables, look at type ReactivateAccountVars in ../index.d.ts
const { data } = await ReactivateAccount(dataConnect, reactivateAccountVars);

// Operation CreateReservation:  For variables, look at type CreateReservationVars in ../index.d.ts
const { data } = await CreateReservation(dataConnect, createReservationVars);

// Operation UpdateReservation:  For variables, look at type UpdateReservationVars in ../index.d.ts
const { data } = await UpdateReservation(dataConnect, updateReservationVars);

// Operation AddReservationDetail:  For variables, look at type AddReservationDetailVars in ../index.d.ts
const { data } = await AddReservationDetail(dataConnect, addReservationDetailVars);


```