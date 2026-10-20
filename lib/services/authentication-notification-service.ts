import { getAuth } from "firebase-admin/auth";
import { randomUUID } from "node:crypto";
import { getFirebaseAdminApp } from "../auth";
import { buildEmailContent } from "../email/email-layout";
import { repositoryEmailClient } from "../email/email-sender-settings";
import type { ReservationRepository } from "../repositories/reservation-repository";
export async function notifyAuthenticationChange(repository: ReservationRepository, uid: string, action: string) {
  try {
    const user = await getAuth(getFirebaseAdminApp()).getUser(uid);
    if (!user.email || !user.emailVerified) return "failed" as const;
    await (await repositoryEmailClient(repository)).send({ to: user.email, ...buildEmailContent("ログイン方法の変更のお知らせ", `${action}。\n\nこの操作に心当たりがない場合は、サービス管理者にお問い合わせください。`), idempotencyKey: `auth-change/${randomUUID()}` });
    return "sent" as const;
  } catch { console.warn(JSON.stringify({ event: "authentication_change_notification_failed" })); return "failed" as const; }
}
