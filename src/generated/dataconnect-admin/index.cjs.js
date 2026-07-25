const { validateAdminArgs } = require('firebase-admin/data-connect');

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

const ReservationChangeRequestStatus = {
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
}
exports.ReservationChangeRequestStatus = ReservationChangeRequestStatus;

const ReservationStatus = {
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
}
exports.ReservationStatus = ReservationStatus;

const connectorConfig = {
  connector: 'reservation',
  serviceId: 'reservation-system',
  location: 'asia-northeast1'
};
exports.connectorConfig = connectorConfig;

function createCustomer(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateCustomer', inputVars, inputOpts);
}
exports.createCustomer = createCustomer;

function updateCustomer(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateCustomer', inputVars, inputOpts);
}
exports.updateCustomer = updateCustomer;

function updateCustomerIdentity(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateCustomerIdentity', inputVars, inputOpts);
}
exports.updateCustomerIdentity = updateCustomerIdentity;

function deactivateCustomer(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeactivateCustomer', inputVars, inputOpts);
}
exports.deactivateCustomer = deactivateCustomer;

function reactivateCustomer(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ReactivateCustomer', inputVars, inputOpts);
}
exports.reactivateCustomer = reactivateCustomer;

function createReservation(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateReservation', inputVars, inputOpts);
}
exports.createReservation = createReservation;

function addReservationDetail(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddReservationDetail', inputVars, inputOpts);
}
exports.addReservationDetail = addReservationDetail;

function deleteReservationDetail(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteReservationDetail', inputVars, inputOpts);
}
exports.deleteReservationDetail = deleteReservationDetail;

function updateReservation(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateReservation', inputVars, inputOpts);
}
exports.updateReservation = updateReservation;

function updateReservationStatus(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateReservationStatus', inputVars, inputOpts);
}
exports.updateReservationStatus = updateReservationStatus;

function updateConfirmationContact(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateConfirmationContact', inputVars, inputOpts);
}
exports.updateConfirmationContact = updateConfirmationContact;

function assignStore(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AssignStore', inputVars, inputOpts);
}
exports.assignStore = assignStore;

function deleteStoreAssignment(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteStoreAssignment', inputVars, inputOpts);
}
exports.deleteStoreAssignment = deleteStoreAssignment;

function createReservationChangeRequest(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateReservationChangeRequest', inputVars, inputOpts);
}
exports.createReservationChangeRequest = createReservationChangeRequest;

function updateReservationChangeRequestStatus(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateReservationChangeRequestStatus', inputVars, inputOpts);
}
exports.updateReservationChangeRequestStatus = updateReservationChangeRequestStatus;

function createStore(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateStore', inputVars, inputOpts);
}
exports.createStore = createStore;

function updateStore(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateStore', inputVars, inputOpts);
}
exports.updateStore = updateStore;

function deactivateStore(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeactivateStore', inputVars, inputOpts);
}
exports.deactivateStore = deactivateStore;

function reactivateStore(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ReactivateStore', inputVars, inputOpts);
}
exports.reactivateStore = reactivateStore;

function createMenu(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateMenu', inputVars, inputOpts);
}
exports.createMenu = createMenu;

function updateMenu(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateMenu', inputVars, inputOpts);
}
exports.updateMenu = updateMenu;

function deactivateMenu(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeactivateMenu', inputVars, inputOpts);
}
exports.deactivateMenu = deactivateMenu;

function reactivateMenu(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ReactivateMenu', inputVars, inputOpts);
}
exports.reactivateMenu = reactivateMenu;

function recordVisit(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RecordVisit', inputVars, inputOpts);
}
exports.recordVisit = recordVisit;

function listReservations(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListReservations', undefined, inputOpts);
}
exports.listReservations = listReservations;

function getReservation(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetReservation', inputVars, inputOpts);
}
exports.getReservation = getReservation;

function getReservationByCode(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetReservationByCode', inputVars, inputOpts);
}
exports.getReservationByCode = getReservationByCode;

function listReservationChangeRequests(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListReservationChangeRequests', undefined, inputOpts);
}
exports.listReservationChangeRequests = listReservationChangeRequests;

function listCustomers(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListCustomers', undefined, inputOpts);
}
exports.listCustomers = listCustomers;

function listInactiveCustomers(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListInactiveCustomers', undefined, inputOpts);
}
exports.listInactiveCustomers = listInactiveCustomers;

function getCustomerByName(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetCustomerByName', inputVars, inputOpts);
}
exports.getCustomerByName = getCustomerByName;

function getCustomerById(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetCustomerById', inputVars, inputOpts);
}
exports.getCustomerById = getCustomerById;

function getCustomerByFirebaseUid(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetCustomerByFirebaseUid', inputVars, inputOpts);
}
exports.getCustomerByFirebaseUid = getCustomerByFirebaseUid;

function getCustomerByEmail(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetCustomerByEmail', inputVars, inputOpts);
}
exports.getCustomerByEmail = getCustomerByEmail;

function listStores(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListStores', undefined, inputOpts);
}
exports.listStores = listStores;

function listInactiveStores(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListInactiveStores', undefined, inputOpts);
}
exports.listInactiveStores = listInactiveStores;

function getStoreByName(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetStoreByName', inputVars, inputOpts);
}
exports.getStoreByName = getStoreByName;

function getStoreById(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetStoreById', inputVars, inputOpts);
}
exports.getStoreById = getStoreById;

function listMenus(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMenus', undefined, inputOpts);
}
exports.listMenus = listMenus;

function listInactiveMenus(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListInactiveMenus', undefined, inputOpts);
}
exports.listInactiveMenus = listInactiveMenus;

function getMenuByName(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMenuByName', inputVars, inputOpts);
}
exports.getMenuByName = getMenuByName;

function listBillingRecords(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListBillingRecords', undefined, inputOpts);
}
exports.listBillingRecords = listBillingRecords;

