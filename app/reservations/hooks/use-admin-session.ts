"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { requestJson } from "../api-client";
import { firebaseAuth } from "../firebase-client";
import type { AdminSession } from "../types";

export function useAdminSession() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      setAuthLoading(true);
      setAdminSession(null);
      if (!user) {
        setAuthLoading(false);
        return;
      }
      setAuthError("");
      try {
        const token = await user.getIdToken();
        const session = await requestJson<{ admin: true; email: string | null }>("/api/auth/session", { authToken: token });
        setAdminSession({ user, email: session.email });
      } catch {
        await signOut(firebaseAuth);
        setAuthError("管理者権限が確認できませんでした。管理者アカウントでログインしてください。");
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  const getAdminToken = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error("Admin login required.");
    return user.getIdToken();
  };

  const loginAdmin = async (email: string, password: string) => {
    setAuthError("");
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  };

  return {
    adminSession,
    authError,
    authLoading,
    getAdminToken,
    loginAdmin,
    signOutAdmin: () => signOut(firebaseAuth),
  };
}
