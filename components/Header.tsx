"use client";

import { useAuth } from "@/components/AuthProvider";
import PricingModal from "@/components/PricingModal";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const {
    user,
    isAuthenticated,
    isProUnlocked,
    ready,
    logout,
    toggleDevPaidPlan,
    isDevPaidOverride,
    signInAsDevMock,
  } = useAuth();
  const [pricingOpen, setPricingOpen] = useState(false);
  const isDev = process.env.NODE_ENV === "development";

  const showFreeTrialBadge =
    isAuthenticated &&
    user &&
    !isProUnlocked &&
    user.membershipType !== "paid";

  const freeTrialLeft = showFreeTrialBadge
    ? Boolean(user.freeTrialUsed)
      ? 0
      : Math.max(user.freeTrialCredits ?? 1, 1)
    : null;

  const isPaidUi = isProUnlocked || user?.membershipType === "paid";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="group min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100 transition group-hover:text-blue-300">
              Smartお詫びコンシェルジュ
            </p>
            <p className="hidden truncate text-[11px] text-slate-500 sm:block">
              〜クレーム対応からお詫びメールまで、AIが即座に最適化〜
            </p>
          </Link>

          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isDev && (
              <button
                type="button"
                onClick={toggleDevPaidPlan}
                title="ローカル開発専用: 有料/無料を切り替え（履歴FIFO確認用）"
                className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition sm:text-[11px] ${
                  isPaidUi
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                    : "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20"
                }`}
              >
                [Dev] 有料プラン体験
                {isDevPaidOverride === null
                  ? "切替"
                  : isPaidUi
                    ? "：ON"
                    : "：OFF"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setPricingOpen(true)}
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 transition hover:border-amber-400/60 hover:bg-amber-500/20 sm:px-3 sm:text-xs"
            >
              有料プランについて
            </button>

            {freeTrialLeft !== null && (
              <span
                className={`hidden rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold sm:inline-flex ${
                  freeTrialLeft > 0
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-600/60 bg-slate-800/60 text-slate-400"
                }`}
              >
                初回無料体験：残り{freeTrialLeft}回
              </span>
            )}

            {!ready ? (
              <span className="h-8 w-28 animate-pulse rounded-lg bg-slate-800/80" />
            ) : isAuthenticated && user ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="max-w-[10rem] truncate text-xs font-medium text-slate-200">
                    {user.name}
                  </p>
                  <p className="max-w-[10rem] truncate text-[11px] text-slate-500">
                    {user.email}
                    {(isProUnlocked || user.membershipType === "paid") && (
                      <span className="ml-1 text-amber-400">· PRO</span>
                    )}
                    {isDev && isDevPaidOverride !== null && (
                      <span className="ml-1 text-fuchsia-300">· DEV</span>
                    )}
                  </p>
                </div>
                <Link
                  href="/mypage"
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-blue-500/50 hover:text-blue-200"
                >
                  マイページ
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <>
                {isDev && (
                  <button
                    type="button"
                    onClick={() => {
                      signInAsDevMock();
                    }}
                    title="ローカル開発専用: メール確認なしで即時ログイン"
                    className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-1.5 text-[10px] font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/20 sm:text-[11px]"
                  >
                    [Dev] モックログイン
                  </button>
                )}
                <Link
                  href="/login"
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
                >
                  新規登録
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </>
  );
}
