"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, ExternalLink, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestJson } from "../api-client";

type Settings = { supported: boolean; configured?: boolean; connection?: { email: string; calendarId: string | null; connected: boolean; recoveryAvailable?: boolean; enabled: boolean; lastRunAt: string | null; lastSuccessAt: string | null; lastError: string | null } | null; counts?: Record<string, number>; errors?: { number: string; message: string }[] };
const recovery = z.object({ calendarId: z.string().trim().min(1, "カレンダーIDを入力してください。").max(512).regex(/^[A-Za-z0-9_@.\-]+$/, "カレンダーIDを確認してください。") });
const at = (value?: string | null) => value ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "short", timeStyle: "medium" }).format(new Date(value)) : "—";
export function GoogleCalendarSettings({ getAdminToken }: { getAdminToken: () => Promise<string> }) {
  const token = useRef(getAdminToken); token.current = getAdminToken;
  const [data, setData] = useState<Settings | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false);
  const [replace, setReplace] = useState(false);
  const sending = useRef(false), mounted = useRef(true), version = useRef(0);
  const form = useForm<z.infer<typeof recovery>>({ resolver: zodResolver(recovery), defaultValues: { calendarId: "" } });
  const load = useCallback(async () => { if (sending.current) return; const requestVersion = ++version.current; const result = await requestJson<Settings>("/api/admin/google-calendar", { authToken: await token.current(), cache: "no-store" }); if (mounted.current && version.current === requestVersion) { setData(result); setError(""); } }, []);
  useEffect(() => {
    mounted.current = true;
    const url = new URL(window.location.href), result = url.searchParams.get("googleCalendar");
    if (result) { setNotice(result === "connected" ? "Googleに接続しました。連携先を確認してください。" : result === "different_account" ? "現在と同じGoogleアカウントで再接続してください。" : "Googleとの接続が完了しませんでした。設定と許可内容を確認し、再度接続してください。"); url.searchParams.delete("googleCalendar"); window.history.replaceState(null, "", url.toString()); }
    const refresh = () => { void load().catch(() => { if (mounted.current) setError("連携状態を取得できませんでした。再読み込みしてください。"); }).finally(() => { if (mounted.current) setLoading(false); }); };
    refresh(); const timer = setInterval(refresh, 15000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, [load]);
  async function action(action: string, calendarId?: string) {
    if (sending.current) return; sending.current = true; version.current++; setBusy(true); setError(""); setNotice("");
    try {
      if (action === "connect") {
        const result = await requestJson<{ url: string }>("/api/admin/google-calendar/connect", { method: "POST", authToken: await token.current(), headers: { "Content-Type": "application/json" }, body: "{}" });
        const url = new URL(result.url); if (url.origin !== "https://accounts.google.com") throw new Error("接続先を確認できません。"); window.location.assign(url.toString());
      } else {
        const result = await requestJson<Settings>("/api/admin/google-calendar", { method: "POST", authToken: await token.current(), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(calendarId ? { calendarId } : {}), ...(action.startsWith("replace_") ? { replaceCalendarId: data?.connection?.calendarId, confirmed: true } : {}) }) });
        if (mounted.current) { setData(result); setConfirm(false); setReplace(false); setNotice(action === "retry" ? "同期を実行しました。結果は連携状態をご確認ください。" : "連携設定を更新しました。"); }
      }
    } catch (e) { if (mounted.current) { setError(e instanceof Error ? e.message : "処理できませんでした。"); try { const result = await requestJson<Settings>("/api/admin/google-calendar", { authToken: await token.current(), cache: "no-store" }); if (mounted.current) setData(result); } catch {} } }
    finally { sending.current = false; if (mounted.current) setBusy(false); }
  }
  const c = data?.connection;
  return <section className="mt-6 min-w-0 border-t border-border pt-5 text-sm">
    <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="size-4" />Googleカレンダー連携</h3>
    <p className="mt-2 text-muted-foreground">承認済みの仮予約・本予約を、管理者用の「団体予約」カレンダーへ自動反映します。変更申請中は承認済みの内容を維持し、キャンセル確定後は予定を削除します。</p>
    {loading ? <p role="status" className="mt-4">連携状態を読み込み中…</p> : data?.supported === false ? <p className="mt-4 text-muted-foreground">この機能はPostgreSQL / Drizzle構成で利用できます。</p> : data && <>
      {!data.configured && <div className="mt-4 space-y-2 text-muted-foreground"><p>Google連携の初期設定が必要です。</p><details><summary className="cursor-pointer text-foreground">設定手順</summary><ol className="mt-2 list-decimal space-y-2 pl-5"><li>Google CloudでCalendar APIを有効にし、管理者連携用のOAuthクライアントを作成します。</li><li>リダイレクト先に <code className="break-all">http://localhost:3000/api/admin/google-calendar/callback</code> を登録します。本番ではサイトのHTTPS URLを使用します。</li><li>サーバーの環境設定にGOOGLE_CALENDAR_CLIENT_ID、GOOGLE_CALENDAR_CLIENT_SECRET、GOOGLE_CALENDAR_REDIRECT_URI、GOOGLE_CALENDAR_ENCRYPTION_KEYを設定して再起動します。暗号化キーは32バイトのランダム値をBase64にしたものです。</li></ol></details></div>}
      <dl className="mt-4 grid min-w-0 gap-2 sm:grid-cols-[9rem_1fr]"><dt className="text-muted-foreground">接続アカウント</dt><dd className="break-all">{c?.connected ? c.email : "未接続"}</dd><dt className="text-muted-foreground">連携状態</dt><dd>{!c?.connected ? "未接続" : !c.calendarId ? "カレンダー未設定" : c.enabled ? "連携中" : "停止中"}</dd><dt className="text-muted-foreground">最終連携成功</dt><dd>{at(c?.lastSuccessAt)}</dd><dt className="text-muted-foreground">連携処理の最終実行</dt><dd>{at(c?.lastRunAt)}</dd></dl>
      {c?.calendarId && <p className="mt-3"><a className="inline-flex min-h-11 items-center gap-2 text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(c.calendarId)}`}>Googleカレンダーを開く<ExternalLink className="size-4" /></a></p>}
      {c?.lastError && <p role="alert" className="mt-3 text-warning">{c.lastError}</p>}
      <div className="mt-4 flex flex-wrap gap-4 text-muted-foreground" aria-live="polite"><span>連携済み {data.counts?.synced ?? 0}件</span><span>連携待ち {data.counts?.pending ?? 0}件</span><span className={data.counts?.error ? "text-destructive" : ""}>エラー {data.counts?.error ?? 0}件</span></div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="outline" className="min-h-11" disabled={busy || !data.configured} onClick={() => void action("connect")}>{c?.connected ? "Googleに再接続" : "Googleに接続"}</Button>
        {c?.connected && !c.calendarId && !c.lastError && <Button type="button" className="min-h-11" disabled={busy || !data.configured} onClick={() => void action("create")}>専用カレンダーを作成して連携</Button>}
        {c?.connected && c.calendarId && <><Button type="button" variant="outline" className="min-h-11" disabled={busy || !!c.recoveryAvailable} onClick={() => void action(c.enabled ? "pause" : "resume")}>{c.enabled ? "連携を一時停止" : "連携を再開"}</Button><Button type="button" variant="outline" className="min-h-11" disabled={busy || !c.enabled || !data.configured} onClick={() => void action("retry")}><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />今すぐ同期・再試行</Button></>}
        <Button type="button" variant="ghost" className="min-h-11" disabled={busy} onClick={() => void load().catch(() => setError("連携状態を取得できませんでした。"))}>再読み込み</Button>
        {c?.connected && <Button type="button" variant="ghost" className="min-h-11 text-destructive" disabled={busy} onClick={() => setConfirm(true)}>接続を解除</Button>}
      </div>
      {c?.connected && c.recoveryAvailable && !replace && <Button type="button" variant="outline" className="mt-4 min-h-11" disabled={busy} onClick={() => setReplace(true)}>連携先カレンダーを復旧</Button>}
      {replace && c?.recoveryAvailable && <section className="mt-4 space-y-3 border-t border-border pt-4"><p>削除された連携先を置き換えます。有効な予約を新しい連携先に再登録します。共有設定はGoogleカレンダーで再設定してください。</p><div className="flex flex-wrap gap-3"><Button type="button" disabled={busy} onClick={() => void action("replace_create")}>新しい専用カレンダーを作成して復旧</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setReplace(false)}>戻る</Button></div></section>}
      {c?.connected && ((!c.calendarId && c.lastError) || (replace && c.recoveryAvailable)) && <form className="mt-4 grid max-w-xl gap-2" onSubmit={form.handleSubmit(v => void action(replace && c?.calendarId ? "replace_recover" : "recover", v.calendarId))}><label htmlFor="calendar-recovery-id" className="font-medium">作成済みカレンダーのID</label><p className="text-muted-foreground">Googleカレンダーの「設定と共有」→「カレンダーの統合」で確認できます。このアプリが作成したカレンダーのみ接続できます。</p><Input id="calendar-recovery-id" {...form.register("calendarId")} disabled={busy} aria-invalid={!!form.formState.errors.calendarId} />{form.formState.errors.calendarId && <p role="alert" className="text-destructive">{form.formState.errors.calendarId.message}</p>}<Button type="submit" className="min-h-11 justify-self-start" disabled={busy}>このカレンダーに接続</Button></form>}
      {confirm && <div role="alert" className="mt-4 space-y-3 border-t border-border pt-4"><p>Googleとの接続を解除しますか？保存された接続情報を削除して自動反映を停止します。Googleに登録済みの予定は残ります。</p><div className="flex flex-wrap gap-3"><Button type="button" variant="destructive" className="min-h-11" disabled={busy} onClick={() => void action("disconnect")}>解除する</Button><Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => setConfirm(false)}>戻る</Button></div></div>}
      {!!data.errors?.length && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-96 text-left"><thead><tr className="border-b border-border"><th className="py-2 font-medium">予約番号</th><th className="py-2 font-medium">確認事項（最大20件）</th></tr></thead><tbody>{data.errors.map((e, i) => <tr key={`${e.number}:${i}`} className="border-b border-border"><td className="whitespace-nowrap py-2 pr-4">{e.number}</td><td className="py-2">{e.message}</td></tr>)}</tbody></table></div>}
      <p className="mt-4 text-muted-foreground">PCと予約システムの起動中に順次反映します。停止中の変更は再起動後に反映されます。共有先を関係者に限定し、Googleカレンダーの「設定と共有」から行ってください。予定内容の変更は予約管理サイトで行ってください。</p>
    </>}
    {busy && <p role="status" className="mt-3 text-muted-foreground">処理中…</p>}{error && <p role="alert" className="mt-3 text-destructive">{error}</p>}{notice && <p role="status" className="mt-3 text-foreground">{notice}</p>}
  </section>;
}
