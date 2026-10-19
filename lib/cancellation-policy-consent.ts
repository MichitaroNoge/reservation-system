export const cancellationPolicyVersion = "2026-10-19-v1";
export const cancellationPolicyText = [
  "キャンセルポリシー",
  "・本予約完了後の取り消しは、キャンセル料100%頂きます。",
  "・本予約完了後から50％以上の減員は、キャンセル料100％を頂きます。",
  "例：60名で本予約した場合",
  "60名 → 55名（5名減）…キャンセルポリシーの対象外のため、前日まで人数変更可能です。",
  "60名 → 40名（20名減）…キャンセルポリシーの対象外のため、前日まで人数変更可能です。",
  "60名 → 30名（30名減・50％減）…初回予約人数の50％以上の減員となるため、キャンセル料が発生します。",
  "※キャンセルポリシーに該当しない人数変更は、前日まで変更可能です。",
].join("\n\n");
export type CancellationPolicyAgreementInput = { accepted: true; version: string };
export type CancellationPolicyConsent = { source: "confirmed_request" | "confirmed_change_request"; acceptedAt: string; version: string; policyText: string; people: number };
export function policyConsentLabel(source: CancellationPolicyConsent["source"]) { return source === "confirmed_request" ? "本予約の申請" : "本予約への変更申請"; }
export function policyConsentDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "日時不明" : new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date);
}
export function policyConsentDetail(consent: CancellationPolicyConsent) { return [policyConsentLabel(consent.source), "同意日時（日本時間）：" + policyConsentDate(consent.acceptedAt), "ポリシーの版：" + consent.version, "申請時の人数：" + consent.people + "名", consent.policyText].join("\n"); }
