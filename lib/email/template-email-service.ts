import type { EmailDelivery } from "../domain";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { buildEmailContent } from "./email-layout";
import { defaultEmailTemplates, isEmailTemplateKey, type EmailTemplateKey, type TemplateVariables } from "./email-template-catalog";
import { renderTemplate } from "./template-renderer";

export async function renderRepositoryEmail(repository: ReservationRepository, templateKey: EmailTemplateKey, variables: TemplateVariables) {
  const stored = await repository.getEmailTemplate(templateKey);
  const fallback = defaultEmailTemplates().find((item) => item.templateKey === templateKey)!;
  const template = stored ?? await repository.upsertEmailTemplate(fallback);
  if (!template.isActive) throw new Error(`メールテンプレート「${template.name}」は無効です。`);
  if (!isEmailTemplateKey(template.templateKey)) throw new Error(`未対応のtemplateKeyです: ${template.templateKey}`);
  const rendered = renderTemplate(templateKey, template.subject, template.body, variables);
  return { ...buildEmailContent(rendered.subject, rendered.body), body: rendered.body };
}

export async function getOrCreateEmailDelivery(repository: ReservationRepository, input: EmailDelivery) {
  return (await repository.getEmailDelivery(input.deliveryKey)) ?? repository.createEmailDelivery(input);
}
