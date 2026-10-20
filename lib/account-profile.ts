/** Authentication creates an identity; a usable customer profile is completed separately. */
export function isAccountProfileComplete(account: { name?: string; phone?: string; accountType?: string; companyBranchName?: string; contactPersonName?: string } | null | undefined) {
  if (!account?.phone?.trim() || !/^[0-9+()\-\s]{8,30}$/.test(account.phone.trim())) return false;
  if (account.accountType === "travel_agency") return Boolean(account.companyBranchName?.trim() && account.contactPersonName?.trim());
  return Boolean(account.name?.trim()); // Existing profiles without a type retain the individual default.
}
