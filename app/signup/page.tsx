"use client";

import { useAuth } from "@/components/AuthProvider";
import FreeTrialPromoBanner from "@/components/FreeTrialPromoBanner";
import { toJapaneseAuthError } from "@/lib/auth-errors";
import { AGE_GROUP_OPTIONS, REGION_OPTIONS } from "@/lib/survey";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const { signUp, isAuthenticated, supabaseReady, ready } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim() || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上にしてください。");
      return;
    }
    if (!ageGroup || !region) {
      setError("アンケート（年代・地域）は必須です。");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
        ageGroup,
        region,
      });

      if (result.needsEmailConfirmation) {
        setInfo(
          "確認メールを送信しました。メール内のリンクから認証を完了してください。認証完了後、有料プラン1回無料チケットが付与されます。"
        );
      } else {
        router.push("/mypage");
      }
    } catch (err) {
      console.error("[signup] registration failed:", err);
      setError(toJapaneseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (ready && isAuthenticated) {
    return (
      <main className="mx-auto max-w-md px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 text-center">
          <p className="text-sm text-slate-300">すでにログインしています</p>
          <Link
            href="/mypage"
            className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            マイページへ
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
        <div className="mb-5">
          <FreeTrialPromoBanner variant="compact" />
        </div>

        <header className="mb-6 border-b border-slate-700/60 pb-5">
          <p className="mb-2 text-xs font-medium tracking-[0.12em] text-blue-400/80">
            無料会員登録
          </p>
          <h1 className="text-2xl font-bold text-slate-50">新規会員登録</h1>
          <p className="mt-2 text-sm text-slate-400">
            無料会員として登録できます。今なら有料プラン（プレミアム生成）が1回無料でお試しいただけます。サービス改善のため、年代・地域のアンケートにご協力ください。
          </p>
        </header>

        {!supabaseReady && (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Supabase 環境変数が未設定のため、現在登録できません。
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="mb-2 block text-sm text-slate-200">
              お名前（任意）
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              placeholder="山田 太郎"
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-slate-200">
              メールアドレス <span className="text-red-400">*</span>
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
              パスワード（8文字以上） <span className="text-red-400">*</span>
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

          <fieldset className="space-y-4 rounded-xl border border-slate-700/70 bg-slate-950/40 p-4">
            <legend className="px-1 text-sm font-medium text-slate-200">
              アンケート（必須）
            </legend>

            <div>
              <label htmlFor="ageGroup" className="mb-2 block text-sm text-slate-300">
                年代 <span className="text-red-400">*</span>
              </label>
              <select
                id="ageGroup"
                required
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">選択してください</option>
                {AGE_GROUP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="region" className="mb-2 block text-sm text-slate-300">
                地域 <span className="text-red-400">*</span>
              </label>
              <select
                id="region"
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">選択してください</option>
                {REGION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

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
            disabled={submitting || !supabaseReady}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "登録中…" : "無料会員登録する"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
