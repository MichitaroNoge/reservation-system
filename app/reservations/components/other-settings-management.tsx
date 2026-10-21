"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { GoogleCalendarSettings } from "./google-calendar-settings";
import { Input } from "@/components/ui/input";
import { systemSettingsSchema } from "@/lib/system-settings";
import type { SystemSettings } from "@/lib/domain";

export function OtherSettingsManagement({ getAdminToken }: { getAdminToken: () => Promise<string> }) {
  const token = useRef(getAdminToken); token.current = getAdminToken;
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting, isDirty } } = useForm<SystemSettings>({ resolver: zodResolver(systemSettingsSchema), defaultValues: { acceptanceCapacity: null, reservationLeadDays: 3, blockedPeriods: [] } });
  const { fields, append, remove } = useFieldArray({ control, name: "blockedPeriods" });
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoaded(false); setError(""); setSuccess(false);
    void (async () => {
      try {
        const response = await fetch("/api/system-settings", { headers: { Authorization: `Bearer ${await token.current()}` }, cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "設定を読み込めませんでした。");
        if (!cancelled) { reset({ ...body.settings, reservationLeadDays: body.settings.reservationLeadDays ?? 3, blockedPeriods: body.settings.blockedPeriods ?? [] }); setLoaded(true); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "設定を読み込めませんでした。"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [attempt, reset]);
  const save = handleSubmit(async settings => {
    setError(""); setSuccess(false);
    try {
      const response = await fetch("/api/system-settings", { method: "PUT", headers: { Authorization: `Bearer ${await token.current()}`, "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "設定を保存できませんでした。");
      reset({ ...body.settings, reservationLeadDays: body.settings.reservationLeadDays ?? 3, blockedPeriods: body.settings.blockedPeriods ?? [] }); setRemoveIndex(null); setSuccess(true);
    } catch (e) { setError(e instanceof Error ? e.message : "設定を保存できませんでした。"); }
  });
  return <section className="rounded-lg border border-border bg-background p-5 text-foreground">
    <h2 className="text-lg font-semibold">その他</h2>
    {loading ? <p role="status" className="mt-4 text-sm text-muted-foreground">設定を読み込み中…</p> : loaded && <form onSubmit={save} className="mt-5 grid max-w-3xl gap-5">
      <div className="grid gap-2"><label htmlFor="acceptance-capacity" className="text-sm font-medium">全体の受入上限（人数）</label>
        <p id="capacity-help" className="text-sm text-muted-foreground">共有スペースを含め、同じ時間帯に受け入れられる合計人数です。空欄は未設定です。</p>
        <Input id="acceptance-capacity" type="number" min={0} max={99999} step={1} inputMode="numeric" disabled={isSubmitting} aria-invalid={!!errors.acceptanceCapacity} aria-describedby="capacity-help capacity-error" {...register("acceptanceCapacity", { setValueAs: value => value === "" || value === null ? null : Number(value), onChange: () => setSuccess(false) })} />
        {errors.acceptanceCapacity && <p id="capacity-error" role="alert" className="text-sm text-destructive">{errors.acceptanceCapacity.message}</p>}
      </div>
      <div className="grid gap-2 border-t border-border pt-5"><label htmlFor="reservation-lead-days" className="text-sm font-medium">予約・変更申請の締切（日数）</label><p id="lead-days-help" className="text-sm text-muted-foreground">利用日の何日前までお客様の申請を受け付けるかを指定します。初期値は3日です。変更申請は変更前・変更後の利用日の両方に適用します。ただし、キャンセル料の対象外で人数だけを変更する場合は、前日まで受け付けます。</p><Input id="reservation-lead-days" type="number" min={0} max={365} step={1} inputMode="numeric" disabled={isSubmitting} aria-invalid={!!errors.reservationLeadDays} aria-describedby="lead-days-help lead-days-error" {...register("reservationLeadDays", {valueAsNumber:true,onChange:()=>setSuccess(false)})} />{errors.reservationLeadDays && <p id="lead-days-error" role="alert" className="text-sm text-destructive">{errors.reservationLeadDays.message}</p>}</div>
      <section className="min-w-0 border-t border-border pt-5">
        <h3 className="text-sm font-semibold">受入不可の日時</h3>
        <p className="mt-2 text-sm text-muted-foreground">日本時間で開始・終了を指定します。予約の利用時間と重なる場合は、承認画面に受入不可と表示します。終日は当日0:00から翌日0:00まで設定してください。</p>
        {!fields.length && <p className="mt-3 text-sm text-muted-foreground">受入不可の日時は設定されていません。</p>}
        <div className="mt-4 divide-y divide-border">{fields.map((field, index) => <div key={field.id} className="grid min-w-0 gap-3 py-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">{(["start", "end"] as const).map(key => <div key={key} className="grid min-w-0 gap-2">
            <label htmlFor={`block-${field.id}-${key}`} className="text-sm font-medium">{key === "start" ? "開始日時" : "終了日時"} <span className="text-xs text-muted-foreground">必須</span></label>
            <Input id={`block-${field.id}-${key}`} className="min-w-0 max-w-full" type="datetime-local" disabled={isSubmitting} aria-invalid={!!errors.blockedPeriods?.[index]?.[key]} aria-describedby={`block-${field.id}-${key}-error`} {...register(`blockedPeriods.${index}.${key}`, { onChange: () => setSuccess(false) })} />
            {errors.blockedPeriods?.[index]?.[key] && <p id={`block-${field.id}-${key}-error`} role="alert" className="text-sm text-destructive">{errors.blockedPeriods[index]?.[key]?.message}</p>}
          </div>)}</div>
          <div className="grid gap-2"><label htmlFor={`block-${field.id}-reason`} className="text-sm font-medium">理由（任意）</label><Input id={`block-${field.id}-reason`} maxLength={200} disabled={isSubmitting} aria-invalid={!!errors.blockedPeriods?.[index]?.reason} {...register(`blockedPeriods.${index}.reason`, { onChange: () => setSuccess(false) })} />{errors.blockedPeriods?.[index]?.reason && <p role="alert" className="text-sm text-destructive">{errors.blockedPeriods[index]?.reason?.message}</p>}</div>
          {removeIndex === index ? <div role="alert" className="flex flex-wrap items-center gap-2 text-sm"><span>この期間を削除しますか？保存すると反映されます。</span><Button type="button" variant="destructive" className="min-h-11" disabled={isSubmitting} onClick={() => { remove(index); setRemoveIndex(null); setSuccess(false); }}>削除する</Button><Button type="button" variant="outline" className="min-h-11" disabled={isSubmitting} onClick={() => setRemoveIndex(null)}>戻る</Button></div> : <Button type="button" variant="outline" className="min-h-11 justify-self-start text-destructive" disabled={isSubmitting} onClick={() => setRemoveIndex(index)}><Trash2 className="size-4" />この期間を削除</Button>}
        </div>)}</div>
        {errors.blockedPeriods?.root?.message && <p role="alert" className="text-sm text-destructive">{errors.blockedPeriods.root.message}</p>}
        <Button type="button" variant="outline" className="mt-3 min-h-11" disabled={isSubmitting || fields.length >= 200} onClick={() => { append({ start: "", end: "", reason: "" }); setSuccess(false); }}><Plus className="size-4" />日時を追加</Button>
      </section>
      <Button type="submit" disabled={isSubmitting || !isDirty} className="min-h-11 justify-self-start">{isSubmitting ? "保存中…" : "保存"}</Button>
    </form>}
    {error && <div role="alert" className="mt-4 text-sm text-destructive"><p>{error}</p><Button type="button" variant="outline" className="mt-2 min-h-11" disabled={isSubmitting} onClick={() => setAttempt(value => value + 1)}>再読み込み</Button></div>}
    {success && <p role="status" className="mt-4 text-sm text-success">設定を保存しました。</p>}
    <GoogleCalendarSettings getAdminToken={getAdminToken} />
  </section>;
}
