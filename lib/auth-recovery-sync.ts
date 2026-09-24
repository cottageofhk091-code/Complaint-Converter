/**
 * パスワード再設定の「元タブ完結」用クロス・タブ同期。
 * メールリンクで開いた案内タブから、元アプリタブへ準備完了を通知する。
 */

export const AWAITING_PASSWORD_RECOVERY_KEY = "awaiting_password_recovery";
export const PASSWORD_RECOVERY_READY_KEY = "password_recovery_ready";
export const PASSWORD_RECOVERY_CHANNEL = "smart-apology-password-recovery";

export function markAwaitingPasswordRecovery(): void {
  try {
    sessionStorage.setItem(AWAITING_PASSWORD_RECOVERY_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearAwaitingPasswordRecovery(): void {
  try {
    sessionStorage.removeItem(AWAITING_PASSWORD_RECOVERY_KEY);
  } catch {
    // ignore
  }
}

export function isAwaitingPasswordRecovery(): boolean {
  try {
    return sessionStorage.getItem(AWAITING_PASSWORD_RECOVERY_KEY) === "1";
  } catch {
    return false;
  }
}

/** 案内タブから元タブへ「再設定準備完了」を通知 */
export function notifyPasswordRecoveryReady(): void {
  const stamp = String(Date.now());
  try {
    localStorage.setItem(PASSWORD_RECOVERY_READY_KEY, stamp);
  } catch {
    // ignore
  }
  try {
    const bc = new BroadcastChannel(PASSWORD_RECOVERY_CHANNEL);
    bc.postMessage({ type: "PASSWORD_RECOVERY_READY", at: stamp });
    bc.close();
  } catch {
    // ignore (古いブラウザ等)
  }
}

/** 案内・確認ページではモーダルを出さない */
export function isAuthNoticePath(pathname: string): boolean {
  return (
    pathname.startsWith("/auth/password-reset-notice") ||
    pathname.startsWith("/auth/confirmed") ||
    pathname.startsWith("/auth/update-password") ||
    pathname.startsWith("/auth/callback")
  );
}
