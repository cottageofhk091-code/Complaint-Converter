"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("メールアドレスを入力してください。");
      return;
    }
    login({ name: name.trim() || undefined, email: email.trim(), plan: "free" });
    router.push("/");
  }

  if (isAuthenticated && user) {
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
            デモ用の簡易ログインです。メールアドレスを入力して続行できます。
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm text-slate-200">
              お名前（任意）
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              placeholder="山田 太郎"
              autoComplete="name"
            />
          </div>
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

          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-500"
          >
            ログインする
          </button>
        </form>

        <div className="mt-5 border-t border-slate-700/60 pt-5">
          <p className="mb-2 text-xs text-slate-500">ワンクリック（デモ）</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <DemoLoginButton
              label="フリーで入る"
              onClick={() => {
                login({ email: "user@example.com", name: "フリーユーザー", plan: "free" });
                router.push("/");
              }}
            />
            <DemoLoginButton
              label="PROで入る"
              onClick={() => {
                login({ email: "pro@example.com", name: "PROユーザー", plan: "pro" });
                router.push("/");
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function DemoLoginButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-blue-500/40 hover:text-blue-300"
    >
      {label}
    </button>
  );
}
