import type { Reservation } from "../domain";

export type ConfirmationEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildConfirmationEmailContent(reservation: Reservation): ConfirmationEmailContent {
  const visitTime = reservation.startTime ?? "未定";
  const storeName = reservation.store ?? "未割当";
  const subject = `ご予約内容の確認 ${reservation.id}`;
  const lines = [
    `${reservation.customer} 様`,
    "",
    "ご予約日が近づいてまいりましたので、以下の内容でご予約を確認いたします。",
    "",
    `予約番号: ${reservation.id}`,
    `来店日: ${reservation.date}`,
    `来店時間: ${visitTime}`,
    `店舗: ${storeName}`,
    `予約人数: ${reservation.people}名`,
    "",
    "変更やキャンセルが必要な場合は、本メールへご返信ください。",
  ];

  return {
    subject,
    text: lines.join("\n"),
    html: [
      `<p>${escapeHtml(reservation.customer)} 様</p>`,
      "<p>ご予約日が近づいてまいりましたので、以下の内容でご予約を確認いたします。</p>",
      "<dl>",
      `<dt>予約番号</dt><dd>${escapeHtml(reservation.id)}</dd>`,
      `<dt>来店日</dt><dd>${escapeHtml(reservation.date)}</dd>`,
      `<dt>来店時間</dt><dd>${escapeHtml(visitTime)}</dd>`,
      `<dt>店舗</dt><dd>${escapeHtml(storeName)}</dd>`,
      `<dt>予約人数</dt><dd>${reservation.people}名</dd>`,
      "</dl>",
      "<p>変更やキャンセルが必要な場合は、本メールへご返信ください。</p>",
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
