"use client";
import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReservationSearch } from "@/lib/reservation-search";

export function ReservationCsvExport({ query, count, getAdminToken }: { query: ReservationSearch; count: number; getAdminToken: () => Promise<string> }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const current = useRef<AbortController | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { current.current?.abort(); current.current = null; if (messageTimer.current) clearTimeout(messageTimer.current); }, []);
  const download = async () => {
    if (current.current) return;
    if (messageTimer.current) { clearTimeout(messageTimer.current); messageTimer.current = null; }
    setMessage(""); setError("");
    const controller = new AbortController(); current.current = controller; setBusy(true);
    const body = JSON.stringify(query); // Freeze the current controls while the request is in progress.
    const timer = setTimeout(() => controller.abort(), 35000);
    let rejectAbort: (reason: Error) => void = () => {};
    const interrupted = new Promise<never>((_, reject) => { rejectAbort = reject; });
    const interrupt = () => rejectAbort(new Error("出力処理が中断されました。"));
    controller.signal.addEventListener("abort", interrupt, { once: true });
    let url: string | undefined;
    let apiMessage = "";
    try {
      const token = await Promise.race([getAdminToken(), interrupted]);
      if (controller.signal.aborted) return;
      const response = await fetch("/api/reservations/export", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body, cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        if (failure?.code === "EMPTY") { setMessage("出力対象の予約はありません。"); return; }
        apiMessage = typeof failure?.error === "string" ? failure.error : "CSV出力に失敗しました。再実行してください。";
        throw new Error(apiMessage);
      }
      if (!response.headers.get("content-type")?.startsWith("text/csv")) throw new Error("CSVファイルを取得できませんでした。");
      const blob = await response.blob();
      url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename = response.headers.get("content-disposition")?.match(/filename="(reservations_\d{8}_\d{6}\.csv)"/)?.[1];
      link.download = filename ?? "reservations.csv";
      document.body.appendChild(link); link.click(); link.remove();
      setMessage(`${response.headers.get("x-export-count") ?? ""}件のCSVダウンロードを開始しました。`);
      messageTimer.current = setTimeout(() => { setMessage(""); messageTimer.current = null; }, 5000);
    } catch {
      if (current.current === controller) setError(controller.signal.aborted ? "出力処理が中断されました。条件を絞って再実行してください。" : apiMessage || "CSVファイルを取得できませんでした。再実行してください。");
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", interrupt);
      // Delay revocation until the browser has consumed the download click.
      if (url) { const objectUrl = url; setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
      if (current.current === controller) { current.current = null; setBusy(false); }
    }
  };
  return <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
    <p role={error ? "alert" : "status"} aria-live="polite" className={`min-w-0 break-words text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}>{error || message || (busy ? "CSVを作成しています。最大30秒程度かかります。" : "")}</p>
    <Button type="button" variant="outline" className="min-h-11 shrink-0" title={`現在の検索条件に一致する全件を出力（一覧：${count}件）`} disabled={busy} aria-busy={busy} onClick={() => void download()}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}{busy ? "CSV作成中…" : "CSV出力"}</Button>
  </div>;
}
