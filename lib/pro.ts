/** localStorage: PROロック解除フラグ */
export const PRO_UNLOCK_STORAGE_KEY = "claim_mail_pro_unlocked";

/** sessionStorage: 決済リダイレクト前後で生成結果を保持 */
export const LAST_RESULT_STORAGE_KEY = "claim_mail_last_result";

export function isProUnlockedInStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PRO_UNLOCK_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setProUnlockedInStorage(unlocked: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (unlocked) {
      localStorage.setItem(PRO_UNLOCK_STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(PRO_UNLOCK_STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

/** URLクエリから決済成功・ロック解除を判定 */
export function hasUnlockQueryParam(search: string): boolean {
  const params = new URLSearchParams(search);
  return (
    params.get("unlocked") === "true" ||
    params.get("payment") === "success"
  );
}

export function getStripePaymentLink(): string | undefined {
  const link = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK?.trim();
  if (!link || link === "your_stripe_payment_link_here") return undefined;
  return link;
}
