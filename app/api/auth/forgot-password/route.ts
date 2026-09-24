import { NextResponse } from "next/server";
import { buildRecoveryEmail } from "@/lib/auth-mail";
import { sendResendEmail } from "@/lib/resend";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

function jsonError(
  error: string,
  detail: string,
  status: number
): NextResponse {
  console.error("[api/auth/forgot-password]", error, detail);
  return NextResponse.json({ error, detail }, { status });
}

function siteOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (host && !/localhost|127\.0\.0\.1/i.test(host)) {
    return `${proto}://${host}`;
  }
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (env && !/localhost|127\.0\.0\.1/i.test(env)) return env;
  return new URL(req.url).origin;
}

/**
 * Supabase 標準の再設定メールは送らず、generateLink + Resend で配信。
 * ユーザー有無はレスポンスでは区別しない（列挙対策）。
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return jsonError(
      "認証サービスが設定されていません。",
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。",
      503
    );
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return jsonError(
      "サーバー側の認証設定が不足しています。",
      "SUPABASE_SERVICE_ROLE_KEY が未設定です。Vercel の環境変数を確認してください。",
      503
    );
  }

  let body: { email?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError(
      "リクエストが不正です。",
      "JSON の解析に失敗しました。",
      400
    );
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return jsonError(
      "メールアドレスを入力してください。",
      "email empty",
      400
    );
  }

  const origin = siteOrigin(req);
  const redirectTo = `${origin}/auth/callback?type=recovery&next=${encodeURIComponent("/auth/password-reset-notice")}`;

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

  // ユーザー不在でも成功扱い（セキュリティ）
  if (linkError || !linkData) {
    console.warn(
      "[api/auth/forgot-password] generateLink skipped/failed:",
      linkError?.message
    );
    return NextResponse.json({
      success: true,
      message:
        "登録済みのメールアドレスの場合、パスワード再設定用のメールを送信しました。",
    });
  }

  const props = linkData.properties as {
    hashed_token?: string;
    action_link?: string;
    redirect_to?: string;
  };
  const tokenHash = props.hashed_token;
  if (!tokenHash) {
    return jsonError(
      "再設定メール用リンクの生成に失敗しました。",
      "hashed_token が空です。",
      503
    );
  }

  const resetUrl = `${origin}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=${encodeURIComponent("/auth/password-reset-notice")}`;
  console.info("[api/auth/forgot-password] resetUrl host", {
    host: new URL(resetUrl).host,
    supabaseRedirectTo: props.redirect_to || null,
  });

  const mail = buildRecoveryEmail(resetUrl);
  const sent = await sendResendEmail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  if ("error" in sent) {
    return NextResponse.json(
      { error: sent.error, detail: sent.detail },
      { status: sent.status }
    );
  }

  return NextResponse.json({
    success: true,
    resendId: sent.id,
    message:
      "登録済みのメールアドレスの場合、パスワード再設定用のメールを送信しました。",
  });
}
