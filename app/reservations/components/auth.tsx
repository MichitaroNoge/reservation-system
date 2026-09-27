import { useState, type FormEvent } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function AuthBrand() {
  return <div className="mb-6 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">R</span><div><strong className="block text-base">Reserve</strong><small className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Operations</small></div></div>;
}

export function AdminAuthShell({ title, text }: { title: string; text: string }) {
  return <main className="grid min-h-screen place-items-center bg-background p-5"><Card className="w-full max-w-md"><CardHeader><AuthBrand/><CardTitle className="text-xl">{title}</CardTitle><CardDescription>{text}</CardDescription></CardHeader></Card></main>;
}

export function AdminLogin({ onLogin, onCustomer, error }: { onLogin: (email: string, password: string) => Promise<void>; onCustomer: () => void; error: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await onLogin(email, password);
    } catch {
      setMessage("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-background p-5"><Card className="w-full max-w-md"><CardHeader><AuthBrand/><CardTitle className="text-xl">管理画面ログイン</CardTitle><CardDescription>予約・顧客・店舗・メニューを管理するには、管理者アカウントでログインしてください。</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="grid gap-5"><Label className="grid gap-2">メールアドレス<Input type="email" value={email} autoComplete="email" onChange={event => setEmail(event.target.value)} required /></Label><Label className="grid gap-2">パスワード<Input type="password" value={password} autoComplete="current-password" onChange={event => setPassword(event.target.value)} required /></Label>{(message || error) && <Alert>{message || error}</Alert>}<Button type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className="animate-spin"/>確認中...</> : <><LogIn/>ログイン</>}</Button><Button type="button" variant="ghost" onClick={onCustomer}>顧客予約フォームを表示</Button></form></CardContent></Card></main>;
}
