"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * メール確認・マジックリンク等の PKCE コールバック。
 * Supabase の {{ .ConfirmationURL }} の redirectTo 先。
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("認証処理中…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isSupabaseConfigured() || !supabase) {
        setMessage("Supabase が未設定です。");
        return;
      }

      try {
        // URL の code をセッションへ交換（detectSessionInUrl でも処理されるが明示）
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) {
            throw new Error("セッションを取得できませんでした。");
          }
        }

        if (!cancelled) {
          setMessage("認証が完了しました。移動します…");
          router.replace("/mypage");
        }
      } catch (err) {
        console.error("[auth/callback]", err);
        if (!cancelled) {
          setMessage(
            err instanceof Error
              ? err.message
              : "認証に失敗しました。ログイン画面から再度お試しください。"
          );
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md items-center px-4 py-14">
      <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 text-center">
        <p className="text-sm text-slate-300">{message}</p>
      </div>
    </main>
  );
}
