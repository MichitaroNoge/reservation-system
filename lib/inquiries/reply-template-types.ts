import { z } from "zod";

export const replyTemplateFields = z.object({
  name: z.string().trim().min(1, "テンプレート名を入力してください。").max(100, "テンプレート名は100文字以内です。").refine(value => !/[\r\n\u0000]/.test(value), "テンプレート名に改行は使用できません。"),
  body: z.string().trim().min(1, "挿入する定型文を入力してください。").max(10000, "定型文は10,000文字以内です。").refine(value => !value.includes("\u0000"), "使用できない文字があります。"),
  isActive: z.boolean(),
}).strict();
export const createReplyTemplateSchema = replyTemplateFields.extend({ id: z.string().uuid() }).strict();
export const updateReplyTemplateSchema = replyTemplateFields.extend({ revision: z.number().int().positive() }).strict();
export type ReplyTemplateFields = z.infer<typeof replyTemplateFields>;
export type ReplyTemplate = ReplyTemplateFields & { id: string; revision: number; createdAt: string; updatedAt: string };
export type ReplyTemplateSummary = Omit<ReplyTemplate, "body">;
