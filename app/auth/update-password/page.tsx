"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // ConfirmationURL 経由でセッションが確立されるまで待つ
    if (!supabase) {
      setReady(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError(
          "再設定セッションが見つかりません。メールのリンクから再度アクセスしてください。"
        );
      }
      setReady(true);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!isSupabaseConfigured() || !supabase) {
      setError("Supabase が未設定です。");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上にしてください。");
      return;
    }
    if (password !== confirm) {
      setError("確認用パスワードが一致しません。");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setInfo("パスワードを更新しました。ログイン画面へ移動します…");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "パスワード更新に失敗しました。"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 sm:p-7">
        <h1 className="text-2xl font-bold text-slate-50">新しいパスワード</h1>
        <p className="mt-2 text-sm text-slate-400">
          メールの ConfirmationURL から遷移後、新しいパスワードを設定してください。
        </p>

        {!ready ? (
          <div className="mt-6 h-24 animate-pulse rounded-xl bg-slate-800/60" />
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm text-slate-200">
                新しいパスワード
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="mb-2 block text-sm text-slate-200">
                パスワード（確認）
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {submitting ? "更新中…" : "パスワードを更新する"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-slate-500">
          <Link href="/login" className="text-blue-400 hover:underline">
            ログインへ
          </Link>
        </p>
      </div>
    </main>
  );
}
