"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

/**
 * 決済完了の受け皿。
 * Stripe success_url → ここで session を検証し PRO を有効化してトップへ誘導する。
 */
function DashboardPaymentHandler() {
  const { user, activateProFromCheckout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "verifying" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id")?.trim();

    if (payment !== "success" || !sessionId) {
      setStatus("idle");
      return;
    }

    let cancelled = false;

    async function verify() {
      setStatus("verifying");
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
          error?: string;
        };

        if (cancelled) return;

        if (data.unlocked && (data.sessionId || sessionId)) {
          activateProFromCheckout({
            sessionId: data.sessionId || sessionId!,
            email: data.email,
          });
          setStatus("ok");
          setMessage("お支払いが完了しました。PROプランが利用可能です。");
          window.setTimeout(() => {
            router.replace("/?payment=success");
          }, 1200);
        } else {
          setStatus("error");
          setMessage(
            data.error ||
              "決済の確認ができませんでした。反映まで数分かかる場合があります。"
          );
        }
      } catch (err) {
        console.error("[dashboard payment]", err);
        if (!cancelled) {
          setStatus("error");
          setMessage(
            "決済の検証中にエラーが発生しました。しばらくしてからトップページを再読み込みしてください。"
          );
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [searchParams, user?.email, activateProFromCheckout, router]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-14 sm:px-6">
      <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 text-center shadow-xl sm:p-8">
        <p className="text-xs font-medium tracking-[0.12em] text-blue-400/80">
          ダッシュボード
        </p>
        <h1 className="mt-2 text-xl font-bold text-slate-50">お支払い状況</h1>

        {status === "idle" && (
          <p className="mt-4 text-sm text-slate-400">
            Smartお詫びコンシェルジュの利用状況を確認できます。
          </p>
        )}
        {status === "verifying" && (
          <p className="mt-6 text-sm text-slate-300">決済内容を確認しています…</p>
        )}
        {status === "ok" && (
          <p className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {message}
          </p>
        )}
        {status === "error" && (
          <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {message}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-2">
          <Link
            href="/"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            トップへ進む
          </Link>
          <Link
            href="/mypage"
            className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            マイページ
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[50vh] max-w-md items-center px-4 py-14">
          <div className="h-40 w-full animate-pulse rounded-2xl bg-slate-800/60" />
        </main>
      }
    >
      <DashboardPaymentHandler />
    </Suspense>
  );
}
