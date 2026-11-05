"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerPageActions } from "@/components/ui/customer-page-layout";
import { useCustomerSession } from "@/app/reservations/hooks/use-customer-session";
import { ApiRequestError, requestJson } from "@/app/reservations/api-client";
import { inquiryFormSchema, generalInquiryCategories, reservationInquiryCategories, type InquiryFormInput } from "@/lib/inquiries/types";
import { ContactShell, controlClass } from "./shared";
import { AnonymousInquiryFormSession, type InquiryFormProof } from "./anonymous-form-session";
import { availabilityDateError, inquiryToday, MAX_INQUIRY_PEOPLE } from "@/lib/inquiries/availability";

export function ContactForm({ reservationNumber }: { reservationNumber?: string } = {}) {
  const router = useRouter();
  const { customerUser: user, customerAuthLoading: authLoading } = useCustomerSession();
  const reservation = reservationNumber || null;
  const categories = reservation ? reservationInquiryCategories : generalInquiryCategories;
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [done, setDone] = useState<{ number: string; receiptEmailSent: boolean; message: string } | null>(null);
  const [prepareVersion, setPrepareVersion] = useState(0);
  const [minimumMealDate, setMinimumMealDate] = useState("");
  const challenge = useRef<AnonymousInquiryFormSession | null>(null), website = useRef<HTMLInputElement>(null), savedInput = useRef<InquiryFormInput | null>(null), requestKey = useRef<string>(""), previousUser = useRef<string | null | undefined>(undefined), submitting = useRef(false);
  const liveFormSchema = inquiryFormSchema.superRefine((value, context) => {
    const message = !savedInput.current && value.category === "availability" ? availabilityDateError(value.mealDate) : undefined;
    if (message) context.addIssue({ code: "custom", path: ["mealDate"], message });
  });
  const { register, handleSubmit, setValue, setError: setFieldError, trigger, getFieldState, reset, watch, formState: { errors, isDirty } } = useForm<InquiryFormInput>({ resolver: zodResolver(liveFormSchema), defaultValues: { name: "", email: "", category: reservationNumber ? "reservation" : "availability", subject: "", body: "", mealDate: "", mealStartTime: "", people: "" } });
  const availability = !reservation && watch("category") === "availability";
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = Date.now(), today = inquiryToday(now);
      setMinimumMealDate(today);
      timer = setTimeout(refresh, Date.parse(`${today}T00:00:00+09:00`) + 86400000 - now);
    };
    const visible = () => { if (document.visibilityState !== "hidden") refresh(); };
    refresh();
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", visible);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); };
  }, []);
  useEffect(() => {
    if (authLoading) return;
    const identity = JSON.stringify([user?.uid ?? null, reservationNumber ?? null]);
    if (previousUser.current !== identity) {
      reset({ name: "", email: "", category: reservationNumber ? "reservation" : "availability", subject: "", body: "", mealDate: "", mealStartTime: "", people: "" });
      previousUser.current = identity; setDone(null); setLocked(false); savedInput.current = null; requestKey.current = crypto.randomUUID(); challenge.current = null;
    }
    let cancelled = false; setReady(false); setError("");
    const number = reservationNumber || null;
    void (async () => {
      try {
        if (number && !user) throw new Error("この予約について問い合わせるにはログインしてください。予約に紐づけない一般問い合わせは、未ログインでも送信できます。");
        const token = user ? await user.getIdToken() : undefined;
        const data = number ? await requestJson<{ name: string; email: string }>(`/api/reservations/${encodeURIComponent(number)}/inquiries`, { authToken: token }) : user ? (await requestJson<{ account: { name: string; contact: string } | null }>("/api/accounts/me", { authToken: token })).account : null;
        if (cancelled) return;
        const profile = data ?? (user ? { name: user.displayName ?? "", email: user.email ?? "" } : null);
        if (profile) { if (!getFieldState("name").isDirty) setValue("name", profile.name ?? user?.displayName ?? ""); if (!getFieldState("email").isDirty) setValue("email", ("email" in profile ? profile.email : profile.contact) ?? user?.email ?? ""); }
        if (!user) { const session = challenge.current ?? new AnonymousInquiryFormSession(requestKey.current, key => requestJson<InquiryFormProof>(`/api/inquiries/challenge?requestKey=${encodeURIComponent(key)}`)); challenge.current = session; await session.prepare(); if (cancelled) return; }
        setReady(true);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "フォームを準備できませんでした。"); }
    })(); return () => { cancelled = true; };
  }, [authLoading, user, setValue, getFieldState, reset, reservationNumber, prepareVersion]);
  useEffect(() => {
    if (user || !ready || done) return;
    const refresh = () => { if (document.visibilityState !== "hidden") void challenge.current?.prepare().catch(() => { /* Submission retries preparation while preserving every input. */ }); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [user, ready, done]);
  const submit = async (values: InquiryFormInput) => {
    if (submitting.current || !ready) return; submitting.current = true; setBusy(true); setError(""); setLocked(true); savedInput.current ??= values;
    const submittingKey = requestKey.current, session = challenge.current, submittedInput = savedInput.current;
    try {
      const send = async () => requestJson<{ number: string; receiptEmailSent: boolean; message: string }>(reservation ? `/api/reservations/${encodeURIComponent(reservation)}/inquiries` : "/api/inquiries", { method: "POST", authToken: user ? await user.getIdToken() : undefined, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...submittedInput, requestKey: submittingKey, formToken: !user && session ? await session.token() : undefined, website: website.current?.value ?? "" }) });
      let response;
      try { response = await send(); }
      catch (e) {
        if (!user && session && e instanceof ApiRequestError && e.status === 403) { await session.prepare(true); response = await send(); }
        else throw e;
      }
      if (submittingKey === requestKey.current) setDone(response);
    }
    catch (e) {
      if (submittingKey !== requestKey.current) return;
      const fields = e instanceof ApiRequestError ? e.fields : undefined;
      let fieldError = false;
      for (const name of ["mealDate", "people"] as const) {
        if (fields?.[name]?.[0]) { setFieldError(name, { type: "server", message: fields[name][0] }, { shouldFocus: !fieldError }); fieldError = true; }
      }
      setError(fieldError ? "" : e instanceof Error ? e.message : "送信できませんでした。");
      if (e instanceof ApiRequestError && e.status < 500 && e.status !== 409) { setLocked(false); savedInput.current = null; }
    }
    finally { setBusy(false); submitting.current = false; }
  };
  const fieldError = (name: keyof InquiryFormInput) => errors[name] && <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-destructive">{errors[name]?.message}</p>;
  return <ContactShell title={done ? "お問い合わせを受け付けました" : "お問い合わせ"}>{done ? <div className="space-y-4" role="status">
    <p>問い合わせ番号：<strong>{done.number}</strong>
    </p>
    {done.receiptEmailSent && <p className="text-sm text-muted-foreground">入力いただいたメールアドレスへ受付確認メールを送信しました。</p>}<div>
      <Link href="/contact" className="text-sm text-primary underline" onClick={event => { event.preventDefault(); if (reservation) router.push("/contact"); else { previousUser.current = undefined; setPrepareVersion(value => value + 1); } }}>別の問い合わせを送る</Link>
    </div>
  </div> : <>
    {error && <p role="alert" className="mb-4 rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    {authLoading || (!ready && !error) ? <p role="status" className="text-sm text-muted-foreground">フォームを準備しています…</p> : !ready ? <div className="flex flex-wrap gap-3">
      {(!reservation || user) && <Button type="button" onClick={() => setPrepareVersion(value => value + 1)}>再試行</Button>}
      <Button asChild variant="outline">
        <Link href="/login">ログイン</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/contact">一般問い合わせへ</Link>
      </Button>
    </div> : <form id="customer-inquiry-form" noValidate onSubmit={event => { setMinimumMealDate(inquiryToday()); void handleSubmit(submit)(event); }} className="space-y-5">
      {reservation && <div>
        <Label htmlFor="reservation-number">予約番号</Label>
        <Input id="reservation-number" className="mt-2" value={reservation} readOnly />
      </div>}
      <div className="grid gap-5 sm:grid-cols-2">{(["name", "email"] as const).map((name) =>
        <div key={name}>
          <Label htmlFor={name}>{name === "name" ? "氏名" : "メールアドレス"} <span className="text-xs text-muted-foreground">必須</span>
          </Label>
          <Input {...register(name)} id={name} type={name === "email" ? "email" : "text"} autoComplete={name} maxLength={name === "name" ? 100 : 255} className="mt-2" readOnly={locked} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} />{fieldError(name)}</div>)}</div>
      <div>
        <Label htmlFor="category">問い合わせ種別 <span className="text-xs text-muted-foreground">必須</span>
        </Label>
        <select {...register("category")} id="category" className={`${controlClass} mt-2`} disabled={!!reservation || locked}>{Object.entries(categories).map(([key, label]) =>
          <option key={key} value={key}>{label}</option>)}</select>{fieldError("category")}</div>
      {availability ? <fieldset className="space-y-4">
        <legend className="text-sm font-medium">ご希望の食事日時・人数</legend>
        <p className="text-xs text-muted-foreground">日時は日本時間で入力してください。</p>
        <div className="grid min-w-0 gap-4 sm:grid-cols-3">
          <div className="min-w-0"><Label htmlFor="meal-date">食事日 <span className="text-xs text-muted-foreground">必須</span></Label>
            <Input {...register("mealDate", { onBlur: () => { void trigger("mealDate"); } })} id="meal-date" type="date" min={minimumMealDate} onFocus={() => setMinimumMealDate(inquiryToday())} required className="mt-2 min-w-0" readOnly={locked} aria-invalid={!!errors.mealDate} aria-describedby={errors.mealDate ? "mealDate-error" : undefined} />{fieldError("mealDate")}</div>
          <div className="min-w-0"><Label htmlFor="meal-start-time">食事開始時間 <span className="text-xs text-muted-foreground">必須</span></Label>
            <Input {...register("mealStartTime")} id="meal-start-time" type="time" step="60" required className="mt-2 min-w-0" readOnly={locked} aria-invalid={!!errors.mealStartTime} aria-describedby={errors.mealStartTime ? "mealStartTime-error" : undefined} />{fieldError("mealStartTime")}</div>
          <div className="min-w-0"><Label htmlFor="inquiry-people">人数 <span className="text-xs text-muted-foreground">必須</span></Label>
            <Input {...register("people")} id="inquiry-people" type="number" inputMode="numeric" min="1" max={MAX_INQUIRY_PEOPLE} step="1" required className="mt-2" readOnly={locked} aria-invalid={!!errors.people} aria-describedby={errors.people ? "people-error" : undefined} />{fieldError("people")}</div>
        </div>
      </fieldset> : <div>
        <Label htmlFor="subject">件名 <span className="text-xs text-muted-foreground">必須</span></Label>
        <Input {...register("subject")} id="subject" className="mt-2" maxLength={200} readOnly={locked} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-error" : undefined} />{fieldError("subject")}
      </div>}
      <div>
        <Label htmlFor="body">{availability ? "その他質問" : "問い合わせ内容"} <span className="text-xs text-muted-foreground">{availability ? "任意" : "必須"}</span></Label>
        <textarea {...register("body")} id="body" className={controlClass + " mt-2 min-h-48"} maxLength={5000} readOnly={locked} aria-invalid={!!errors.body} aria-describedby={errors.body ? "body-error" : undefined} />{fieldError("body")}
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input ref={website} id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {locked && !busy && <p className="text-sm text-muted-foreground">重複受付を防ぐため、同じ内容で再試行します。</p>}
    </form>}</>}
    <CustomerPageActions busy={busy} dirty={!done && (isDirty || locked)} backHref={!authLoading && !user ? "/login" : done ? "/?customerMode=home" : reservation ? "/customer/reservations" : "/?customerMode=home"} backLabel={!authLoading && !user ? "ログイン画面へ戻る" : !done && reservation ? "予約一覧へ戻る" : "お手続きトップへ戻る"}>
      {!done && ready && <Button type="submit" form="customer-inquiry-form" disabled={busy || !ready}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{busy ? "送信しています…" : locked ? "同じ内容で再試行" : "問い合わせを送信"}</Button>}
      {done && user && <Button asChild><Link href="/contact/history">問い合わせ履歴を確認</Link></Button>}
    </CustomerPageActions>
  </ContactShell>;
}
