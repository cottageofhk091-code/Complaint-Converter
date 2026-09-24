/**
 * 認証メール（会員登録確認 / パスワード再設定）の文面。
 * Supabase 標準メーラーは使わず、Resend から配信する。
 */

export const CONFIRM_SIGNUP_SUBJECT =
  "【スマートお詫びコンシェルジュ】会員登録のご確認";

export const RECOVERY_SUBJECT =
  "【スマートお詫びコンシェルジュ】パスワード再設定のご案内";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildConfirmSignupEmail(confirmUrl: string): {
  subject: string;
  text: string;
  html: string;
} {
  const text = [
    "スマートお詫びコンシェルジュへのご登録ありがとうございます。",
    "以下のリンクをクリックして、会員登録を完了してください。",
    "",
    confirmUrl,
    "",
    "※リンクの有効期限が切れている場合は、もう一度新規登録をお試しください。",
  ].join("\n");

  const html = `
    <div style="font-family:sans-serif;line-height:1.7;color:#0f172a;max-width:560px;margin:0 auto">
      <h2 style="margin:0 0 12px;font-size:18px">会員登録のご確認</h2>
      <p style="margin:0 0 12px">スマートお詫びコンシェルジュへのご登録ありがとうございます。</p>
      <p style="margin:0 0 20px">以下のボタンをクリックして、会員登録を完了してください。</p>
      <p style="margin:0 0 20px">
        <a href="${escapeHtml(confirmUrl)}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
          メールアドレスを確認する
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#64748b;word-break:break-all">ボタンが開けない場合: ${escapeHtml(confirmUrl)}</p>
    </div>
  `;

  return { subject: CONFIRM_SIGNUP_SUBJECT, text, html };
}

export function buildRecoveryEmail(resetUrl: string): {
  subject: string;
  text: string;
  html: string;
} {
  const text = [
    "スマートお詫びコンシェルジュのパスワード再設定リクエストを受け付けました。",
    "以下のリンクをクリックして、新しいパスワードを設定してください。",
    "",
    resetUrl,
    "",
    "※心当たりがない場合は、このメールを無視してください。",
  ].join("\n");

  const html = `
    <div style="font-family:sans-serif;line-height:1.7;color:#0f172a;max-width:560px;margin:0 auto">
      <h2 style="margin:0 0 12px;font-size:18px">パスワード再設定のご案内</h2>
      <p style="margin:0 0 12px">パスワード再設定のリクエストを受け付けました。</p>
      <p style="margin:0 0 20px">以下のボタンをクリックして、新しいパスワードを設定してください。</p>
      <p style="margin:0 0 20px">
        <a href="${escapeHtml(resetUrl)}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
          パスワードを再設定する
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#64748b;word-break:break-all">ボタンが開けない場合: ${escapeHtml(resetUrl)}</p>
    </div>
  `;

  return { subject: RECOVERY_SUBJECT, text, html };
}

/** @deprecated Dashboard テンプレ用。Resend 配信の正本は上記 subject 定数を使う */
export const CONFIRM_SIGNUP_EMAIL = {
  subject: CONFIRM_SIGNUP_SUBJECT,
  bodyText: "",
  bodyHtmlHintPath: "supabase/templates/confirm-signup.html",
} as const;

export const RECOVERY_EMAIL = {
  subject: RECOVERY_SUBJECT,
  bodyText: "",
  bodyHtmlHintPath: "supabase/templates/reset-password.html",
  redirectToPath: "/auth/callback?type=recovery&next=/auth/password-reset-notice",
} as const;
