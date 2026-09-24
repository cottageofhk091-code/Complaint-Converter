"use client";

import { useAuth } from "@/components/AuthProvider";
import { toJapaneseAuthError } from "@/lib/auth-errors";
import { supabase } from "@/lib/supabase";
import { FormEvent, useEffect, useState } from "react";

export default function PasswordChangeModal() {
  const { passwordRecoveryOpen, closePasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!passwordRecoveryOpen) {
      setPassword("");
      setPassword2("");
      setError(null);
      setDone(false);
      setSubmitting(false);
    }
  }, [passwordRecoveryOpen]);

  if (!passwordRecoveryOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }
    if (password !== password2) {
      setError("確認用パスワードが一致しません。");
      return;
    }
    if (!supabase) {
      setError("認証サービスが利用できません。");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setDone(true);
      window.setTimeout(() => {
        closePasswordRecovery();
      }, 1800);
    } catch (err) {
      setError(toJapaneseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-change-title"
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6"
      >
        <h2
          id="password-change-title"
          className="text-lg font-bold text-slate-50"
        >
          新しいパスワードを設定
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          新しいパスワードを入力してください。更新後はそのままログイン状態でご利用いただけます。
        </p>

        {done ? (
          <p
            role="status"
            className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200"
          >
            パスワードが正常に変更されました
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-200">
                新しいパスワード（8文字以上）
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                autoComplete="new-password"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-200">
                新しいパスワード（確認用）
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closePasswordRecovery}
                className="flex-1 rounded-xl border border-slate-600 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                閉じる
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {submitting ? "更新中…" : "パスワードを更新する"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
