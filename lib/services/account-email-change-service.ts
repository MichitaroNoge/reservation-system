import type { Account } from "../domain";
import { buildEmailContent } from "../email/email-layout";
import { repositoryEmailClient } from "../email/email-sender-settings";
import { renderRepositoryEmail } from "../email/template-email-service";
import type { ReservationRepository } from "../repositories/reservation-repository";

export async function sendAccountEmailChangedNotification(repository: ReservationRepository, account: Account, oldEmail: string, newEmail: string, changedAt: string) {
  const rendered = await renderRepositoryEmail(repository, "account_email_changed", {
    customerName: account.name,
    oldEmail,
    newEmail,
    changedAt: new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(changedAt)),
  });
  const deliveryKey = `account-email-changed/${account.firebaseUid}/${changedAt}`;
  const delivery = await repository.createEmailDelivery({ deliveryKey, templateKey: "account_email_changed", recipient: oldEmail, subject: rendered.subject, body: rendered.body, status: "pending", requestedAt: changedAt, sentAt: null, lastError: null });
  try {
    await (await repositoryEmailClient(repository)).send({ to: oldEmail, ...buildEmailContent(delivery.subject, delivery.body), idempotencyKey: deliveryKey });
    await repository.updateEmailDelivery(deliveryKey, { status: "sent", sentAt: changedAt, lastError: null });
  } catch (error) {
    await repository.updateEmailDelivery(deliveryKey, { status: "failed", sentAt: null, lastError: error instanceof Error ? error.message : "Unknown email error" });
  }
}
