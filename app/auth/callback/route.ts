import {
  AUTH_CONFIRMED_PATH,
  PASSWORD_RESET_NOTICE_PATH,
  PASSWORD_UPDATE_PATH,
} from "@/lib/auth-redirects";
import { ensureFreeTrialGranted } from "@/lib/profiles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * メール確認・パスワード再設定のコールバック。
 * - signup: 案内ページ（元タブへ戻る旨）
 * - recovery: 案内ページ（元タブでパスワード変更モーダル）
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextRaw = searchParams.get("next");
  const nextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/";

  const toConfirmed = () =>
    NextResponse.redirect(`${origin}${AUTH_CONFIRMED_PATH}`);

  const toRecoveryNotice = () =>
    NextResponse.redirect(`${origin}${PASSWORD_RESET_NOTICE_PATH}`);

  const afterAuthSuccess = (resolvedType: EmailOtpType | null | undefined) => {
    if (resolvedType === "recovery") {
      return toRecoveryNotice();
    }
    return toConfirmed();
  };

  if (!isSupabaseConfigured()) {
    console.warn("[auth/callback] Supabase not configured");
    return type === "recovery" ? toRecoveryNotice() : toConfirmed();
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (!error) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user && type !== "recovery") {
            await ensureFreeTrialGranted(userData.user.id, supabase);
          }
        } catch (grantErr) {
          console.warn("[auth/callback] free trial grant skipped:", grantErr);
        }
        return afterAuthSuccess(type);
      }
      console.warn("[auth/callback] verifyOtp failed:", error.message);
      return type === "recovery"
        ? NextResponse.redirect(`${origin}/forgot-password`)
        : NextResponse.redirect(`${origin}/login`);
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          const isRecovery =
            type === "recovery" ||
            nextPath.startsWith(PASSWORD_RESET_NOTICE_PATH) ||
            nextPath.startsWith(PASSWORD_UPDATE_PATH);
          if (userData.user && !isRecovery) {
            await ensureFreeTrialGranted(userData.user.id, supabase);
          }
          if (isRecovery) return toRecoveryNotice();
        } catch (grantErr) {
          console.warn("[auth/callback] free trial grant skipped:", grantErr);
        }
        return toConfirmed();
      }
      console.warn(
        "[auth/callback] exchangeCodeForSession failed:",
        error.message
      );
      return type === "recovery"
        ? NextResponse.redirect(`${origin}/forgot-password`)
        : NextResponse.redirect(`${origin}/login`);
    }

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      if (
        type === "recovery" ||
        nextPath.startsWith(PASSWORD_RESET_NOTICE_PATH) ||
        nextPath.startsWith(PASSWORD_UPDATE_PATH)
      ) {
        return toRecoveryNotice();
      }
      return toConfirmed();
    }
  } catch (err) {
    console.warn("[auth/callback] unexpected error:", err);
  }

  return type === "recovery"
    ? NextResponse.redirect(`${origin}/forgot-password`)
    : NextResponse.redirect(`${origin}/login`);
}
