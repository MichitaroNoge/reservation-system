import type { Reservation } from "../domain";

export type ReceiptEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildReceiptEmailContent(reservation: Reservation): ReceiptEmailContent {
  const visitTime = reservation.startTime ?? "未定";
  const menu = reservation.menuItems.length ? reservation.menuItems.join("、") : "未確定";
  const subject = `予約申請を受け付けました ${reservation.id}`;
  const lines = [
    `${reservation.customer} 様`,
    "",
    "予約申請を受け付けました。",
    "このメールは受付完了のお知らせです。予約はまだ確定していません。",
    "",
    `予約番号: ${reservation.id}`,
    `利用日: ${reservation.date}`,
    `開始時間: ${visitTime}`,
    `予約人数: ${reservation.people}名`,
    `メニュー: ${menu}`,
    "",
    "内容を確認後、予約可否をご連絡します。",
  ];

  return {
    subject,
    text: lines.join("\n"),
    html: [
      `<p>${escapeHtml(reservation.customer)} 様</p>`,
      "<p>予約申請を受け付けました。</p>",
      "<p><strong>このメールは受付完了のお知らせです。予約はまだ確定していません。</strong></p>",
      "<dl>",
      `<dt>予約番号</dt><dd>${escapeHtml(reservation.id)}</dd>`,
      `<dt>利用日</dt><dd>${escapeHtml(reservation.date)}</dd>`,
      `<dt>開始時間</dt><dd>${escapeHtml(visitTime)}</dd>`,
      `<dt>予約人数</dt><dd>${reservation.people}名</dd>`,
      `<dt>メニュー</dt><dd>${escapeHtml(menu)}</dd>`,
      "</dl>",
      "<p>内容を確認後、予約可否をご連絡します。</p>",
    ].join(""),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
