"use client";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { signInWithCustomToken, type User } from "firebase/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { firebaseAuth } from "../firebase-client";
import { requestJson } from "../api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type GoogleId = { initialize(options: { client_id: string; nonce: string; auto_select: boolean; callback(response: { credential: string }): void }): void; renderButton(element: HTMLElement, options: { type: string; theme: string; size: string; text: string; locale: string; width: number }): void; cancel(): void };
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }
let sdk: Promise<GoogleId> | undefined;
function googleSdk() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  return sdk ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true;
    const timer = setTimeout(() => { script.remove(); sdk = undefined; reject(new Error("Googleのログイン画面を読み込めませんでした。再試行してください。")); }, 15000);
    script.onload = () => { clearTimeout(timer); if (window.google?.accounts?.id) resolve(window.google.accounts.id); else { sdk = undefined; reject(new Error("Googleログインを準備できませんでした。")); } };
    script.onerror = () => { clearTimeout(timer); script.remove(); sdk = undefined; reject(new Error("Googleに接続できませんでした。通信状態を確認してください。")); };
    document.head.appendChild(script);
  });
}
type AuthContext = { user: User | null; onAuthenticated(user: User, mode: string, notification?: string): void; reauthenticate(password: string): Promise<string>; signOut(): Promise<void>; notify?(message: string): void };
const GoogleContext = createContext<AuthContext | null>(null);
export const useGoogleCustomer = () => useContext(GoogleContext);
type LoginMethods = { google: boolean; password: boolean; googleEmail: string | null };
export function GoogleCustomerAuthProvider({ children, ...value }: AuthContext & { children: ReactNode }) {
  const [verification, setVerification] = useState<{ uid: string; email: string | null } | null>(null);
  const pending = useRef<{ resolve(token: string): void; reject(error: Error): void } | null>(null);
  const currentUid = useRef(value.user?.uid);
  currentUid.current = value.user?.uid;
  const cancel = () => {
    pending.current?.reject(new Error("本人確認をキャンセルしました。"));
    pending.current = null;
    setVerification(null);
  };
  useEffect(() => () => {
    pending.current?.reject(new Error("ログイン状態が変わりました。もう一度お試しください。"));
    pending.current = null;
  }, [value.user?.uid]);
  useEffect(() => { setVerification(null); }, [value.user?.uid]);
  const reauthenticate = async (password: string) => {
    if (password || !value.user?.providerData.some(p => p.providerId === "google.com")) return value.reauthenticate(password);
    if (pending.current) throw new Error("本人確認を完了してから操作してください。");
    const uid = value.user.uid;
    const authToken = await firebaseAuth.currentUser?.getIdToken();
    const methods = await requestJson<LoginMethods>("/api/accounts/me/login-methods", { authToken, cache: "no-store" });
    if (currentUid.current !== uid || firebaseAuth.currentUser?.uid !== uid) throw new Error("ログイン状態が変わりました。もう一度お試しください。");
    if (!methods.google) throw new Error("Googleの連携状態が変わりました。再度ログインしてください。");
    if (pending.current) throw new Error("本人確認を完了してから操作してください。");
    return new Promise<string>((resolve, reject) => {
      pending.current = { resolve, reject };
      setVerification({ uid, email: methods.googleEmail });
    });
  };
  return <GoogleContext.Provider value={{ ...value, reauthenticate }}>
    {children}
    <Dialog open={Boolean(verification)} onOpenChange={open => { if (!open) cancel(); }}>
      <DialogContent className="grid max-w-md gap-4 p-5">
        <DialogTitle className="font-semibold">Googleで本人確認</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">予約サイトに連携済みのGoogleアカウントを選択してください。</DialogDescription>
        {verification && <>
          <p className="break-all text-sm">連携済みのアカウント：<strong>{verification.email ?? "メールアドレスを取得できませんでした"}</strong></p>
          <p className="text-sm text-muted-foreground">Googleボタンに別のアカウントが表示された場合は、連携済みのアカウントに切り替えてください。</p>
          <GoogleCustomerButton mode="reauth" onComplete={() => { void (async () => {
            if (firebaseAuth.currentUser?.uid !== verification.uid || currentUid.current !== verification.uid) { cancel(); return; }
            const attempt = pending.current;
            const token = await firebaseAuth.currentUser.getIdToken(true);
            if (pending.current !== attempt || currentUid.current !== verification.uid || firebaseAuth.currentUser?.uid !== verification.uid) return;
            attempt?.resolve(token);
            pending.current = null;
            setVerification(null);
          })().catch(() => cancel()); }} />
        </>}
        <Button type="button" variant="outline" className="justify-self-end" onClick={cancel}>キャンセル</Button>
      </DialogContent>
    </Dialog>
  </GoogleContext.Provider>;
}
export function GoogleCustomerButton({ mode = "login", registration = false, onComplete, onBusyChange }: { mode?: "login" | "link" | "reauth"; registration?: boolean; onComplete?: () => void; onBusyChange?: (busy: boolean) => void }) {
  const context = useContext(GoogleContext), host = useRef<HTMLDivElement>(null), callback = useRef({ context, onComplete });
  callback.current = { context, onComplete };
  const enabled = Boolean(context), uid = context?.user?.uid;
  const [retry, setRetry] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  useEffect(() => {
    if (!enabled) return;
    let active = true, working = false;
    let observer: ResizeObserver | undefined;
    setLoading(true); setError("");
    host.current?.replaceChildren();
    void (async () => {
      const authToken = mode === "login" ? undefined : await firebaseAuth.currentUser?.getIdToken();
      const init = await requestJson<{ nonce: string; clientId: string }>("/api/auth/google/challenge", { method: "POST", authToken, body: JSON.stringify({ mode }), cache: "no-store" });
      const id = await googleSdk(); if (!active || !host.current) return;
      host.current.replaceChildren();
      id.initialize({ client_id: init.clientId, nonce: init.nonce, auto_select: false, callback: response => {
        if (!active || working) return; working = true; setBusy(true); setError("");
        void (async () => {
          const token = mode === "login" ? undefined : await firebaseAuth.currentUser?.getIdToken();
          const result = await requestJson<{ token: string; uid: string; notification?: string }>("/api/auth/google", { method: "POST", authToken: token, body: JSON.stringify({ credential: response.credential }), cache: "no-store" });
          if (!active) return;
          if (mode !== "login" && firebaseAuth.currentUser?.uid !== result.uid) throw new Error("ログイン状態が変わりました。やり直してください。");
          if (mode !== "login" && result.uid !== callback.current.context?.user?.uid) throw new Error("ログイン状態が変わりました。やり直してください。");
          const continuation = callback.current;
          const credential = await signInWithCustomToken(firebaseAuth, result.token);
          if (firebaseAuth.currentUser?.uid !== credential.user.uid) return;
          continuation.context?.onAuthenticated(credential.user, mode, result.notification);
          if (active) continuation.onComplete?.();
        })().catch(e => { if (active) setError(e instanceof Error ? e.message : "Googleログインに失敗しました。"); }).finally(() => { working = false; if (active) setBusy(false); });
      } });
      let renderedWidth = 0;
      const render = () => {
        if (!active || !host.current) return;
        const width = Math.max(160, Math.min(400, Math.floor(host.current.getBoundingClientRect().width)));
        if (width === renderedWidth) return;
        renderedWidth = width;
        host.current.replaceChildren();
        // Google's medium button uses a fixed action label instead of personalized account details.
        id.renderButton(host.current, { type: "standard", theme: "outline", size: mode === "login" ? "medium" : "large", text: registration ? "signup_with" : "signin_with", locale: "ja", width });
      };
      render();
      observer = new ResizeObserver(render);
      observer.observe(host.current);
      setLoading(false);
    })().catch(e => { if (active) { setError(e instanceof Error ? e.message : "Googleログインを準備できませんでした。"); setLoading(false); } });
    return () => { active = false; observer?.disconnect(); };
  }, [mode, registration, retry, uid, enabled]);
  if (!context) return null;
  return <div className="grid min-w-0 gap-2" aria-busy={busy || loading}>
    <div ref={host} className={`flex min-h-11 min-w-0 w-full max-w-[400px] items-center ${busy || loading ? "pointer-events-none opacity-50" : ""}`} inert={busy || loading || undefined} />
    {(loading || busy) && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{busy ? "本人確認中…" : "Googleログインを準備中…"}</p>}
    {error && <Alert className="border-destructive/40 text-destructive"><p>{error}</p><Button type="button" variant="outline" className="mt-2" disabled={busy} onClick={() => setRetry(v => v + 1)}>再試行</Button></Alert>}
  </div>;
}

