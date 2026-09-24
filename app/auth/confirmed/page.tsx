"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ConfirmedBody() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const detail = searchParams.get("detail");

  if (error) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-14 sm:px-6">
        <div className="w-full rounded-2xl border border-red-500/40 bg-slate-900/80 p-6 text-center shadow-2xl sm:p-8">
          <h1 className="text-xl font-bold text-slate-50 sm:text-2xl">
            認証に失敗しました
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-red-200">{error}</p>
          {detail && (
            <p className="mt-3 break-all rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-left text-xs text-slate-400">
              detail: {detail}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              ログイン画面へ
            </Link>
            <Link
              href="/signup"
              className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              新規登録へ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-14 sm:px-6">
      <div className="w-full rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-6 text-center shadow-2xl shadow-emerald-950/30 sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-2xl text-emerald-300">
          ✓
        </div>
        <h1 className="text-xl font-bold text-slate-50 sm:text-2xl">
          認証が完了しました
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          元の画面（タブ）に戻ってお続けください。
        </p>
        <p className="mt-3 text-xs text-slate-500">
          このタブはそのまま閉じて構いません。ログイン状態は元のタブに反映されます。
        </p>
      </div>
    </main>
  );
}

export default function EmailConfirmedPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[50vh] max-w-lg items-center px-4 py-14">
          <div className="h-40 w-full animate-pulse rounded-2xl bg-slate-800/60" />
        </main>
      }
    >
      <ConfirmedBody />
    </Suspense>
  );
}
