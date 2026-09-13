"use client";

import { toJapaneseAuthError } from "@/lib/auth-errors";
import { getPasswordRecoveryRedirectTo } from "@/lib/auth-redirects";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!isSupabaseConfigured() || !supabase) {
      setError("Supabase が未設定です。");
      return;
    }
    if (!email.trim()) {
      setError("メールアドレスを入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      // redirectTo は Dashboard の Redirect URLs に /auth/callback を登録すること。
      // 日本語メール件名・本文は Dashboard の Recovery テンプレ側。
      // token_hash テンプレでも ConfirmationURL フォールバックでも、
      // type=recovery 付き callback へ揃える。
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: getPasswordRecoveryRedirectTo(window.location.origin),
        }
      );
      if (resetError) throw resetError;
      setInfo(
        "パスワード再設定用のメールを送信しました。メール内のリンクから手続きを続けてください。"
      );
    } catch (err) {
      setError(toJapaneseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-blue-300"
        >
          <span aria-hidden>←</span>
          ログインへ戻る
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 sm:p-7">
        <p className="mb-2 text-xs font-medium tracking-[0.12em] text-blue-400/80">
          パスワード再設定
        </p>
        <h1 className="text-2xl font-bold text-slate-50">パスワードをお忘れの方</h1>
        <p className="mt-2 text-sm text-slate-400">
          登録済みのメールアドレス宛に、再設定用のリンクを送信します。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              autoComplete="email"
              placeholder="you@example.com"
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
            {submitting ? "送信中…" : "再設定メールを送る"}
          </button>
        </form>
      </div>
    </main>
  );
}
