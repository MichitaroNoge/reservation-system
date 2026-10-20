import { Resend } from "resend";

export type SendEmailInput = {
  to: string;
  bcc?: string[];
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

  constructor(message: string, public readonly outcome: "failed" | "unknown" = "unknown") {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export class ResendEmailClient implements EmailClient {
  private resend: Resend;
  private from: string;
  private replyTo?: string;
  private testRecipient?: string;

  constructor(options?: { apiKey?: string; from?: string; replyTo?: string; testRecipient?: string }) {
    const apiKey = options?.apiKey ?? process.env.RESEND_API_KEY;
    const from = options?.from ?? process.env.RESEND_FROM_EMAIL;
    const replyTo = options?.replyTo ?? process.env.RESEND_REPLY_TO_EMAIL;
    const testRecipient = options?.testRecipient ?? process.env.RESEND_TEST_RECIPIENT;
    if (!apiKey) throw new EmailDeliveryError("RESEND_API_KEY が未設定です。", "failed");
    if (!from) throw new EmailDeliveryError("RESEND_FROM_EMAIL が未設定です。", "failed");
    this.resend = new Resend(apiKey);
    this.from = from;
    this.replyTo = replyTo || undefined;
    this.testRecipient = testRecipient || undefined;
  }

  async send(input: SendEmailInput) {
    const { data, error } = await this.resend.emails.send(
      {
        from: this.from,
        to: this.testRecipient ?? input.to,
        bcc: this.testRecipient ? undefined : input.bcc,
        replyTo: this.replyTo,
        subject: input.subject,
        text: input.text,
        html: input.html,
      },
      {
        idempotencyKey: input.idempotencyKey,
      },
    );
    if (error) throw new EmailDeliveryError("メールの送信に失敗しました。", error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 409 ? "failed" : "unknown");
    if (!data?.id) throw new EmailDeliveryError("メールの送信結果を確認できませんでした。");
    return { id: data.id };
  }
}
