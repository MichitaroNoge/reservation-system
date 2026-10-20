import type { BookingForm, Customer } from "./types";

/** Optional profile fields belong to this account; never inherit another person's values. */
export function applyAccountToReservationForm(current: BookingForm, account: Customer): BookingForm {
  const travelAgency = account.accountType === "travel_agency";
  return {
    ...current,
    name: travelAgency ? account.companyBranchName || account.name : account.name,
    email: account.contact,
    phone: account.phone ?? "",
    address: account.address ?? "",
    accountType: travelAgency ? "travel_agency" : "individual",
    bookingType: travelAgency ? "travel_agency_group" : "individual",
    companyBranchName: travelAgency ? account.companyBranchName || account.name : "",
    contactPersonName: travelAgency ? account.contactPersonName ?? "" : "",
    bookingContactName: travelAgency ? account.contactPersonName ?? "" : "",
    tcCount: travelAgency ? current.tcCount : 0,
    dgCount: travelAgency ? current.dgCount : 0,
  };
}
