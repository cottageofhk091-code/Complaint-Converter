"use client";

import { useAuth } from "@/components/AuthProvider";
import {
  FREE_TRIAL_TICKET_LABEL,
  formatFreeTrialPromoHeadline,
  formatHistoryBenefitLine,
  formatProCtaLabel,
  formatProPriceTaxIncluded,
  PRO_PLAN_FEATURES,
} from "@/lib/pricing";
import { startStripeCheckout } from "@/lib/start-checkout";
import Link from "next/link";
import { useState } from "react";

export default function PricingPlanContent({
  showSignupCta = true,
  onCheckoutStarted,
}: {
  showSignupCta?: boolean;
  /** Checkout へ遷移する直前（モーダルを閉じる等） */
  onCheckoutStarted?: () => void;
}) {
  const { user, isAuthenticated, isProUnlocked } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyPro =
    isProUnlocked || user?.membershipType === "paid" || user?.plan === "pro";

  async function handleCheckout() {
    setError(null);
    setLoading(true);
    try {
      onCheckoutStarted?.();
      await startStripeCheckout({ email: user?.email });
    } catch (err) {
      console.error("[pricing checkout]", err);
      setError(
        err instanceof Error
          ? err.message
          : "決済ページを開けませんでした。時間をおいて再度お試しください。"
      );
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-medium tracking-[0.12em] text-amber-300/90">
          有料プラン（PRO）
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-50">
          プレミアム生成で、全文をすぐ業務に使う
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          無料プレビューでは確認しきれない返信全文・コピー・防止メモを、PRO
          プランで解放できます。
        </p>
      </section>

      <section className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
        <p className="text-sm font-medium text-slate-300">料金</p>
        <p className="mt-1 text-2xl font-bold text-slate-50">
          {formatProPriceTaxIncluded()}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Stripe Checkout で安全に決済できます。解約・更新は契約内容に従います。
        </p>
      </section>

      <section>
        <p className="mb-2 text-sm font-medium text-slate-200">できること</p>
        <ul className="space-y-2">
          {PRO_PLAN_FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex gap-2.5 text-sm leading-relaxed text-slate-300"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
              {feature}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {formatHistoryBenefitLine()}
        </p>
      </section>

      <section className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
        <p className="text-xs font-semibold tracking-wide text-amber-300">
          初回特典
        </p>
        <p className="mt-1 text-sm font-bold text-slate-50">
          {formatFreeTrialPromoHeadline()}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          無料会員登録で {FREE_TRIAL_TICKET_LABEL}
          を付与。有料プラン相当のプレミアム生成を1回お試しいただけます。
        </p>
      </section>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {alreadyPro ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-200">
          すでに PRO プランをご利用中です。
          <div className="mt-3">
            <Link
              href="/"
              className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              トップで生成する
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleCheckout()}
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:from-amber-400 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "決済ページへ移動中…" : formatProCtaLabel()}
          </button>
          <p className="text-center text-[11px] text-slate-500">
            クリックすると Stripe の安全な決済画面へ移動します。
          </p>

          {showSignupCta && !isAuthenticated && (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                先に無料会員登録する
              </Link>
              <Link
                href="/"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                トップで試す
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
