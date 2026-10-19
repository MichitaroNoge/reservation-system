import type { Metadata } from "next";
import ReservationApp from "../page";

export const metadata: Metadata = { title: "ログイン | 団体予約" };

export default function LoginPage() {
  return <ReservationApp key="customer-login" />;
}
