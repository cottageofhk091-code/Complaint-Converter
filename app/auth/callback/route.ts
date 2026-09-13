import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * メール確認・マジックリンク等のコールバック。
 *
 * 優先順位:
 * 1. token_hash + type → verifyOtp（PKCE 不要・メール確認の本命）
 * 2. code → exchangeCodeForSession（Cookie 上の code_verifier を使用）
 * 3. 失敗時もエラー画面を出さず /login?message=email-confirmed へフォールバック
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
      : "/mypage";

  const softSuccess = NextResponse.redirect(
    `${origin}/login?message=email-confirmed`
  );
  const hardSuccess = NextResponse.redirect(`${origin}${nextPath}`);

  if (!isSupabaseConfigured()) {
    console.warn("[auth/callback] Supabase not configured — soft redirect");
    return softSuccess;
  }

  try {
    const supabase = await createSupabaseServerClient();

    // 1) メール確認（Token Hash）— 別端末・メーラー内ブラウザでも成立
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (!error) {
        return hardSuccess;
      }
      console.warn(
        "[auth/callback] verifyOtp failed, soft redirect:",
        error.message
      );
      return softSuccess;
    }

    // 2) PKCE code 交換（同一ブラウザ・Cookie に verifier がある場合）
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return hardSuccess;
      }
      console.warn(
        "[auth/callback] exchangeCodeForSession failed (likely missing PKCE verifier), soft redirect:",
        error.message
      );
      // 「PKCE code verifier not found」でもユーザーには成功扱いの導線を出す
      return softSuccess;
    }

    // 3) 既にセッションがある場合
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return hardSuccess;
    }
  } catch (err) {
    console.warn("[auth/callback] unexpected error, soft redirect:", err);
  }

  return softSuccess;
}
