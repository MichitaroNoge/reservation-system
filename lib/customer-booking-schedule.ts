import { z } from "zod";

export const customerBookingStartTimes = Array.from({ length: 24 * 4 }, (_, index) =>
  `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`,
);

export const customerBookingTimeSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "開始時間を入力してください。")
    .refine(time => customerBookingStartTimes.includes(time), "開始時間は15分単位（00分・15分・30分・45分）で指定してください。"),
});

export function customerBookingScheduleSchema(minimumDate: string | null) {
  return customerBookingTimeSchema.extend({
    date: z.string().date("利用日を入力してください。").refine(date => !minimumDate || date >= minimumDate, `利用日は${minimumDate}以降を指定してください。`),
    people: z.number({ error: "人数は1〜999名の整数で入力してください。" }).int("人数は整数で入力してください。").min(1, "人数は1名以上で入力してください。").max(999, "人数は999名以内で入力してください。"),
  });
}
