"use client";
import type { ReactNode } from "react";
import { inquiryMessageText } from "@/lib/inquiries/availability";
import { inquiryDate, mailStatusLabels, type InquiryDetail, type InquiryMailStatus, type InquiryReply } from "@/lib/inquiries/types";

/** Submitted replies are available in history independently of email delivery. */
const customerEmailLabels: Record<InquiryMailStatus, string> = {
  pending: "メール送信待ち",
  sending: "メール送信中",
  sent: "メール送信済み",
  failed: "メールを送信できませんでした。回答はこちらでご確認いただけます。",
  unknown: "メールの送信結果を確認できません。回答はこちらでご確認いただけます。",
  not_sent: "回答はこちらの履歴でご確認いただけます。",
};
export function InquiryConversation({ detail, admin = false, originalMessageAction, onlyReplies = false, replyActions }: { detail: InquiryDetail; admin?: boolean; originalMessageAction?: ReactNode; onlyReplies?: boolean; replyActions?: (reply: InquiryReply) => ReactNode }) {
  const messages = [
    ...(!onlyReplies ? [{ id: detail.inquiry.number, author: "お客様", name: admin ? detail.inquiry.name : null, subject: detail.inquiry.subject, body: inquiryMessageText(detail.inquiry), at: detail.inquiry.createdAt, order: 0, status: null, action: originalMessageAction }] : []),
    ...detail.replies.map(reply => ({
      id: reply.id, author: "管理者", name: admin ? reply.adminLabel : null, subject: reply.subject,
      body: reply.body, at: reply.createdAt, order: 1, status: reply.emailStatus, action: replyActions?.(reply),
    })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.order - b.order || a.id.localeCompare(b.id));
  return <ol aria-label={onlyReplies ? "回答履歴" : "やり取りの履歴"} className="space-y-5 text-sm">
    {messages.map(message => <li key={message.id} className={`min-w-0 border-l-2 pl-4 ${message.author === "管理者" ? "border-primary" : "border-border"}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 break-words font-semibold">{message.author}{message.name && message.name !== message.author && <span className="ml-2 break-words font-normal text-muted-foreground">{message.name}</span>}</span>
        <time dateTime={message.at} className="text-xs text-muted-foreground">{inquiryDate(message.at)}</time>
      </div>
      {message.status && <p className={`mt-1 text-xs ${message.status === "sent" ? "text-muted-foreground" : "text-warning"}`}>{admin ? `メール：${mailStatusLabels[message.status]}` : customerEmailLabels[message.status]}</p>}
      <h3 className="mt-2 break-words font-medium">{message.subject}</h3>
      <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>
      {message.action}
    </li>)}
  </ol>;
}
