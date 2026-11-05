import { z } from "zod";

export const MAX_INQUIRY_PEOPLE = 999;
export const PAST_MEAL_DATE_MESSAGE = "食事日は本日以降を指定してください。";

export function inquiryToday(now = Date.now()) {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const inquiryAvailabilitySchema = z.object({
  mealDate: z.string({ required_error: "食事日を入力してください。" }).min(1, "食事日を入力してください。").regex(/^\d{4}-\d{2}-\d{2}$/, "食事日を正しく入力してください。").refine(value => {
    const date = new Date(`${value}T00:00:00Z`);
    return !value.startsWith("0000-") && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "実在する食事日を入力してください。"),
  mealStartTime: z.string({ required_error: "食事開始時間を入力してください。" }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, "食事開始時間を時・分で入力してください。"),
  people: z.coerce.number({ invalid_type_error: "人数を入力してください。" }).int("人数は整数で入力してください。").min(1, "人数は1名以上で入力してください。").max(MAX_INQUIRY_PEOPLE, "人数は999名以内で入力してください。"),
});
export type InquiryAvailability = z.output<typeof inquiryAvailabilitySchema>;

/** The current-day rule applies to new submissions, not historical records or accepted retries. */
export function availabilityDateError(mealDate: string | undefined, now = Date.now()) {
  if (!mealDate || !inquiryAvailabilitySchema.shape.mealDate.safeParse(mealDate).success) return;
  return mealDate < inquiryToday(now) ? PAST_MEAL_DATE_MESSAGE : undefined;
}

/** Shared plain-text view for the original message, receipt and administrator's reply email. */
export function inquiryMessageText(input: { category: string; body: string; availability?: InquiryAvailability | null }) {
  if (input.category !== "availability" || !input.availability) return input.body;
  const { mealDate, mealStartTime, people } = input.availability;
  return [
    `食事日: ${mealDate.replaceAll("-", "/")}`,
    `食事開始時間: ${mealStartTime}（日本時間）`,
    `人数: ${people}名`,
    "",
    "その他質問:",
    input.body || "記載なし",
  ].join("\n");
}
