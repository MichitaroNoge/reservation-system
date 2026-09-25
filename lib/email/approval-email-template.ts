import type { ApprovalEmailType, Reservation } from "../domain";

const headings: Record<ApprovalEmailType, string> = {
  reservation_approved: "予約申請が承認されました",
  confirmed_change_approved: "本予約への変更申請が承認されました",
  reservation_change_approved: "予約内容の変更申請が承認されました",
  cancellation_approved: "予約キャンセルが承認されました",
};

export function buildApprovalEmailContent(reservation: Reservation, type: ApprovalEmailType) {
  const heading = headings[type];
  const details = [
    `予約番号: ${reservation.id}`,
    `利用日: ${reservation.date}`,
    `開始時間: ${reservation.startTime ?? "未定"}`,
    `予約人数: ${reservation.people}名`,
    `メニュー: ${reservation.menuItems.length ? reservation.menuItems.join("、") : "未確定"}`,
  ];
  return {
    subject: `${heading} ${reservation.id}`,
    text: [`${reservation.customer} 様`, "", heading, "", ...details].join("\n"),
    html: `<p>${escapeHtml(reservation.customer)} 様</p><p><strong>${heading}</strong></p><dl>${details.map((line) => {
      const [label, ...value] = line.split(": ");
      return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value.join(": "))}</dd>`;
    }).join("")}</dl>`,
  };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
