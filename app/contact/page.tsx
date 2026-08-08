"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

const inputClassName =
  "w-full rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function postContact(payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    console.log("[contact] sending request...", payload);

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    let data: { error?: string; ok?: boolean; notified?: boolean } = {};
    try {
      data = (await res.json()) as typeof data;
    } catch {
      data = {};
    }

    console.log("[contact] response received", {
      status: res.status,
      ok: res.ok,
      data,
    });

    if (!res.ok) {
      throw new Error(data.error || `送信に失敗しました（HTTP ${res.status}）`);
    }

    return data;
  }

  function handleButtonClick() {
    console.log("[contact] button click");
    void (async () => {
      if (sendingRef.current) {
        console.log("[contact] skip: already sending");
        return;
      }

      console.log("[contact] submit start");

      const formEl = formRef.current;
      const fd = formEl ? new FormData(formEl) : null;
      const payload = {
        name: String(fd?.get("name") ?? "").trim(),
        email: String(fd?.get("email") ?? "").trim(),
        subject: String(fd?.get("subject") ?? "").trim(),
        message: String(fd?.get("message") ?? "").trim(),
      };

      console.log("[contact] form values collected", {
        hasName: !!payload.name,
        hasEmail: !!payload.email,
        hasSubject: !!payload.subject,
        messageLength: payload.message.length,
      });

      sendingRef.current = true;
      setSubmitting(true);
      setError(null);

      try {
        await postContact(payload);
        console.log("[contact] success");
        setSubmitted(true);
        formEl?.reset();
      } catch (err) {
        console.log("[contact] failed", err);
        setError(
          err instanceof Error ? err.message : "送信中にエラーが発生しました。"
        );
      } finally {
        sendingRef.current = false;
        setSubmitting(false);
        console.log("[contact] submit end");
      }
    })();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // Enter キー送信も同じ経路へ
    e.preventDefault();
    e.stopPropagation();
    console.log("[contact] form onSubmit -> button path");
    handleButtonClick();
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
                setError(null);
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

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="contact-name"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              お名前
            </label>
            <input
              id="contact-name"
              name="name"
              className={inputClassName}
              placeholder="山田 太郎"
              autoComplete="name"
            />
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              メールアドレス
              <span className="ml-1 text-red-400">*</span>
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              className={inputClassName}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="contact-subject"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              件名
              <span className="ml-1 text-red-400">*</span>
            </label>
            <input
              id="contact-subject"
              name="subject"
              className={inputClassName}
              placeholder="例：PROプランについて"
            />
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              お問い合わせ内容
              <span className="ml-1 text-red-400">*</span>
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={7}
              className={`${inputClassName} resize-y`}
              placeholder="具体的な内容をご記入ください"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={submitting}
            onClick={handleButtonClick}
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
