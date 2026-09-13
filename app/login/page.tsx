"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { signIn, isAuthenticated, user, supabaseReady, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }
    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  if (ready && isAuthenticated && user) {
    return (
      <main className="mx-auto max-w-md px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 text-center">
          <p className="text-sm text-slate-300">すでにログインしています</p>
          <p className="mt-2 text-base font-semibold text-slate-50">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            トップへ戻る
          </Link>
        </div>
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
          トップページへ戻る
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 shadow-xl shadow-black/20 sm:p-7">
        <header className="mb-6 border-b border-slate-700/60 pb-5">
          <p className="mb-2 text-xs font-medium tracking-[0.15em] text-blue-400/80 uppercase">
            Login
          </p>
          <h1 className="text-2xl font-bold text-slate-50">ログイン</h1>
          <p className="mt-2 text-sm text-slate-400">
            登録済みのメールアドレスとパスワードでログインできます。
          </p>
        </header>

        {!supabaseReady && (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Supabase 環境変数が未設定のため、現在ログインできません。
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-slate-200">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-slate-200">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !supabaseReady}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "ログイン中…" : "ログインする"}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center text-xs text-slate-500">
          <p>
            アカウントをお持ちでない方は{" "}
            <Link href="/signup" className="text-blue-400 hover:underline">
              新規登録
            </Link>
          </p>
          <p>
            <Link href="/forgot-password" className="text-blue-400 hover:underline">
              パスワードをお忘れの方
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
