"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { History, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AdminActions } from "@/components/ui/admin-interactions";
import { ListPanel, ListToolbar, ResultCount } from "@/components/ui/management-layout";
import { ListSearchField } from "@/components/ui/list-search-field";
import { ListPagination } from "@/components/ui/list-pagination";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requestJson } from "../api-client";
import { historyKindLabels, historyStatusLabel, type HistoryKind, type HistoryPage, type ReservationHistory, type ReservationSnapshot } from "@/lib/reservation-history";
import { reservationStatusLabel, paymentConditionLabel } from "@/lib/domain";
import { policyConsentDetail } from "@/lib/cancellation-policy-consent";

const at = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "未記録";
const statusTone = (status: ReservationHistory["status"]) => status === "approved" || status === "completed" ? "success" : status === "rejected" ? "destructive" : status === "unknown" ? "warning" : "secondary";

export function ApprovalHistoryTabs({ kind, getAdminToken, children }: { kind: HistoryKind; getAdminToken: () => Promise<string>; children: ReactNode }) {
  return <Tabs defaultValue="pending" className="min-w-0"><TabsList className="mb-4 h-auto"><TabsTrigger value="pending" className="min-h-11">未対応</TabsTrigger><TabsTrigger value="processed" className="min-h-11">処理済み</TabsTrigger></TabsList><TabsContent value="pending">{children}</TabsContent><TabsContent value="processed"><ReservationHistoryList kind={kind} getAdminToken={getAdminToken} /></TabsContent></Tabs>;
}

export function ReservationHistoryButton({ reservationId, getAdminToken, disabled = false }: { reservationId: string; getAdminToken: () => Promise<string>; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return <><Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(true)}><History className="size-4" />申請・承認履歴</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="flex max-h-[90dvh] max-w-5xl flex-col overflow-hidden"><header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4"><div><DialogTitle>申請・承認履歴</DialogTitle><DialogDescription className="mt-1">{reservationId} の申請と処理結果</DialogDescription></div><Button type="button" variant="ghost" size="icon" aria-label="履歴を閉じる" onClick={() => setOpen(false)}><X /></Button></header><div className="min-h-0 overflow-y-auto p-5">{open && <ReservationHistoryList reservationId={reservationId} getAdminToken={getAdminToken} />}</div><AdminActions><Button variant="outline" onClick={() => setOpen(false)}>閉じる</Button></AdminActions></DialogContent></Dialog>
  </>;
}

