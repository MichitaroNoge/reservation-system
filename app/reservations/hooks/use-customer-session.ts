"use client";

import { useState, useSyncExternalStore } from "react";
import { browserLocalPersistence, createUserWithEmailAndPassword, EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, reload, sendEmailVerification, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut, verifyBeforeUpdateEmail, type User } from "firebase/auth";
import { firebaseAuth } from "../firebase-client";
import { completeCustomerRegistration } from "@/lib/customer-registration";
import { createCustomerAuthState } from "@/lib/customer-auth-state";

const customerAuthPersistence = setPersistence(firebaseAuth, browserLocalPersistence);
const customerAuthState = createCustomerAuthState<User>(({ setUser, setError }) => {
  void customerAuthPersistence.catch(() => {
    setError("ログイン状態を保存できませんでした。ブラウザの保存設定を確認してください。");
  }).then(() => {
    onAuthStateChanged(firebaseAuth, setUser);
  });
});

export function useCustomerSession() {
  const { user: customerUser, loading: customerAuthLoading, error: persistenceError } = useSyncExternalStore(customerAuthState.subscribe, customerAuthState.getSnapshot, customerAuthState.getServerSnapshot);
  const [customerAuthError, setCustomerAuthError] = useState("");

  const loginCustomer = async (email: string, password: string) => {
    setCustomerAuthError("");
    try {
      await customerAuthPersistence;
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return credential.user;
    } catch (error) {
      const message = customerAuthMessage(error, "ログインに失敗しました。メールアドレスとパスワードを確認してください。");
      setCustomerAuthError(message);
      throw customerAuthUiError(message, error);
    }
  };

  const registerCustomer = async (email: string, password: string, saveProfile: (user: User) => Promise<void>) => {
    setCustomerAuthError("");
    try {
      await customerAuthPersistence;
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await completeCustomerRegistration(credential.user, saveProfile, async () => {
        await sendEmailVerification(credential.user);
      });
      return credential.user;
    } catch (error) {
      const message = customerAuthMessage(error, error instanceof Error ? error.message : "アカウント作成に失敗しました。入力内容を確認してください。");
      setCustomerAuthError(message);
      throw customerAuthUiError(message, error);
    }
  };

  const resendVerificationEmail = async () => {
    if (!firebaseAuth.currentUser) throw new Error("ログイン状態を確認できませんでした。もう一度ログインしてください。");
    await sendEmailVerification(firebaseAuth.currentUser);
  };

  const refreshEmailVerification = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    await reload(user);
    customerAuthState.setUser(firebaseAuth.currentUser);
    return firebaseAuth.currentUser;
  };

  const resetCustomerPassword = async (email: string) => {
    setCustomerAuthError("");
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
    } catch (error) {
      const message = customerAuthMessage(error, "パスワード再設定メールを送信できませんでした。");
      setCustomerAuthError(message);
      throw customerAuthUiError(message, error);
    }
  };

  const requestCustomerEmailChange = async (newEmail: string) => {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error("ログイン状態を確認できませんでした。もう一度ログインしてください。");
    await verifyBeforeUpdateEmail(user, newEmail, {
      url: `${window.location.origin}/?customerMode=emailChange&emailChange=complete`,
      handleCodeInApp: false,
    });
  };

  const reauthenticateCustomer = async (password: string) => {
    const user = firebaseAuth.currentUser;
    if (!user?.email) throw new Error("ログイン状態を確認できませんでした。もう一度ログインしてください。");
    if (!password && user.providerData.some(p => p.providerId === "google.com")) return await user.getIdToken(true); // API still enforces a recent Google sign-in.
    if (!password) throw new Error("現在のパスワードを入力してください。");
    try {
      const result = await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      return await result.user.getIdToken(true);
    } catch (error) {
      throw customerAuthUiError(customerAuthMessage(error, "本人確認に失敗しました。もう一度ログインしてください。"), error);
    }
  };

  return {
    customerUser,
    customerAuthLoading,
    customerAuthError: customerAuthError || persistenceError,
    loginCustomer,
    registerCustomer,
    resendVerificationEmail,
    refreshEmailVerification,
    resetCustomerPassword,
    requestCustomerEmailChange,
    reauthenticateCustomer,
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
  if (code === "auth/too-many-requests") return "送信回数が多いため一時的に制限されています。時間をおいてお試しください。";
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
