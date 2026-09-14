/**
 * PRO プラン価格の単一ソース。
 * UI・特商法・Checkout 検証はすべてここ（または NEXT_PUBLIC_PRO_PRICE_YEN）を参照する。
 * Stripe の Price.unit_amount（JPY はゼロデシマル）と一致させること。
 */
export const PRO_PRICE_YEN = 300;

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

/** 無料会員向け・有料プラン1回無料キャンペーン */
export const FREE_TRIAL_TICKET_LABEL = "有料プラン1回無料チケット";

export function formatFreeTrialPromoHeadline(): string {
  return "今なら無料会員登録で有料プランが1回無料！";
}

export function formatFreeTrialPromoBody(): string {
  return "プレミアム生成（全文表示・コピーなど）を1回無料でお試しいただけます。まずは無料会員登録からどうぞ。";
}

export function formatFreeTrialGrantedMessage(): string {
  return `${FREE_TRIAL_TICKET_LABEL}（初回無料権利）を付与しました。トップページからプレミアム生成を1回お試しいただけます。`;
}

export const PRO_PLAN_FEATURES = [
  "お詫びメール全文の表示・コピー",
  "プレミアム品質の生成結果",
  "二次炎上防止メモのフル活用",
  "生成結果を最大5件までマイページに自動保存・閲覧",
  "継続利用時の安定した業務効率化",
] as const;

/** 履歴保存の注意書き（料金・マイページ共通） */
export const HISTORY_LIMIT = 5;

export function formatHistoryBenefitLine(): string {
  return `有料プランなら生成結果を最大${HISTORY_LIMIT}件までマイページに自動保存・閲覧可能（※${HISTORY_LIMIT + 1}件目以降は古い順に自動上書き）`;
}

export function formatHistoryLimitNote(): string {
  return `※履歴は最新${HISTORY_LIMIT}件まで保存されます（有料プラン限定）`;
}
