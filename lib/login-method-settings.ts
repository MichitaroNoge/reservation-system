import { z } from "zod";

export const currentPasswordSchema = z.object({ currentPassword: z.string().min(1, "現在のパスワードを入力してください。") });
export function loginMethodPasswordSchema(hasPassword: boolean) {
  return z.object({
    currentPassword: z.string().default("").refine(value => !hasPassword || value.length > 0, "現在のパスワードを入力してください。"),
    password: z.string().min(8, "8文字以上で入力してください。").max(128, "128文字以内で入力してください。"),
    confirmPassword: z.string(),
  }).refine(values => values.password === values.confirmPassword, { path: ["confirmPassword"], message: "パスワードが一致しません。" });
}