const passwordSchema = z.object({ currentPassword: z.string(), password: z.string().min(8, "8文字以上で入力してください。").max(128), confirmPassword: z.string() }).refine(v => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "パスワードが一致しません。" });
export function CustomerLoginMethods() {
  const context = useContext(GoogleContext);
  const [methods, setMethods] = useState<LoginMethods | null>(null), [error, setError] = useState(""), [message, setMessage] = useState(""), [reload, setReload] = useState(0), [link, setLink] = useState(false), [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const panelId = useId();
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const form = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", password: "", confirmPassword: "" } });
  const uid = context?.user?.uid;
  useEffect(() => { let active = true; setMethods(null); setError(""); if (uid && expanded) void (async () => {
    const authToken = await firebaseAuth.currentUser?.getIdToken();
    const data = await requestJson<LoginMethods>("/api/accounts/me/login-methods", { authToken, cache: "no-store" }); if (active) setMethods(data);
  })().catch(e => { if (active) setError(e instanceof Error ? e.message : "ログイン方法を取得できませんでした。"); }); return () => { active = false; }; }, [uid, reload, expanded]);
  if (!context?.user) return null;
  const finishChange = async (data: { notification?: string }, text: string) => { const message = `${text}${data.notification === "failed" ? " 変更通知を送信できませんでした。" : ""} 再度ログインしてください。`; setMessage(message); context.notify?.(message); await context.signOut(); };
  return <section className="grid gap-4 rounded-lg border bg-card p-5" aria-labelledby="customer-login-methods-title">
    <h3 id="customer-login-methods-title"><button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={expanded} aria-controls={panelId} disabled={busy} onClick={() => { setExpanded(v => !v); setMessage(""); form.reset(); }}>ログイン方法の設定<ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} /></button></h3>
    {expanded && <div id={panelId} className="grid min-w-0 gap-4">
    {!methods && !error && <p role="status" className="text-sm text-muted-foreground">読み込み中…</p>}
    {methods && <>
      <dl className="grid gap-2 text-sm"><div className="flex flex-wrap gap-x-3"><dt className="text-muted-foreground">パスワード</dt><dd>{methods.password ? "設定済み" : "未設定"}</dd></div><div className="grid gap-1"><dt className="text-muted-foreground">Google連携</dt><dd className="break-all">{methods.google ? methods.googleEmail ?? "連携済み（メールアドレスを取得できませんでした）" : "未連携"}</dd></div></dl>
      {methods.password && !methods.google && <div className="grid gap-2"><Label htmlFor="security-current-password">現在のパスワード</Label><Input id="security-current-password" type="password" autoComplete="current-password" {...form.register("currentPassword")} /></div>}
      {!methods.google && !link && <Button type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await context.reauthenticate(form.getValues("currentPassword")); setLink(true); } catch (e) { setError(e instanceof Error ? e.message : "本人確認に失敗しました。"); } finally { setBusy(false); } }}>Googleアカウントを連携</Button>}
      <Dialog open={link} onOpenChange={open => { if (!linkBusy) setLink(open); }}><DialogContent className="grid max-w-md gap-4 p-5"><DialogTitle className="font-semibold">Googleアカウントを連携</DialogTitle><DialogDescription className="text-sm text-muted-foreground">予約サイトへのログインに使用するGoogleアカウントを選択してください。</DialogDescription>{link && <GoogleCustomerButton mode="link" onBusyChange={setLinkBusy} onComplete={() => { setLink(false); setMessage("Googleアカウントを連携しました。"); setReload(v => v + 1); }} />}<Button type="button" variant="outline" disabled={linkBusy} className="justify-self-end" onClick={() => setLink(false)}>キャンセル</Button></DialogContent></Dialog>
      <form className="grid gap-3 border-t pt-4" onSubmit={form.handleSubmit(async values => { setBusy(true); setError(""); try {
        const authToken = await context.reauthenticate(values.currentPassword);
        const data = await requestJson<{ notification?: string }>("/api/accounts/me/login-methods", { method: "POST", authToken, body: JSON.stringify({ password: values.password }) });
        form.reset(); await finishChange(data, "パスワードを設定・変更しました。");
      } catch (e) { setError(e instanceof Error ? e.message : "パスワードを設定できませんでした。"); } finally { setBusy(false); } })}>
        <div className="grid gap-2"><Label htmlFor="security-new-password">{methods.password ? "新しいパスワード" : "追加するパスワード"}</Label><Input id="security-new-password" type="password" autoComplete="new-password" aria-invalid={!!form.formState.errors.password} {...form.register("password")} />{form.formState.errors.password && <p role="alert" className="text-sm text-destructive">{form.formState.errors.password.message}</p>}</div>
        <div className="grid gap-2"><Label htmlFor="security-confirm-password">パスワード（確認）</Label><Input id="security-confirm-password" type="password" autoComplete="new-password" aria-invalid={!!form.formState.errors.confirmPassword} {...form.register("confirmPassword")} />{form.formState.errors.confirmPassword && <p role="alert" className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>}</div>
        <Button type="submit" className="justify-self-start" disabled={busy}>{busy ? "処理中…" : methods.password ? "パスワードを変更" : "パスワードを追加"}</Button>
      </form>
      {methods.google && <div className="grid gap-2 border-t pt-4"><Button type="button" variant="outline" className="justify-self-start" disabled={busy || !methods.password} onClick={() => setConfirmUnlink(true)}>Google連携を解除</Button>{!methods.password && <p className="text-sm text-muted-foreground">解除するには、先にパスワードを設定してください。</p>}</div>}
      <Dialog open={confirmUnlink} onOpenChange={value => { if (!busy) setConfirmUnlink(value); }}><DialogContent className="grid max-w-md gap-4 p-5"><DialogTitle className="font-semibold">Google連携を解除しますか？</DialogTitle><DialogDescription className="text-sm text-muted-foreground">解除後はメールアドレスとパスワードでログインしてください。お客様情報と予約はそのまま残ります。</DialogDescription><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmUnlink(false)}>キャンセル</Button><Button type="button" variant="destructive" disabled={busy} onClick={async () => {
        setConfirmUnlink(false); setBusy(true); setError(""); try { const authToken = await context.reauthenticate(""); const data = await requestJson<{ notification?: string }>("/api/accounts/me/login-methods", { method: "DELETE", authToken }); await finishChange(data, "Google連携を解除しました。"); } catch (e) { setError(e instanceof Error ? e.message : "連携を解除できませんでした。"); } finally { setBusy(false); }
      }}>{busy ? "解除中…" : "解除する"}</Button></div></DialogContent></Dialog>
    </>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    {error && <Alert className="border-destructive/40 text-destructive"><p>{error}</p>{!methods && <Button type="button" variant="outline" className="mt-2" onClick={() => setReload(v => v + 1)}>再読み込み</Button>}</Alert>}
    </div>}
  </section>;
}
