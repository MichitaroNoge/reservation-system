"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ApiRequestError, requestJson } from "../api-client";
import { firebaseAuth } from "../firebase-client";
import type { AdminSession } from "../types";

export function useAdminSession(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    if (!enabled) {
      setAdminSession(null);
      setAuthLoading(false);
      return;
    }
    let cancelled = false;
    let revision = 0;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      const requestRevision = ++revision;
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
        if (cancelled || requestRevision !== revision) return;
        setAdminSession({ user, email: session.email });
      } catch (error) {
        if (cancelled || requestRevision !== revision) return;
        // Switching to the admin screen must not sign a customer out of the shared Auth session.
        setAuthError(error instanceof ApiRequestError && [401, 403].includes(error.status)
          ? "管理者権限がありません。管理者アカウントでログインしてください。"
          : "管理者情報を取得できませんでした。通信状態を確認して、もう一度お試しください。");
      } finally {
        if (!cancelled && requestRevision === revision) setAuthLoading(false);
      }
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [enabled]);

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
