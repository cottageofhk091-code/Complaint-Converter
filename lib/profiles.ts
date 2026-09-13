import type { AuthUser, MembershipType, ProfileRow } from "@/lib/auth";
import { toJapaneseAuthError } from "@/lib/auth-errors";
import type { AgeGroup, Region } from "@/lib/survey";
import { getSupabaseOrThrow, supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SurveyInput = {
  displayName?: string;
  ageGroup: AgeGroup | string;
  region: Region | string;
  membershipType?: MembershipType;
};

/** ダッシュボード連携用 app 識別子 */
export const APP_NAME = "apology";

const INITIAL_FREE_TRIAL_CREDITS = 1;

function normalizeCredits(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) return 0;
  return Math.floor(value);
}

/**
 * プロファイルを作成または更新。
 * 新規作成時のみ free_trial_credits = 1 を付与（既存の残回数は上書きしない）。
 */
export async function upsertProfileForUser(
  userId: string,
  email: string,
  survey: SurveyInput
): Promise<ProfileRow> {
  const client = getSupabaseOrThrow();
  const now = new Date().toISOString();
  const existing = await fetchProfile(userId);

  if (existing) {
    const { data, error } = await client
      .from("profiles")
      .update({
        app_name: APP_NAME,
        email: email.trim().toLowerCase(),
        display_name: survey.displayName?.trim() || existing.display_name,
        age_group: survey.ageGroup,
        region: survey.region,
        membership_type: survey.membershipType ?? existing.membership_type,
        updated_at: now,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(
        toJapaneseAuthError(error.message || "プロファイルの保存に失敗しました。")
      );
    }
    return data as ProfileRow;
  }

  const row = {
    id: userId,
    app_name: APP_NAME,
    email: email.trim().toLowerCase(),
    display_name: survey.displayName?.trim() || null,
    age_group: survey.ageGroup,
    region: survey.region,
    membership_type: survey.membershipType ?? "free",
    free_trial_credits: INITIAL_FREE_TRIAL_CREDITS,
    free_trial_used: false,
    updated_at: now,
  };

  const { data, error } = await client.from("profiles").insert(row).select().single();

  if (error) {
    const again = await fetchProfile(userId);
    if (again) return again;
    throw new Error(
      toJapaneseAuthError(error.message || "プロファイルの保存に失敗しました。")
    );
  }

  return data as ProfileRow;
}

export async function fetchProfile(
  userId: string,
  client?: SupabaseClient
): Promise<ProfileRow | null> {
  const db = client ?? supabase;
  if (!db) return null;
  const { data, error } = await db
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

/**
 * 認証完了時に初回無料権を確実に付与する。
 * プロファイルが無い場合は user_metadata から作成する。
 */
export async function ensureFreeTrialGranted(
  userId: string,
  client?: SupabaseClient
): Promise<ProfileRow | null> {
  const db = client ?? supabase;
  if (!db) return null;

  let profile = await fetchProfile(userId, db);

  if (!profile) {
    const {
      data: { user },
    } = await db.auth.getUser();
    const meta = (user?.user_metadata || {}) as Record<string, unknown>;
    const ageGroup = typeof meta.age_group === "string" ? meta.age_group : "unknown";
    const region = typeof meta.region === "string" ? meta.region : "unknown";
    const displayName =
      typeof meta.display_name === "string" ? meta.display_name : null;
    const email = (user?.email || "").trim().toLowerCase();
    const now = new Date().toISOString();

    const { data, error } = await db
      .from("profiles")
      .insert({
        id: userId,
        app_name: APP_NAME,
        email: email || null,
        display_name: displayName,
        age_group: ageGroup,
        region,
        membership_type: "free",
        free_trial_credits: INITIAL_FREE_TRIAL_CREDITS,
        free_trial_used: false,
        updated_at: now,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[profiles] create on auth failed:", error.message);
      return null;
    }
    return data as ProfileRow;
  }

  const credits = normalizeCredits(profile.free_trial_credits);
  const used = Boolean(profile.free_trial_used);
  if (used || credits > 0) return profile;
  if (profile.membership_type === "paid") return profile;

  const { data, error } = await db
    .from("profiles")
    .update({
      free_trial_credits: INITIAL_FREE_TRIAL_CREDITS,
      free_trial_used: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("free_trial_used", false)
    .eq("free_trial_credits", 0)
    .select()
    .maybeSingle();

  if (error) {
    console.warn("[profiles] ensure free trial failed:", error.message);
    return profile;
  }

  return (data as ProfileRow) || profile;
}

/** 初回無料クレジットを原子的に消費（RPC 優先） */
export async function consumeFreeTrialCredit(
  client: SupabaseClient
): Promise<{ success: boolean; freeTrialCredits: number; freeTrialUsed: boolean }> {
  const { data, error } = await client.rpc("consume_free_trial_credit");

  if (!error && Array.isArray(data) && data[0]) {
    const row = data[0] as {
      success?: boolean;
      free_trial_credits?: number;
      free_trial_used?: boolean;
    };
    return {
      success: Boolean(row.success),
      freeTrialCredits: normalizeCredits(row.free_trial_credits),
      freeTrialUsed: Boolean(row.free_trial_used),
    };
  }

  if (error) {
    console.warn("[profiles] consume RPC failed, fallback update:", error.message);
  }

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return { success: false, freeTrialCredits: 0, freeTrialUsed: true };
  }

  const { data: updated, error: updateError } = await client
    .from("profiles")
    .update({
      free_trial_credits: 0,
      free_trial_used: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .gt("free_trial_credits", 0)
    .select("free_trial_credits, free_trial_used")
    .maybeSingle();

  if (updateError) {
    console.warn("[profiles] consume fallback failed:", updateError.message);
    return { success: false, freeTrialCredits: 0, freeTrialUsed: true };
  }

  if (!updated) {
    const latest = await fetchProfile(user.id, client);
    return {
      success: false,
      freeTrialCredits: normalizeCredits(latest?.free_trial_credits),
      freeTrialUsed: Boolean(latest?.free_trial_used),
    };
  }

  return {
    success: true,
    freeTrialCredits: normalizeCredits(updated.free_trial_credits),
    freeTrialUsed: Boolean(updated.free_trial_used),
  };
}

export function profileToAuthUser(
  profile: ProfileRow | null,
  fallback: { id: string; email: string; name?: string },
  isProUnlocked: boolean
): AuthUser {
  const membershipType: MembershipType =
    profile?.membership_type === "paid" ? "paid" : "free";
  const freeTrialCredits = normalizeCredits(profile?.free_trial_credits);
  const freeTrialUsed = Boolean(profile?.free_trial_used);

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
    freeTrialCredits:
      isProUnlocked || membershipType === "paid" ? 0 : freeTrialCredits,
    freeTrialUsed:
      isProUnlocked || membershipType === "paid" ? true : freeTrialUsed,
  };
}

/** Stripe 決済後に membership_type を paid へ更新（可能な場合） */
export async function markProfilePaid(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("profiles")
    .update({
      membership_type: "paid",
      free_trial_credits: 0,
      free_trial_used: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.warn("[profiles] mark paid failed:", error.message);
  }
}
