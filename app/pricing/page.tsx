import PricingPlanContent from "@/components/PricingPlanContent";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "有料プランについて",
  description:
    "Smartお詫びコンシェルジュの有料プラン（PRO）の特徴・料金・無料会員向け1回無料特典のご案内。",
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-blue-300"
        >
          <span aria-hidden>←</span>
          トップページへ戻る
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 shadow-xl shadow-black/20 sm:p-7">
        <PricingPlanContent />
      </div>
    </main>
  );
}
