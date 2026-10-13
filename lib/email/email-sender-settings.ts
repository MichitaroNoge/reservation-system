import type { EmailSettings } from "../domain";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { ResendEmailClient } from "./resend-email-client";

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
  if (!input.senderName.trim()) throw new Error("送信者名を入力してください。");
  if (!allowedFromEmails().includes(input.fromEmail)) throw new Error("送信元は認証済みの候補から選択してください。");
  if (input.replyToEnabled && !emailPattern.test(input.replyToEmail ?? "")) throw new Error("返信先メールアドレスを正しく入力してください。");
}

export async function repositoryEmailClient(repository: ReservationRepository) {
  const settings = (await repository.getEmailSettings()) ?? defaultEmailSettings();
  validateEmailSettings(settings);
  return new ResendEmailClient({
    from: `${settings.senderName.trim()} <${settings.fromEmail}>`,
    replyTo: settings.replyToEnabled ? settings.replyToEmail ?? undefined : "",
  });
}

function extractEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}
