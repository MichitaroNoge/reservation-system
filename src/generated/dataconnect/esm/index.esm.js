import { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs, makeMemoryCacheProvider } from 'firebase/data-connect';

export const BillingStatus = {
  UNBILLED: "UNBILLED",
  INVOICED: "INVOICED",
  PAID: "PAID",
  VOIDED: "VOIDED",
}

export const BillingType = {
  USAGE: "USAGE",
  CANCELLATION: "CANCELLATION",
}

export const ReservationStatus = {
  TEMPORARY_REQUESTED: "TEMPORARY_REQUESTED",
  TEMPORARY_CONFIRMED: "TEMPORARY_CONFIRMED",
  CONFIRMED_REQUESTED: "CONFIRMED_REQUESTED",
  CONFIRMED: "CONFIRMED",
  WAITING_FOR_VISIT: "WAITING_FOR_VISIT",
  VISITED: "VISITED",
  CANCELLATION_REQUESTED: "CANCELLATION_REQUESTED",
  CANCELLED: "CANCELLED",
}

export const connectorConfig = {
  connector: 'reservation',
  service: 'reservation-system',
  location: 'asia-northeast1'
};
export const dataConnectSettings = {
  cacheSettings: {
    cacheProvider: makeMemoryCacheProvider(),
    maxAgeSeconds: 30
  }
};
export const createCustomerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateCustomer', inputVars);
}
createCustomerRef.operationName = 'CreateCustomer';

export function createCustomer(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createCustomerRef(dcInstance, inputVars));
}

export const updateCustomerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateCustomer', inputVars);
}
updateCustomerRef.operationName = 'UpdateCustomer';

export function updateCustomer(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateCustomerRef(dcInstance, inputVars));
}

export const deactivateCustomerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeactivateCustomer', inputVars);
}
deactivateCustomerRef.operationName = 'DeactivateCustomer';

export function deactivateCustomer(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deactivateCustomerRef(dcInstance, inputVars));
}

export const createReservationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateReservation', inputVars);
}
createReservationRef.operationName = 'CreateReservation';

export function createReservation(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createReservationRef(dcInstance, inputVars));
}

export const addReservationDetailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddReservationDetail', inputVars);
}
addReservationDetailRef.operationName = 'AddReservationDetail';

export function addReservationDetail(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(addReservationDetailRef(dcInstance, inputVars));
}

export const deleteReservationDetailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteReservationDetail', inputVars);
}
deleteReservationDetailRef.operationName = 'DeleteReservationDetail';

export function deleteReservationDetail(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteReservationDetailRef(dcInstance, inputVars));
}

export const updateReservationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateReservation', inputVars);
}
updateReservationRef.operationName = 'UpdateReservation';

export function updateReservation(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateReservationRef(dcInstance, inputVars));
}

export const updateReservationStatusRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateReservationStatus', inputVars);
}
updateReservationStatusRef.operationName = 'UpdateReservationStatus';

export function updateReservationStatus(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateReservationStatusRef(dcInstance, inputVars));
}

export const updateConfirmationContactRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateConfirmationContact', inputVars);
}
updateConfirmationContactRef.operationName = 'UpdateConfirmationContact';

export function updateConfirmationContact(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateConfirmationContactRef(dcInstance, inputVars));
}

export const assignStoreRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AssignStore', inputVars);
}
assignStoreRef.operationName = 'AssignStore';

export function assignStore(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(assignStoreRef(dcInstance, inputVars));
}

export const deleteStoreAssignmentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteStoreAssignment', inputVars);
}
deleteStoreAssignmentRef.operationName = 'DeleteStoreAssignment';

export function deleteStoreAssignment(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteStoreAssignmentRef(dcInstance, inputVars));
}

export const updateStoreRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateStore', inputVars);
}
updateStoreRef.operationName = 'UpdateStore';

export function updateStore(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateStoreRef(dcInstance, inputVars));
}

export const deactivateStoreRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeactivateStore', inputVars);
}
deactivateStoreRef.operationName = 'DeactivateStore';

export function deactivateStore(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deactivateStoreRef(dcInstance, inputVars));
}

export const createMenuRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMenu', inputVars);
}
createMenuRef.operationName = 'CreateMenu';

export function createMenu(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createMenuRef(dcInstance, inputVars));
}

export const updateMenuRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMenu', inputVars);
}
updateMenuRef.operationName = 'UpdateMenu';

export function updateMenu(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateMenuRef(dcInstance, inputVars));
}

export const deactivateMenuRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeactivateMenu', inputVars);
}
deactivateMenuRef.operationName = 'DeactivateMenu';

export function deactivateMenu(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deactivateMenuRef(dcInstance, inputVars));
}

export const recordVisitRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'RecordVisit', inputVars);
}
recordVisitRef.operationName = 'RecordVisit';

export function recordVisit(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(recordVisitRef(dcInstance, inputVars));
}

export const listReservationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListReservations');
}
listReservationsRef.operationName = 'ListReservations';

export function listReservations(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listReservationsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getReservationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetReservation', inputVars);
}
getReservationRef.operationName = 'GetReservation';

export function getReservation(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getReservationRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getReservationByCodeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetReservationByCode', inputVars);
}
getReservationByCodeRef.operationName = 'GetReservationByCode';

export function getReservationByCode(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getReservationByCodeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listCustomersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCustomers');
}
listCustomersRef.operationName = 'ListCustomers';

export function listCustomers(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCustomersRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getCustomerByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCustomerByName', inputVars);
}
getCustomerByNameRef.operationName = 'GetCustomerByName';

export function getCustomerByName(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getCustomerByNameRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listStoresRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListStores');
}
listStoresRef.operationName = 'ListStores';

export function listStores(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listStoresRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getStoreByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStoreByName', inputVars);
}
getStoreByNameRef.operationName = 'GetStoreByName';

export function getStoreByName(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getStoreByNameRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listMenusRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMenus');
}
listMenusRef.operationName = 'ListMenus';

export function listMenus(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMenusRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getMenuByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMenuByName', inputVars);
}
getMenuByNameRef.operationName = 'GetMenuByName';

export function getMenuByName(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMenuByNameRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listBillingRecordsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListBillingRecords');
}
listBillingRecordsRef.operationName = 'ListBillingRecords';

export function listBillingRecords(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listBillingRecordsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
