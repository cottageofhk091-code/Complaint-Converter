import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * メール確認・マジックリンク等のコールバック。
 * 成功・失敗いずれも歓迎画面 /auth/confirmed へ誘導（赤エラーを出さない）。
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

  /** パスワード再設定は歓迎画面ではなく設定画面へ */
  const afterAuthSuccess = (resolvedType: EmailOtpType | null | undefined) => {
    if (resolvedType === "recovery") {
      const dest =
        nextPath.startsWith("/auth/update-password") || nextPath === "/"
          ? "/auth/update-password"
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
        // code フローでも next が update-password ならそちらへ
        if (nextPath.startsWith("/auth/update-password")) {
          return NextResponse.redirect(`${origin}/auth/update-password`);
        }
        return welcome(nextPath === "/mypage" ? "/" : nextPath);
      }
      console.warn(
        "[auth/callback] exchangeCodeForSession failed, welcome anyway:",
        error.message
      );
      return welcome("/login");
    }

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return welcome("/");
    }
  } catch (err) {
    console.warn("[auth/callback] unexpected error, welcome redirect:", err);
  }

  return welcome("/login");
}
