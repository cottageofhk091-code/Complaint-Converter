"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ConfirmedContent() {
  const { isAuthenticated, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const destination = useMemo(() => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      // ログイン画面への自動誘導は避け、確認後は利用開始を優先
      if (next === "/login") {
        return isAuthenticated ? "/" : "/login";
      }
      return next;
    }
    if (ready && isAuthenticated) return "/";
    if (ready && !isAuthenticated) return "/login";
    return "/";
  }, [searchParams, ready, isAuthenticated]);

  const primaryLabel = useMemo(() => {
    if (!ready) return "利用を開始する";
    if (isAuthenticated) return "利用を開始する";
    return "ログインして利用を開始する";
  }, [ready, isAuthenticated]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-14 sm:px-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-confirmed-title"
        aria-describedby="email-confirmed-body"
        className="w-full rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-6 shadow-2xl shadow-emerald-950/30 sm:p-8"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-2xl text-emerald-300">
          ✓
        </div>

        <p className="mb-2 text-center text-xs font-medium tracking-[0.15em] text-emerald-400/90 uppercase">
          Email confirmed
        </p>
        <h1
          id="email-confirmed-title"
          className="text-center text-xl font-bold text-slate-50 sm:text-2xl"
        >
          メールアドレスの確認が完了しました！
        </h1>
        <p
          id="email-confirmed-body"
          className="mt-4 text-center text-sm leading-relaxed text-slate-300"
        >
          ご登録ありがとうございます。
          <br />
          Smartお詫びコンシェルジュへようこそ。
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push(destination)}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-500"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={() => router.push(isAuthenticated ? "/mypage" : "/login")}
            className="w-full rounded-xl border border-slate-600 bg-slate-950/50 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80"
          >
            ダッシュボードへ進む
          </button>
          <p className="text-center text-xs text-slate-500">
            ボタンを押すまでこの画面に留まります。
          </p>
          {!isAuthenticated && ready && (
            <Link
              href="/login"
              className="text-center text-xs text-blue-400 hover:underline"
            >
              ログイン画面を開く
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

export default function EmailConfirmedPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[50vh] max-w-lg items-center px-4 py-14">
          <div className="h-48 w-full animate-pulse rounded-2xl bg-slate-800/60" />
        </main>
      }
    >
      <ConfirmedContent />
    </Suspense>
  );
}
