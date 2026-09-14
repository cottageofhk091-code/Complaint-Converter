import type { AuthUser, MembershipType, ProfileRow } from "@/lib/auth";
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

export type FreeTrialState = {
  /** プレミアム生成を1回無料で許可するか */
  available: boolean;
  freeTrialCredits: number;
  freeTrialUsed: boolean;
  /** プロファイル・メタから判定不能 */
  unknown?: boolean;
};

/**
 * profiles / user_metadata から初回無料権を解決する。
 * どちらか一方でも free_trial_used===true なら消費済み（二重無料を防止）。
 */
export function resolveFreeTrialState(
  profile: ProfileRow | null | undefined,
  meta?: Record<string, unknown> | null
): FreeTrialState {
  if (profile?.membership_type === "paid") {
    return { available: false, freeTrialCredits: 0, freeTrialUsed: true };
  }

  const profileUsed = profile?.free_trial_used === true;
  const metaUsed = meta?.free_trial_used === true;
  if (profileUsed || metaUsed) {
    return { available: false, freeTrialCredits: 0, freeTrialUsed: true };
  }

  if (profile) {
    // free_trial_used が false / null なら未消費
    const hasCreditsColumn = profile.free_trial_credits != null;
    const credits = hasCreditsColumn
      ? normalizeCredits(profile.free_trial_credits)
      : 1;
    return {
      available: true,
      freeTrialCredits: Math.max(credits > 0 ? credits : 1, 1),
      freeTrialUsed: false,
    };
  }

  // プロファイル無し: メタの未消費明示
  if (meta && meta.free_trial_used === false) {
    return { available: true, freeTrialCredits: 1, freeTrialUsed: false };
  }
  if (meta && !("free_trial_used" in meta) && meta.app_name === "apology") {
    return { available: true, freeTrialCredits: 1, freeTrialUsed: false };
  }

  // 判定不能（ensure 後に再判定する）
  return {
    available: false,
    freeTrialCredits: 0,
    freeTrialUsed: false,
    unknown: true,
  };
}

type PostgrestLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function logProfileError(
  context: string,
  error: PostgrestLikeError,
  extra?: unknown
) {
  console.error(`[profiles] ${context}:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    ...(extra !== undefined ? { extra } : {}),
  });
}

/**
 * プロファイルを作成または更新。
 * 新規作成時のみ free_trial_credits = 1 を付与（既存の残回数は上書きしない）。
 * free_trial_* / age_group / region 等が未マイグレーションでも Auth 登録を止めないよう
 * 段階フォールバックし、失敗時は null を返す（throw しない）。
 */
export async function upsertProfileForUser(
  userId: string,
  email: string,
  survey: SurveyInput,
  client?: SupabaseClient
): Promise<ProfileRow | null> {
  let db: SupabaseClient;
  try {
    db = client ?? getSupabaseOrThrow();
  } catch (err) {
    console.error("[profiles] supabase client unavailable:", err);
    return null;
  }

  const now = new Date().toISOString();
  const normalizedEmail = email.trim().toLowerCase();
  const displayName = survey.displayName?.trim() || null;
  const membershipType = survey.membershipType ?? "free";

  try {
    const existing = await fetchProfile(userId, db);

    if (existing) {
      const updateCandidates: Record<string, unknown>[] = [
        {
          app_name: APP_NAME,
          email: normalizedEmail,
          display_name: displayName || existing.display_name,
          age_group: survey.ageGroup,
          region: survey.region,
          membership_type: membershipType ?? existing.membership_type,
          updated_at: now,
        },
        {
          app_name: APP_NAME,
          email: normalizedEmail,
          display_name: displayName || existing.display_name,
          membership_type: membershipType ?? existing.membership_type,
          updated_at: now,
        },
        {
          email: normalizedEmail,
          display_name: displayName || existing.display_name,
          updated_at: now,
        },
      ];

      for (let i = 0; i < updateCandidates.length; i++) {
        const payload = updateCandidates[i];
        const { data, error } = await db
          .from("profiles")
          .update(payload)
          .eq("id", userId)
          .select()
          .maybeSingle();

        if (!error) {
          return (data as ProfileRow) || existing;
        }
        logProfileError(`update attempt ${i + 1} failed`, error, payload);
      }

      console.warn(
        "[profiles] update fallbacks exhausted; returning existing profile"
      );
      return existing;
    }

    const insertCandidates: Record<string, unknown>[] = [
      {
        id: userId,
        app_name: APP_NAME,
        email: normalizedEmail,
        display_name: displayName,
        age_group: survey.ageGroup,
        region: survey.region,
        membership_type: membershipType,
        free_trial_credits: INITIAL_FREE_TRIAL_CREDITS,
        free_trial_used: false,
        updated_at: now,
      },
      // free_trial_* 未マイグレーション向け
      {
        id: userId,
        app_name: APP_NAME,
        email: normalizedEmail,
        display_name: displayName,
        age_group: survey.ageGroup,
        region: survey.region,
        membership_type: membershipType,
        updated_at: now,
      },
      // age_group / region 列が無い・制約不一致向け
      {
        id: userId,
        app_name: APP_NAME,
        email: normalizedEmail,
        display_name: displayName,
        membership_type: membershipType,
        updated_at: now,
      },
      // 最小限
      {
        id: userId,
        app_name: APP_NAME,
        email: normalizedEmail,
        updated_at: now,
      },
    ];

    for (let i = 0; i < insertCandidates.length; i++) {
      const row = insertCandidates[i];
      const { data, error } = await db
        .from("profiles")
        .insert(row)
        .select()
        .maybeSingle();

      if (!error) {
        return data as ProfileRow;
      }

      logProfileError(`insert attempt ${i + 1} failed`, error, row);

      if (
        error.code === "23505" ||
        /duplicate key|already exists/i.test(error.message || "")
      ) {
        const again = await fetchProfile(userId, db);
        if (again) return again;
      }
    }

    const again = await fetchProfile(userId, db);
    if (again) return again;

    console.error(
      "[profiles] all insert fallbacks failed; Auth user may exist without profile",
      { userId, email: normalizedEmail }
    );
    return null;
  } catch (err) {
    console.error("[profiles] upsertProfileForUser unexpected error:", err);
    return null;
  }
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

  const profile = await fetchProfile(userId, db);

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
      console.error("[profiles] create on auth failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return await upsertProfileForUser(
        userId,
        email || "",
        {
          displayName: displayName || undefined,
          ageGroup,
          region,
          membershipType: "free",
        },
        db
      );
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
    console.error("[profiles] ensure free trial failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return profile;
  }

  return (data as ProfileRow) || profile;
}

/** 初回無料クレジットを原子的に消費（RPC 優先）。成功時 free_trial_used=true */
export async function consumeFreeTrialCredit(
  client: SupabaseClient
): Promise<{ success: boolean; freeTrialCredits: number; freeTrialUsed: boolean }> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    console.error("[profiles] consume aborted: no auth user");
    return { success: false, freeTrialCredits: 0, freeTrialUsed: true };
  }

  const { getWriteClient } = await import("@/lib/supabase/admin");
  const writer = getWriteClient(client);

  // プロファイルが無い場合は先に付与してから消費する
  let profile = await fetchProfile(user.id, writer);
  if (!profile) {
    profile = await ensureFreeTrialGranted(user.id, writer);
  }

  async function markAuthMetadataUsed() {
    try {
      const { error } = await client.auth.updateUser({
        data: { free_trial_used: true, free_trial_credits: 0 },
      });
      if (error) {
        console.error("[profiles] auth metadata mark used failed:", error);
        return false;
      }
      return true;
    } catch (metaErr) {
      console.error("[profiles] auth metadata mark used threw:", metaErr);
      return false;
    }
  }

  // 1) RPC はユーザーセッション付き client で実行（auth.uid() が必要）
  const { data, error } = await client.rpc("consume_free_trial_credit");
  if (!error && Array.isArray(data) && data[0]) {
    const row = data[0] as {
      success?: boolean;
      free_trial_credits?: number;
      free_trial_used?: boolean;
    };
    if (row.success || row.free_trial_used === true) {
      await markAuthMetadataUsed();
      // Service Role でも profiles を確実に同期
      const { error: syncErr } = await writer
        .from("profiles")
        .update({
          free_trial_credits: 0,
          free_trial_used: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (syncErr) {
        console.error("[profiles] post-RPC profile sync failed:", syncErr);
      }
      console.info("[profiles] free trial consumed via RPC", {
        userId: user.id,
        success: row.success,
      });
      return {
        success: true,
        freeTrialCredits: 0,
        freeTrialUsed: true,
      };
    }
  } else if (error) {
    console.warn("[profiles] consume RPC failed, using direct update:", {
      message: error.message,
      code: error.code,
    });
  }

  // 2) 直接 UPDATE（Service Role で RLS 回避）。NULL / false 両方を消費対象に
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await writer
    .from("profiles")
    .update({
      free_trial_credits: 0,
      free_trial_used: true,
      updated_at: now,
    })
    .eq("id", user.id)
    .or("free_trial_used.eq.false,free_trial_used.is.null")
    .select("free_trial_credits, free_trial_used")
    .maybeSingle();

  if (updateError) {
    console.error("[profiles] consume direct update failed:", {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
      userId: user.id,
    });
  }

  if (updated) {
    await markAuthMetadataUsed();
    console.info("[profiles] free trial consumed via update", { userId: user.id });
    return { success: true, freeTrialCredits: 0, freeTrialUsed: true };
  }

  // 既に used=true なら冪等成功
  const latest = await fetchProfile(user.id, writer);
  if (latest?.free_trial_used === true) {
    await markAuthMetadataUsed();
    return { success: true, freeTrialCredits: 0, freeTrialUsed: true };
  }

  // 3) upsert で used=true を強制
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const { data: upserted, error: upsertError } = await writer
    .from("profiles")
    .upsert(
      {
        id: user.id,
        app_name: APP_NAME,
        email: (user.email || "").trim().toLowerCase() || null,
        display_name:
          typeof meta.display_name === "string" ? meta.display_name : null,
        age_group:
          typeof meta.age_group === "string" ? meta.age_group : "unknown",
        region: typeof meta.region === "string" ? meta.region : "unknown",
        membership_type: "free",
        free_trial_credits: 0,
        free_trial_used: true,
        updated_at: now,
      },
      { onConflict: "id" }
    )
    .select("free_trial_credits, free_trial_used")
    .maybeSingle();

  if (upsertError) {
    console.error("[profiles] consume upsert failed:", {
      message: upsertError.message,
      code: upsertError.code,
      userId: user.id,
    });
  }

  const metaOk = await markAuthMetadataUsed();

  if (upserted?.free_trial_used === true || metaOk) {
    console.info("[profiles] free trial consumed via upsert/metadata", {
      userId: user.id,
      profile: Boolean(upserted),
      metaOk,
    });
    return { success: true, freeTrialCredits: 0, freeTrialUsed: true };
  }

  console.error("[profiles] consume totally failed", { userId: user.id });
  return { success: false, freeTrialCredits: 0, freeTrialUsed: false };
}

export function profileToAuthUser(
  profile: ProfileRow | null,
  fallback: { id: string; email: string; name?: string },
  isProUnlocked: boolean,
  meta?: Record<string, unknown> | null
): AuthUser {
  const membershipType: MembershipType =
    profile?.membership_type === "paid" ? "paid" : "free";
  const trial = resolveFreeTrialState(profile, meta);

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
      isProUnlocked || membershipType === "paid" ? 0 : trial.freeTrialCredits,
    freeTrialUsed:
      isProUnlocked || membershipType === "paid" ? true : trial.freeTrialUsed,
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
