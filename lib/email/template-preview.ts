import { type EmailTemplateKey, type TemplateVariables } from "./email-template-catalog";
import { renderTemplate } from "./template-renderer";

const sampleVariables: TemplateVariables = {
  customerName: "山田太郎", reservationId: "RSV-1001", reservationDate: "2026-10-10",
  reservationTime: "18:00", storeName: "広島店", numberOfGuests: "20", menuName: "季節のコース",
  oldEmail: "old@example.com", newEmail: "new@example.com", changedAt: "2026年10月14日 22:00",
  email: "contact@example.com", verificationUrl: "https://example.com/verify?token=sample", expiresAt: "2026年10月15日 22:00",
};

export function renderTemplatePreview(templateKey: EmailTemplateKey, subject: string, body: string) {
  return renderTemplate(templateKey, subject, body, sampleVariables);
}
