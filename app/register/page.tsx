import type { Metadata } from "next";
import CustomerApp from "../reservations/customer-app";

export const metadata: Metadata = { title: "新規登録 | 団体予約" };

export default function RegisterPage() {
  return <CustomerApp initialMode="register" />;
}
