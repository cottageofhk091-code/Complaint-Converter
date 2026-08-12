export type AuthUser = {
  id: string;
  name: string;
  email: string;
  plan: "free" | "pro";
};

export const AUTH_STORAGE_KEY = "smart_owabi_auth_user";

export function loadUserFromStorage(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.email || !parsed?.id) return null;
    return {
      id: parsed.id,
      name: parsed.name || "ユーザー",
      email: parsed.email,
      // plan は表示用。PRO 実権は Checkout Session 検証が正本。
      plan: parsed.plan === "pro" ? "pro" : "free",
    };
  } catch {
    return null;
  }
}

export function saveUserToStorage(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

/** メールログイン用ユーザー作成（常に free。PRO は決済検証後に付与） */
export function createUser(partial?: {
  name?: string;
  email?: string;
}): AuthUser {
  const email = partial?.email?.trim() || "user@example.com";
  const name = partial?.name?.trim() || "ユーザー";

  return {
    id: `user_${Date.now().toString(36)}`,
    name,
    email,
    plan: "free",
  };
}
