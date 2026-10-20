import { ApiAuthError } from "../auth";
import { ApiValidationError, validateCustomerInput } from "../api-validation";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { repositoryTransaction } from "../repositories/transaction";
import { assertAccountNotDeleting } from "./account-lifecycle-service";

function profileInput(body: Record<string, unknown>, contact: string) {
  const input = validateCustomerInput({ ...body, name: body.accountType === "travel_agency" ? body.companyBranchName : body.name, contact });
  if (input.accountType === "travel_agency") {
    if (!input.companyBranchName || !input.contactPersonName) throw new ApiValidationError("会社・支店名と担当者名を入力してください。");
    input.name = input.companyBranchName;
  } else {
    input.companyBranchName = undefined;
    input.contactPersonName = undefined;
  }
  return input;
}

export async function withAccountTransaction<T>(repository: ReservationRepository, id: string, work: (repository: ReservationRepository) => Promise<T>) {
  const account = [...await repository.listAccounts(), ...await repository.listInactiveAccounts()].find(account => account.id === id);
  if (!account) throw Object.assign(new Error("アカウントが見つかりません。"), { statusCode: 404 });
  return repositoryTransaction(repository, `account:${account.firebaseUid ?? id}`, async repository => {
    if (account.firebaseUid) await assertAccountNotDeleting(repository, account.firebaseUid);
    return work(repository);
  });
}

export async function updateAuthenticatedAccountProfile(repository: ReservationRepository, uid: string, body: Record<string, unknown>) {
  return repositoryTransaction(repository, `account:${uid}`, async repository => {
    await assertAccountNotDeleting(repository, uid);
    const existing = await repository.findAccountByFirebaseUid(uid);
    if (!existing?.id) throw Object.assign(new Error("アカウントが見つかりません。"), { statusCode: 404 });
    return repository.updateAccount(existing.id, profileInput(body, existing.contact));
  });
}

export async function saveAuthenticatedAccountProfile(repository: ReservationRepository, user: { uid: string; email?: string }, body: Record<string, unknown>) {
  await assertAccountNotDeleting(repository, user.uid);
  if (!user.email) throw new ApiValidationError("認証済みメールアドレスを確認できません。");
  const input = profileInput(body, user.email);
  const existing = await repository.findAccountByFirebaseUid(user.uid);
  if (!existing && (await repository.listInactiveAccounts()).some(account => account.firebaseUid === user.uid)) {
    throw new ApiAuthError("このアカウントは無効化されています。管理者にお問い合わせください。", 403);
  }
  const account = existing
    ? await repository.updateAccount(existing.id!, input)
    : await repository.createAccount({ ...input, firebaseUid: user.uid });
  return { account, created: !existing };
}

export async function updateAdminAccountProfile(repository: ReservationRepository, id: string, body: Record<string, unknown>) {
  return withAccountTransaction(repository, id, async repository => {
    const existing = [...await repository.listAccounts(), ...await repository.listInactiveAccounts()].find(account => account.id === id);
    if (!existing) throw Object.assign(new Error("アカウントが見つかりません。"), { statusCode: 404 });
    if (typeof body.contact === "string" && body.contact.trim().toLowerCase() !== existing.contact.trim().toLowerCase()) {
      throw new ApiValidationError("ログイン用メールアドレスは、本人のアカウント画面から変更してください。");
    }
    const input = profileInput({ ...body, id }, existing.contact);
    return repository.updateAccount(id, input);
  });
}

export async function resolveLegacyAccountId(repository: ReservationRepository, name: string, explicitId?: string) {
  const accounts = await repository.listAccounts();
  if (explicitId) return accounts.find(account => account.id === explicitId)?.id ?? "";
  // Next.js route params have already been decoded; never decode a second time.
  const matches = accounts.filter(account => account.name === name);
  if (matches.length > 1) throw Object.assign(new Error("同名のアカウントが複数あります。アカウントIDで指定してください。"), { statusCode: 409 });
  return matches[0]?.id ?? "";
}
