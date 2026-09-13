"use client";

import {
  getCheckoutSessionIdFromSearch,
  hasCheckoutReturnQuery,
  LAST_RESULT_STORAGE_KEY,
} from "@/lib/pro";
import {
  formatProCtaLabel,
  formatProPriceShort,
  formatProUnlockHeadline,
} from "@/lib/pricing";
import { startStripeCheckout } from "@/lib/start-checkout";
import FreeTrialPromoBanner from "@/components/FreeTrialPromoBanner";
import PricingModal from "@/components/PricingModal";
import { useAuth } from "@/components/AuthProvider";
import { FormEvent, useEffect, useRef, useState } from "react";

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
  isPro?: boolean;
  paywalled?: boolean;
}

/** 非 PRO 時のぼかし装飾用（実本文はサーバーから返らない） */
const LOCKED_BODY_PLACEHOLDER = [
  "（PROプランで全文が表示されます）",
  "お客様への返信本文は、決済完了後にサーバー側でロック解除されます。",
  "プレビュー以外の文面は API 応答に含まれません。",
  "安全な Stripe Checkout 決済のあと、同じ条件で再生成すると全文をご利用いただけます。",
  "本プレースホルダーはダミー文言です。実際のお詫び文は含まれていません。",
].join("\n\n");


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

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CopyButton({
  text,
  label = "コピー",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("クリップボードへのコピーに失敗しました。");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "コピーしました" : label}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
        copied
          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
          : "border-slate-600/80 bg-slate-950/60 text-slate-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300"
      } ${className}`}
    >
      {copied ? (
        <>
          <CheckIcon className="h-3.5 w-3.5" />
          コピーしました！
        </>
      ) : (
        <>
          <CopyIcon className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </button>
  );
}

export default function Home() {
  const { user, isAuthenticated, isProUnlocked, proSessionId, activateProFromCheckout , refreshProfile} = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [content, setContent] = useState("");
  const [faultLevel, setFaultLevel] = useState<FaultLevel>("unclear");
  const [responsePolicy, setResponsePolicy] =
    useState<ResponsePolicy>("fact_clarification");
  const [tone, setTone] = useState<Tone>("business");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [showUnlockToast, setShowUnlockToast] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const unlockToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 決済完了・キャンセルの通知（dashboard / pricing からの戻り含む）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setStatusToast("お支払いが完了しました。PROプランが利用可能です。");
      window.history.replaceState({}, "", window.location.pathname);
      const t = window.setTimeout(() => setStatusToast(null), 5000);
      return () => window.clearTimeout(t);
    }
    if (params.get("canceled") === "true") {
      setStatusToast("決済がキャンセルされました。いつでも再開できます。");
      window.history.replaceState({}, "", window.location.pathname);
      const t = window.setTimeout(() => setStatusToast(null), 5000);
      return () => window.clearTimeout(t);
    }
  }, []);

  // 決済戻りクエリ処理 + 生成結果の復元（検証成功時のみ PRO）
  useEffect(() => {
    const search = window.location.search;
    const fromCheckout = hasCheckoutReturnQuery(search);
    const sessionId = getCheckoutSessionIdFromSearch(search);

    async function handlePaymentReturn() {
      if (!fromCheckout && !sessionId) return;

      if (!sessionId) {
        // unlocked=true だけで session_id が無い戻りは無効
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      try {
        const res = await fetch("/api/stripe/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            email: user?.email || undefined,
          }),
        });
        const data = (await res.json()) as {
          unlocked?: boolean;
          email?: string | null;
          sessionId?: string | null;
        };

        if (data.unlocked && (data.sessionId || sessionId)) {
          activateProFromCheckout({
            sessionId: data.sessionId || sessionId,
            email: data.email,
          });
          setShowUnlockToast(true);
          unlockToastTimer.current = setTimeout(
            () => setShowUnlockToast(false),
            4000
          );
        } else {
          alert(
            "決済の確認ができませんでした。反映まで数分かかる場合があります。ページを再読み込みするか、サポートへお問い合わせください。"
          );
        }
      } catch (err) {
        console.error("[verify session]", err);
        alert("決済の検証中にエラーが発生しました。しばらくしてから再試行してください。");
      }

      window.history.replaceState({}, "", window.location.pathname);
    }

    void handlePaymentReturn();

    try {
      const saved = sessionStorage.getItem(LAST_RESULT_STORAGE_KEY);
      if (saved) {
        setResult(JSON.parse(saved) as GenerateResult);
      }
    } catch {
      // ignore
    }

    return () => {
      if (unlockToastTimer.current) clearTimeout(unlockToastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初回の決済戻り処理のみ
  }, []);

  // 生成結果を決済リダイレクト前後で保持
  useEffect(() => {
    if (!result) return;
    try {
      sessionStorage.setItem(LAST_RESULT_STORAGE_KEY, JSON.stringify(result));
    } catch {
      // ignore
    }
  }, [result]);

  async function handleUnlockClick() {
    if (result) {
      try {
        sessionStorage.setItem(LAST_RESULT_STORAGE_KEY, JSON.stringify(result));
      } catch {
        // ignore
      }
    }

    setCheckoutLoading(true);
    try {
      await startStripeCheckout({ email: user?.email });
    } catch (err) {
      console.error("[checkout]", err);
      const message =
        err instanceof Error ? err.message : "決済の開始に失敗しました。";
      alert(message);
      setCheckoutLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          faultLevel,
          responsePolicy,
          tone,
          checkoutSessionId: proSessionId || undefined,
          isRegistered: isAuthenticated,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "生成に失敗しました。");
      }
      setResult(data as GenerateResult);
      if (data.usedFreeTrial) {
        await refreshProfile();
      }
      if (
        data.paywalled &&
        isAuthenticated &&
        !isProUnlocked &&
        !((user?.freeTrialCredits ?? 0) > 0)
      ) {
        setUpgradeOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーです。");
    } finally {
      setLoading(false);
    }
  }

  const showFullBody = Boolean(result?.isPro && result.replyBody);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      {showUnlockToast && (
        <div
          role="status"
          className="fixed top-4 right-4 left-4 z-50 mx-auto max-w-sm animate-fade-up rounded-xl border border-emerald-500/40 bg-slate-900/95 px-4 py-3 text-center shadow-lg shadow-black/40 backdrop-blur sm:left-auto"
        >
          <p className="text-sm font-medium text-emerald-300">
            PRO版のロックを解除しました
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            もう一度生成すると全文・コピーが利用できます
          </p>
        </div>
      )}

      {statusToast && (
        <div
          role="status"
          className="fixed top-4 right-4 left-4 z-50 mx-auto max-w-sm animate-fade-up rounded-xl border border-blue-500/40 bg-slate-900/95 px-4 py-3 text-center shadow-lg shadow-black/40 backdrop-blur sm:left-auto"
        >
          <p className="text-sm font-medium text-slate-100">{statusToast}</p>
        </div>
      )}

      <header className="mb-10 text-center animate-fade-up">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <p className="text-xs font-medium tracking-[0.15em] text-blue-400/80">
            Smart Concierge
          </p>
          {isProUnlocked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              PRO版利用中（ロック解除済み）
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-50 sm:text-3xl">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Smartお詫びコンシェルジュ
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          〜クレーム対応からお詫びメールまで、AIが即座に最適化〜
        </p>
      </header>

      {!isAuthenticated && (
        <div className="mb-8 animate-fade-up">
          <FreeTrialPromoBanner variant="hero" showCta />
        </div>
      )}

      {isAuthenticated &&
        !isProUnlocked &&
        (user?.freeTrialCredits ?? 0) > 0 && (
          <div className="mb-6 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <span className="font-semibold text-emerald-300">初回無料体験適用中</span>
            <span className="mt-0.5 block text-emerald-100/85">
              プレミアム生成（全文表示）があと {user?.freeTrialCredits} 回まで無料です。
            </span>
          </div>
        )}

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
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-slate-300">
                推奨件名案
              </h2>
              <CopyButton
                text={result.subjectSuggestions.join("\n")}
                label="すべてコピー"
              />
            </div>
            <ol className="space-y-2">
              {result.subjectSuggestions.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200"
                >
                  <span className="mt-0.5 shrink-0 font-mono text-xs text-blue-400">
                    {i + 1}.
                  </span>
                  <span className="min-w-0 flex-1 leading-relaxed">{s}</span>
                  <CopyButton text={s} className="mt-0.5" />
                </li>
              ))}
            </ol>
          </div>

          {/* Reply body — locked preview or full PRO body */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-slate-300">
                返信本文
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {showFullBody ? "（全文・PRO）" : "（無料プレビュー）"}
                </span>
              </h2>
              <CopyButton
                text={showFullBody ? result.replyBody : result.freePreview}
                label={showFullBody ? "全文をコピー" : "プレビューをコピー"}
              />
            </div>

            {showFullBody ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  PRO版利用中（ロック解除済み）— フル本文を表示しています
                </div>
                <div className="rounded-lg border border-slate-700/40 bg-slate-950/30 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                    {result.replyBody}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="rounded-lg border border-slate-700/40 bg-slate-950/30 p-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                    {result.freePreview}
                  </p>
                </div>

                <div className="relative mt-3 max-h-48 overflow-hidden">
                  <p
                    className="select-none whitespace-pre-wrap text-sm leading-relaxed text-slate-300 blur-[6px]"
                    aria-hidden
                  >
                    {LOCKED_BODY_PLACEHOLDER}
                  </p>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/40 to-slate-900/95" />
                </div>

                <div className="relative z-10 -mt-6 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-slate-950 p-5 text-center shadow-lg shadow-amber-900/20">
                  <p className="text-xs font-medium tracking-wider text-amber-400/90 uppercase">
                    PRO PLAN — LOCKED
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-50">
                    {formatProUnlockHeadline()} —{" "}
                    <span className="text-amber-300">{formatProPriceShort()}</span>
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
                    ぼかし部分を含む完全な返信本文の表示・コピーは PRO
                    プランでご利用いただけます。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        isAuthenticated &&
                        !isProUnlocked &&
                        (user?.freeTrialCredits ?? 0) <= 0
                      ) {
                        setUpgradeOpen(true);
                        return;
                      }
                      void handleUnlockClick();
                    }}
                    disabled={checkoutLoading}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:from-amber-400 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkoutLoading
                      ? "決済ページへ移動中…"
                      : formatProCtaLabel()}
                  </button>
                  <p className="mt-3 text-[11px] text-slate-500">
                    Stripe Checkout で安全に決済できます。完了後に全文ロックが解除されます。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Prevention notes */}
          {result.preventionNotes.length > 0 && (
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
          )}

          <p className="pb-4 text-center text-xs text-slate-600">
            ※ 本ツールの出力は参考案です。法的判断・最終文面は専門家・社内規程に従ってください。
          </p>
        </section>
      )}
          <PricingModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </main>
  );
}
