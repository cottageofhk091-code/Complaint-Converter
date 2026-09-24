/**
 * Auth メール連携用のリダイレクト URL。
 *
 * - 件名・本文は Dashboard の Email Templates（日本語テンプレ）側で設定
 * - resetPasswordForEmail の redirectTo は Allow list に載せる必要がある
 * - カスタムテンプレの token_hash リンクと、ConfirmationURL 経由の両対応
 */

/** パスワード再設定完了後の遷移先（トップ＋モーダル起動・新タブで入力完結） */
export const PASSWORD_RESET_ACTION = "reset-password";
export const PASSWORD_UPDATE_PATH = `/?action=${PASSWORD_RESET_ACTION}`;

/** 旧フロー互換 */
export const PASSWORD_RESET_NOTICE_PATH = "/auth/password-reset-notice";
export const LEGACY_PASSWORD_UPDATE_PATH = "/auth/update-password";

export const AUTH_CALLBACK_PATH = "/auth/callback";
export const AUTH_CONFIRMED_PATH = "/auth/confirmed";

export function isPasswordRecoveryPath(path: string): boolean {
  if (!path) return false;
  if (path.startsWith(PASSWORD_RESET_NOTICE_PATH)) return true;
  if (path.startsWith(LEGACY_PASSWORD_UPDATE_PATH)) return true;
  if (path.includes(`action=${PASSWORD_RESET_ACTION}`)) return true;
  return false;
}

/**
 * generateLink / メール用 redirectTo。
 * コールバック検証後はトップでパスワード再設定モーダルを開く（新タブで完結）。
 */
export function getPasswordRecoveryRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${PASSWORD_UPDATE_PATH}`;
}
