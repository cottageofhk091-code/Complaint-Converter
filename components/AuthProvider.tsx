"use client";

import {
  AuthUser,
  createUser,
  loadUserFromStorage,
  saveUserToStorage,
} from "@/lib/auth";
import {
  getProSessionIdFromStorage,
  setProSessionIdInStorage,
} from "@/lib/pro";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** サーバー検証済みの Checkout Session を保持しているか */
  isProUnlocked: boolean;
  /** PRO 全文取得に送る Session ID */
  proSessionId: string | null;
  ready: boolean;
  login: (input: { name?: string; email: string }) => void;
  logout: () => void;
  /** 決済検証成功後に Session ID を保存し PRO 表示にする */
  activateProFromCheckout: (input: {
    sessionId: string;
    email?: string | null;
  }) => void;
  /** PRO セッションを破棄（ロック） */
  clearProAccess: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function notifyProChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pro-unlock-changed"));
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [proSessionId, setProSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const storedUser = loadUserFromStorage();
      const storedSessionId = getProSessionIdFromStorage();

      if (!storedUser) {
        setProSessionIdInStorage(null);
        if (!cancelled) {
          setUser(null);
          setProSessionId(null);
          setReady(true);
        }
        return;
      }

      if (!storedSessionId) {
        const freeUser =
          storedUser.plan === "pro"
            ? { ...storedUser, plan: "free" as const }
            : storedUser;
        if (freeUser.plan !== storedUser.plan) {
          saveUserToStorage(freeUser);
        }
        if (!cancelled) {
          setUser(freeUser);
          setProSessionId(null);
          setReady(true);
        }
        return;
      }

      // 起動時に Session を再検証（偽の localStorage だけでは PRO にしない）
      try {
        const res = await fetch("/api/stripe/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: storedSessionId,
            email: storedUser.email || undefined,
          }),
        });
        const data = (await res.json()) as {
          unlocked?: boolean;
          sessionId?: string | null;
          email?: string | null;
        };

        if (cancelled) return;

        if (data.unlocked && (data.sessionId || storedSessionId)) {
          const sid = data.sessionId || storedSessionId;
          setProSessionIdInStorage(sid);
          const nextUser: AuthUser = {
            ...storedUser,
            plan: "pro",
            email: data.email || storedUser.email,
          };
          saveUserToStorage(nextUser);
          setUser(nextUser);
          setProSessionId(sid);
        } else {
          setProSessionIdInStorage(null);
          const freeUser = { ...storedUser, plan: "free" as const };
          saveUserToStorage(freeUser);
          setUser(freeUser);
          setProSessionId(null);
        }
      } catch (err) {
        console.error("[auth] pro session re-verify failed:", err);
        if (!cancelled) {
          // 検証失敗時は fail-closed（ロック）
          setProSessionIdInStorage(null);
          const freeUser = { ...storedUser, plan: "free" as const };
          saveUserToStorage(freeUser);
          setUser(freeUser);
          setProSessionId(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistUser = useCallback((next: AuthUser | null) => {
    setUser(next);
    saveUserToStorage(next);
  }, []);

  const login = useCallback(
    (input: { name?: string; email: string }) => {
      const next = createUser({
        name: input.name,
        email: input.email,
      });
      // ログインだけでは PRO にしない。既存の検証済み Session があれば維持。
      const existingSession = getProSessionIdFromStorage();
      persistUser(
        existingSession ? { ...next, plan: "pro" } : next
      );
      setProSessionId(existingSession);
      notifyProChanged();
    },
    [persistUser]
  );

  const clearProAccess = useCallback(() => {
    setProSessionIdInStorage(null);
    setProSessionId(null);
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, plan: "free" as const };
      saveUserToStorage(next);
      return next;
    });
    notifyProChanged();
  }, []);

  const activateProFromCheckout = useCallback(
    (input: { sessionId: string; email?: string | null }) => {
      const sid = input.sessionId.trim();
      if (!sid) return;
      setProSessionIdInStorage(sid);
      setProSessionId(sid);
      setUser((prev) => {
        const base =
          prev ??
          createUser({
            email: input.email || undefined,
            name: "PROユーザー",
          });
        const next: AuthUser = {
          ...base,
          plan: "pro",
          email: input.email?.trim() || base.email,
        };
        saveUserToStorage(next);
        return next;
      });
      notifyProChanged();
    },
    []
  );

  const logout = useCallback(() => {
    persistUser(null);
    setProSessionIdInStorage(null);
    setProSessionId(null);
    notifyProChanged();
  }, [persistUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isProUnlocked: Boolean(proSessionId),
      proSessionId,
      ready,
      login,
      logout,
      activateProFromCheckout,
      clearProAccess,
    }),
    [
      user,
      proSessionId,
      ready,
      login,
      logout,
      activateProFromCheckout,
      clearProAccess,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
