/**
 * Stripe Checkout セッション作成 → 決済画面へ遷移。
 * モーダル・料金ページ・ホームの CTA から共通利用する。
 */
export async function startStripeCheckout(options?: {
  email?: string | null;
}): Promise<void> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: options?.email?.trim() || undefined,
    }),
  });

  const data = (await res.json()) as {
    checkoutUrl?: string;
    url?: string;
    error?: string;
  };

  if (!res.ok || !(data.checkoutUrl || data.url)) {
    throw new Error(
      data.error || "決済ページの準備に失敗しました。しばらくしてから再度お試しください。"
    );
  }

  window.location.href = (data.checkoutUrl || data.url)!;
}
