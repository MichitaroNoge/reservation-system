"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentPasswordSchema, loginMethodPasswordSchema } from "@/lib/login-method-settings";
import { firebaseAuth } from "../firebase-client";
import { requestJson } from "../api-client";
import { useCustomerSession } from "../hooks/use-customer-session";
import { GoogleCustomerButton, useGoogleCustomer } from "./google-customer-auth";

type LoginMethods = { google: boolean; password: boolean; googleEmail: string | null; canLinkWithoutPassword: boolean };
type PasswordValues = { currentPassword: string; password: string; confirmPassword: string };
type FormState = { dirty: boolean; busy: boolean };

export function CustomerLoginMethods({ onStateChange }: { onStateChange?: (state: FormState) => void }) {
  const context = useGoogleCustomer();
  const { resetCustomerPassword } = useCustomerSession();
  const uid = context?.user?.uid;
  const currentUid = useRef(uid); currentUid.current = uid;
  const [methods, setMethods] = useState<LoginMethods | null>(null), [loading, setLoading] = useState(false), [loadError, setLoadError] = useState(""), [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false), [linkBusy, setLinkBusy] = useState(false);
  const [passwordError, setPasswordError] = useState(""), [resetMessage, setResetMessage] = useState("");
  const [linkStage, setLinkStage] = useState<"password" | "google" | null>(null), [linkError, setLinkError] = useState(""), [linkMessage, setLinkMessage] = useState("");
  const [unlink, setUnlink] = useState(false), [unlinkError, setUnlinkError] = useState("");
  const pending = useRef(false);
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(loginMethodPasswordSchema(Boolean(methods?.password))), defaultValues: { currentPassword: "", password: "", confirmPassword: "" }, mode: "onTouched" });
  const linkForm = useForm<{ currentPassword: string }>({ resolver: zodResolver(currentPasswordSchema), defaultValues: { currentPassword: "" } });
  const unlinkForm = useForm<{ currentPassword: string }>({ resolver: zodResolver(currentPasswordSchema), defaultValues: { currentPassword: "" } });
  const working = busy || linkBusy;
  const disabled = working || loading;
  const dirty = passwordForm.formState.isDirty || linkForm.formState.isDirty || unlinkForm.formState.isDirty;
  useEffect(() => { onStateChange?.({ dirty, busy: working }); }, [dirty, working, onStateChange]);

  useEffect(() => {
    if (!uid) return;
    let active = true; setLoading(true); setLoadError("");
    void (async () => {
      const authToken = await firebaseAuth.currentUser?.getIdToken();
      const data = await requestJson<LoginMethods>("/api/accounts/me/login-methods", { authToken, cache: "no-store" });
      if (active) setMethods(data);
    })().catch(e => { if (active) setLoadError(e instanceof Error ? e.message : "ログイン方法を取得できませんでした。"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uid, reload]);

  if (!context?.user) return null;
  const assertCurrent = () => {
    if (!uid || currentUid.current !== uid || firebaseAuth.currentUser?.uid !== uid) throw new Error("ログイン状態が変わりました。画面を開き直してください。");
  };
  const run = async (action: () => Promise<void>, onError: (message: string) => void) => {
    if (pending.current || linkBusy) return;
    pending.current = true; setBusy(true);
    try { assertCurrent(); await action(); }
    catch (e) { if (currentUid.current === uid) onError(e instanceof Error ? e.message : "処理を完了できませんでした。"); }
    finally { pending.current = false; setBusy(false); }
  };
  const finishChange = async (data: { notification?: string }, message: string) => {
    assertCurrent();
    context.notify?.(`${message}${data.notification === "failed" ? " 変更通知を送信できませんでした。" : ""} 再度ログインしてください。`);
    await context.signOut();
  };
  const openLink = () => void run(async () => {
    setLinkError(""); setLinkMessage(""); linkForm.reset();
    const data = await requestJson<LoginMethods>("/api/accounts/me/login-methods", { authToken: await firebaseAuth.currentUser!.getIdToken(), cache: "no-store" });
    assertCurrent(); setMethods(data);
    if (data.google) throw new Error("Googleアカウントは連携済みです。画面を確認してください。");
    setLinkStage(data.canLinkWithoutPassword ? "google" : "password");
  }, setLinkError);
  const cancelLink = () => { if (!working) { setLinkStage(null); setLinkError(""); linkForm.reset(); } };
  const cancelUnlink = () => { if (!working) { setUnlink(false); setUnlinkError(""); unlinkForm.reset(); } };

  return <>
    <div className="my-4 grid min-w-0 gap-4" aria-busy={disabled}>
      {loading && <p role="status" className="text-sm text-muted-foreground">読み込み中…</p>}
      {loadError && <Alert role="alert" className="border-destructive/40 text-destructive"><p>{loadError}</p><Button type="button" variant="outline" className="mt-2" disabled={working} onClick={() => setReload(v => v + 1)}>再読み込み</Button></Alert>}
      {methods && <>
        <section className="grid min-w-0 gap-4 rounded-lg border border-border bg-card p-5" aria-labelledby="customer-password-title">
          <h3 id="customer-password-title" className="font-semibold">{methods.password ? "パスワード変更" : "パスワード設定"}</h3>
          <form className="grid gap-4" noValidate onSubmit={passwordForm.handleSubmit(values => run(async () => {
            setPasswordError(""); setResetMessage("");
            const authToken = await context.reauthenticate(methods.password ? values.currentPassword : "");
            assertCurrent();
            const data = await requestJson<{ notification?: string }>("/api/accounts/me/login-methods", { method: "POST", authToken, body: JSON.stringify({ password: values.password, operation: methods.password ? "change-password" : "set-password" }) });
            passwordForm.reset(); await finishChange(data, methods.password ? "パスワードを変更しました。" : "パスワードを設定しました。");
          }, setPasswordError).finally(() => passwordForm.setValue("currentPassword", "")))}>
            {methods.password && <div className="grid gap-2">
              <Label htmlFor="security-current-password">現在のパスワード <span className="text-xs text-muted-foreground">必須</span></Label>
              <Input id="security-current-password" type="password" autoComplete="current-password" disabled={disabled} aria-invalid={!!passwordForm.formState.errors.currentPassword} aria-describedby={passwordForm.formState.errors.currentPassword ? "security-current-password-error" : undefined} {...passwordForm.register("currentPassword")} />
              {passwordForm.formState.errors.currentPassword && <p id="security-current-password-error" role="alert" className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>}
            </div>}
            <div className="grid gap-2"><Label htmlFor="security-new-password">新しいパスワード <span className="text-xs text-muted-foreground">必須</span></Label><Input id="security-new-password" type="password" autoComplete="new-password" disabled={disabled} aria-invalid={!!passwordForm.formState.errors.password} aria-describedby={passwordForm.formState.errors.password ? "security-new-password-error" : undefined} {...passwordForm.register("password")} />{passwordForm.formState.errors.password && <p id="security-new-password-error" role="alert" className="text-sm text-destructive">{passwordForm.formState.errors.password.message}</p>}</div>
            <div className="grid gap-2"><Label htmlFor="security-confirm-password">新しいパスワード（確認） <span className="text-xs text-muted-foreground">必須</span></Label><Input id="security-confirm-password" type="password" autoComplete="new-password" disabled={disabled} aria-invalid={!!passwordForm.formState.errors.confirmPassword} aria-describedby={passwordForm.formState.errors.confirmPassword ? "security-confirm-password-error" : undefined} {...passwordForm.register("confirmPassword")} />{passwordForm.formState.errors.confirmPassword && <p id="security-confirm-password-error" role="alert" className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>}</div>
            {passwordError && <Alert role="alert" className="border-destructive/40 text-destructive">{passwordError}</Alert>}
            <Button type="submit" className="justify-self-start" disabled={disabled}>{busy ? "処理中…" : methods.password ? "パスワードを変更" : "パスワードを設定"}</Button>
          </form>
          {methods.password && <Button type="button" variant="link" className="h-auto justify-self-start whitespace-normal p-0 text-left" disabled={disabled} onClick={() => void run(async () => { setPasswordError(""); await resetCustomerPassword(context.user!.email ?? ""); assertCurrent(); setResetMessage("登録済みのメールアドレス宛てにパスワード再設定メールを送信しました。"); }, setPasswordError)}>パスワードをお忘れですか？</Button>}
          {resetMessage && <p role="status" className="text-sm text-muted-foreground">{resetMessage}</p>}
        </section>
        <section className="grid min-w-0 gap-4 rounded-lg border border-border bg-card p-5" aria-labelledby="customer-google-link-title">
          <h3 id="customer-google-link-title" className="font-semibold">Googleアカウント連携</h3>
          <p className="break-all text-sm">{methods.google ? methods.googleEmail ?? "連携済み（メールアドレスを取得できませんでした）" : "未連携"}</p>
          {methods.google ? <><Button type="button" variant="outline" className="justify-self-start" disabled={disabled || !methods.password} onClick={() => { setUnlinkError(""); unlinkForm.reset(); setUnlink(true); }}>Google連携を解除</Button>{!methods.password && <p className="text-sm text-muted-foreground">解除するには、先にパスワードを設定してください。</p>}</> : <Button type="button" variant="outline" className="justify-self-start" disabled={disabled} onClick={openLink}>Googleアカウントを連携</Button>}
          {linkError && !linkStage && <Alert role="alert" className="border-destructive/40 text-destructive">{linkError}</Alert>}
          {linkMessage && <p role="status" className="text-sm text-muted-foreground">{linkMessage}</p>}
        </section>
      </>}
    </div>
    <Dialog open={Boolean(linkStage)} onOpenChange={open => { if (!open) cancelLink(); }}>
      <DialogContent className="grid max-w-md gap-4 p-5" onEscapeKeyDown={event => { if (working) event.preventDefault(); }} onInteractOutside={event => { if (working) event.preventDefault(); }}>
        <DialogTitle>Googleアカウントを連携</DialogTitle>
        <DialogDescription>{linkStage === "password" ? "予約サイトの現在のパスワードで本人確認を行ってください。" : "予約サイトへのログインに使用するGoogleアカウントを選択してください。"}</DialogDescription>
        {linkStage === "password" && <form className="grid gap-4" noValidate onSubmit={linkForm.handleSubmit(values => run(async () => {
          setLinkError(""); await context.reauthenticate(values.currentPassword); assertCurrent(); linkForm.reset(); setLinkStage("google");
        }, setLinkError))}>
          <div className="grid gap-2"><Label htmlFor="google-link-current-password">現在のパスワード <span className="text-xs text-muted-foreground">必須</span></Label><Input id="google-link-current-password" type="password" autoComplete="current-password" disabled={working} {...linkForm.register("currentPassword")} aria-invalid={!!linkForm.formState.errors.currentPassword} aria-describedby={linkForm.formState.errors.currentPassword ? "google-link-password-error" : undefined} />{linkForm.formState.errors.currentPassword && <p id="google-link-password-error" role="alert" className="text-sm text-destructive">{linkForm.formState.errors.currentPassword.message}</p>}</div>
          <Button type="submit" disabled={working} className="justify-self-end">{busy ? "確認中…" : "本人確認して次へ"}</Button>
        </form>}
        {linkStage === "google" && <GoogleCustomerButton mode="link" onBusyChange={setLinkBusy} onLinkAuthenticationRequired={message => { setLinkError(message); setLinkStage("password"); }} onComplete={() => { setLinkStage(null); linkForm.reset(); setLinkMessage("Googleアカウントを連携しました。"); setReload(v => v + 1); }} />}
        {linkError && <Alert role="alert" className="border-destructive/40 text-destructive">{linkError}</Alert>}
        <Button type="button" variant="outline" disabled={working} className="justify-self-end" onClick={cancelLink}>キャンセル</Button>
      </DialogContent>
    </Dialog>
    <Dialog open={unlink} onOpenChange={open => { if (!open) cancelUnlink(); }}>
      <DialogContent className="grid max-w-md gap-4 p-5" onEscapeKeyDown={event => { if (working) event.preventDefault(); }} onInteractOutside={event => { if (working) event.preventDefault(); }}>
        <DialogTitle>Google連携を解除しますか？</DialogTitle>
        <DialogDescription>解除後はメールアドレスとパスワードでログインしてください。お客様情報と予約はそのまま残ります。</DialogDescription>
        <p className="break-all text-sm">{methods?.googleEmail}</p>
        <form className="grid gap-4" noValidate onSubmit={unlinkForm.handleSubmit(values => run(async () => {
          setUnlinkError(""); const authToken = await context.reauthenticate(values.currentPassword); assertCurrent();
          const data = await requestJson<{ notification?: string }>("/api/accounts/me/login-methods", { method: "DELETE", authToken });
          unlinkForm.reset(); setUnlink(false); await finishChange(data, "Google連携を解除しました。");
        }, setUnlinkError).finally(() => unlinkForm.reset()))}>
          <div className="grid gap-2"><Label htmlFor="google-unlink-current-password">現在のパスワード <span className="text-xs text-muted-foreground">必須</span></Label><Input id="google-unlink-current-password" type="password" autoComplete="current-password" disabled={working} {...unlinkForm.register("currentPassword")} aria-invalid={!!unlinkForm.formState.errors.currentPassword} aria-describedby={unlinkForm.formState.errors.currentPassword ? "google-unlink-password-error" : undefined} />{unlinkForm.formState.errors.currentPassword && <p id="google-unlink-password-error" role="alert" className="text-sm text-destructive">{unlinkForm.formState.errors.currentPassword.message}</p>}</div>
          {unlinkError && <Alert role="alert" className="border-destructive/40 text-destructive">{unlinkError}</Alert>}
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={working} onClick={cancelUnlink}>キャンセル</Button><Button type="submit" variant="destructive" disabled={working}>{busy ? "解除中…" : "本人確認して解除する"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
