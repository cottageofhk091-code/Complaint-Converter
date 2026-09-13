/**
 * Supabase Auth 連携用のユーザー型。
 * plan / membershipType の表示と Stripe PRO（proSessionId）は別系統。
 */
export type MembershipType = "free" | "paid";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  /** 表示用。PRO 実権は Checkout Session 検証が正本 */
  plan: "free" | "pro";
  membershipType: MembershipType;
  ageGroup?: string | null;
  region?: string | null;
};

export type ProfileRow = {
  id: string;
  app_name: string;
  email: string | null;
  display_name: string | null;
  age_group: string;
  region: string;
  membership_type: MembershipType;
  created_at?: string;
  updated_at?: string;
};

/** localStorage の旧デモ認証キー（移行時に掃除） */
export const LEGACY_AUTH_STORAGE_KEY = "smart_owabi_auth_user";

export function clearLegacyAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}
