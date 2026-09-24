"use client";

import { toJapaneseApiError, toJapaneseAuthError } from "@/lib/auth-errors";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("メールアドレスを入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(toJapaneseApiError(data));
      }
      router.push("/auth/password-reset-notice?sent=1");
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
