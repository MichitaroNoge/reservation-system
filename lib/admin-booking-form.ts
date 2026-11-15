import { z } from "zod";
import { customerBookingScheduleSchema } from "./customer-booking-schedule";

/** Admin editing allows historical dates; lead-time and state rules remain server-owned. */
export const adminBookingEditFormSchema = customerBookingScheduleSchema(null).extend({
  name: z.string().trim().min(1, "お名前・会社名を入力してください。").max(100, "100文字以内で入力してください。"),
  email: z.string().email("メールアドレスを正しく入力してください。"),
  phone: z.string().trim().regex(/^[0-9+\-()\s]{8,30}$/, "電話番号は8〜30文字の数字・記号で入力してください。"),
  address: z.string().max(500, "500文字以内で入力してください。"),
  menuItems: z.array(z.string()),
  tcCount: z.number().int("整数を入力してください。").min(0).max(999).optional(),
  dgCount: z.number().int("整数を入力してください。").min(0).max(999).optional(),
  remarks: z.string().max(1000, "1000文字以内で入力してください。").optional(),
}).passthrough();

// New group registrations already require these fields. Historical edits retain
// the existing API's ability to preserve incomplete optional group information.
export const adminBookingFormSchema = adminBookingEditFormSchema.superRefine((value, context) => {
  if (value.bookingType !== "travel_agency_group") return;
  for (const [key, label] of [["bookingContactName", "予約担当者名"], ["dayContactName", "当日責任者名"], ["dayContactPhone", "当日責任者携帯番号"], ["groupName", "団体名"], ["groupType", "団体種別"]]) {
    const raw = value[key];
    if (typeof raw !== "string" || !raw.trim()) context.addIssue({ code: "custom", path: [key], message: `${label}を入力してください。` });
  }
});
