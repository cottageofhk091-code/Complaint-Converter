"use client";

import { useAuth } from "@/components/AuthProvider";
import CopyButton from "@/components/CopyButton";
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

function HistoryDetail({
  item,
  userId,
  onDeleted,
}: {
  item: GenerationHistoryItem;
  userId: string;
  onDeleted: (next: GenerationHistoryItem[]) => void;
}) {
  const subjects = item.subjectSuggestions ?? [];
  const notes = item.preventionNotes ?? [];
  const body = item.replyBody || item.freePreview || "";

  return (
    <div className="space-y-4 border-t border-slate-700/50 px-4 py-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400">
            推奨件名案
          </h3>
          {subjects.length > 0 && (
            <CopyButton text={subjects.join("\n")} label="すべてコピー" />
          )}
        </div>
        {subjects.length === 0 ? (
          <p className="rounded-lg border border-slate-700/40 bg-slate-950/30 px-3 py-2 text-xs text-slate-500">
            件名案は保存されていません（旧データ、または未生成）
          </p>
        ) : (
          <ol className="space-y-1.5">
            {subjects.map((s, i) => (
              <li
                key={`${item.id}-sub-${i}`}
                className="flex items-start gap-2 rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-sm text-slate-200"
              >
                <span className="mt-0.5 shrink-0 font-mono text-xs text-blue-400">
                  {i + 1}.
                </span>
                <span className="min-w-0 flex-1 leading-relaxed">{s}</span>
                <CopyButton text={s} className="mt-0.5" />
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400">
            お詫びメール本文
          </h3>
          {body ? <CopyButton text={body} label="本文をコピー" /> : null}
        </div>
        {body ? (
          <p className="whitespace-pre-wrap rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2.5 text-sm leading-relaxed text-slate-200">
            {body}
          </p>
        ) : (
          <p className="rounded-lg border border-slate-700/40 bg-slate-950/30 px-3 py-2 text-xs text-slate-500">
            本文は保存されていません
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400">
            二次炎上防止メモ
          </h3>
          {notes.length > 0 && (
            <CopyButton text={notes.join("\n")} label="すべてコピー" />
          )}
        </div>
        {notes.length === 0 ? (
          <p className="rounded-lg border border-slate-700/40 bg-slate-950/30 px-3 py-2 text-xs text-slate-500">
            防止メモは保存されていません（旧データ、または未生成）
          </p>
        ) : (
          <ul className="space-y-1.5">
            {notes.map((note, i) => (
              <li
                key={`${item.id}-note-${i}`}
                className="flex items-start gap-2 rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-sm leading-relaxed text-slate-300"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                <span className="min-w-0 flex-1">{note}</span>
                <CopyButton text={note} className="mt-0.5" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            onDeleted(deleteGenerationHistoryItem(userId, item.id));
          }}
          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
        >
          この履歴を削除
        </button>
      </div>
    </div>
  );
}

export default function MyPage() {
  const {
    user,
    isAuthenticated,
    isProUnlocked,
    ready,
    logout,
    toggleDevPaidPlan,
    isDevPaidOverride,
  } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isDev = process.env.NODE_ENV === "development";

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
          {isDev && (
            <button
              type="button"
              onClick={toggleDevPaidPlan}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                isPaid
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                  : "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20"
              }`}
            >
              [Dev] 有料プラン体験切り替え（現在: {isPaid ? "有料" : "無料"}
              {isDevPaidOverride !== null ? " / 上書き中" : ""}）
            </button>
          )}
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

      <section className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 sm:p-7">
        <header className="mb-4 border-b border-slate-700/60 pb-4">
          <p className="mb-1 text-xs font-medium tracking-[0.12em] text-amber-300/90">
            生成履歴
          </p>
          <h2 className="text-lg font-bold text-slate-50">保存したお詫び文</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {formatHistoryLimitNote()}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            各履歴には本文・推奨件名案・二次炎上防止メモが含まれます。
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
              const subjects = item.subjectSuggestions ?? [];
              const bodyPreview = (
                item.replyBody ||
                item.freePreview ||
                ""
              ).slice(0, 40);
              const title =
                subjects[0] ||
                (bodyPreview ? `${bodyPreview}…` : null) ||
                "（件名なし）";
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-700/60 bg-slate-950/40"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : item.id)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatWhen(item.createdAt)} · 危険度{" "}
                        {item.riskLevel || "—"}
                        {subjects.length > 0
                          ? ` · 件名 ${subjects.length}件`
                          : ""}
                        {(item.preventionNotes ?? []).length > 0
                          ? ` · メモ ${(item.preventionNotes ?? []).length}件`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {open ? "閉じる" : "開く"}
                    </span>
                  </button>
                  {open && (
                    <HistoryDetail
                      item={item}
                      userId={user.id}
                      onDeleted={(next) => {
                        setHistory(next);
                        setExpandedId(null);
                      }}
                    />
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
