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
};

/**
 * profiles / user_metadata から初回無料権を解決する。
 * プロファイル欠落・カラム欠落時も、未消費の新規会員は available=true とする。
 */
export function resolveFreeTrialState(
  profile: ProfileRow | null | undefined,
  meta?: Record<string, unknown> | null
): FreeTrialState {
  if (profile?.membership_type === "paid") {
    return { available: false, freeTrialCredits: 0, freeTrialUsed: true };
  }

  if (profile) {
    const used = Boolean(profile.free_trial_used);
    if (used) {
      return { available: false, freeTrialCredits: 0, freeTrialUsed: true };
    }
    // free_trial_used=false なら未消費。credits 列が無い/null の場合は 1 とみなす
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

  const metaUsed = Boolean(meta?.free_trial_used);
  if (metaUsed) {
    return { available: false, freeTrialCredits: 0, freeTrialUsed: true };
  }

  const metaCreditsRaw = meta?.free_trial_credits;
  const metaCredits =
    typeof metaCreditsRaw === "number"
      ? normalizeCredits(metaCreditsRaw)
      : typeof metaCreditsRaw === "string" && /^\d+$/.test(metaCreditsRaw)
        ? Number(metaCreditsRaw)
        : null;

  // プロファイル無しでも、メタの free_trial_used が false/未設定なら新規会員として付与扱い
  if (meta && meta.free_trial_used === false) {
    return {
      available: true,
      freeTrialCredits: metaCredits && metaCredits > 0 ? metaCredits : 1,
      freeTrialUsed: false,
    };
  }

  if (meta && "free_trial_used" in meta === false) {
    // サインアップ時にフラグを載せている想定。欠落時も新規寄りに扱う
    return {
      available: true,
      freeTrialCredits: metaCredits && metaCredits > 0 ? metaCredits : 1,
      freeTrialUsed: false,
    };
  }

  // プロファイル取得失敗 + メタ無し: 呼び出し側が「認証済み新規」とみなす場合のフォールバック
  return {
    available: true,
    freeTrialCredits: 1,
    freeTrialUsed: false,
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
    return { success: false, freeTrialCredits: 0, freeTrialUsed: true };
  }

  // プロファイルが無い場合は先に付与してから消費する
  let profile = await fetchProfile(user.id, client);
  if (!profile) {
    profile = await ensureFreeTrialGranted(user.id, client);
  }

  const { data, error } = await client.rpc("consume_free_trial_credit");

  if (!error && Array.isArray(data) && data[0]) {
    const row = data[0] as {
      success?: boolean;
      free_trial_credits?: number;
      free_trial_used?: boolean;
    };
    if (row.success) {
      try {
        await client.auth.updateUser({
          data: { free_trial_used: true, free_trial_credits: 0 },
        });
      } catch (metaErr) {
        console.warn("[profiles] metadata mark used failed:", metaErr);
      }
      return {
        success: true,
        freeTrialCredits: normalizeCredits(row.free_trial_credits),
        freeTrialUsed: true,
      };
    }
  }

  if (error) {
    console.warn("[profiles] consume RPC failed, fallback update:", error.message);
  }

  // free_trial_used=false を正本に消費（credits 列が無くても更新できるよう段階フォールバック）
  const updateCandidates: Record<string, unknown>[] = [
    {
      free_trial_credits: 0,
      free_trial_used: true,
      updated_at: new Date().toISOString(),
    },
    {
      free_trial_used: true,
      updated_at: new Date().toISOString(),
    },
  ];

  for (const payload of updateCandidates) {
    const { data: updated, error: updateError } = await client
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .eq("free_trial_used", false)
      .select("free_trial_credits, free_trial_used")
      .maybeSingle();

    if (!updateError && updated) {
      try {
        await client.auth.updateUser({
          data: { free_trial_used: true, free_trial_credits: 0 },
        });
      } catch (metaErr) {
        console.warn("[profiles] metadata mark used failed:", metaErr);
      }
      return {
        success: true,
        freeTrialCredits: normalizeCredits(updated.free_trial_credits),
        freeTrialUsed: Boolean(updated.free_trial_used),
      };
    }

    if (updateError) {
      console.error("[profiles] consume fallback update failed:", {
        message: updateError.message,
        code: updateError.code,
        payload,
      });
    }
  }

  // 行が無い場合: used=true のプロファイルを作成して消費完了扱い
  const now = new Date().toISOString();
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const { data: inserted, error: insertError } = await client
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

  if (!insertError && inserted) {
    try {
      await client.auth.updateUser({
        data: { free_trial_used: true, free_trial_credits: 0 },
      });
    } catch {
      // ignore
    }
    return {
      success: true,
      freeTrialCredits: 0,
      freeTrialUsed: true,
    };
  }

  // 最終手段: メタデータだけでも消費済みにして、今回の生成は許可する
  try {
    await client.auth.updateUser({
      data: { free_trial_used: true, free_trial_credits: 0 },
    });
    console.warn(
      "[profiles] consume marked on auth metadata only (profile write failed)",
      insertError?.message
    );
    return { success: true, freeTrialCredits: 0, freeTrialUsed: true };
  } catch (metaErr) {
    console.error("[profiles] consume totally failed:", metaErr);
    return { success: false, freeTrialCredits: 0, freeTrialUsed: true };
  }
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
