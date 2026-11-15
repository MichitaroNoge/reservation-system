import type { InquiryMailStatus, InquiryReply } from "./types";

export function isReplyDeliveryComplete(status: InquiryMailStatus) {
  return status === "sent" || status === "not_sent";
}

/** Show every unresolved reply, including older replies in legacy threads. */
export function repliesForDeliveryResult(replies: InquiryReply[]) {
  const ordered = [...replies].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
  const pending = ordered.filter(reply => !isReplyDeliveryComplete(reply.emailStatus));
  return pending.length ? pending : ordered.slice(-1);
}

export const replyDeliveryPresentation = {
  pending: { label: "送信待ち", description: "お客様への通知メールは送信待ちです。送信状況は自動で更新されます。", variant: "secondary" },
  sending: { label: "送信中", description: "お客様への通知メールを送信しています。送信状況は自動で更新されます。", variant: "secondary" },
  sent: { label: "送信済み", description: "お客様への通知メールを送信しました。", variant: "success" },
  failed: { label: "送信失敗", description: "回答は保存されていますが、通知メールを送信できませんでした。同じメールの再試行ができます。", variant: "destructive" },
  unknown: { label: "結果の確認が必要", description: "回答は保存されていますが、メールが送信されたか確認が必要です。送信履歴を確認してください。", variant: "warning" },
  not_sent: { label: "メール送信終了", description: "通知メールの送信を終了しました。保存した回答は回答履歴に残っています。", variant: "secondary" },
} as const satisfies Record<InquiryMailStatus, { label: string; description: string; variant: string }>;
