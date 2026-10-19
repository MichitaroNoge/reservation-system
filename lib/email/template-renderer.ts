import { emailTemplateDefinitions, isEmailTemplateKey, type EmailTemplateKey, type TemplateVariables } from "./email-template-catalog";
import { ApiValidationError } from "../api-validation";

const variablePattern = /{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g;

export function validateTemplate(templateKey: string, subject: string, body: string) {
  if (!isEmailTemplateKey(templateKey)) throw new ApiValidationError(`未対応のtemplateKeyです: ${templateKey}`);
  if (!subject.trim()) throw new ApiValidationError("件名を入力してください。");
  if (!body.trim()) throw new ApiValidationError("本文を入力してください。");
  const combined = `${subject}\n${body}`;
  const withoutValidVariables = combined.replace(variablePattern, "");
  if (withoutValidVariables.includes("{{") || withoutValidVariables.includes("}}")) throw new ApiValidationError("テンプレート変数の記述が正しくありません。");
  const allowed = new Set(Object.keys(emailTemplateDefinitions[templateKey].variables));
  for (const variable of extractTemplateVariables(combined)) {
    if (!allowed.has(variable)) throw new ApiValidationError(`このテンプレートでは {{${variable}}} を使用できません。`);
  }
}

export function renderTemplate(templateKey: EmailTemplateKey, subject: string, body: string, variables: TemplateVariables) {
  validateTemplate(templateKey, subject, body);
  const render = (value: string) => value.replace(variablePattern, (_match, name: string) => {
    const replacement = variables[name];
    if (replacement === undefined || replacement === null || replacement === "") throw new Error(`テンプレート変数 {{${name}}} の値がありません。`);
    return String(replacement);
  });
  return { subject: render(subject), body: render(body) };
}

export function extractTemplateVariables(value: string) {
  return [...value.matchAll(variablePattern)].map((match) => match[1]);
}
