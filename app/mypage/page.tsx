"use client";

import { useAuth } from "@/components/AuthProvider";
import {
  deleteGenerationHistoryItem,
  listGenerationHistory,
  type GenerationHistoryItem,
} from "@/lib/generation-history";
import { formatHistoryLimitNote } from "@/lib/pricing";
import { ageGroupLabel, regionLabel } from "@/lib/survey";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function MyPage() {
  const { user, isAuthenticated, isProUnlocked, ready, logout } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isPaid =
    Boolean(user) &&
    (isProUnlocked || user?.membershipType === "paid" || user?.plan === "pro");

  const reloadHistory = useCallback(() => {
    if (!user?.id || !isPaid) {
      setHistory([]);
      return;
    }
    setHistory(listGenerationHistory(user.id));
  }, [user?.id, isPaid]);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login");
    }
  }, [ready, isAuthenticated, router]);

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  if (!ready || !user) {
    return (
      <main className="mx-auto max-w-md px-4 py-14">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-800/60" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
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
              {isPaid ? "有料（PRO）" : "無料"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">初回無料体験</dt>
            <dd className="mt-1 font-medium text-slate-100">
              {isPaid
                ? "PRO利用中（無料枠不要）"
                : (user.freeTrialCredits ?? 0) > 0 && !user.freeTrialUsed
                  ? `残り ${user.freeTrialCredits} 回`
                  : user.freeTrialUsed
                    ? "利用済み"
                    : "未付与"}
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

      {/* 生成履歴（有料限定） */}
      <section className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 sm:p-7">
        <header className="mb-4 border-b border-slate-700/60 pb-4">
          <p className="mb-1 text-xs font-medium tracking-[0.12em] text-amber-300/90">
            生成履歴
          </p>
          <h2 className="text-lg font-bold text-slate-50">保存したお詫び文</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {formatHistoryLimitNote()}
          </p>
        </header>

        {!isPaid ? (
          <div className="rounded-xl border border-slate-700/50 bg-slate-950/40 px-4 py-5 text-center">
            <p className="text-sm text-slate-300">
              履歴の自動保存・閲覧は有料プランの特典です。
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-flex rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
            >
              有料プランを見る
            </Link>
          </div>
        ) : history.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            まだ保存された履歴はありません。トップで生成すると自動保存されます。
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => {
              const open = expandedId === item.id;
              const title =
                item.subjectSuggestions?.[0] ||
                item.replyBody.slice(0, 40) ||
                "（件名なし）";
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-700/60 bg-slate-950/40"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(open ? null : item.id)
                    }
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatWhen(item.createdAt)} · 危険度 {item.riskLevel}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {open ? "閉じる" : "開く"}
                    </span>
                  </button>
                  {open && (
                    <div className="space-y-3 border-t border-slate-700/50 px-4 py-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                        {item.replyBody || item.freePreview}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                item.replyBody || item.freePreview
                              );
                            } catch {
                              // ignore
                            }
                          }}
                          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                        >
                          コピー
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!user.id) return;
                            setHistory(
                              deleteGenerationHistoryItem(user.id, item.id)
                            );
                            setExpandedId(null);
                          }}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
