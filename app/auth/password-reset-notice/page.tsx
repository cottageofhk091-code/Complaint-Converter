"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { notifyPasswordRecoveryReady } from "@/lib/auth-recovery-sync";

/**
 * sent=1 … 再設定メール送信後の案内
 * error … 認証失敗
 * それ以外（コールバック成功後）… 元タブでモーダル完結する旨を表示
 */
function NoticeBody() {
  const searchParams = useSearchParams();
  const sent = searchParams.get("sent") === "1";
  const error = searchParams.get("error");
  const detail = searchParams.get("detail");

  useEffect(() => {
    if (sent || error) return;
    // メールリンク側タブ: 認証済み。元タブへ準備完了を通知する
    notifyPasswordRecoveryReady();
  }, [sent, error]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-14 sm:px-6">
        <div className="w-full rounded-2xl border border-red-500/40 bg-slate-900/80 p-6 text-center shadow-2xl sm:p-8">
          <h1 className="text-xl font-bold text-slate-50 sm:text-2xl">
            再設定リンクの確認に失敗しました
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-red-200">{error}</p>
          {detail && (
            <p className="mt-3 break-all rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-left text-xs text-slate-400">
              detail: {detail}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/forgot-password"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              再設定メールを再送する
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              ログイン画面へ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (sent) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-14 sm:px-6">
        <div className="w-full rounded-2xl border border-blue-500/30 bg-slate-900/80 p-6 text-center shadow-2xl shadow-blue-950/30 sm:p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/15 text-2xl text-blue-300">
            ✓
          </div>
          <h1 className="text-xl font-bold text-slate-50 sm:text-2xl">
            メールを送信しました
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            メール内の「パスワードを再設定する」ボタンを開くと準備が完了します。その後、元々開いていた画面（タブ）に戻って新しいパスワードを入力してください。
          </p>
          <p className="mt-3 text-xs text-slate-500">
            届かない場合は迷惑メールフォルダもご確認ください。
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            ログインへ戻る
          </Link>
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
          パスワード再設定の準備が完了しました
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          元々開いていた画面（タブ）に戻って新しいパスワードを入力してください。（この画面は閉じて構いません）
        </p>
        <p className="mt-3 text-xs text-slate-500">
          元のタブにパスワード設定画面が表示されます。
        </p>
      </div>
    </main>
  );
}

export default function PasswordResetNoticePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[50vh] max-w-lg items-center px-4 py-14">
          <div className="h-40 w-full animate-pulse rounded-2xl bg-slate-800/60" />
        </main>
      }
    >
      <NoticeBody />
    </Suspense>
  );
}
