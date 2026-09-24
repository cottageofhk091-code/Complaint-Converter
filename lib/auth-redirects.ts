/**
 * Auth メール連携用のリダイレクト URL。
 *
 * - 件名・本文は Dashboard の Email Templates（日本語テンプレ）側で設定
 * - resetPasswordForEmail の redirectTo は Allow list に載せる必要がある
 * - カスタムテンプレの token_hash リンクと、ConfirmationURL 経由の両対応
 */

export const PASSWORD_UPDATE_PATH = "/auth/update-password";
export const PASSWORD_RESET_NOTICE_PATH = "/auth/password-reset-notice";
export const AUTH_CALLBACK_PATH = "/auth/callback";
export const AUTH_CONFIRMED_PATH = "/auth/confirmed";

/**
 * パスワード再設定メール用 redirectTo。
 * コールバック後は /auth/update-password で新パスワードを入力する。
 */
export function getPasswordRecoveryRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, "");
  const next = encodeURIComponent(PASSWORD_UPDATE_PATH);
  return `${base}${AUTH_CALLBACK_PATH}?type=recovery&next=${next}`;
}
