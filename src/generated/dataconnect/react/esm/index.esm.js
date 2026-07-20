import { createCustomerRef, updateCustomerRef, deactivateCustomerRef, createReservationRef, addReservationDetailRef, deleteReservationDetailRef, updateReservationRef, updateReservationStatusRef, updateConfirmationContactRef, assignStoreRef, deleteStoreAssignmentRef, updateStoreRef, deactivateStoreRef, createMenuRef, updateMenuRef, deactivateMenuRef, recordVisitRef, listReservationsRef, getReservationRef, getReservationByCodeRef, listCustomersRef, getCustomerByNameRef, listStoresRef, getStoreByNameRef, listMenusRef, getMenuByNameRef, listBillingRecordsRef, connectorConfig } from '../../esm/index.esm.js';
import { validateArgs, CallerSdkTypeEnum } from 'firebase/data-connect';
import { useDataConnectQuery, useDataConnectMutation, validateReactArgs } from '@tanstack-query-firebase/react/data-connect';

export function useCreateCustomer(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return createCustomerRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useUpdateCustomer(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return updateCustomerRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useDeactivateCustomer(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return deactivateCustomerRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useCreateReservation(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return createReservationRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useAddReservationDetail(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return addReservationDetailRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useDeleteReservationDetail(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return deleteReservationDetailRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useUpdateReservation(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return updateReservationRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useUpdateReservationStatus(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return updateReservationStatusRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useUpdateConfirmationContact(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return updateConfirmationContactRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useAssignStore(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return assignStoreRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useDeleteStoreAssignment(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return deleteStoreAssignmentRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useUpdateStore(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return updateStoreRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useDeactivateStore(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return deactivateStoreRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useCreateMenu(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return createMenuRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useUpdateMenu(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return updateMenuRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useDeactivateMenu(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return deactivateMenuRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useRecordVisit(dcOrOptions, options) {
  const { dc: dcInstance, vars: inputOpts } = validateArgs(connectorConfig, dcOrOptions, options);
  function refFactory(vars) {
    return recordVisitRef(dcInstance, vars);
  }
  return useDataConnectMutation(refFactory, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}


export function useListReservations(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateReactArgs(connectorConfig, dcOrOptions, options);
  const ref = listReservationsRef(dcInstance);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useGetReservation(dcOrVars, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateReactArgs(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  const ref = getReservationRef(dcInstance, inputVars);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useGetReservationByCode(dcOrVars, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateReactArgs(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  const ref = getReservationByCodeRef(dcInstance, inputVars);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useListCustomers(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateReactArgs(connectorConfig, dcOrOptions, options);
  const ref = listCustomersRef(dcInstance);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useGetCustomerByName(dcOrVars, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateReactArgs(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  const ref = getCustomerByNameRef(dcInstance, inputVars);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useListStores(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateReactArgs(connectorConfig, dcOrOptions, options);
  const ref = listStoresRef(dcInstance);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useGetStoreByName(dcOrVars, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateReactArgs(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  const ref = getStoreByNameRef(dcInstance, inputVars);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useListMenus(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateReactArgs(connectorConfig, dcOrOptions, options);
  const ref = listMenusRef(dcInstance);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useGetMenuByName(dcOrVars, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateReactArgs(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  const ref = getMenuByNameRef(dcInstance, inputVars);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}

export function useListBillingRecords(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateReactArgs(connectorConfig, dcOrOptions, options);
  const ref = listBillingRecordsRef(dcInstance);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}
