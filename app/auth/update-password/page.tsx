"use client";

import { PASSWORD_RESET_NOTICE_PATH } from "@/lib/auth-redirects";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * 旧パスワード入力ページ。
 * メールリンク経由の互換のため案内ページへ転送（入力は元タブのモーダル）。
 */
export default function UpdatePasswordPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(PASSWORD_RESET_NOTICE_PATH);
  }, [router]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg items-center px-4 py-14">
      <div className="h-40 w-full animate-pulse rounded-2xl bg-slate-800/60" />
    </main>
  );
}
