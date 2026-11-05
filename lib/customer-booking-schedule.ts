import { z } from "zod";

export function customerBookingScheduleSchema(minimumDate: string | null) {
  return z.object({
    date: z.string().date("利用日を入力してください。").refine(date => !minimumDate || date >= minimumDate, `利用日は${minimumDate}以降を指定してください。`),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "開始時間を入力してください。"),
    people: z.number({ invalid_type_error: "人数は1〜999名の整数で入力してください。" }).int("人数は整数で入力してください。").min(1, "人数は1名以上で入力してください。").max(999, "人数は999名以内で入力してください。"),
  });
}
