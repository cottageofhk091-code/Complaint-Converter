import {
  AUTH_CONFIRMED_PATH,
  isPasswordRecoveryPath,
  PASSWORD_UPDATE_PATH,
} from "@/lib/auth-redirects";
import { ensureFreeTrialGranted } from "@/lib/profiles";
import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function requestOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (host && !/localhost|127\.0\.0\.1/i.test(host)) {
    return `${proto}://${host}`;
  }
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (env && !/localhost|127\.0\.0\.1/i.test(env)) return env;
  return request.nextUrl.origin;
}

function withError(
  origin: string,
  path: string,
  error: string,
  detail?: string
): NextResponse {
  const u = new URL(path, origin);
  u.searchParams.set("error", error);
  if (detail) u.searchParams.set("detail", detail.slice(0, 300));
  return NextResponse.redirect(u.toString());
}

/**
 * メール確認・パスワード再設定コールバック。
 * verifyOtp / exchangeCodeForSession のセッション Cookie を
 * リダイレクト Response に必ず載せる（next/headers cookies() だと落ちることがある）。
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const origin = requestOrigin(request);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const type = typeParam as EmailOtpType | null;
  const nextRaw = searchParams.get("next");
  const nextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/";
  const oauthError =
    searchParams.get("error_description") || searchParams.get("error");

  console.info("[auth/callback] start", {
    origin,
    hasCode: !!code,
    hasTokenHash: !!tokenHash,
    type,
    nextPath,
    oauthError,
  });

  if (oauthError) {
    console.error("[auth/callback] provider error:", oauthError);
    return withError(
      origin,
      AUTH_CONFIRMED_PATH,
      "認証リンクの処理に失敗しました。",
      oauthError
    );
  }

  const isRecovery =
    type === "recovery" || isPasswordRecoveryPath(nextPath);

  // recovery 成功後はトップへ。クライアント側で再設定モーダルを開く
  const successPath = isRecovery
    ? PASSWORD_UPDATE_PATH
    : AUTH_CONFIRMED_PATH;

  console.info("[auth/callback] resolved", { isRecovery, successPath, type });

  if (!isSupabaseConfigured()) {
    console.error("[auth/callback] Supabase not configured");
    return withError(
      origin,
      successPath,
      "認証サービスが設定されていません。",
      "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY"
    );
  }

  // 先に成功用リダイレクトを用意し、setAll で Cookie をこの Response に載せる
  let response = NextResponse.redirect(new URL(successPath, origin));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        const location =
          response.headers.get("location") ||
          new URL(successPath, origin).toString();
        response = NextResponse.redirect(location);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    if (tokenHash && type) {
      const tryTypes: EmailOtpType[] = [type];
      if (type === "signup") tryTypes.push("email");
      if (type === "email") tryTypes.push("signup");

      let verified = false;
      let lastError: string | null = null;

      for (const t of tryTypes) {
        const { data, error } = await supabase.auth.verifyOtp({
          type: t,
          token_hash: tokenHash,
        });
        console.info("[auth/callback] verifyOtp attempt", {
          type: t,
          ok: !error,
          userId: data.user?.id || null,
          confirmed: !!data.user?.email_confirmed_at,
          error: error?.message || null,
        });
        if (!error) {
          verified = true;
          break;
        }
        lastError = error.message;
      }

      if (!verified) {
        console.error("[auth/callback] verifyOtp failed:", lastError);
        return withError(
          origin,
          isRecovery ? "/forgot-password" : "/login",
          "メール認証に失敗しました。リンクの有効期限が切れている可能性があります。",
          lastError || undefined
        );
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        console.info("[auth/callback] session user after verify", {
          userId: userData.user?.id || null,
          email: userData.user?.email || null,
          confirmed: !!userData.user?.email_confirmed_at,
        });
        if (userData.user && !isRecovery) {
          await ensureFreeTrialGranted(userData.user.id, supabase);
        }
      } catch (grantErr) {
        console.warn("[auth/callback] free trial grant skipped:", grantErr);
      }

      // success path を再設定（Cookie 付き response を維持）
      const location = new URL(successPath, origin).toString();
      const cookies = response.cookies.getAll();
      response = NextResponse.redirect(location);
      cookies.forEach((c) => {
        response.cookies.set(c.name, c.value);
      });
      return response;
    }

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      console.info("[auth/callback] exchangeCodeForSession", {
        ok: !error,
        userId: data.user?.id || null,
        error: error?.message || null,
      });
      if (error) {
        console.error("[auth/callback] exchangeCodeForSession failed:", error);
        return withError(
          origin,
          isRecovery ? "/forgot-password" : "/login",
          "認証コードの交換に失敗しました。",
          error.message
        );
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user && !isRecovery) {
          await ensureFreeTrialGranted(userData.user.id, supabase);
        }
      } catch (grantErr) {
        console.warn("[auth/callback] free trial grant skipped:", grantErr);
      }

      const location = new URL(successPath, origin).toString();
      const cookies = response.cookies.getAll();
      response = NextResponse.redirect(location);
      cookies.forEach((c) => {
        response.cookies.set(c.name, c.value);
      });
      return response;
    }

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      console.info("[auth/callback] existing session, redirect success");
      return response;
    }

    console.error("[auth/callback] no code/token_hash/session");
    return withError(
      origin,
      isRecovery ? "/forgot-password" : "/login",
      "認証パラメータが見つかりません。メール内のリンクから再度お試しください。",
      "missing code and token_hash"
    );
  } catch (err) {
    console.error("[auth/callback] unexpected error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return withError(
      origin,
      AUTH_CONFIRMED_PATH,
      "認証処理中に予期しないエラーが発生しました。",
      detail
    );
  }
}