export function ReservationHistoryList({ kind, reservationId, getAdminToken }: { kind?: HistoryKind; reservationId?: string; getAdminToken: () => Promise<string> }) {
  const token = useRef(getAdminToken); token.current = getAdminToken;
  const [keyword, setKeyword] = useState(""), [search, setSearch] = useState("");
  const [status, setStatus] = useState(""), [selectedKind, setSelectedKind] = useState(kind ?? ""), [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [page, setPage] = useState(1), [reload, setReload] = useState(0);
  const [data, setData] = useState<HistoryPage | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReservationHistory | null>(null);
  useEffect(() => { const timer = setTimeout(() => { setSearch(keyword.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [keyword]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    if (from && to && from > to) { setError("終了日は開始日以降を指定してください。"); setLoading(false); return () => controller.abort(); }
    const params = new URLSearchParams({ page: String(page), pageSize: "20", keyword: search, ...(reservationId ? { reservationId } : {}), ...(selectedKind ? { kind: selectedKind } : {}), ...(status ? { status } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) });
    void (async () => { try { const result = await requestJson<HistoryPage>(`/api/admin/reservation-history?${params}`, { authToken: await token.current(), signal: controller.signal, cache: "no-store" }); if (!controller.signal.aborted) setData(result); } catch (caught) { if (!controller.signal.aborted) { setData(null); setError(caught instanceof Error ? caught.message : "履歴を読み込めませんでした。"); } } finally { if (!controller.signal.aborted) setLoading(false); } })();
    return () => controller.abort();
  }, [reservationId, selectedKind, status, search, from, to, page, reload]);
  useEffect(() => { if (data) setSelected(current => current ? data.items.find(entry => entry.id === current.id) ?? current : null); }, [data]);
  return <ListPanel><ListToolbar><ListSearchField aria-label="履歴を予約ID・お客様名で検索" placeholder="予約ID・お客様名で検索" value={keyword} onChange={event => setKeyword(event.target.value)} />
    {!kind && <label className="grid gap-1 text-xs text-muted-foreground">申請種別<Select className="sm:w-48" value={selectedKind} onChange={event => { setSelectedKind(event.target.value as HistoryKind | ""); setPage(1); }}><option value="">すべて</option>{Object.entries(historyKindLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</Select></label>}
    <label className="grid gap-1 text-xs text-muted-foreground">処理結果<Select className="sm:w-40" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">すべて</option>{reservationId && <option value="requested">未対応</option>}<option value="approved">承認・キャンセル確定</option><option value="rejected">却下済み</option><option value="completed">変更・手動処理済み</option><option value="unknown">処理結果不明</option></Select></label>
    <ResultCount count={data?.total ?? 0} loading={loading} error={!!error} /><Button variant="outline" size="icon" aria-label="履歴を再読み込み" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} /></Button>
  </ListToolbar><div className="grid gap-3 border-b border-border px-5 py-4 sm:grid-cols-2"><label className="grid gap-1 text-xs text-muted-foreground">記録日の開始<Input type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} /></label><label className="grid gap-1 text-xs text-muted-foreground">記録日の終了<Input type="date" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); setPage(1); }} /></label><p className="text-xs text-muted-foreground sm:col-span-2">期間は処理日時、未対応・処理日時未記録の履歴は申請／同意日時で絞り込みます（日本時間）。旧記録には処理結果不明の同意記録を含みます。</p></div>
    {error && <div role="alert" className="space-y-3 p-5 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={() => setReload(value => value + 1)}>再試行</Button></div>}
    {loading ? <p role="status" className="min-h-28 p-5 text-sm text-muted-foreground">履歴を読み込み中…</p> : !error && data && !data.supported ? <p role="status" className="p-5 text-sm text-warning">この接続先は申請履歴の保存・閲覧に対応していません。</p> : !error && data && <><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-muted text-muted-foreground"><tr>{["予約ID / お客様", "申請種別", "申請日時", "処理日時", "結果", "処理者", "操作"].map(label => <th key={label} className={`whitespace-nowrap px-5 py-3 font-medium ${label === "操作" ? "sticky right-0 bg-muted" : ""}`}>{label}</th>)}</tr></thead><tbody>{data.items.map(entry => <tr key={entry.id} className="cursor-pointer border-t border-border hover:bg-accent/30" onClick={() => { if (!window.getSelection()?.toString()) setSelected(entry); }}><td className="px-5 py-4"><button type="button" className="min-h-11 rounded-sm text-left font-semibold focus-visible:ring-2 focus-visible:ring-ring" onClick={event => { event.stopPropagation(); setSelected(entry); }}>{entry.reservationCode}</button><span className="block">{entry.customerDisplay ?? entry.requested?.customer ?? "氏名未記録"}{entry.customerFromCurrent && <span className="block text-muted-foreground">現在の予約名</span>}</span></td><td className="px-5 py-4">{historyKindLabels[entry.kind]}{entry.legacy && <span className="block text-muted-foreground">旧記録・一部未記録</span>}</td><td className="whitespace-nowrap px-5 py-4">{at(entry.requestedAt)}</td><td className="whitespace-nowrap px-5 py-4">{at(entry.processedAt)}</td><td className="px-5 py-4"><Badge variant={statusTone(entry.status)}>{historyStatusLabel(entry)}</Badge></td><td className="px-5 py-4">{entry.processedBy?.label ?? "未記録"}</td><td className="sticky right-0 bg-card px-5 py-4"><Button variant="outline" size="sm" onClick={event => { event.stopPropagation(); setSelected(entry); }}>履歴を確認</Button></td></tr>)}</tbody></table></div>{!data.items.length && <p className="p-8 text-center text-sm text-muted-foreground">条件に一致する履歴はありません。導入以前に保存されなかった申請の経緯は表示できません。</p>}<ListPagination page={page} pageSize={20} total={data.total} onPageChange={setPage} loading={loading} error={!!error} /></>}
    {selected && <ReservationHistoryDetail entry={selected} onClose={() => setSelected(null)} onRefresh={() => setReload(value => value + 1)} refreshing={loading} error={error} />}
  </ListPanel>;
}

const fields: [keyof ReservationSnapshot, string][] = [["customer", "お客様名"], ["date", "利用日"], ["startTime", "開始時間"], ["endTime", "終了時間"], ["people", "人数"], ["menuItems", "メニュー"], ["totalAmount", "合計金額"], ["status", "予約状態"], ["phone", "電話番号"], ["email", "メールアドレス"], ["address", "住所"], ["bookingType", "予約区分"], ["companyBranchName", "会社・支店名"], ["contactPersonName", "担当者名"], ["bookingContactName", "予約担当者名"], ["dayContactName", "当日責任者名"], ["dayContactPhone", "当日責任者携帯番号"], ["groupName", "団体名"], ["groupNameKana", "団体ふりがな"], ["groupType", "団体種別"], ["groupTypeOther", "団体種別 その他"], ["tcCount", "T/C（人数の内数）"], ["dgCount", "D/G"], ["paymentCondition", "支払条件"], ["storeAssignments", "担当店舗"], ["confirmationContactedAt", "確認連絡日時"], ["remarks", "備考"], ["initialConfirmedPeople", "初回本予約人数"]];
function valueLabel(key: keyof ReservationSnapshot, value: unknown) {
  if (value === undefined) return "未記録";
  if (value === null || value === "" || Array.isArray(value) && !value.length) return "記載なし";
  if (key === "status") return reservationStatusLabel(value as ReservationSnapshot["status"] & string);
  if (key === "paymentCondition") return paymentConditionLabel(value as NonNullable<ReservationSnapshot["paymentCondition"]>);
  if (key === "bookingType") return value === "travel_agency_group" ? "旅行会社様専用 団体予約" : "一般予約";
  if (key === "confirmationContactedAt") return at(String(value));
  if (key === "totalAmount") return `¥${Number(value).toLocaleString()}`;
  if (key === "storeAssignments" && Array.isArray(value)) return value.map(item => `${item.store} ${item.people}名`).join("、");
  return Array.isArray(value) ? value.join("、") : String(value);
}
function Comparison({ before, after, beforeTitle, afterTitle, initial = false }: { before: ReservationSnapshot | null; after: ReservationSnapshot | null; beforeTitle: string; afterTitle: string; initial?: boolean }) {
  const rows = fields.filter(([key]) => before?.[key] !== undefined || after?.[key] !== undefined);
  return !rows.length ? <p className="mt-3 text-sm text-muted-foreground">この時点の予約内容は未記録です。</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[540px] table-fixed text-left text-sm"><thead className="bg-muted"><tr><th className="w-32 p-3">項目</th>{!initial && <th className="p-3">{beforeTitle}</th>}<th className="p-3">{afterTitle}</th></tr></thead><tbody>{rows.map(([key,label]) => { const changed = before?.[key] !== undefined && after?.[key] !== undefined && JSON.stringify(before[key]) !== JSON.stringify(after[key]); return <tr key={key} className={`border-t border-border ${changed ? "bg-accent/40" : ""}`}><th className="p-3 align-top font-medium">{label}{changed && <span className="mt-1 block text-xs text-primary">変更あり</span>}</th>{!initial && <td className="whitespace-pre-wrap break-words p-3 align-top">{valueLabel(key, before?.[key])}</td>}<td className="whitespace-pre-wrap break-words p-3 align-top">{valueLabel(key, after?.[key])}</td></tr>; })}</tbody></table></div>;
}
export function ReservationHistoryDetail({ entry, onClose, onRefresh, refreshing = false, error }: { entry: ReservationHistory; onClose: () => void; onRefresh?: () => void; refreshing?: boolean; error?: string }) {
  const notification = entry.notification;
  const mailLabels = { not_requested: "この処理による送信なし", pending: "送信待ち・再試行待ち", sent: "送信済み", failed: "送信エラー", stopped: "元の通知は停止済み", unknown: "送信記録を確認できません" };
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="flex max-h-[90dvh] max-w-4xl flex-col overflow-hidden"><header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4"><div><DialogTitle>{historyKindLabels[entry.kind]}の履歴</DialogTitle><DialogDescription className="mt-1">{entry.reservationCode}・閲覧専用</DialogDescription></div><Button variant="ghost" size="icon" aria-label="履歴詳細を閉じる" onClick={onClose}><X /></Button></header><div className="min-h-0 space-y-6 overflow-y-auto p-5">
    <Badge variant={statusTone(entry.status)}>{historyStatusLabel(entry)}</Badge>
    {entry.legacy && <p role="status" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">旧データのため、申請時の内容・日時・処理者に未記録の項目があります。現在の予約内容から過去の情報を推測して補っていません。処理結果不明の同意記録は、承認済みを意味しません。</p>}
    <dl className="grid gap-3 text-sm sm:grid-cols-2">{[["申請・同意日時", at(entry.requestedAt)], ["申請者", entry.requestedBy?.label ?? "未記録"], ["処理日時", at(entry.processedAt)], ["処理者", entry.processedBy?.label ?? "未記録"]].map(([label,value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
    {entry.reason && <section><h3 className="text-sm font-semibold">{entry.kind === "admin_edit" || entry.kind === "manual_status" ? "変更理由" : "申請理由"}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{entry.reason}</p></section>}
    <section><h3 className="font-semibold">申請時の内容</h3><Comparison before={entry.before} after={entry.requested} beforeTitle="申請前" afterTitle="申請・希望内容" initial={entry.kind === "reservation" && !entry.before && !entry.legacy} /></section>
    <section><h3 className="font-semibold">実際の処理結果</h3>{entry.status === "requested" ? <p className="mt-3 text-sm text-muted-foreground">まだ処理されていません。</p> : <Comparison before={entry.appliedBefore} after={entry.after} beforeTitle="処理直前" afterTitle="処理後" />}</section>
    {entry.requested?.policyConsents?.map((consent,index) => <details key={index} className="border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium">申請時のキャンセルポリシー同意記録 {index + 1}</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm">{policyConsentDetail(consent)}</p></details>)}
    {entry.requested?.feeAcknowledgement && <p className="text-sm">キャンセル料の確認日時：{at(entry.requested.feeAcknowledgement.acceptedAt)}</p>}
    {entry.after?.feeAcknowledgement && entry.after.feeAcknowledgement.acceptedAt !== entry.requested?.feeAcknowledgement?.acceptedAt && <p className="text-sm">処理時に確認されたキャンセル料の同意日時：{at(entry.after.feeAcknowledgement.acceptedAt)}</p>}
    {entry.requested?.cancellationFeeAcknowledged && <section className="space-y-2 text-sm"><h3 className="font-semibold">キャンセル料の案内への同意</h3><p>{at(entry.requested.cancellationFeeAcknowledgedAt ?? null)}</p><p className="whitespace-pre-wrap">{entry.requested.cancellationFeeNotice}</p></section>}
    <section className="space-y-3 border-t border-border pt-5"><h3 className="font-semibold">承認結果の通知メール</h3><p className="text-sm">{mailLabels[notification?.state ?? "unknown"]}</p>{notification?.sentAt && <p className="text-sm">送信・確認記録日時：{at(notification.sentAt)}</p>}{notification?.nextAttemptAt && <p className="text-sm">次回試行予定：{at(notification.nextAttemptAt)}</p>}{notification?.state === "unknown" && <p className="text-sm text-muted-foreground">この申請に対応する送信記録を特定できません。未送信と断定するものではありません。</p>}{onRefresh && <Button variant="outline" disabled={refreshing} onClick={onRefresh}><RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />{refreshing ? "更新中…" : "送信状況を更新"}</Button>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</section>
    <p className="text-sm text-muted-foreground">申請の処理結果とメールの送信状態は別です。ここでは予約の変更・承認・再送は行いません。再送などの対応は「予約通知メール」から行ってください。</p>
  </div><AdminActions><Button variant="outline" onClick={onClose}>閉じる</Button></AdminActions></DialogContent></Dialog>;
}
