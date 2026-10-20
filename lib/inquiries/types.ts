import { z } from "zod";
export class InquiryError extends Error {
  constructor(message: string, public statusCode = 409) { super(message); }
}
export const inquiryCategories = { reservation: "予約について", service: "サービスについて", other: "その他" } as const;
export const inquiryStatuses = { unhandled: "未対応", in_progress: "対応中", answered: "回答済み", closed: "完了" } as const;
export type InquiryStatus = keyof typeof inquiryStatuses;
export type InquiryCategory = keyof typeof inquiryCategories;
export type InquiryMailStatus = "pending" | "sending" | "sent" | "failed" | "unknown";
const subject = z.string().trim().min(1, "件名を入力してください。").max(200, "件名は200文字以内です。").refine(v => !/[\r\n\u0000]/.test(v), "件名に改行は使用できません。");
export const inquiryFormSchema = z.object({ name: z.string().trim().min(1, "氏名を入力してください。").max(100), email: z.string().trim().email("メールアドレスを確認してください。").max(255).transform(v => v.toLowerCase()), category: z.enum(["reservation", "service", "other"]), subject, body: z.string().trim().min(1, "問い合わせ内容を入力してください。").max(5000, "本文は5,000文字以内です。").refine(v => !v.includes("\u0000"), "使用できない文字があります。") });
export type InquiryFormInput = z.input<typeof inquiryFormSchema>;
export const inquirySubmissionSchema = inquiryFormSchema.extend({ requestKey: z.string().uuid(), formToken: z.string().max(2048).optional(), website: z.string().max(200).default("") }).strict();
export const inquiryReplySchema = z.object({ subject, body: z.string().trim().min(1, "回答本文を入力してください。").max(10000).refine(v => !v.includes("\u0000"), "使用できない文字があります。"), requestKey: z.string().uuid(), revision: z.number().int().positive() }).strict();
export const inquiryStatusSchema = z.object({ status: z.enum(["in_progress", "closed"]), revision: z.number().int().positive() }).strict();
export type Inquiry = {
    number: string;
    reservationNumber: string | null;
    name: string;
    email: string;
    category: InquiryCategory;
    subject: string;
    body: string;
    status: InquiryStatus;
    createdAt: string;
    updatedAt: string;
    revision: number;
    receiptEmailStatus: InquiryMailStatus;
};
export type InquiryReply = {
    id: string;
    subject: string;
    body: string;
    emailStatus: InquiryMailStatus;
    sentAt: string | null;
    createdAt: string;
    adminLabel?: string | null;
    lastError?: string | null;
};
export type InquiryDetail = {
    inquiry: Inquiry;
    replies: InquiryReply[];
};
export type InquiryList = {
    inquiries: Inquiry[];
    total: number;
    page: number;
    pageSize: number;
};
export type SenderSnapshot = {
    from: string;
    replyTo: string;
    testRecipient: string;
};
export function inquiryDate(value: string) { return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
export function inquiryNumber(value: string) { if (!/^INQ-[1-9]\d{0,9}$/.test(value) || Number(value.slice(4)) > 2147483647)
    throw new InquiryError("問い合わせが見つかりません。", 404); return Number(value.slice(4)); }
export function parseInquiryQuery(url: URL) { const schema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(["unhandled", "in_progress", "answered", "closed"]).optional(), category: z.enum(["reservation", "service", "other"]).optional(), keyword: z.string().trim().max(100).default("") }).strict(); const entries: Record<string, string> = {}; for (const [key, value] of url.searchParams) {
    if (key in entries)
        throw new InquiryError("検索条件が重複しています。", 400);
    entries[key] = value;
} return schema.parse(entries); }
export type InquiryQuery = ReturnType<typeof parseInquiryQuery>;
export const mailStatusLabels: Record<InquiryMailStatus, string> = { pending: "送信待ち", sending: "送信中", sent: "送信済み", failed: "送信できませんでした", unknown: "送信結果の確認が必要です" };

/** Reservation history accepts paging only; ownership and reservation IDs are resolved on the server. */
export function parseReservationInquiryQuery(url: URL): InquiryQuery {
  const entries: Record<string, string> = Object.create(null);
  for (const [key, value] of url.searchParams) {
    if (Object.hasOwn(entries, key)) throw new InquiryError("検索条件が重複しています。", 400);
    entries[key] = value;
  }
  const query = z.object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(20).default(10),
  }).strict().parse(entries);
  return { ...query, keyword: "" };
}
