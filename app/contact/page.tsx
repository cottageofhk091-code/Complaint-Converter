"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const INITIAL: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const inputClassName =
  "w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // デモ：バックエンド未接続のためクライアント側で受付完了を表示
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/50 p-8 text-center shadow-xl shadow-black/20">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <path
                d="M20 6 9 17l-5-5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-50">
            お問い合わせを受け付けました
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            ご連絡ありがとうございます。内容を確認のうえ、必要に応じてご登録のメールアドレスへご返信します。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setForm(INITIAL);
              }}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            >
              別の内容を送る
            </button>
            <Link
              href="/"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              トップページへ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-blue-300"
        >
          <span aria-hidden>←</span>
          トップページへ戻る
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-8">
        <header className="mb-8 border-b border-slate-700/60 pb-6">
          <p className="mb-2 text-xs font-medium tracking-[0.15em] text-blue-400/80 uppercase">
            Contact
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            お問い合わせ
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            サービスに関するご質問・ご要望・不具合報告などお気軽にご連絡ください。
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="お名前" htmlFor="name" required>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputClassName}
              placeholder="山田 太郎"
              autoComplete="name"
            />
          </Field>

          <Field label="メールアドレス" htmlFor="email" required>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputClassName}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>

          <Field label="件名" htmlFor="subject" required>
            <input
              id="subject"
              required
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              className={inputClassName}
              placeholder="例：PROプランについて"
            />
          </Field>

          <Field label="お問い合わせ内容" htmlFor="message" required>
            <textarea
              id="message"
              required
              rows={7}
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              className={`${inputClassName} resize-y`}
              placeholder="具体的な内容をご記入ください"
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "送信中…" : "送信する"}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-blue-300"
        >
          <span aria-hidden>←</span>
          トップページへ戻る
        </Link>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}
