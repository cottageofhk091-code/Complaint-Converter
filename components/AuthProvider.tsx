"use client";

import type { AuthUser } from "@/lib/auth";
import { clearLegacyAuthStorage } from "@/lib/auth";
import { toJapaneseAuthError } from "@/lib/auth-errors";
import {
  DEV_MOCK_USER,
  IS_DEV,
  readDevMockUser,
  readDevPaidOverride,
  writeDevMockUser,
  writeDevPaidOverride,
} from "@/lib/dev-auth";
import {
  fetchProfile,
  markProfilePaid,
  profileToAuthUser,
  upsertProfileForUser,
} from "@/lib/profiles";
import {
  getProSessionIdFromStorage,
  setProSessionIdInStorage,
} from "@/lib/pro";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
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
  session: Session | null;
  isAuthenticated: boolean;
  isProUnlocked: boolean;
  proSessionId: string | null;
  ready: boolean;
  supabaseReady: boolean;
  signUp: (input: {
    email: string;
    password: string;
    displayName?: string;
    ageGroup: string;
    region: string;
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  /** 開発環境: メール確認なしで即時ログイン */
  signInAsDevMock: () => void;
  signOut: () => Promise<void>;
  logout: () => void;
  activateProFromCheckout: (input: {
    sessionId: string;
    email?: string | null;
  }) => void;
  clearProAccess: () => void;
  refreshProfile: () => Promise<void>;
  /** 無料体験消費後に UI を即時同期 */
  markFreeTrialConsumed: () => void;
  /** 開発環境のみ: 有料プラン体験のトグル */
  toggleDevPaidPlan: () => void;
  /** 開発環境のみ: 有料体験オーバーライド中か */
  isDevPaidOverride: boolean | null;
  /** 開発環境のみ: モックログイン中か */
  isDevMockAuth: boolean;
  /** メール確認完了後のウェルカム表示 */
  welcomeMessage: string | null;
  clearWelcomeMessage: () => void;
  /** パスワード再設定フロー（トップ上モーダル） */
  passwordRecoveryOpen: boolean;
  openPasswordRecovery: () => void;
  closePasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function notifyProChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pro-unlock-changed"));
  }
}

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    (typeof meta?.display_name === "string" && meta.display_name) ||
    (typeof meta?.name === "string" && meta.name) ||
    "";
  return fromMeta.trim() || user.email?.split("@")[0] || "ユーザー";
}

