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

export function createDemoUser(
  partial?: Partial<Pick<AuthUser, "name" | "email" | "plan">>
): AuthUser {
  const plan = partial?.plan === "pro" ? "pro" : "free";
  const email =
    partial?.email?.trim() ||
    (plan === "pro" ? "pro@example.com" : "user@example.com");
  const name =
    partial?.name?.trim() || (plan === "pro" ? "PROユーザー" : "フリーユーザー");

  return {
    id: `user_${Date.now().toString(36)}`,
    name,
    email,
    plan,
  };
}
