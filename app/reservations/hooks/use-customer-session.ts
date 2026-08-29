"use client";

import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { firebaseAuth } from "../firebase-client";

export function useCustomerSession() {
  const [customerUser, setCustomerUser] = useState<User | null>(null);
  const [customerAuthLoading, setCustomerAuthLoading] = useState(true);
  const [customerAuthError, setCustomerAuthError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (user) => {
      setCustomerUser(user);
      setCustomerAuthLoading(false);
    });
  }, []);

  const loginCustomer = async (email: string, password: string) => {
    setCustomerAuthError("");
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (error) {
      const message = customerAuthMessage(error, "ログインに失敗しました。メールアドレスとパスワードを確認してください。");
      setCustomerAuthError(message);
      throw customerAuthUiError(message, error);
    }
  };

  const registerCustomer = async (email: string, password: string) => {
    setCustomerAuthError("");
    try {
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
    } catch (error) {
      const message = customerAuthMessage(error, "アカウント作成に失敗しました。入力内容を確認してください。");
      setCustomerAuthError(message);
      throw customerAuthUiError(message, error);
    }
  };

  return {
    customerUser,
    customerAuthLoading,
    customerAuthError,
    loginCustomer,
    registerCustomer,
    signOutCustomer: () => signOut(firebaseAuth),
  };
}

function customerAuthMessage(error: unknown, fallback: string) {
  const code = customerAuthErrorCode(error);
  if (code === "auth/email-already-in-use") return "このメールアドレスは登録済みです。ログインを選択してください。";
  if (code === "auth/weak-password") return "パスワードは6文字以上で入力してください。";
  if (code === "auth/invalid-email") return "メールアドレスの形式を確認してください。";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "メールアドレスまたはパスワードが正しくありません。";
  if (code === "auth/operation-not-allowed") return "メールアドレスとパスワードでのログインがFirebase Authenticationで有効になっていません。";
  if (code === "auth/network-request-failed") return "ネットワーク接続を確認して、もう一度お試しください。";
  if (code === "auth/invalid-api-key") return "Firebaseの公開APIキー設定を確認してください。";
  return fallback;
}

export function customerAuthErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
}

function customerAuthUiError(message: string, originalError: unknown) {
  const error = new Error(message);
  const code = customerAuthErrorCode(originalError);
  if (code) Object.assign(error, { code });
  return error;
}
