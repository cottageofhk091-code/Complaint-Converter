"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const AUTO_REDIRECT_MS = 3000;

function ConfirmedContent() {
  const { isAuthenticated, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [remainingMs, setRemainingMs] = useState(AUTO_REDIRECT_MS);

  const destination = useMemo(() => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      return next;
    }
    // セッションがあればメイン、なければログインへ
    if (ready && isAuthenticated) return "/";
    if (ready && !isAuthenticated) return "/login";
    return "/";
  }, [searchParams, ready, isAuthenticated]);

  const ctaLabel = useMemo(() => {
    if (!ready) return "利用を開始する";
    if (isAuthenticated) return "利用を開始する";
    return "ログインして利用を開始する";
  }, [ready, isAuthenticated]);

  useEffect(() => {
    if (!ready) return;

    const started = Date.now();
    const tick = window.setInterval(() => {
      const left = Math.max(0, AUTO_REDIRECT_MS - (Date.now() - started));
      setRemainingMs(left);
      if (left <= 0) {
        window.clearInterval(tick);
        router.replace(destination);
      }
    }, 100);

    return () => window.clearInterval(tick);
  }, [ready, destination, router]);

  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-14 sm:px-6">
      <div
        role="dialog"
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
            onClick={() => router.replace(destination)}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-500"
          >
            {ctaLabel}
          </button>
          <p className="text-center text-xs text-slate-500">
            {ready
              ? `${secondsLeft}秒後に自動で移動します…`
              : "準備中…"}
          </p>
          <Link
            href="/mypage"
            className="text-center text-xs text-blue-400 hover:underline"
          >
            マイページへ進む
          </Link>
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
