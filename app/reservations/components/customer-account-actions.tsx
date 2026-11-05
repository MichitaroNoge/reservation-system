"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CustomerPageActions } from "@/components/ui/customer-page-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { customerEmailChangeSchema } from "@/lib/customer-email-change";
import { customerAuthErrorCode } from "../hooks/use-customer-session";
import { useGoogleCustomer } from "./google-customer-auth";

type AccountActionProps = { customerEmail: string; onBack: () => void; busy?: boolean };

export function CustomerEmailChangeScreen({ customerEmail, onBack, busy = false, message, failed = false, onRequestEmailChange }: AccountActionProps & {
  message: string;
  failed?: boolean;
  onRequestEmailChange: (email: string) => Promise<void>;
}) {
  const google = useGoogleCustomer();
  const pending = useRef(false);
  const [error, setError] = useState("");
  const form = useForm<z.infer<typeof customerEmailChangeSchema>>({ resolver: zodResolver(customerEmailChangeSchema), defaultValues: { email: "", confirmation: "" }, mode: "onTouched" });
  const submitting = busy || form.formState.isSubmitting;
  const submit = form.handleSubmit(async values => {
    if (pending.current || busy) return;
    pending.current = true; setError("");
    try {
      if (google?.user?.providerData.some(provider => provider.providerId === "google.com")) await google.reauthenticate("");
      await onRequestEmailChange(values.email);
      form.reset();
    } catch (e) {
      setError(customerAuthErrorCode(e) === "auth/requires-recent-login" ? "安全のため再ログインしてからお試しください。" : e instanceof Error ? e.message : "確認メールを送信できませんでした。");
    } finally { pending.current = false; }
  });
  return <div className="form-body narrow space-y-5">
    <h1 className="text-xl font-semibold">メールアドレス変更</h1>
    <dl><dt className="text-sm text-muted-foreground">現在のメールアドレス</dt><dd className="mt-1 break-all font-medium">{customerEmail}</dd></dl>
    {message && <Alert role={failed ? "alert" : "status"} className={failed ? "border-destructive/40 text-destructive" : "border-success/40"}>{message}</Alert>}
    <form id="customer-email-change-form" noValidate className="grid gap-5" onSubmit={submit}>
      {(["email", "confirmation"] as const).map(name => <div key={name} className="grid gap-2">
        <Label htmlFor={`customer-email-${name}`}>{name === "email" ? "新しいメールアドレス" : "新しいメールアドレス（確認）"} <span className="text-xs text-muted-foreground">必須</span></Label>
        <Input {...form.register(name)} id={`customer-email-${name}`} type="email" inputMode="email" autoComplete="email" maxLength={255} disabled={submitting} aria-invalid={Boolean(form.formState.errors[name])} aria-describedby={form.formState.errors[name] ? `customer-email-${name}-error` : undefined} />
        {form.formState.errors[name] && <p id={`customer-email-${name}-error`} role="alert" className="text-sm text-destructive">{form.formState.errors[name]?.message}</p>}
      </div>)}
      {error && <Alert role="alert" className="border-destructive/40 text-destructive">{error}</Alert>}
    </form>
    <CustomerPageActions onBack={onBack} busy={submitting} dirty={form.formState.isDirty}>
      <Button type="submit" form="customer-email-change-form" disabled={submitting}><Mail />{submitting ? "送信中…" : "確認メールを送信"}</Button>
    </CustomerPageActions>
  </div>;
}

export function CustomerAccountDeletionScreen({ customerEmail, onBack, busy = false, onDeleteAccount }: AccountActionProps & { onDeleteAccount: (password: string) => Promise<void> }) {
  const google = useGoogleCustomer();
  const hasGoogle = Boolean(google?.user?.providerData.some(provider => provider.providerId === "google.com"));
  const pending = useRef(false);
  const [error, setError] = useState("");
  const form = useForm<{ password: string }>({ defaultValues: { password: "" }, shouldUnregister: true });
  const password = form.watch("password");
  const submitting = busy || form.formState.isSubmitting;
  const submit = form.handleSubmit(async values => {
    if (pending.current || busy) return;
    pending.current = true; setError("");
    try {
      if (hasGoogle) await google!.reauthenticate("");
      await onDeleteAccount(values.password);
    } catch (e) { setError(e instanceof Error ? e.message : "アカウントを削除できませんでした。"); }
    finally { pending.current = false; form.reset(); }
  });
  return <div className="form-body narrow space-y-5">
    <h1 className="text-xl font-semibold">アカウント削除</h1>
    <dl><dt className="text-sm text-muted-foreground">削除するアカウント</dt><dd className="mt-1 break-all font-medium">{customerEmail}</dd></dl>
    <Alert className="border-destructive/40"><p>アカウントを削除するとログインできなくなります。この操作は取り消せません。</p></Alert>
    <form id="customer-account-deletion-form" noValidate className="grid gap-4" onSubmit={submit}>
      {!hasGoogle && <div className="grid gap-2">
        <Label htmlFor="account-deletion-password">現在のパスワード <span className="text-xs text-muted-foreground">必須</span></Label>
        <Input {...form.register("password", { required: "現在のパスワードを入力してください。" })} id="account-deletion-password" type="password" autoComplete="current-password" disabled={submitting} aria-invalid={Boolean(form.formState.errors.password)} aria-describedby={form.formState.errors.password ? "account-deletion-password-error" : undefined} />
        {form.formState.errors.password && <p id="account-deletion-password-error" role="alert" className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
      </div>}
      {hasGoogle && <p className="text-sm text-muted-foreground">削除する前に、連携済みのGoogleアカウントで本人確認を行います。</p>}
      {error && <Alert role="alert" className="border-destructive/40 text-destructive">{error}</Alert>}
    </form>
    <CustomerPageActions onBack={onBack} busy={submitting} dirty={form.formState.isDirty}>
      <Button type="submit" form="customer-account-deletion-form" variant="destructive" disabled={submitting || (!hasGoogle && !password)}><Trash2 />{submitting ? "本人確認・削除中…" : "本人確認して削除する"}</Button>
    </CustomerPageActions>
  </div>;
}
