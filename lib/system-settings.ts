import { z } from "zod";

// Values are Japan-local wall times, matching the reservation date/time fields.
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "日時を入力してください。")
  .refine(value => {
    const parsed = new Date(`${value}:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 16) === value;
  }, "正しい日時を入力してください。");
export const acceptanceBlockSchema = z.object({
  start: localDateTime,
  end: localDateTime,
  reason: z.string().trim().max(200, "理由は200文字以内で入力してください。"),
}).strict().refine(value => value.start < value.end, { path: ["end"], message: "終了は開始より後の日時にしてください。" });
export const systemSettingsSchema = z.object({
  acceptanceCapacity: z.number().int("整数で入力してください。").min(0, "0以上で入力してください。").max(99999, "99999以下で入力してください。").nullable(),
  reservationLeadDays: z.number().int("日数は整数で入力してください。").min(0, "0以上で入力してください。").max(365, "365以下で入力してください。").optional(),
  blockedPeriods: z.array(acceptanceBlockSchema).max(200, "受入不可期間は200件以内で設定してください。").optional(),
}).strict();
