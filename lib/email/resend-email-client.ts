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

export class EmailDeliveryError extends Error {
  statusCode = 502;

  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export class ResendEmailClient implements EmailClient {
  private resend: Resend;
  private from: string;
  private replyTo?: string;

  constructor(options?: { apiKey?: string; from?: string; replyTo?: string }) {
    const apiKey = options?.apiKey ?? process.env.RESEND_API_KEY;
    const from = options?.from ?? process.env.RESEND_FROM_EMAIL;
    const replyTo = options?.replyTo ?? process.env.RESEND_REPLY_TO_EMAIL;
    if (!apiKey) throw new EmailDeliveryError("RESEND_API_KEY が未設定です。");
    if (!from) throw new EmailDeliveryError("RESEND_FROM_EMAIL が未設定です。");
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
    if (error) throw new EmailDeliveryError(`確認メールの送信に失敗しました: ${error.message}`);
    if (!data?.id) throw new EmailDeliveryError("確認メールの送信結果を確認できませんでした。");
    return { id: data.id };
  }
}
