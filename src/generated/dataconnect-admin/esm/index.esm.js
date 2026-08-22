import { validateAdminArgs } from 'firebase-admin/data-connect';

export const BillingStatus = { UNBILLED: "UNBILLED", INVOICED: "INVOICED", PAID: "PAID", VOIDED: "VOIDED" };
export const BillingType = { USAGE: "USAGE", CANCELLATION: "CANCELLATION" };
export const ReservationChangeRequestStatus = { REQUESTED: "REQUESTED", APPROVED: "APPROVED", REJECTED: "REJECTED" };
export const ReservationStatus = {
  TEMPORARY_REQUESTED: "TEMPORARY_REQUESTED",
  TEMPORARY_CONFIRMED: "TEMPORARY_CONFIRMED",
  TEMPORARY_REJECTED: "TEMPORARY_REJECTED",
  CONFIRMED_REQUESTED: "CONFIRMED_REQUESTED",
  CONFIRMED: "CONFIRMED",
  CONFIRMED_REJECTED: "CONFIRMED_REJECTED",
  WAITING_FOR_VISIT: "WAITING_FOR_VISIT",
  VISITED: "VISITED",
  CANCELLATION_REQUESTED: "CANCELLATION_REQUESTED",
  CANCELLED: "CANCELLED",
};

export const connectorConfig = { connector: 'reservation', serviceId: 'reservation-system', location: 'asia-northeast1' };

const mutation = (operationName) => (dcOrVarsOrOptions, varsOrOptions, options) => {
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation(operationName, inputVars, inputOpts);
};

const query = (operationName, hasVariables) => (dcOrVarsOrOptions, varsOrOptions, options) => {
  if (hasVariables) {
    const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
    dcInstance.useGen(true);
    return dcInstance.executeQuery(operationName, inputVars, inputOpts);
  }
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery(operationName, undefined, inputOpts);
};

export const createAccount = mutation('CreateAccount');
export const updateAccount = mutation('UpdateAccount');
export const deactivateAccount = mutation('DeactivateAccount');
export const reactivateAccount = mutation('ReactivateAccount');
export const createReservation = mutation('CreateReservation');
export const updateReservation = mutation('UpdateReservation');
export const addReservationDetail = mutation('AddReservationDetail');
export const deleteReservationDetail = mutation('DeleteReservationDetail');
export const updateReservationStatus = mutation('UpdateReservationStatus');
export const updateConfirmationContact = mutation('UpdateConfirmationContact');
export const clearConfirmationContact = mutation('ClearConfirmationContact');
export const assignStore = mutation('AssignStore');
export const deleteStoreAssignment = mutation('DeleteStoreAssignment');
export const createReservationChangeRequest = mutation('CreateReservationChangeRequest');
export const updateReservationChangeRequestStatus = mutation('UpdateReservationChangeRequestStatus');
export const createStore = mutation('CreateStore');
export const updateStore = mutation('UpdateStore');
export const deactivateStore = mutation('DeactivateStore');
export const reactivateStore = mutation('ReactivateStore');
export const createMenu = mutation('CreateMenu');
export const updateMenu = mutation('UpdateMenu');
export const deactivateMenu = mutation('DeactivateMenu');
export const reactivateMenu = mutation('ReactivateMenu');
export const recordVisit = mutation('RecordVisit');

export const listReservations = query('ListReservations', false);
export const getReservation = query('GetReservation', true);
export const getReservationByCode = query('GetReservationByCode', true);
export const listReservationChangeRequests = query('ListReservationChangeRequests', false);
export const listAccounts = query('ListAccounts', false);
export const listInactiveAccounts = query('ListInactiveAccounts', false);
export const getAccountById = query('GetAccountById', true);
export const getAccountByFirebaseUid = query('GetAccountByFirebaseUid', true);
export const listStores = query('ListStores', false);
export const listInactiveStores = query('ListInactiveStores', false);
export const getStoreByName = query('GetStoreByName', true);
export const getStoreById = query('GetStoreById', true);
export const listMenus = query('ListMenus', false);
export const listInactiveMenus = query('ListInactiveMenus', false);
export const getMenuByName = query('GetMenuByName', true);
export const listBillingRecords = query('ListBillingRecords', false);
