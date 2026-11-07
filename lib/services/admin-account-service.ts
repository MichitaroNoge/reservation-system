import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "../auth";
import { ApiValidationError } from "../api-validation";
import { normalizeLoginEmail } from "../login-email";
import type { ReservationRepository } from "../repositories/reservation-repository";

/** Admin compatibility APIs attach profiles only to an existing Firebase identity. */
export async function createAdminAccountProfile(repository: ReservationRepository, body: Record<string, unknown>) {
  const firebaseUid = typeof body.firebaseUid === "string" ? body.firebaseUid.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const contact = typeof body.contact === "string" ? normalizeLoginEmail(body.contact) : "";
  if (!firebaseUid || !name || !contact) throw new ApiValidationError("Firebase UID、氏名、ログイン用メールアドレスを入力してください。");
  let identity;
  try { identity = await getAuth(getFirebaseAdminApp()).getUser(firebaseUid); }
  catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") throw Object.assign(new Error("Firebaseの認証ユーザーが見つかりません。"), { statusCode: 404 });
    throw error;
  }
  if (identity.disabled || !identity.email) throw Object.assign(new Error("このFirebase認証ユーザーではアカウントを作成できません。"), { statusCode: 403 });
  const email = normalizeLoginEmail(identity.email);
  if (contact !== email) throw Object.assign(new Error("Firebaseのログイン用メールアドレスと一致しません。最新の認証情報を確認してください。"), { statusCode: 409 });
  return repository.createAccount({
    firebaseUid, name, contact: email,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    address: typeof body.address === "string" ? body.address : undefined,
    accountType: body.accountType === "travel_agency" ? "travel_agency" : "individual",
    companyBranchName: typeof body.companyBranchName === "string" ? body.companyBranchName : undefined,
    contactPersonName: typeof body.contactPersonName === "string" ? body.contactPersonName : undefined,
  });
}
