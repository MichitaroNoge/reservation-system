const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs, makeMemoryCacheProvider } = require('firebase/data-connect');

const BillingStatus = {
  UNBILLED: "UNBILLED",
  INVOICED: "INVOICED",
  PAID: "PAID",
  VOIDED: "VOIDED",
}
exports.BillingStatus = BillingStatus;

const BillingType = {
  USAGE: "USAGE",
  CANCELLATION: "CANCELLATION",
}
exports.BillingType = BillingType;

const ReservationStatus = {
  TEMPORARY_REQUESTED: "TEMPORARY_REQUESTED",
  TEMPORARY_CONFIRMED: "TEMPORARY_CONFIRMED",
  CONFIRMED_REQUESTED: "CONFIRMED_REQUESTED",
  CONFIRMED: "CONFIRMED",
  WAITING_FOR_VISIT: "WAITING_FOR_VISIT",
  VISITED: "VISITED",
  CANCELLATION_REQUESTED: "CANCELLATION_REQUESTED",
  CANCELLED: "CANCELLED",
}
exports.ReservationStatus = ReservationStatus;

const connectorConfig = {
  connector: 'reservation',
  service: 'reservation-system',
  location: 'asia-northeast1'
};
exports.connectorConfig = connectorConfig;
const dataConnectSettings = {
  cacheSettings: {
    cacheProvider: makeMemoryCacheProvider(),
    maxAgeSeconds: 30
  }
};
exports.dataConnectSettings = dataConnectSettings;

const createCustomerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateCustomer', inputVars);
}
createCustomerRef.operationName = 'CreateCustomer';
exports.createCustomerRef = createCustomerRef;

exports.createCustomer = function createCustomer(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createCustomerRef(dcInstance, inputVars));
}
;

const updateCustomerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateCustomer', inputVars);
}
updateCustomerRef.operationName = 'UpdateCustomer';
exports.updateCustomerRef = updateCustomerRef;

exports.updateCustomer = function updateCustomer(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateCustomerRef(dcInstance, inputVars));
}
;

const updateCustomerIdentityRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateCustomerIdentity', inputVars);
}
updateCustomerIdentityRef.operationName = 'UpdateCustomerIdentity';
exports.updateCustomerIdentityRef = updateCustomerIdentityRef;

exports.updateCustomerIdentity = function updateCustomerIdentity(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateCustomerIdentityRef(dcInstance, inputVars));
}
;

const deactivateCustomerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeactivateCustomer', inputVars);
}
deactivateCustomerRef.operationName = 'DeactivateCustomer';
exports.deactivateCustomerRef = deactivateCustomerRef;

exports.deactivateCustomer = function deactivateCustomer(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deactivateCustomerRef(dcInstance, inputVars));
}
;

const reactivateCustomerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ReactivateCustomer', inputVars);
}
reactivateCustomerRef.operationName = 'ReactivateCustomer';
exports.reactivateCustomerRef = reactivateCustomerRef;

exports.reactivateCustomer = function reactivateCustomer(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(reactivateCustomerRef(dcInstance, inputVars));
}
;

const createReservationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateReservation', inputVars);
}
createReservationRef.operationName = 'CreateReservation';
exports.createReservationRef = createReservationRef;

exports.createReservation = function createReservation(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createReservationRef(dcInstance, inputVars));
}
;

const addReservationDetailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddReservationDetail', inputVars);
}
addReservationDetailRef.operationName = 'AddReservationDetail';
exports.addReservationDetailRef = addReservationDetailRef;

exports.addReservationDetail = function addReservationDetail(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(addReservationDetailRef(dcInstance, inputVars));
}
;

const deleteReservationDetailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteReservationDetail', inputVars);
}
deleteReservationDetailRef.operationName = 'DeleteReservationDetail';
exports.deleteReservationDetailRef = deleteReservationDetailRef;

exports.deleteReservationDetail = function deleteReservationDetail(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteReservationDetailRef(dcInstance, inputVars));
}
;

const updateReservationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateReservation', inputVars);
}
updateReservationRef.operationName = 'UpdateReservation';
exports.updateReservationRef = updateReservationRef;

exports.updateReservation = function updateReservation(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateReservationRef(dcInstance, inputVars));
}
;

const updateReservationStatusRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateReservationStatus', inputVars);
}
updateReservationStatusRef.operationName = 'UpdateReservationStatus';
exports.updateReservationStatusRef = updateReservationStatusRef;

exports.updateReservationStatus = function updateReservationStatus(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateReservationStatusRef(dcInstance, inputVars));
}
;

const updateConfirmationContactRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateConfirmationContact', inputVars);
}
updateConfirmationContactRef.operationName = 'UpdateConfirmationContact';
exports.updateConfirmationContactRef = updateConfirmationContactRef;

exports.updateConfirmationContact = function updateConfirmationContact(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateConfirmationContactRef(dcInstance, inputVars));
}
;

const assignStoreRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AssignStore', inputVars);
}
assignStoreRef.operationName = 'AssignStore';
exports.assignStoreRef = assignStoreRef;

exports.assignStore = function assignStore(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(assignStoreRef(dcInstance, inputVars));
}
;

const deleteStoreAssignmentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteStoreAssignment', inputVars);
}
deleteStoreAssignmentRef.operationName = 'DeleteStoreAssignment';
exports.deleteStoreAssignmentRef = deleteStoreAssignmentRef;

exports.deleteStoreAssignment = function deleteStoreAssignment(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteStoreAssignmentRef(dcInstance, inputVars));
}
;

const createStoreRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStore', inputVars);
}
createStoreRef.operationName = 'CreateStore';
exports.createStoreRef = createStoreRef;

exports.createStore = function createStore(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createStoreRef(dcInstance, inputVars));
}
;

const updateStoreRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateStore', inputVars);
}
updateStoreRef.operationName = 'UpdateStore';
exports.updateStoreRef = updateStoreRef;

exports.updateStore = function updateStore(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateStoreRef(dcInstance, inputVars));
}
;

const deactivateStoreRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeactivateStore', inputVars);
}
deactivateStoreRef.operationName = 'DeactivateStore';
exports.deactivateStoreRef = deactivateStoreRef;

exports.deactivateStore = function deactivateStore(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deactivateStoreRef(dcInstance, inputVars));
}
;

const reactivateStoreRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ReactivateStore', inputVars);
}
reactivateStoreRef.operationName = 'ReactivateStore';
exports.reactivateStoreRef = reactivateStoreRef;

exports.reactivateStore = function reactivateStore(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(reactivateStoreRef(dcInstance, inputVars));
}
;

const createMenuRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMenu', inputVars);
}
createMenuRef.operationName = 'CreateMenu';
exports.createMenuRef = createMenuRef;

exports.createMenu = function createMenu(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createMenuRef(dcInstance, inputVars));
}
;

const updateMenuRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMenu', inputVars);
}
updateMenuRef.operationName = 'UpdateMenu';
exports.updateMenuRef = updateMenuRef;

exports.updateMenu = function updateMenu(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateMenuRef(dcInstance, inputVars));
}
;

const deactivateMenuRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeactivateMenu', inputVars);
}
deactivateMenuRef.operationName = 'DeactivateMenu';
exports.deactivateMenuRef = deactivateMenuRef;

exports.deactivateMenu = function deactivateMenu(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deactivateMenuRef(dcInstance, inputVars));
}
;

const recordVisitRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'RecordVisit', inputVars);
}
recordVisitRef.operationName = 'RecordVisit';
exports.recordVisitRef = recordVisitRef;

exports.recordVisit = function recordVisit(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(recordVisitRef(dcInstance, inputVars));
}
;

const listReservationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListReservations');
}
listReservationsRef.operationName = 'ListReservations';
exports.listReservationsRef = listReservationsRef;

