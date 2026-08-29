const { validateAdminArgs } = require('firebase-admin/data-connect');

const BillingStatus = { UNBILLED: "UNBILLED", INVOICED: "INVOICED", PAID: "PAID", VOIDED: "VOIDED" };
exports.BillingStatus = BillingStatus;
const BillingType = { USAGE: "USAGE", CANCELLATION: "CANCELLATION" };
exports.BillingType = BillingType;
const ReservationChangeRequestStatus = { REQUESTED: "REQUESTED", APPROVED: "APPROVED", REJECTED: "REJECTED" };
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
};
exports.ReservationStatus = ReservationStatus;

const connectorConfig = { connector: 'reservation', serviceId: 'reservation-system', location: 'asia-northeast1' };
exports.connectorConfig = connectorConfig;

function mutation(operationName) {
  return function(dcOrVarsOrOptions, varsOrOptions, options) {
    const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
    dcInstance.useGen(true);
    return dcInstance.executeMutation(operationName, inputVars, inputOpts);
  };
}

function query(operationName, hasVariables) {
  return function(dcOrVarsOrOptions, varsOrOptions, options) {
    if (hasVariables) {
      const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
      dcInstance.useGen(true);
      return dcInstance.executeQuery(operationName, inputVars, inputOpts);
    }
    const { dc: dcInstance, options: inputOpts } = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, undefined);
    dcInstance.useGen(true);
    return dcInstance.executeQuery(operationName, undefined, inputOpts);
  };
}

exports.createAccount = mutation('CreateAccount');
exports.updateAccount = mutation('UpdateAccount');
exports.deactivateAccount = mutation('DeactivateAccount');
exports.reactivateAccount = mutation('ReactivateAccount');
exports.createReservation = mutation('CreateReservation');
exports.updateReservation = mutation('UpdateReservation');
exports.addReservationDetail = mutation('AddReservationDetail');
exports.deleteReservationDetail = mutation('DeleteReservationDetail');
exports.updateReservationStatus = mutation('UpdateReservationStatus');
exports.updateConfirmationContact = mutation('UpdateConfirmationContact');
exports.clearConfirmationContact = mutation('ClearConfirmationContact');
exports.assignStore = mutation('AssignStore');
exports.deleteStoreAssignment = mutation('DeleteStoreAssignment');
exports.createReservationChangeRequest = mutation('CreateReservationChangeRequest');
exports.updateReservationChangeRequestStatus = mutation('UpdateReservationChangeRequestStatus');
exports.createStore = mutation('CreateStore');
exports.updateStore = mutation('UpdateStore');
exports.deactivateStore = mutation('DeactivateStore');
exports.reactivateStore = mutation('ReactivateStore');
exports.createMenu = mutation('CreateMenu');
exports.updateMenu = mutation('UpdateMenu');
exports.deactivateMenu = mutation('DeactivateMenu');
exports.reactivateMenu = mutation('ReactivateMenu');
exports.recordVisit = mutation('RecordVisit');

exports.listReservations = query('ListReservations', false);
exports.getReservation = query('GetReservation', true);
exports.getReservationByCode = query('GetReservationByCode', true);
exports.listReservationChangeRequests = query('ListReservationChangeRequests', false);
exports.listAccounts = query('ListAccounts', false);
exports.listInactiveAccounts = query('ListInactiveAccounts', false);
exports.getAccountById = query('GetAccountById', true);
exports.getAccountByFirebaseUid = query('GetAccountByFirebaseUid', true);
exports.listStores = query('ListStores', false);
exports.listInactiveStores = query('ListInactiveStores', false);
exports.getStoreByName = query('GetStoreByName', true);
exports.getStoreById = query('GetStoreById', true);
exports.listMenus = query('ListMenus', false);
exports.listInactiveMenus = query('ListInactiveMenus', false);
exports.getMenuByName = query('GetMenuByName', true);
exports.listBillingRecords = query('ListBillingRecords', false);
