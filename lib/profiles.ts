import type { AuthUser, MembershipType, ProfileRow } from "@/lib/auth";
import type { AgeGroup, Region } from "@/lib/survey";
import { getSupabaseOrThrow, supabase } from "@/lib/supabase";

export type SurveyInput = {
  displayName?: string;
  ageGroup: AgeGroup | string;
  region: Region | string;
  membershipType?: MembershipType;
};

/** ダッシュボード連携用 app 識別子 */
export const APP_NAME = "apology";

export async function upsertProfileForUser(
  userId: string,
  email: string,
  survey: SurveyInput
): Promise<ProfileRow> {
  const client = getSupabaseOrThrow();
  const now = new Date().toISOString();
  const row = {
    id: userId,
    app_name: APP_NAME,
    email: email.trim().toLowerCase(),
    display_name: survey.displayName?.trim() || null,
    age_group: survey.ageGroup,
    region: survey.region,
    membership_type: survey.membershipType ?? "free",
    updated_at: now,
  };

  const { data, error } = await client
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "プロファイルの保存に失敗しました。");
  }

  return data as ProfileRow;
}

export async function fetchProfile(
  userId: string
): Promise<ProfileRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profiles] fetch failed:", error);
    return null;
  }
  return (data as ProfileRow) || null;
}

export function profileToAuthUser(
  profile: ProfileRow | null,
  fallback: { id: string; email: string; name?: string },
  isProUnlocked: boolean
): AuthUser {
  const membershipType: MembershipType =
    profile?.membership_type === "paid" ? "paid" : "free";

  return {
    id: fallback.id,
    email: profile?.email || fallback.email,
    name:
      profile?.display_name?.trim() ||
      fallback.name?.trim() ||
      fallback.email.split("@")[0] ||
      "ユーザー",
    plan: isProUnlocked || membershipType === "paid" ? "pro" : "free",
    membershipType: isProUnlocked ? "paid" : membershipType,
    ageGroup: profile?.age_group ?? null,
    region: profile?.region ?? null,
  };
}

/** Stripe 決済後に membership_type を paid へ更新（可能な場合） */
export async function markProfilePaid(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("profiles")
    .update({
      membership_type: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.warn("[profiles] mark paid failed:", error.message);
  }
}
