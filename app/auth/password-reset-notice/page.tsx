"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * sent=1 … メール送信後の案内
 * それ以外（古いメールの next 先）… パスワード入力画面へ転送
 */
function NoticeBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sent = searchParams.get("sent") === "1";

  useEffect(() => {
    if (!sent) {
      router.replace("/auth/update-password");
    }
  }, [sent, router]);

  if (!sent) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-lg items-center px-4 py-14">
        <div className="h-40 w-full animate-pulse rounded-2xl bg-slate-800/60" />
      </main>
    );
  }

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
          メール内の「パスワードを再設定する」ボタンを開くと、新しいパスワードの入力画面に進みます。
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
