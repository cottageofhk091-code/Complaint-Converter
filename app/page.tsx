"use client";

import { FormEvent, useState } from "react";

type FaultLevel =
  | "clear_fault"
  | "partial_fault"
  | "unclear"
  | "no_fault"
  | "customer_misunderstanding";

type ResponsePolicy =
  | "full_apology"
  | "apology_with_remedy"
  | "fact_clarification"
  | "firm_refusal"
  | "escalate_legal";

type Tone = "sincere" | "business" | "firm";

interface GenerateResult {
  riskLevel: "高" | "中" | "低";
  riskReason: string;
  subjectSuggestions: string[];
  replyBody: string;
  preventionNotes: string[];
  freePreview: string;
}

const FAULT_OPTIONS: { value: FaultLevel; label: string }[] = [
  { value: "clear_fault", label: "自社に明確な過失あり" },
  { value: "partial_fault", label: "双方に過失の可能性" },
  { value: "unclear", label: "事実関係が未確定" },
  { value: "no_fault", label: "自社に過失なし（主張）" },
  {
    value: "customer_misunderstanding",
    label: "相手の誤解・事実誤認の可能性",
  },
];

const POLICY_OPTIONS: { value: ResponsePolicy; label: string }[] = [
  { value: "full_apology", label: "全面的なお詫び" },
  { value: "apology_with_remedy", label: "お詫び＋是正・補償提案" },
  { value: "fact_clarification", label: "事実確認・説明を優先" },
  { value: "firm_refusal", label: "不当要求への毅然とした拒否" },
  { value: "escalate_legal", label: "法務・専門家へのエスカレーション" },
];

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  {
    value: "sincere",
    label: "最上級の誠意",
    desc: "最大限の配慮と丁寧さ",
  },
  {
    value: "business",
    label: "標準ビジネス",
    desc: "落ち着いた実務トーン",
  },
  {
    value: "firm",
    label: "毅然・法的防衛",
    desc: "事実と境界線を明確に",
  },
];

function riskStyles(level: GenerateResult["riskLevel"]) {
  switch (level) {
    case "高":
      return {
        badge: "bg-red-500/20 text-red-400 border-red-500/40",
        bar: "bg-red-500",
        width: "w-full",
      };
    case "中":
      return {
        badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
        bar: "bg-amber-500",
        width: "w-2/3",
      };
    default:
      return {
        badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
        bar: "bg-emerald-500",
        width: "w-1/3",
      };
  }
}

export default function Home() {
  const [content, setContent] = useState("");
  const [faultLevel, setFaultLevel] = useState<FaultLevel>("unclear");
  const [responsePolicy, setResponsePolicy] =
    useState<ResponsePolicy>("fact_clarification");
  const [tone, setTone] = useState<Tone>("business");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, faultLevel, responsePolicy, tone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "生成に失敗しました。");
      }
      setResult(data as GenerateResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーです。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 text-center animate-fade-up">
        <p className="mb-3 text-xs font-medium tracking-[0.2em] text-blue-400/80 uppercase">
          Crisis Mail Assistant
        </p>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-50 sm:text-3xl">
          クレーム・お詫びメール
          <br className="sm:hidden" />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            神対応変換器
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          状況を入力するだけで、過失認定リスクと炎上を抑えた返信メール案を生成します。
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-7 animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >
        <div>
          <label
            htmlFor="content"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            状況 / メール本文
          </label>
          <textarea
            id="content"
            required
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="お客様からのクレーム内容、経緯、現時点で分かっている事実などを記入してください…"
            className="w-full resize-y rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="fault"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              自社の過失状況
            </label>
            <select
              id="fault"
              value={faultLevel}
              onChange={(e) => setFaultLevel(e.target.value as FaultLevel)}
              className="w-full appearance-none rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            >
              {FAULT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="policy"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              希望する対応方針
            </label>
            <select
              id="policy"
              value={responsePolicy}
              onChange={(e) =>
                setResponsePolicy(e.target.value as ResponsePolicy)
              }
              className="w-full appearance-none rounded-xl border border-slate-600/80 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            >
              {POLICY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-200">トーン選択</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {TONE_OPTIONS.map((opt) => {
              const active = tone === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTone(opt.value)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-blue-500 bg-blue-500/15 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                      : "border-slate-600/80 bg-slate-950/40 hover:border-slate-500"
                  }`}
                >
                  <span
                    className={`block text-sm font-medium ${
                      active ? "text-blue-300" : "text-slate-200"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="animate-pulse-glow flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              神対応を生成中…
            </>
          ) : (
            "神対応メールを生成する"
          )}
        </button>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </form>

      {result && (
        <section className="mt-8 space-y-5 animate-fade-up">
          {/* Risk */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-slate-300">
                炎上危険度
              </h2>
              <span
                className={`rounded-full border px-3 py-1 text-sm font-bold ${
                  riskStyles(result.riskLevel).badge
                }`}
              >
                {result.riskLevel}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all ${
                  riskStyles(result.riskLevel).bar
                } ${riskStyles(result.riskLevel).width}`}
              />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {result.riskReason}
            </p>
          </div>

          {/* Subjects */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 sm:p-6">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-300">
              推奨件名案
            </h2>
            <ol className="space-y-2">
              {result.subjectSuggestions.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200"
                >
                  <span className="shrink-0 font-mono text-xs text-blue-400">
                    {i + 1}.
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Reply body with blur + PRO banner */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 sm:p-6">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-300">
              返信本文
            </h2>

            <div className="relative">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                {result.freePreview}
              </p>

              <div className="relative mt-3 max-h-48 overflow-hidden">
                <p
                  className="select-none whitespace-pre-wrap text-sm leading-relaxed text-slate-300 blur-[6px]"
                  aria-hidden
                >
                  {result.replyBody}
                </p>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/40 to-slate-900/95" />
              </div>

              <div className="relative z-10 -mt-6 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-slate-950 p-5 text-center shadow-lg shadow-amber-900/20">
                <p className="text-xs font-medium tracking-wider text-amber-400/90 uppercase">
                  PRO PLAN
                </p>
                <p className="mt-1 text-lg font-bold text-slate-50">
                  全文ロック解除 —{" "}
                  <span className="text-amber-300">月額 980円</span>
                </p>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
                  ぼかし部分を含む完全な返信本文・コピー機能・履歴保存は PRO
                  プランでご利用いただけます。
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:from-amber-400 hover:to-yellow-400"
                  onClick={() =>
                    alert(
                      "デモ版です。実際の課金導線は決済連携後に有効化されます。"
                    )
                  }
                >
                  PROプランで全文を見る
                </button>
              </div>
            </div>
          </div>

          {/* Prevention notes */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 sm:p-6">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-300">
              二次炎上防止メモ
            </h2>
            <ul className="space-y-2">
              {result.preventionNotes.map((note, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-sm leading-relaxed text-slate-300"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  {note}
                </li>
              ))}
            </ul>
          </div>

          <p className="pb-8 text-center text-xs text-slate-600">
            ※ 本ツールの出力は参考案です。法的判断・最終文面は専門家・社内規程に従ってください。
          </p>
        </section>
      )}
    </main>
  );
}
