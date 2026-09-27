import type { ApprovalEmailType, EmailTemplate, Reservation } from "../domain";

export const emailTemplateKeys = [
  "reservation_received",
  "reservation_reminder",
  "reservation_approved",
  "confirmed_change_approved",
  "reservation_change_approved",
  "cancellation_approved",
] as const;

export type EmailTemplateKey = typeof emailTemplateKeys[number];
export type TemplateVariables = Record<string, string>;

const commonVariables = {
  customerName: "顧客名",
  reservationId: "予約番号",
  reservationDate: "利用日",
  reservationTime: "開始時間",
  storeName: "店舗名",
  numberOfGuests: "予約人数",
  menuName: "メニュー",
} as const;

export const emailTemplateDefinitions: Record<EmailTemplateKey, {
  name: string;
  variables: typeof commonVariables;
  subject: string;
  body: string;
}> = {
  reservation_received: {
    name: "予約受付メール", variables: commonVariables,
    subject: "予約申請を受け付けました {{reservationId}}",
    body: "{{customerName}} 様\n\n予約申請を受け付けました。\nこのメールは受付完了のお知らせです。予約はまだ確定していません。\n\n予約番号: {{reservationId}}\n利用日: {{reservationDate}}\n開始時間: {{reservationTime}}\n予約人数: {{numberOfGuests}}名\nメニュー: {{menuName}}\n\n内容を確認後、予約可否をご連絡します。",
  },
  reservation_reminder: {
    name: "予約確認メール", variables: commonVariables,
    subject: "ご予約内容の確認 {{reservationId}}",
    body: "{{customerName}} 様\n\nご予約日が近づいてまいりましたので、以下の内容でご予約を確認いたします。\n\n予約番号: {{reservationId}}\n来店日: {{reservationDate}}\n来店時間: {{reservationTime}}\n店舗: {{storeName}}\n予約人数: {{numberOfGuests}}名\n\n変更やキャンセルが必要な場合は、本メールへご返信ください。",
  },
  reservation_approved: approvalDefinition("予約申請承認メール", "予約申請が承認されました"),
  confirmed_change_approved: approvalDefinition("本予約変更承認メール", "本予約への変更申請が承認されました"),
  reservation_change_approved: approvalDefinition("予約内容変更承認メール", "予約内容の変更申請が承認されました"),
  cancellation_approved: approvalDefinition("予約キャンセル承認メール", "予約キャンセルが承認されました"),
};

function approvalDefinition(name: string, heading: string) {
  return {
    name, variables: commonVariables,
    subject: `${heading} {{reservationId}}`,
    body: `{{customerName}} 様\n\n${heading}\n\n予約番号: {{reservationId}}\n利用日: {{reservationDate}}\n開始時間: {{reservationTime}}\n予約人数: {{numberOfGuests}}名\nメニュー: {{menuName}}`,
  };
}

export function defaultEmailTemplates(): EmailTemplate[] {
  return emailTemplateKeys.map((templateKey) => {
    const definition = emailTemplateDefinitions[templateKey];
    return {
      templateKey,
      name: definition.name,
      subject: definition.subject,
      body: definition.body,
      isActive: true,
    };
  });
}

export function approvalTypeTemplateKey(type: ApprovalEmailType): EmailTemplateKey {
  return type;
}

export function reservationTemplateVariables(reservation: Reservation): TemplateVariables {
  return {
    customerName: reservation.customer,
    reservationId: reservation.id,
    reservationDate: reservation.date,
    reservationTime: reservation.startTime ?? "未定",
    storeName: reservation.store ?? "未割当",
    numberOfGuests: String(reservation.people),
    menuName: reservation.menuItems.length ? reservation.menuItems.join("、") : "未確定",
  };
}

export function isEmailTemplateKey(value: string): value is EmailTemplateKey {
  return emailTemplateKeys.includes(value as EmailTemplateKey);
}
