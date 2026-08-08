"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

export default function Header() {
  const { user, isAuthenticated, ready, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="min-w-0 group">
          <p className="truncate text-sm font-semibold text-slate-100 transition group-hover:text-blue-300">
            Smartお詫びコンシェルジュ
          </p>
          <p className="hidden truncate text-[11px] text-slate-500 sm:block">
            〜クレーム対応からお詫びメールまで、AIが即座に最適化〜
          </p>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {!ready ? (
            <span className="h-8 w-20 animate-pulse rounded-lg bg-slate-800/80" />
          ) : isAuthenticated && user ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="max-w-[10rem] truncate text-xs font-medium text-slate-200">
                  {user.name}
                </p>
                <p className="max-w-[10rem] truncate text-[11px] text-slate-500">
                  {user.email}
                  {user.plan === "pro" && (
                    <span className="ml-1 text-amber-400">· PRO</span>
                  )}
                </p>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 sm:hidden">
                {user.plan === "pro" ? "PRO" : "ログイン中"}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
