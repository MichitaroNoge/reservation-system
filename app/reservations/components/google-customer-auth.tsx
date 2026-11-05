"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { signInWithCustomToken, type User } from "firebase/auth";
import { LoaderCircle } from "lucide-react";
import { firebaseAuth } from "../firebase-client";
import { ApiRequestError, requestJson } from "../api-client";
import { Button } from "@/components/ui/button";
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
export function GoogleCustomerButton({ mode = "login", registration = false, onComplete, onBusyChange, onLinkAuthenticationRequired }: { mode?: "login" | "link" | "reauth"; registration?: boolean; onComplete?: () => void; onBusyChange?: (busy: boolean) => void; onLinkAuthenticationRequired?: (message: string) => void }) {
  const context = useContext(GoogleContext), host = useRef<HTMLDivElement>(null), callback = useRef({ context, onComplete, onLinkAuthenticationRequired });
  callback.current = { context, onComplete, onLinkAuthenticationRequired };
  const enabled = Boolean(context), uid = context?.user?.uid;
  const [retry, setRetry] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  useEffect(() => {
    if (!enabled) return;
    let active = true, working = false;
    const fail = (e: unknown) => {
      if (!active) return;
      if (mode === "link" && e instanceof ApiRequestError && e.status === 403 && callback.current.onLinkAuthenticationRequired) callback.current.onLinkAuthenticationRequired(e.message);
      else setError(e instanceof Error ? e.message : "Googleログインを準備できませんでした。");
    };
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
        })().catch(fail).finally(() => { working = false; if (active) setBusy(false); });
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
    })().catch(e => { fail(e); if (active) setLoading(false); });
    return () => { active = false; observer?.disconnect(); };
  }, [mode, registration, retry, uid, enabled]);
  if (!context) return null;
  return <div className="grid min-w-0 gap-2" aria-busy={busy || loading}>
    <div ref={host} className={`flex min-h-11 min-w-0 w-full max-w-[400px] items-center ${busy || loading ? "pointer-events-none opacity-50" : ""}`} inert={busy || loading || undefined} />
    {(loading || busy) && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{busy ? "本人確認中…" : "Googleログインを準備中…"}</p>}
    {error && <Alert className="border-destructive/40 text-destructive"><p>{error}</p><Button type="button" variant="outline" className="mt-2" disabled={busy} onClick={() => setRetry(v => v + 1)}>再試行</Button></Alert>}
  </div>;
}
