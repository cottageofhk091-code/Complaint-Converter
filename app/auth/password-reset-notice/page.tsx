"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function NoticeBody() {
  const searchParams = useSearchParams();
  const sent = searchParams.get("sent") === "1";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-14 sm:px-6">
      <div className="w-full rounded-2xl border border-blue-500/30 bg-slate-900/80 p-6 text-center shadow-2xl shadow-blue-950/30 sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/15 text-2xl text-blue-300">
          ✓
        </div>
        <h1 className="text-xl font-bold text-slate-50 sm:text-2xl">
          {sent ? "メールを送信しました" : "認証が完了しました"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {sent
            ? "メール内のリンクを開いたあと、元の画面（タブ）に戻ってお続けください。"
            : "元の画面（タブ）に戻ってお続けください。"}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          {sent
            ? "届かない場合は迷惑メールフォルダもご確認ください。"
            : "元のタブでパスワード変更画面が開きます。このタブはそのまま閉じて構いません。"}
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
