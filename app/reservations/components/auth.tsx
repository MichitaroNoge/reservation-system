import { useState, type FormEvent } from "react";

export function AdminAuthShell({ title, text }: { title: string; text: string }) {
  return <main className="admin-auth-page"><section className="admin-auth-panel"><div className="logo auth-logo"><span>R</span><strong>Reserve</strong><small>Operations</small></div><h1>{title}</h1><p>{text}</p></section></main>;
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

  return <main className="admin-auth-page"><section className="admin-auth-panel"><div className="logo auth-logo"><span>R</span><strong>Reserve</strong><small>Operations</small></div><h1>管理画面ログイン</h1><p>予約・顧客・店舗・メニューを管理するには、管理者アカウントでログインしてください。</p><form onSubmit={submit} className="admin-auth-form"><label>メールアドレス<input type="email" value={email} autoComplete="email" onChange={event => setEmail(event.target.value)} required /></label><label>パスワード<input type="password" value={password} autoComplete="current-password" onChange={event => setPassword(event.target.value)} required /></label>{(message || error) && <div className="auth-error">{message || error}</div>}<button type="submit" disabled={submitting}>{submitting ? "確認中..." : "ログイン"}</button></form><button className="customer-link-button" onClick={onCustomer}>顧客予約フォームを表示</button></section></main>;
}