async function verifyProSession(
  sessionId: string,
  email?: string | null
): Promise<{ unlocked: boolean; sessionId: string | null }> {
  try {
    const res = await fetch("/api/stripe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        email: email || undefined,
      }),
    });
    const data = (await res.json()) as {
      unlocked?: boolean;
      sessionId?: string | null;
    };
    return {
      unlocked: !!data.unlocked,
      sessionId: data.sessionId || (data.unlocked ? sessionId : null),
    };
  } catch (err) {
    console.error("[auth] pro verify failed:", err);
    return { unlocked: false, sessionId: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [proSessionId, setProSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [devPaidOverride, setDevPaidOverride] = useState<boolean | null>(null);
  const [devMockAuth, setDevMockAuth] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    if (!IS_DEV) return;
    setDevPaidOverride(readDevPaidOverride());
    const mock = readDevMockUser();
    if (mock) {
      setUser(mock);
      setDevMockAuth(true);
    }
  }, []);

  const syncFromSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    const storedProId = getProSessionIdFromStorage();
    let activeProId: string | null = null;

    if (storedProId) {
      const verified = await verifyProSession(
        storedProId,
        nextSession?.user?.email
      );
      if (verified.unlocked && (verified.sessionId || storedProId)) {
        activeProId = verified.sessionId || storedProId;
        setProSessionIdInStorage(activeProId);
      } else {
        setProSessionIdInStorage(null);
      }
    } else {
      setProSessionIdInStorage(null);
    }

    setProSessionId(activeProId);

    if (!nextSession?.user) {
      // 実セッション無しでも Dev モックを維持
      if (IS_DEV) {
        const mock = readDevMockUser();
        if (mock) {
          setUser(mock);
          setDevMockAuth(true);
          return;
        }
      }
      setDevMockAuth(false);
      setUser(null);
      return;
    }

    // 実ログインしたらモックを解除
    if (IS_DEV) {
      writeDevMockUser(null);
      setDevMockAuth(false);
    }

    const profile = await fetchProfile(nextSession.user.id);
    const meta = (nextSession.user.user_metadata || {}) as Record<
      string,
      unknown
    >;

    // プロファイルが無い新規会員は初回無料権を付与してから UI に反映
    let resolvedProfile = profile;
    if (!resolvedProfile) {
      try {
        resolvedProfile = await upsertProfileForUser(
          nextSession.user.id,
          nextSession.user.email || "",
          {
            displayName: displayNameFromUser(nextSession.user),
            ageGroup:
              typeof meta.age_group === "string" ? meta.age_group : "unknown",
            region: typeof meta.region === "string" ? meta.region : "unknown",
            membershipType: "free",
          }
        );
      } catch (err) {
        console.warn("[auth] profile ensure on sync failed:", err);
      }
    }

    setUser(
      profileToAuthUser(
        resolvedProfile,
        {
          id: nextSession.user.id,
          email: nextSession.user.email || "",
          name: displayNameFromUser(nextSession.user),
        },
        Boolean(activeProId),
        meta
      )
    );

    if (activeProId && resolvedProfile?.membership_type !== "paid") {
      void markProfilePaid(nextSession.user.id);
    }
  }, []);

  useEffect(() => {
    clearLegacyAuthStorage();
    let cancelled = false;

    async function init() {
      if (!supabase) {
        if (IS_DEV) {
          const mock = readDevMockUser();
          if (mock && !cancelled) {
            setUser(mock);
            setDevMockAuth(true);
          }
        }
        const storedProId = getProSessionIdFromStorage();
        if (storedProId) {
          const verified = await verifyProSession(storedProId);
          if (!cancelled) {
            if (verified.unlocked) {
              const sid = verified.sessionId || storedProId;
              setProSessionIdInStorage(sid);
              setProSessionId(sid);
            } else {
              setProSessionIdInStorage(null);
              setProSessionId(null);
            }
          }
        }
        if (!cancelled) setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      await syncFromSession(data.session);
      if (!cancelled) setReady(true);
    }

    void init();

    if (!supabase) {
      return () => {
        cancelled = true;
      };
    }

    const client = supabase;
    const maybeWelcomeAfterConfirm = (hasSession: boolean) => {
      if (!hasSession) return;
      try {
        if (sessionStorage.getItem("awaiting_email_confirm") === "1") {
          sessionStorage.removeItem("awaiting_email_confirm");
          setWelcomeMessage(
            "会員登録が完了しました。スマートお詫びコンシェルジュへようこそ。初回は有料プラン機能を1回無料でお試しいただけます。"
          );
          console.info("[auth] welcome after email confirm (tab sync)");
        }
      } catch {
        // ignore
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.info("[auth] onAuthStateChange", {
        event,
        hasSession: !!nextSession?.user,
      });
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecoveryOpen(true);
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        maybeWelcomeAfterConfirm(!!nextSession?.user);
      }
      void syncFromSession(nextSession);
    });

    const onFocus = () => {
      void client.auth.getSession().then(({ data }) => {
        console.info("[auth] focus/visibility sync", {
          hasSession: !!data.session?.user,
        });
        maybeWelcomeAfterConfirm(!!data.session?.user);
        void syncFromSession(data.session);
      });
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocus();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [syncFromSession]);

  const signUp = useCallback(
    async (input: {
      email: string;
      password: string;
      displayName?: string;
      ageGroup: string;
      region: string;
    }) => {
      if (!supabase) {
        // 開発環境: Supabase 未設定でもモック登録で続行
        if (IS_DEV) {
          const mock: AuthUser = {
            ...DEV_MOCK_USER,
            email: input.email.trim().toLowerCase() || DEV_MOCK_USER.email,
            name:
              input.displayName?.trim() ||
              input.email.split("@")[0] ||
              DEV_MOCK_USER.name,
            ageGroup: input.ageGroup,
            region: input.region,
          };
          writeDevMockUser(mock);
          setUser(mock);
          setDevMockAuth(true);
          setSession(null);
          return { needsEmailConfirmation: false };
        }
        throw new Error(
          "Supabase が未設定です。環境変数を設定してから登録してください。"
        );
      }

      // Resend 経由の確認メール（Supabase 標準メールは送らない）
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.email.trim(),
          password: input.password,
          displayName: input.displayName?.trim() || undefined,
          ageGroup: input.ageGroup,
          region: input.region,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        needsEmailConfirmation?: boolean;
        success?: boolean;
      };

      if (!res.ok) {
        console.error("[auth] register API failed:", {
          status: res.status,
          error: data.error,
          detail: data.detail,
        });
        // API が返した日本語 error を優先。英語のみ translator 経由。
        const raw =
          typeof data.error === "string" ? data.error.trim() : "";
        const jp =
          raw && /[\u3040-\u30ff\u4e00-\u9fff]/.test(raw)
            ? raw
            : toJapaneseAuthError(raw || data.detail || data);
        throw new Error(jp);
      }

      try {
        sessionStorage.setItem("awaiting_email_confirm", "1");
      } catch {
        // ignore
      }

      return {
        needsEmailConfirmation: data.needsEmailConfirmation !== false,
      };
    },
    []
  );

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      if (!supabase) {
        if (IS_DEV) {
          const mock: AuthUser = {
            ...DEV_MOCK_USER,
            email: input.email.trim().toLowerCase() || DEV_MOCK_USER.email,
            name: input.email.split("@")[0] || DEV_MOCK_USER.name,
          };
          writeDevMockUser(mock);
          setUser(mock);
          setDevMockAuth(true);
          setSession(null);
          return;
        }
        throw new Error(
          "Supabase が未設定です。環境変数を設定してからログインしてください。"
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });

      if (error) {
        // 開発環境: メール未確認などで失敗したらモックにフォールバック
        if (IS_DEV) {
          console.warn(
            "[auth] signIn failed in development, falling back to mock:",
            error.message
          );
          const mock: AuthUser = {
            ...DEV_MOCK_USER,
            email: input.email.trim().toLowerCase() || DEV_MOCK_USER.email,
            name: input.email.split("@")[0] || DEV_MOCK_USER.name,
          };
          writeDevMockUser(mock);
          setUser(mock);
          setDevMockAuth(true);
          setSession(null);
          return;
        }
        throw new Error(toJapaneseAuthError(error));
      }

      if (data.user) {
        const existing = await fetchProfile(data.user.id);
        if (!existing) {
          const meta = data.user.user_metadata as Record<string, unknown>;
          const ageGroup =
            typeof meta.age_group === "string" ? meta.age_group : "";
          const region = typeof meta.region === "string" ? meta.region : "";
          if (ageGroup && region) {
            try {
              await upsertProfileForUser(
                data.user.id,
                data.user.email || input.email,
                {
                  displayName:
                    typeof meta.display_name === "string"
                      ? meta.display_name
                      : undefined,
                  ageGroup,
                  region,
                  membershipType: "free",
                }
              );
            } catch (err) {
              console.warn("[auth] profile backfill failed:", err);
            }
          }
        }
      }

      await syncFromSession(data.session);
    },
    [syncFromSession]
  );

  const signInAsDevMock = useCallback(() => {
    if (!IS_DEV) return;
    writeDevMockUser(DEV_MOCK_USER);
    setUser(DEV_MOCK_USER);
    setDevMockAuth(true);
    setSession(null);
    notifyProChanged();
  }, []);

  const signOut = useCallback(async () => {
    if (IS_DEV) {
      writeDevMockUser(null);
      setDevMockAuth(false);
    }
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    notifyProChanged();
  }, []);

  const logout = useCallback(() => {
    void signOut();
  }, [signOut]);

  const clearProAccess = useCallback(() => {
    setProSessionIdInStorage(null);
    setProSessionId(null);
    if (IS_DEV) {
      writeDevPaidOverride(false);
      setDevPaidOverride(false);
    }
    setUser((prev) =>
      prev ? { ...prev, plan: "free", membershipType: "free" } : prev
    );
    notifyProChanged();
  }, []);

  const activateProFromCheckout = useCallback(
    (input: { sessionId: string; email?: string | null }) => {
      const sid = input.sessionId.trim();
      if (!sid) return;
      setProSessionIdInStorage(sid);
      setProSessionId(sid);
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          plan: "pro",
          membershipType: "paid",
          email: input.email?.trim() || prev.email,
        };
      });
      if (session?.user?.id) {
        void markProfilePaid(session.user.id);
      }
      notifyProChanged();
    },
    [session?.user?.id]
  );

  const refreshProfile = useCallback(async () => {
    if (IS_DEV && devMockAuth && !session?.user) {
      const mock = readDevMockUser();
      if (mock) {
        setUser(mock);
        return;
      }
    }
    await syncFromSession(session);
  }, [devMockAuth, session, syncFromSession]);

  const markFreeTrialConsumed = useCallback(() => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            freeTrialUsed: true,
            freeTrialCredits: 0,
          }
        : prev
    );
  }, []);

  const toggleDevPaidPlan = useCallback(() => {
    if (!IS_DEV) return;
    setDevPaidOverride((prev) => {
      const currentlyPaid =
        prev === true ||
        (prev !== false &&
          (Boolean(proSessionId) ||
            user?.membershipType === "paid" ||
            user?.plan === "pro"));
      const next = !currentlyPaid;
      writeDevPaidOverride(next);
      return next;
    });
    notifyProChanged();
  }, [proSessionId, user?.membershipType, user?.plan]);

  const clearWelcomeMessage = useCallback(() => {
    setWelcomeMessage(null);
  }, []);

  const openPasswordRecovery = useCallback(() => {
    setPasswordRecoveryOpen(true);
  }, []);

  const closePasswordRecovery = useCallback(() => {
    setPasswordRecoveryOpen(false);
  }, []);

  const displayUser = useMemo(() => {
    if (!user) return null;
    if (!IS_DEV || devPaidOverride === null) return user;
    if (devPaidOverride) {
      return {
        ...user,
        plan: "pro" as const,
        membershipType: "paid" as const,
      };
    }
    return {
      ...user,
      plan: "free" as const,
      membershipType: "free" as const,
    };
  }, [user, devPaidOverride]);

  const effectiveProUnlocked = useMemo(() => {
    if (IS_DEV && devPaidOverride !== null) return devPaidOverride;
    return Boolean(proSessionId);
  }, [devPaidOverride, proSessionId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: displayUser,
      session,
      isAuthenticated: !!session?.user || (IS_DEV && devMockAuth),
      isProUnlocked: effectiveProUnlocked,
      proSessionId,
      ready,
      supabaseReady,
      signUp,
      signIn,
      signInAsDevMock,
      signOut,
      logout,
      activateProFromCheckout,
      clearProAccess,
      refreshProfile,
      markFreeTrialConsumed,
      toggleDevPaidPlan,
      isDevPaidOverride: IS_DEV ? devPaidOverride : null,
      isDevMockAuth: IS_DEV && devMockAuth,
      welcomeMessage,
      clearWelcomeMessage,
      passwordRecoveryOpen,
      openPasswordRecovery,
      closePasswordRecovery,
    }),
    [
      displayUser,
      session,
      devMockAuth,
      effectiveProUnlocked,
      proSessionId,
      ready,
      supabaseReady,
      signUp,
      signIn,
      signInAsDevMock,
      signOut,
      logout,
      activateProFromCheckout,
      clearProAccess,
      refreshProfile,
      markFreeTrialConsumed,
      toggleDevPaidPlan,
      devPaidOverride,
      welcomeMessage,
      clearWelcomeMessage,
      passwordRecoveryOpen,
      openPasswordRecovery,
      closePasswordRecovery,
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
