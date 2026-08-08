"use client";

import {
  AuthUser,
  createDemoUser,
  loadUserFromStorage,
  saveUserToStorage,
} from "@/lib/auth";
import {
  isProUnlockedInStorage,
  setProUnlockedInStorage,
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
  /** 有料機能のロック解除状態（未ログイン時は常に false） */
  isProUnlocked: boolean;
  ready: boolean;
  login: (input: {
    name?: string;
    email: string;
    plan?: "free" | "pro";
  }) => void;
  loginAs: (plan: "free" | "pro") => void;
  logout: () => void;
  setPlan: (plan: "free" | "pro") => void;
  /** 有料ロックの明示的な切替（デバッグ / 決済完了用） */
  setProUnlocked: (unlocked: boolean) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function notifyProChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pro-unlock-changed"));
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isProUnlocked, setIsProUnlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedUser = loadUserFromStorage();

    if (!storedUser) {
      // 未ログインは常に無料（ロック）状態。残留フラグも掃除
      setProUnlockedInStorage(false);
      setUser(null);
      setIsProUnlocked(false);
    } else {
      const unlocked =
        storedUser.plan === "pro" || isProUnlockedInStorage();
      if (storedUser.plan === "pro") {
        setProUnlockedInStorage(true);
      }
      setUser(storedUser);
      setIsProUnlocked(unlocked);
    }

    setReady(true);
  }, []);

  const setProUnlocked = useCallback(
    (unlocked: boolean) => {
      setProUnlockedInStorage(unlocked);
      setIsProUnlocked(unlocked);
      notifyProChanged();
    },
    []
  );

  const persistUser = useCallback((next: AuthUser | null) => {
    setUser(next);
    saveUserToStorage(next);
  }, []);

  const login = useCallback(
    (input: { name?: string; email: string; plan?: "free" | "pro" }) => {
      const next = createDemoUser({
        name: input.name,
        email: input.email,
        plan: input.plan ?? "free",
      });
      persistUser(next);
      if (next.plan === "pro") {
        setProUnlocked(true);
      } else {
        // フリーログイン時は購入済みフラグが残っていれば維持、なければロック
        setIsProUnlocked(isProUnlockedInStorage());
        notifyProChanged();
      }
    },
    [persistUser, setProUnlocked]
  );

  const loginAs = useCallback(
    (plan: "free" | "pro") => {
      const next = createDemoUser({ plan });
      persistUser(next);
      setProUnlocked(plan === "pro");
    },
    [persistUser, setProUnlocked]
  );

  const logout = useCallback(() => {
    // 認証・有料フラグを完全リセット
    persistUser(null);
    setProUnlockedInStorage(false);
    setIsProUnlocked(false);
    notifyProChanged();
  }, [persistUser]);

  const setPlan = useCallback(
    (plan: "free" | "pro") => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, plan };
        saveUserToStorage(next);
        return next;
      });
      setProUnlocked(plan === "pro");
    },
    [setProUnlocked]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isProUnlocked: user ? isProUnlocked : false,
      ready,
      login,
      loginAs,
      logout,
      setPlan,
      setProUnlocked,
    }),
    [
      user,
      isProUnlocked,
      ready,
      login,
      loginAs,
      logout,
      setPlan,
      setProUnlocked,
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