exports.listReservations = function listReservations(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listReservationsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getReservationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetReservation', inputVars);
}
getReservationRef.operationName = 'GetReservation';
exports.getReservationRef = getReservationRef;

exports.getReservation = function getReservation(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getReservationRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getReservationByCodeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetReservationByCode', inputVars);
}
getReservationByCodeRef.operationName = 'GetReservationByCode';
exports.getReservationByCodeRef = getReservationByCodeRef;

exports.getReservationByCode = function getReservationByCode(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getReservationByCodeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listCustomersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCustomers');
}
listCustomersRef.operationName = 'ListCustomers';
exports.listCustomersRef = listCustomersRef;

exports.listCustomers = function listCustomers(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCustomersRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listInactiveCustomersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListInactiveCustomers');
}
listInactiveCustomersRef.operationName = 'ListInactiveCustomers';
exports.listInactiveCustomersRef = listInactiveCustomersRef;

exports.listInactiveCustomers = function listInactiveCustomers(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listInactiveCustomersRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getCustomerByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCustomerByName', inputVars);
}
getCustomerByNameRef.operationName = 'GetCustomerByName';
exports.getCustomerByNameRef = getCustomerByNameRef;

exports.getCustomerByName = function getCustomerByName(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getCustomerByNameRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getCustomerByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCustomerById', inputVars);
}
getCustomerByIdRef.operationName = 'GetCustomerById';
exports.getCustomerByIdRef = getCustomerByIdRef;

exports.getCustomerById = function getCustomerById(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getCustomerByIdRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getCustomerByFirebaseUidRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCustomerByFirebaseUid', inputVars);
}
getCustomerByFirebaseUidRef.operationName = 'GetCustomerByFirebaseUid';
exports.getCustomerByFirebaseUidRef = getCustomerByFirebaseUidRef;

exports.getCustomerByFirebaseUid = function getCustomerByFirebaseUid(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getCustomerByFirebaseUidRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getCustomerByEmailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCustomerByEmail', inputVars);
}
getCustomerByEmailRef.operationName = 'GetCustomerByEmail';
exports.getCustomerByEmailRef = getCustomerByEmailRef;

exports.getCustomerByEmail = function getCustomerByEmail(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getCustomerByEmailRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listStoresRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListStores');
}
listStoresRef.operationName = 'ListStores';
exports.listStoresRef = listStoresRef;

exports.listStores = function listStores(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listStoresRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listInactiveStoresRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListInactiveStores');
}
listInactiveStoresRef.operationName = 'ListInactiveStores';
exports.listInactiveStoresRef = listInactiveStoresRef;

exports.listInactiveStores = function listInactiveStores(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listInactiveStoresRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getStoreByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStoreByName', inputVars);
}
getStoreByNameRef.operationName = 'GetStoreByName';
exports.getStoreByNameRef = getStoreByNameRef;

exports.getStoreByName = function getStoreByName(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getStoreByNameRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getStoreByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStoreById', inputVars);
}
getStoreByIdRef.operationName = 'GetStoreById';
exports.getStoreByIdRef = getStoreByIdRef;

exports.getStoreById = function getStoreById(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getStoreByIdRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMenusRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMenus');
}
listMenusRef.operationName = 'ListMenus';
exports.listMenusRef = listMenusRef;

exports.listMenus = function listMenus(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMenusRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getMenuByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMenuByName', inputVars);
}
getMenuByNameRef.operationName = 'GetMenuByName';
exports.getMenuByNameRef = getMenuByNameRef;

exports.getMenuByName = function getMenuByName(dcOrVars, varsOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMenuByNameRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listBillingRecordsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListBillingRecords');
}
listBillingRecordsRef.operationName = 'ListBillingRecords';
exports.listBillingRecordsRef = listBillingRecordsRef;

exports.listBillingRecords = function listBillingRecords(dcOrOptions, options) {

  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listBillingRecordsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
