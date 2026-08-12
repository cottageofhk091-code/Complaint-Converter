/**
 * PRO プラン価格の単一ソース。
 * UI・特商法・Checkout 検証はすべてここ（または NEXT_PUBLIC_PRO_PRICE_YEN）を参照する。
 * Stripe の Price.unit_amount（JPY はゼロデシマル）と一致させること。
 */
export const PRO_PRICE_YEN = 980;

export const PRO_PRICE_CURRENCY = "jpy" as const;

export const PRO_PRICE_INTERVAL = "month" as const;

/** 表示・Checkout 検証用の実効価格（env で上書き可） */
export function getProPriceYen(): number {
  const fromEnv = process.env.NEXT_PUBLIC_PRO_PRICE_YEN?.trim();
  if (fromEnv && /^\d+$/.test(fromEnv)) {
    const n = Number(fromEnv);
    if (n > 0) return n;
  }
  return PRO_PRICE_YEN;
}

export function formatProPriceShort(): string {
  return `月額 ${getProPriceYen()}円`;
}

export function formatProPriceTaxIncluded(): string {
  return `月額 ${getProPriceYen()}円（税込）`;
}

export function formatProUnlockHeadline(): string {
  return `${getProPriceYen()}円で鍵を解除`;
}

export function formatProCtaLabel(): string {
  return `有料プランに登録する（${formatProPriceShort()}）`;
}

export function formatTokushohoPriceLine(): string {
  return `PROプラン：${formatProPriceTaxIncluded()}`;
}
