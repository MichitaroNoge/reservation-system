import type { BookingForm, Customer } from "./types";

/** Optional profile fields belong to this account; never inherit another person's values. */
export function applyAccountToReservationForm(current: BookingForm, account: Customer, options: { preserveBookingType?: boolean } = {}): BookingForm {
  const travelAgency = account.accountType === "travel_agency";
  const groupBooking = options.preserveBookingType ? current.bookingType === "travel_agency_group" : travelAgency;
  return {
    ...current,
    name: travelAgency ? account.companyBranchName || account.name : account.name,
    email: account.contact,
    phone: account.phone ?? "",
    address: account.address ?? "",
    accountType: groupBooking ? "travel_agency" : "individual",
    bookingType: groupBooking ? "travel_agency_group" : "individual",
    companyBranchName: groupBooking ? account.companyBranchName || (travelAgency ? account.name : "") : "",
    contactPersonName: travelAgency ? account.contactPersonName ?? "" : "",
    bookingContactName: travelAgency ? account.contactPersonName ?? "" : "",
    tcCount: groupBooking ? current.tcCount : 0,
    dgCount: groupBooking ? current.dgCount : 0,
  };
}
