"use client";

import { useAuth } from "@/components/AuthProvider";
import { ageGroupLabel, regionLabel } from "@/lib/survey";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MyPage() {
  const { user, isAuthenticated, isProUnlocked, ready, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login");
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || !user) {
    return (
      <main className="mx-auto max-w-md px-4 py-14">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-800/60" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-blue-300"
        >
          <span aria-hidden>←</span>
          トップへ戻る
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 sm:p-7">
        <header className="mb-6 border-b border-slate-700/60 pb-5">
          <p className="mb-2 text-xs font-medium tracking-[0.12em] text-blue-400/80">
            アカウント情報
          </p>
          <h1 className="text-2xl font-bold text-slate-50">マイページ</h1>
        </header>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-slate-500">お名前</dt>
            <dd className="mt-1 font-medium text-slate-100">{user.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">メールアドレス</dt>
            <dd className="mt-1 font-medium text-slate-100">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">会員種別</dt>
            <dd className="mt-1 font-medium text-slate-100">
              {isProUnlocked || user.membershipType === "paid"
                ? "有料（PRO）"
                : "無料"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">年代</dt>
            <dd className="mt-1 font-medium text-slate-100">
              {user.ageGroup ? ageGroupLabel(user.ageGroup) : "未設定"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">地域</dt>
            <dd className="mt-1 font-medium text-slate-100">
              {user.region ? regionLabel(user.region) : "未設定"}
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col gap-2">
          <Link
            href="/"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-500"
          >
            お詫び文を作成する
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            ログアウト
          </button>
        </div>
      </div>
    </main>
  );
}
