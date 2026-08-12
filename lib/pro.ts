/** localStorage: 検証済み Stripe Checkout Session ID（PRO 証明） */
export const PRO_SESSION_STORAGE_KEY = "claim_mail_pro_session_id";

/** 旧 boolean フラグ（移行時に削除） */
const LEGACY_PRO_UNLOCK_STORAGE_KEY = "claim_mail_pro_unlocked";

/** sessionStorage: 決済リダイレクト前後で生成結果を保持 */
export const LAST_RESULT_STORAGE_KEY = "claim_mail_last_result";

export function clearLegacyProUnlockFlag(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_PRO_UNLOCK_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getProSessionIdFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    clearLegacyProUnlockFlag();
    const id = localStorage.getItem(PRO_SESSION_STORAGE_KEY)?.trim();
    return id || null;
  } catch {
    return null;
  }
}

export function setProSessionIdInStorage(sessionId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    clearLegacyProUnlockFlag();
    if (sessionId?.trim()) {
      localStorage.setItem(PRO_SESSION_STORAGE_KEY, sessionId.trim());
    } else {
      localStorage.removeItem(PRO_SESSION_STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

/** Checkout 成功戻り（unlocked=true + session_id）かどうか */
export function hasCheckoutReturnQuery(search: string): boolean {
  const params = new URLSearchParams(search);
  return (
    params.get("unlocked") === "true" || Boolean(params.get("session_id")?.trim())
  );
}

export function getCheckoutSessionIdFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  return params.get("session_id")?.trim() || null;
}
