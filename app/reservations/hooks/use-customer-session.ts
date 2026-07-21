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
    } catch {
      setCustomerAuthError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
      throw new Error("Customer login failed.");
    }
  };

  const registerCustomer = async (email: string, password: string) => {
    setCustomerAuthError("");
    try {
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
    } catch {
      setCustomerAuthError("アカウント作成に失敗しました。入力内容を確認してください。");
      throw new Error("Customer registration failed.");
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
