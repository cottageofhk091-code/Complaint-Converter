"use client";

import type { AuthUser } from "@/lib/auth";
import { clearLegacyAuthStorage } from "@/lib/auth";
import { toJapaneseAuthError } from "@/lib/auth-errors";
import {
  fetchProfile,
  markProfilePaid,
  profileToAuthUser,
  upsertProfileForUser,
  type SurveyInput,
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
  signOut: () => Promise<void>;
  logout: () => void;
  activateProFromCheckout: (input: {
    sessionId: string;
    email?: string | null;
  }) => void;
  clearProAccess: () => void;
  refreshProfile: () => Promise<void>;
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
  const supabaseReady = isSupabaseConfigured();

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
      setUser(null);
      return;
    }

    const profile = await fetchProfile(nextSession.user.id);
    setUser(
      profileToAuthUser(
        profile,
        {
          id: nextSession.user.id,
          email: nextSession.user.email || "",
          name: displayNameFromUser(nextSession.user),
        },
        Boolean(activeProId)
      )
    );

    if (activeProId && profile?.membership_type !== "paid") {
      void markProfilePaid(nextSession.user.id);
    }
  }, []);

  useEffect(() => {
    clearLegacyAuthStorage();
    let cancelled = false;

    async function init() {
      if (!supabase) {
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncFromSession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
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
        throw new Error(
          "Supabase が未設定です。環境変数を設定してから登録してください。"
        );
      }

      const email = input.email.trim().toLowerCase();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const survey: SurveyInput = {
        displayName: input.displayName,
        ageGroup: input.ageGroup,
        region: input.region,
        membershipType: "free",
      };

      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: {
            display_name: input.displayName?.trim() || "",
            age_group: input.ageGroup,
            region: input.region,
            app_name: "apology",
            free_trial_credits: 1,
            free_trial_used: false,
          },
        },
      });

      if (error) throw new Error(toJapaneseAuthError(error));

      if (data.user && data.session) {
        await upsertProfileForUser(data.user.id, email, survey);
        await syncFromSession(data.session);
        return { needsEmailConfirmation: false };
      }

      if (data.user && !data.session) {
        try {
          await upsertProfileForUser(data.user.id, email, survey);
        } catch (err) {
          console.warn("[auth] profile upsert before confirm skipped:", err);
        }
        return { needsEmailConfirmation: true };
      }

      return { needsEmailConfirmation: !data.session };
    },
    [syncFromSession]
  );

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      if (!supabase) {
        throw new Error(
          "Supabase が未設定です。環境変数を設定してからログインしてください。"
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });

      if (error) throw new Error(toJapaneseAuthError(error));

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

  const signOut = useCallback(async () => {
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
    await syncFromSession(session);
  }, [session, syncFromSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthenticated: !!session?.user,
      isProUnlocked: Boolean(proSessionId),
      proSessionId,
      ready,
      supabaseReady,
      signUp,
      signIn,
      signOut,
      logout,
      activateProFromCheckout,
      clearProAccess,
      refreshProfile,
    }),
    [
      user,
      session,
      proSessionId,
      ready,
      supabaseReady,
      signUp,
      signIn,
      signOut,
      logout,
      activateProFromCheckout,
      clearProAccess,
      refreshProfile,
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
