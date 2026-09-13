import Link from "next/link";
import {
  FREE_TRIAL_TICKET_LABEL,
  formatFreeTrialPromoHeadline,
  formatProPriceTaxIncluded,
  PRO_PLAN_FEATURES,
} from "@/lib/pricing";

export default function PricingPlanContent({
  showSignupCta = true,
}: {
  showSignupCta?: boolean;
}) {
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

      {showSignupCta && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            無料会員登録する
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
  );
}
