import { Resend } from "resend";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export type EmailClient = {
  send(input: SendEmailInput): Promise<{ id: string }>;
};

export class ResendEmailClient implements EmailClient {
  private resend: Resend;
  private from: string;
  private replyTo?: string;

  constructor(options?: { apiKey?: string; from?: string; replyTo?: string }) {
    const apiKey = options?.apiKey ?? process.env.RESEND_API_KEY;
    const from = options?.from ?? process.env.RESEND_FROM_EMAIL;
    const replyTo = options?.replyTo ?? process.env.RESEND_REPLY_TO_EMAIL;
    if (!apiKey) throw new Error("RESEND_API_KEY is required.");
    if (!from) throw new Error("RESEND_FROM_EMAIL is required.");
    this.resend = new Resend(apiKey);
    this.from = from;
    this.replyTo = replyTo || undefined;
  }

  async send(input: SendEmailInput) {
    const { data, error } = await this.resend.emails.send(
      {
        from: this.from,
        to: input.to,
        replyTo: this.replyTo,
        subject: input.subject,
        text: input.text,
        html: input.html,
      },
      {
        idempotencyKey: input.idempotencyKey,
      },
    );
    if (error) throw new Error(error.message);
    if (!data?.id) throw new Error("Resend did not return an email id.");
    return { id: data.id };
  }
}
