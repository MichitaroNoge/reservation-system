/** Login identity only. Additional contact addresses are deliberately excluded. */
export const normalizeLoginEmail = (email: string) => email.trim().toLowerCase();
export const loginEmailConflictMessage = "このログイン用メールアドレスは別のアカウントで使用されています。無効化されたアカウントがある場合は管理者にお問い合わせください。";
export function loginEmailConflict() { return Object.assign(new Error(loginEmailConflictMessage), { statusCode: 409 }); }
export function isLoginEmailConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; constraint?: string; cause?: unknown };
  return value.code === "23505" && value.constraint === "account_active_login_email_unique" || isLoginEmailConstraintError(value.cause);
}
