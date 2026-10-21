"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { requestJson } from "../api-client";
import { reservationStatusLabel, type ReservationStatus } from "@/lib/domain";
type Row = { deliveryKey: string; reservationId: string; revision: number; date?: string; people?: number; status?: ReservationStatus; canSendCurrent: boolean; state: string; nextAttemptAt?: string | null };
type Data = { supported: boolean; localRetryEnabled?: boolean; total?: number; notifications?: Row[]; message?: string };
const at = (value?: string | null) => value ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "short", timeStyle: "medium" }).format(new Date(value)) : "—";
export function ReservationNotificationManagement({ getAdminToken }: { getAdminToken: () => Promise<string> }) {
  const token = useRef(getAdminToken); token.current = getAdminToken;
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ row: Row; action: "send_current" | "record_sent" } | null>(null), [checked, setChecked] = useState(false);
  const sending = useRef(false);
  const load = useCallback(async () => { setError(""); setLoading(true); try { setData(await requestJson<Data>("/api/admin/reservation-notifications", { authToken: await token.current(), cache: "no-store" })); } catch (e) { setError(e instanceof Error ? e.message : "通知を取得できませんでした。"); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const recover = async () => {
    if (!selected || !checked || sending.current) return; sending.current = true; setBusy(true); setError(""); setMessage("");
    try { const result = await requestJson<Data>("/api/admin/reservation-notifications", { method: "POST", authToken: await token.current(), body: JSON.stringify({ deliveryKey: selected.row.deliveryKey, revision: selected.row.revision, action: selected.action, confirmed: true }) }); setData(result); setMessage(result.message ?? "記録を更新しました。"); setSelected(null); }
    catch (e) { setError(e instanceof Error ? e.message : "通知を更新できませんでした。再読み込みして結果を確認してください。"); }
    finally { sending.current = false; setBusy(false); }
  };
  return <section aria-label="予約通知メールの送信状況" className="min-w-0 rounded-lg border border-border bg-card p-4 text-sm sm:p-5">
    <div className="flex justify-end"><Button className="min-h-11" variant="outline" disabled={busy || loading} onClick={() => void load()}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />再読み込み</Button></div>
    <p className="mt-3 text-muted-foreground">承認・変更承認・キャンセル承認の未送信通知を確認します。古い内容の通知は停止し、送信制限中は表示の日時以降に再試行します。</p>
    {data?.localRetryEnabled === false && <p className="mt-3 text-warning">ローカルでの自動再試行は停止中です。送信状況を確認し、必要な通知に手動で対応できます。</p>}
    {error && <p role="alert" className="mt-3 text-destructive">{error}</p>}{message && <p role="status" className="mt-3 text-success">{message}</p>}
    {loading ? <p role="status" className="mt-3">読み込み中…</p> : data?.supported === false ? <p className="mt-3 text-muted-foreground">Drizzle構成で利用できます。</p> : data && <><p className="mt-3">要確認・送信待ち {data.total ?? 0}件</p>{!data.notifications?.length ? <p className="mt-2 text-muted-foreground">未送信の承認通知はありません。</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b border-border"><th className="p-3 font-medium">予約 / 現在の内容</th><th className="p-3 font-medium">送信状態 / 次回試行</th><th className="p-3 font-medium">操作</th></tr></thead><tbody>{data.notifications.map(row => <tr key={row.deliveryKey} className="border-b border-border"><td className="p-3">{row.reservationId}<span className="mt-1 block">{row.date}・{row.people}名</span><span className="block text-muted-foreground">{row.status ? reservationStatusLabel(row.status) : "予約を確認してください"}</span></td><td className="p-3">{row.state}<span className="mt-1 block text-muted-foreground">{at(row.nextAttemptAt)}</span></td><td className="p-3"><div className="flex flex-wrap gap-2"><Button className="min-h-11" variant="outline" disabled={busy || !row.canSendCurrent} onClick={() => { setChecked(false); setSelected({ row, action: "send_current" }); }}>最新内容で送信</Button><Button className="min-h-11" variant="ghost" disabled={busy} onClick={() => { setChecked(false); setSelected({ row, action: "record_sent" }); }}>送信済みを記録</Button></div></td></tr>)}</tbody></table><p className="mt-2 text-xs text-muted-foreground">先頭50件を表示しています。</p></div>}</>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !busy) setSelected(null); }}><DialogContent className="p-5"><DialogTitle>{selected?.action === "send_current" ? "最新内容で通知を送信" : "送信済みの確認を記録"}</DialogTitle><DialogDescription className="mt-3">Resendの送信履歴を確認してください。{selected?.action === "send_current" ? "古い通知を停止し、現在の予約内容で新しい案内を送信します。送信済みの場合は戻って「送信済みを記録」を選択してください。" : "メールは再送しません。送信済みであることを確認した結果を記録します。"}</DialogDescription>{error && <p role="alert" className="mt-3 text-destructive">{error}</p>}<p className="mt-4">{selected?.row.reservationId}・{selected?.row.date}・{selected?.row.people}名</p><label className="mt-4 flex items-start gap-3"><input type="checkbox" className="mt-1 size-4" disabled={busy} checked={checked} onChange={e => setChecked(e.target.checked)} />{selected?.action === "send_current" ? "送信履歴を確認し、この内容の案内がまだ届いていないことを確認しました。" : "Resendの履歴で送信済みであることを確認しました。"}</label><div className="mt-5 flex justify-end gap-3"><Button className="min-h-11" variant="outline" disabled={busy} onClick={() => setSelected(null)}>戻る</Button><Button className="min-h-11" disabled={busy || !checked} onClick={() => void recover()}>{busy ? "処理中…" : selected?.action === "send_current" ? "送信する" : "記録する"}</Button></div></DialogContent></Dialog>
  </section>;
}
