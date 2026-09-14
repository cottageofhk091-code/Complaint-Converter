import type { AuthUser } from "@/lib/auth";

export const IS_DEV = process.env.NODE_ENV === "development";

export const DEV_PAID_STORAGE_KEY = "apology_dev_paid_override_v1";
export const DEV_MOCK_USER_KEY = "apology_dev_mock_user_v1";

/** ローカル検証用の固定テストユーザー */
export const DEV_MOCK_USER: AuthUser = {
  id: "dev-local-user",
  name: "ローカル検証ユーザー",
  email: "dev@localhost.test",
  plan: "free",
  membershipType: "free",
  ageGroup: "30s",
  region: "kanto",
  freeTrialCredits: 1,
  freeTrialUsed: false,
};

export function readDevPaidOverride(): boolean | null {
  if (!IS_DEV || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEV_PAID_STORAGE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    // ignore
  }
  return null;
}

export function writeDevPaidOverride(value: boolean): void {
  if (!IS_DEV || typeof window === "undefined") return;
  try {
    localStorage.setItem(DEV_PAID_STORAGE_KEY, value ? "true" : "false");
  } catch {
    // ignore
  }
}

export function readDevMockUser(): AuthUser | null {
  if (!IS_DEV || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEV_MOCK_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed?.id && parsed?.email) return { ...DEV_MOCK_USER, ...parsed };
  } catch {
    // ignore
  }
  return null;
}

export function writeDevMockUser(user: AuthUser | null): void {
  if (!IS_DEV || typeof window === "undefined") return;
  try {
    if (user) localStorage.setItem(DEV_MOCK_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(DEV_MOCK_USER_KEY);
  } catch {
    // ignore
  }
}
