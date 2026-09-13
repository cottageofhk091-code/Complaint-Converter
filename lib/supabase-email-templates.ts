/**
 * Supabase Auth メール文面のアプリ側正本。
 *
 * Hosted Supabase の標準メール送信では、実際の配信文面は
 * Dashboard > Authentication > Email Templates に貼り付けて反映する。
 * （アプリの API から標準メーラーの件名/本文を上書きすることはできない）
 *
 * ローカル Supabase CLI では supabase/config.toml の
 * [auth.email.template.*] がこの内容と対応する。
 */

export const CONFIRM_SIGNUP_EMAIL = {
  subject: "【Smartお詫びコンシェルジュ】メールアドレスの確認",
  /**
   * Dashboard の Confirm signup 本文（テキスト）用。
   * リンクは Token Hash 方式（PKCE 不要）。
   */
  bodyText: [
    "Smartお詫びコンシェルジュへのご登録ありがとうございます。",
    "以下のリンクをクリックして登録を完了してください。",
    "",
    "{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup",
  ].join("\n"),
  /** Dashboard に貼る HTML */
  bodyHtmlHintPath: "supabase/templates/confirm-signup.html",
} as const;

export const RECOVERY_EMAIL = {
  subject: "【Smartお詫びコンシェルジュ】パスワードの再設定",
  bodyText: [
    "Smartお詫びコンシェルジュのパスワード再設定リクエストを受け付けました。",
    "以下のリンクをクリックして、新しいパスワードを設定してください。",
    "",
    "{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password",
  ].join("\n"),
  bodyHtmlHintPath: "supabase/templates/reset-password.html",
  /**
   * アプリ側 resetPasswordForEmail の redirectTo（ConfirmationURL フォールバック用）。
   * 実値は origin 付きで lib/auth-redirects.ts が生成する。
   */
  redirectToPath:
    "/auth/callback?type=recovery&next=/auth/update-password",
} as const;
