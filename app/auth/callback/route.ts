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
        return welcome(nextPath === "/mypage" ? "/" : nextPath);
      }
      console.warn(
        "[auth/callback] verifyOtp failed, welcome anyway:",
        error.message
      );
      return welcome("/login");
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
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
