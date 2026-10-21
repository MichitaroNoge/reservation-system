import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export class CalendarError extends Error {
  constructor(public code: string, public statusCode = 503) { super(code); }
}
export function calendarConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const key = process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!clientId?.endsWith(".apps.googleusercontent.com") || !clientSecret || !key || !/^[A-Za-z0-9+/]{43}=$/.test(key) || !redirectUri) throw new CalendarError("setup_required");
  const url = new URL(redirectUri);
  if (url.pathname !== "/api/admin/google-calendar/callback" || url.search || url.hash || url.username || url.password || (url.protocol !== "https:" && !(process.env.APP_ENV === "development" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new CalendarError("setup_required");
  return { clientId, clientSecret, key: Buffer.from(key, "base64"), redirectUri, origin: url.origin };
}
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function encrypt(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", calendarConfig().key, iv);
  return [iv, Buffer.concat([cipher.update(value, "utf8"), cipher.final()]), cipher.getAuthTag()].filter(b => b.length).map(b => b.toString("base64url")).join(".");
}
export function decrypt(value: string) {
  try {
    const [iv, body, tag, extra] = value.split("."); if (extra || !tag) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", calendarConfig().key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch { throw new CalendarError("reconnect_required"); }
}
export const calendarScope = "https://www.googleapis.com/auth/calendar.app.created";
export const flowCookie = "admin_calendar_oauth";
export const calendarMessages: Record<string, string> = {
  setup_required: "Googleカレンダー連携の初期設定が必要です。設定手順を確認してください。",
  reconnect_required: "Googleとの接続を確認できません。再接続してください。",
  different_account: "現在と同じGoogleアカウントで再接続してください。",
  invalid_flow: "接続操作の有効期限が切れたか、確認できません。もう一度接続してください。",
  access_denied: "Googleとの接続は許可されませんでした。",
  invalid_time: "予約の開始・終了時刻を確認してください。",
  calendar_still_available: "元のカレンダーに接続できるため、置き換えを停止しました。状態を再読み込みして連携を再開してください。",
  calendar_missing: "連携先カレンダーを確認できません。Google側の設定を確認してください。",
  rate_limited: "Google側で処理が制限されています。時間をおいて自動で再試行します。",
  provider_error: "Googleへの反映が完了しませんでした。自動で再試行します。",
  calendar_creation_unknown: "カレンダーの作成結果を確認できません。Googleカレンダーに作成済みの「団体予約」があれば、そのカレンダーIDを指定して接続してください。重複作成を防ぐため自動再作成は行いません。",
  busy: "別の連携処理が実行中です。少し待って再度お試しください。",
};
