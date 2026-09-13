import { PASSWORD_UPDATE_PATH } from "@/lib/auth-redirects";
import { ensureFreeTrialGranted } from "@/lib/profiles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * メール確認・マジックリンク・パスワード再設定のコールバック。
 * recovery は /auth/update-password へ。それ以外は歓迎画面へ。
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

  const welcome = (next: string) =>
    NextResponse.redirect(
      `${origin}/auth/confirmed?next=${encodeURIComponent(next)}`
    );

  const toUpdatePassword = () =>
    NextResponse.redirect(`${origin}${PASSWORD_UPDATE_PATH}`);

  /** パスワード再設定は歓迎画面ではなく設定画面へ */
  const afterAuthSuccess = (resolvedType: EmailOtpType | null | undefined) => {
    if (resolvedType === "recovery") {
      const dest =
        nextPath.startsWith(PASSWORD_UPDATE_PATH) || nextPath === "/"
          ? PASSWORD_UPDATE_PATH
          : nextPath;
      return NextResponse.redirect(`${origin}${dest}`);
    }
    return welcome(nextPath === "/mypage" ? "/" : nextPath);
  };

  if (!isSupabaseConfigured()) {
    console.warn("[auth/callback] Supabase not configured — welcome redirect");
    return welcome("/login");
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
          if (userData.user) {
            await ensureFreeTrialGranted(userData.user.id, supabase);
          }
        } catch (grantErr) {
          console.warn("[auth/callback] free trial grant skipped:", grantErr);
        }

        return afterAuthSuccess(type);
      }
      console.warn(
        "[auth/callback] verifyOtp failed, welcome anyway:",
        error.message
      );
      return type === "recovery"
        ? NextResponse.redirect(`${origin}/forgot-password`)
        : welcome("/login");
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            await ensureFreeTrialGranted(userData.user.id, supabase);
          }
        } catch (grantErr) {
          console.warn("[auth/callback] free trial grant skipped:", grantErr);
        }

        // ConfirmationURL / PKCE: redirectTo に載せた type=recovery を優先
        if (
          type === "recovery" ||
          nextPath.startsWith(PASSWORD_UPDATE_PATH)
        ) {
          return toUpdatePassword();
        }
        return welcome(nextPath === "/mypage" ? "/" : nextPath);
      }
      console.warn(
        "[auth/callback] exchangeCodeForSession failed, welcome anyway:",
        error.message
      );
      return type === "recovery"
        ? NextResponse.redirect(`${origin}/forgot-password`)
        : welcome("/login");
    }

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      if (type === "recovery" || nextPath.startsWith(PASSWORD_UPDATE_PATH)) {
        return toUpdatePassword();
      }
      return welcome("/");
    }
  } catch (err) {
    console.warn("[auth/callback] unexpected error, welcome redirect:", err);
  }

  return type === "recovery"
    ? NextResponse.redirect(`${origin}/forgot-password`)
    : welcome("/login");
}
