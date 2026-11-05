import { z } from "zod";

export const customerEmailChangeSchema = z.object({
  email: z.string().trim().email("メールアドレスの形式を確認してください。").max(255, "255文字以内で入力してください。"),
  confirmation: z.string().trim().min(1, "確認用のメールアドレスを入力してください。"),
}).refine(values => values.email === values.confirmation, {
  path: ["confirmation"], message: "新しいメールアドレスが一致しません。",
});
