import type { Metadata } from "next";
import CustomerApp from "../reservations/customer-app";

export const metadata: Metadata = { title: "ログイン | 団体予約" };

export default function LoginPage() {
  return <CustomerApp initialMode="login" />;
}
