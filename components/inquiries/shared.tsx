"use client";
import { InquiryConversation } from "./inquiry-conversation";
import type { ReactNode } from "react";
import Link from "next/link";
import { inquiryCategories, inquiryStatuses, inquiryDate, mailStatusLabels, type InquiryDetail } from "@/lib/inquiries/types";

export const controlClass = "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
export function ContactShell({ title, children }: { title: string; children: ReactNode }) {
return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-card px-5 py-4">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <Link href="/?customerMode=home" className="font-semibold">Reserve</Link>
        <nav className="flex flex-wrap gap-4 text-sm text-primary">
          <Link href="/contact">お問い合わせ</Link>
          <Link href="/contact/history">問い合わせ履歴</Link>
          <Link href="/?customerMode=home">お手続きを選択</Link>
        </nav>
      </div>
    </header>
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold">{title}</h1>{children}</section>
  </main>;
}
export function InquiryContent({ detail, admin = false, children }: { detail: InquiryDetail; admin?: boolean; children?: ReactNode }) {
  const i = detail.inquiry;
  return <div className="space-y-6 text-sm">
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 break-words">
      <dt className="text-muted-foreground">問い合わせ番号</dt>
      <dd className="font-medium">{i.number}</dd>
      <dt className="text-muted-foreground">受付日時</dt>
      <dd>{inquiryDate(i.createdAt)}</dd>
      <dt className="text-muted-foreground">対応状況</dt>
      <dd>{inquiryStatuses[i.status]}</dd>
      <dt className="text-muted-foreground">種別</dt>
      <dd>{inquiryCategories[i.category]}</dd>
      <dt className="text-muted-foreground">氏名</dt>
      <dd>{i.name}</dd>
      <dt className="text-muted-foreground">メールアドレス</dt>
      <dd className="min-w-0 break-all">{i.email}</dd>{i.reservationNumber && <>
        <dt className="text-muted-foreground">予約番号</dt>
        <dd>{i.reservationNumber}</dd>
      </>}{admin && <>
        <dt className="text-muted-foreground">受付メール</dt>
        <dd>{mailStatusLabels[i.receiptEmailStatus]}</dd>
      </>}</dl>
    <section className="space-y-4 border-t border-border pt-4">
      <h2 className="font-semibold">やり取りの履歴</h2>
      <InquiryConversation detail={detail} admin={admin} />
    </section>{children}
  </div>;
}
