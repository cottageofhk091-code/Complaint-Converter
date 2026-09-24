import { NextResponse } from "next/server";
import {
  buildConfirmSignupEmail,
} from "@/lib/auth-mail";
import { toJapaneseAuthError } from "@/lib/auth-errors";
import { APP_NAME, upsertProfileForUser } from "@/lib/profiles";
import { sendResendEmail } from "@/lib/resend";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

function jsonError(
  error: string,
  detail: string,
  status: number
): NextResponse {
  console.error("[api/auth/register]", error, detail);
  return NextResponse.json({ error, detail }, { status });
}

function siteOrigin(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (env) return env;
  const url = new URL(req.url);
  return url.origin;
}

/**
 * Supabase 標準確認メールは送らず、admin.createUser + generateLink + Resend で配信。
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

  let body: {
    email?: string;
    password?: string;
    displayName?: string;
    ageGroup?: string;
    region?: string;
  };
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
  const password = String(body.password || "");
  const displayName = body.displayName?.trim() || "";
  const ageGroup = String(body.ageGroup || "").trim();
  const region = String(body.region || "").trim();

  if (!email || !password) {
    return jsonError(
      "メールアドレスとパスワードは必須です。",
      "email / password が空です。",
      400
    );
  }
  if (password.length < 8) {
    return jsonError(
      "パスワードは8文字以上で入力してください。",
      "password length < 8",
      400
    );
  }
  if (!ageGroup || !region) {
    return jsonError(
      "アンケート（年代・地域）は必須です。",
      "ageGroup / region missing",
      400
    );
  }

  const metadata = {
    display_name: displayName,
    age_group: ageGroup,
    region,
    app_name: APP_NAME,
    free_trial_credits: 1,
    free_trial_used: false,
  };

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: metadata,
    });

  if (createError || !created.user) {
    const jp = toJapaneseAuthError(createError || "登録に失敗しました");
    console.error("[api/auth/register] createUser failed:", createError);
    const status =
      /already|exist/i.test(createError?.message || "") ||
      createError?.code === "email_exists" ||
      createError?.code === "user_already_exists"
        ? 409
        : 400;
    return NextResponse.json(
      {
        error: jp,
        detail: createError?.message || "createUser failed",
      },
      { status }
    );
  }

  const userId = created.user.id;

  try {
    await upsertProfileForUser(
      userId,
      email,
      {
        displayName,
        ageGroup,
        region,
        membershipType: "free",
      },
      admin
    );
  } catch (err) {
    console.warn("[api/auth/register] profile upsert failed (Auth OK):", err);
  }

  const origin = siteOrigin(req);
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo: `${origin}/auth/callback`,
        data: metadata,
      },
    });

  if (linkError || !linkData) {
    console.error("[api/auth/register] generateLink failed:", linkError);
    return jsonError(
      "確認メール用リンクの生成に失敗しました。",
      linkError?.message || "generateLink failed",
      503
    );
  }

  const props = linkData.properties as {
    hashed_token?: string;
    action_link?: string;
  };
  const tokenHash = props.hashed_token;
  const confirmUrl = tokenHash
    ? `${origin}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=signup`
    : props.action_link;

  if (!confirmUrl) {
    return jsonError(
      "確認メール用リンクの生成に失敗しました。",
      "hashed_token / action_link が空です。",
      503
    );
  }

  const mail = buildConfirmSignupEmail(confirmUrl);
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
    needsEmailConfirmation: true,
    userId,
    resendId: sent.id,
  });
}
