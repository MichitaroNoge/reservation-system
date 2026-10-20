import { limitEmailRecipients } from "../abuse-limits";
import type { EmailSettings } from "../domain";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { ResendEmailClient } from "./resend-email-client";
import { ApiValidationError } from "../api-validation";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function allowedFromEmails() {
  const configured = (process.env.RESEND_ALLOWED_FROM_EMAILS ?? "")
    .split(",")
    .map((value) => extractEmail(value.trim()))
    .filter(Boolean);
  const fallback = extractEmail(process.env.RESEND_FROM_EMAIL ?? "");
  return [...new Set([...configured, fallback].filter(Boolean))];
}

export function defaultEmailSettings(): EmailSettings {
  return {
    settingKey: "default",
    senderName: "予約システム",
    fromEmail: allowedFromEmails()[0] ?? "",
    replyToEnabled: Boolean(process.env.RESEND_REPLY_TO_EMAIL),
    replyToEmail: process.env.RESEND_REPLY_TO_EMAIL || null,
  };
}

export function validateEmailSettings(input: EmailSettings) {
  if (!input.senderName.trim()) throw new ApiValidationError("送信者名を入力してください。");
  if (!allowedFromEmails().includes(input.fromEmail)) throw new ApiValidationError("送信元は認証済みの候補から選択してください。");
  if (input.replyToEnabled && !emailPattern.test(input.replyToEmail ?? "")) throw new ApiValidationError("返信先メールアドレスを正しく入力してください。");
}

export async function getEmailSenderSnapshot(repository: ReservationRepository) {
  const settings = (await repository.getEmailSettings()) ?? defaultEmailSettings();
  validateEmailSettings(settings);
  return { from: `${settings.senderName.trim()} <${settings.fromEmail}>`, replyTo: settings.replyToEnabled ? settings.replyToEmail ?? "" : "", testRecipient: process.env.RESEND_TEST_RECIPIENT ?? "" };
}

export async function repositoryEmailClient(repository: ReservationRepository, snapshot?: import("../inquiries/types").SenderSnapshot) {
  const sender = snapshot ?? await getEmailSenderSnapshot(repository);
  const client = new ResendEmailClient({
    from: sender.from,
    replyTo: sender.replyTo,
    testRecipient: sender.testRecipient,
  });
  return { async send(input: import("./resend-email-client").SendEmailInput) {
    await limitEmailRecipients([input.to, ...(input.bcc ?? [])]);
    try { const result = await client.send(input); console.info(JSON.stringify({ event: "email_send_success" })); return result; }
    catch (error) { console.error(JSON.stringify({ event: "email_send_failure", severity: "ERROR" })); throw error; }
  } };
}

function extractEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}
