import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yoyaku | 予約をもっとシンプルに",
  description: "心地よい時間を、かんたん予約。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
