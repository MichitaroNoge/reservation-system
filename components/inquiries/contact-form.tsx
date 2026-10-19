"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerSession } from "@/app/reservations/hooks/use-customer-session";
import { ApiRequestError, requestJson } from "@/app/reservations/api-client";
import { inquiryFormSchema, inquiryCategories, type InquiryFormInput } from "@/lib/inquiries/types";
import { ContactShell, controlClass } from "./shared";

type Challenge = { requestKey: string; formToken: string };
export function ContactForm({ reservationNumber }: { reservationNumber?: string } = {}) {
  const { customerUser: user, customerAuthLoading: authLoading } = useCustomerSession();
  const reservation = reservationNumber || null;
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [done, setDone] = useState<{ number: string; receiptEmailSent: boolean; message: string } | null>(null);
  const challenge = useRef<Challenge | null>(null), website = useRef<HTMLInputElement>(null), savedInput = useRef<InquiryFormInput | null>(null), requestKey = useRef<string>(""), previousUser = useRef<string | null | undefined>(undefined), submitting = useRef(false);
  const { register, handleSubmit, setValue, getFieldState, reset, formState: { errors } } = useForm<InquiryFormInput>({ resolver: zodResolver(inquiryFormSchema), defaultValues: { name: "", email: "", category: "reservation", subject: "", body: "" } });
  useEffect(() => {
    if (authLoading) return;
    const identity = JSON.stringify([user?.uid ?? null, reservationNumber ?? null]); if (previousUser.current !== identity) { reset({ name: "", email: "", category: "reservation", subject: "", body: "" }); previousUser.current = identity; }
    let cancelled = false; setReady(false); setError(""); setDone(null); setLocked(false); savedInput.current = null; requestKey.current = crypto.randomUUID(); challenge.current = null;
    const number = reservationNumber || null;
    void (async () => {
      try {
        if (number && !user) throw new Error("この予約について問い合わせるにはログインしてください。予約に紐づけない一般問い合わせは、未ログインでも送信できます。");
        const token = user ? await user.getIdToken() : undefined;
        const data = number ? await requestJson<{ name: string; email: string }>(`/api/reservations/${encodeURIComponent(number)}/inquiries`, { authToken: token }) : user ? (await requestJson<{ account: { name: string; contact: string } | null }>("/api/accounts/me", { authToken: token })).account : null;
        if (cancelled) return;
        const profile = data ?? (user ? { name: user.displayName ?? "", email: user.email ?? "" } : null);
        if (profile) { if (!getFieldState("name").isDirty) setValue("name", profile.name ?? user?.displayName ?? ""); if (!getFieldState("email").isDirty) setValue("email", ("email" in profile ? profile.email : profile.contact) ?? user?.email ?? ""); }
        if (!user) { const c = await requestJson<Challenge>("/api/inquiries/challenge"); if (cancelled) return; challenge.current = c; requestKey.current = c.requestKey; }
        setReady(true);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "フォームを準備できませんでした。"); }
    })(); return () => { cancelled = true; };
  }, [authLoading, user, setValue, getFieldState, reset, reservationNumber]);
  const submit = async (values: InquiryFormInput) => {
    if (submitting.current || !ready) return; submitting.current = true; setBusy(true); setError(""); setLocked(true); savedInput.current ??= values;
    try { const response = await requestJson<{ number: string; receiptEmailSent: boolean; message: string }>(reservation ? `/api/reservations/${encodeURIComponent(reservation)}/inquiries` : "/api/inquiries", { method: "POST", authToken: user ? await user.getIdToken() : undefined, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...savedInput.current, requestKey: requestKey.current, formToken: challenge.current?.formToken, website: website.current?.value ?? "" }) }); setDone(response); }
    catch (e) { setError(e instanceof Error ? e.message : "送信できませんでした。"); if (e instanceof ApiRequestError && e.status < 500 && e.status !== 409) { setLocked(false); savedInput.current = null; } }
    finally { setBusy(false); submitting.current = false; }
  };
  const fieldError = (name: keyof InquiryFormInput) => errors[name] && <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-destructive">{errors[name]?.message}</p>;
  return <ContactShell title="お問い合わせ">{done ? <div className="space-y-4 rounded-lg border border-border bg-card p-5" role="status">
    <h2 className="font-semibold">お問い合わせを受け付けました</h2>
    <p>問い合わせ番号：<strong>{done.number}</strong>
    </p>
    <p className={done.receiptEmailSent ? "text-muted-foreground" : "text-warning"}>{done.message}</p>{done.receiptEmailSent && <p className="text-sm text-muted-foreground">入力いただいたメールアドレスへ受付確認メールを送信しました。</p>}{user && <Button asChild variant="outline">
      <Link href="/contact/history">問い合わせ履歴を確認</Link>
    </Button>}<div>
      <Link href="/contact" className="text-sm text-primary underline" onClick={event => { event.preventDefault(); window.location.assign("/contact"); }}>別の問い合わせを送る</Link>
    </div>
  </div> : <>
    {error && <p role="alert" className="mb-4 rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    {authLoading || (!ready && !error) ? <p role="status" className="text-sm text-muted-foreground">フォームを準備しています…</p> : !ready ? <div className="flex gap-3">
      <Button asChild variant="outline">
        <Link href="/login">ログイン</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/contact">一般問い合わせへ</Link>
      </Button>
    </div> : <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5 rounded-lg border border-border bg-card p-5 sm:p-6">
      {reservation && <div>
        <Label htmlFor="reservation-number">予約番号</Label>
        <Input id="reservation-number" className="mt-2" value={reservation} readOnly />
      </div>}
      <p className="text-sm text-muted-foreground">必要事項を入力して送信してください。必須の項目はすべて入力してください。</p>
      <div className="grid gap-5 sm:grid-cols-2">{(["name", "email"] as const).map((name) =>
        <div key={name}>
          <Label htmlFor={name}>{name === "name" ? "氏名" : "メールアドレス"} <span className="text-xs text-muted-foreground">必須</span>
          </Label>
          <Input {...register(name)} id={name} type={name === "email" ? "email" : "text"} autoComplete={name} maxLength={name === "name" ? 100 : 255} className="mt-2" readOnly={locked} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} />{fieldError(name)}</div>)}</div>
      <div>
        <Label htmlFor="category">問い合わせ種別 <span className="text-xs text-muted-foreground">必須</span>
        </Label>
        <select {...register("category")} id="category" className={`${controlClass} mt-2`} disabled={!!reservation || locked}>{Object.entries(inquiryCategories).map(([key, label]) =>
          <option key={key} value={key}>{label}</option>)}</select>{fieldError("category")}</div>
      <div>
        <Label htmlFor="subject">件名 <span className="text-xs text-muted-foreground">必須</span>
        </Label>
        <Input {...register("subject")} id="subject" className="mt-2" maxLength={200} readOnly={locked} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-error" : undefined} />{fieldError("subject")}</div>
      <div>
        <Label htmlFor="body">問い合わせ内容 <span className="text-xs text-muted-foreground">必須</span>
        </Label>
        <textarea {...register("body")} id="body" className={`${controlClass} mt-2 min-h-48`} maxLength={5000} readOnly={locked} aria-invalid={!!errors.body} aria-describedby={errors.body ? "body-error" : undefined} />{fieldError("body")}</div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input ref={website} id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {locked && !busy && <p className="text-sm text-muted-foreground">重複受付を防ぐため、同じ内容で再試行します。</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !ready} className="min-h-11 w-full sm:w-auto">{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}{busy ? "送信しています…" : locked ? "同じ内容で再試行" : "問い合わせを送信"}</Button>
      </div>
    </form>}</>}</ContactShell>;
}
