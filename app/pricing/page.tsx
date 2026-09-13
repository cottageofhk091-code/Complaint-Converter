"use client";

import PricingPlanContent from "@/components/PricingPlanContent";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function PricingNotices() {
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const canceled = searchParams.get("canceled");
    const payment = searchParams.get("payment");

    if (canceled === "true") {
      setToast("決済がキャンセルされました。いつでもこちらから再開できます。");
      window.history.replaceState({}, "", "/pricing");
    } else if (payment === "success") {
      setToast("お支払いが完了しました。PROプランをご利用いただけます。");
      window.history.replaceState({}, "", "/pricing");
    }

    if (canceled === "true" || payment === "success") {
      const t = window.setTimeout(() => setToast(null), 5000);
      return () => window.clearTimeout(t);
    }
  }, [searchParams]);

  if (!toast) return null;

  const isSuccess = toast.includes("完了");
  return (
    <div
      role="status"
      className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        isSuccess
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-amber-500/40 bg-amber-500/10 text-amber-100"
      }`}
    >
      {toast}
    </div>
  );
}

function PricingPageBody() {
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

      <Suspense fallback={null}>
        <PricingNotices />
      </Suspense>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 shadow-xl shadow-black/20 sm:p-7">
        <PricingPlanContent />
      </div>
    </main>
  );
}

export default function PricingPage() {
  return <PricingPageBody />;
}
