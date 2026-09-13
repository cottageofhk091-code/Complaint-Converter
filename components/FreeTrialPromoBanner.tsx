import Link from "next/link";
import {
  formatFreeTrialPromoBody,
  formatFreeTrialPromoHeadline,
} from "@/lib/pricing";

type Variant = "compact" | "hero" | "inline";

export default function FreeTrialPromoBanner({
  variant = "compact",
  showCta = false,
  className = "",
}: {
  variant?: Variant;
  showCta?: boolean;
  className?: string;
}) {
  const headline = formatFreeTrialPromoHeadline();
  const body = formatFreeTrialPromoBody();

  if (variant === "hero") {
    return (
      <div
        className={`rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-500/15 via-slate-900/80 to-slate-950 px-4 py-4 text-left shadow-lg shadow-amber-950/20 sm:px-5 sm:py-5 ${className}`}
      >
        <p className="text-[11px] font-semibold tracking-[0.14em] text-amber-300/90">
          キャンペーン
        </p>
        <p className="mt-1.5 text-base font-bold leading-snug text-slate-50 sm:text-lg">
          {headline}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
        {showCta && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/signup"
              className="inline-flex rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              無料会員登録する
            </Link>
            <Link
              href="/pricing"
              className="inline-flex rounded-lg border border-slate-600 bg-slate-900/70 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-amber-400/40 hover:text-amber-200"
            >
              有料プランについて
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <p
        className={`rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm leading-relaxed text-amber-100 ${className}`}
      >
        <span className="font-semibold text-amber-300">{headline}</span>
        <span className="mt-1 block text-amber-100/85">{body}</span>
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-3 ${className}`}
    >
      <p className="text-sm font-semibold text-amber-200">{headline}</p>
      <p className="mt-1 text-xs leading-relaxed text-amber-100/80">{body}</p>
      {showCta && (
        <Link
          href="/signup"
          className="mt-2 inline-flex text-xs font-semibold text-amber-300 hover:underline"
        >
          今すぐ無料登録 →
        </Link>
      )}
    </div>
  );
}
