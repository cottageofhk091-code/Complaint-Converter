"use client";

import { useEffect, useState } from "react";

/** 生成中のプログレスバー＋スピナー */
export default function GenerateProgress({ active }: { active: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setProgress(8);
      const started = Date.now();
      const timer = window.setInterval(() => {
        const elapsed = Date.now() - started;
        const target = Math.min(92, 8 + (elapsed / 25000) * 84);
        setProgress((prev) => Math.min(92, Math.max(prev, prev + (target - prev) * 0.2)));
      }, 120);
      return () => window.clearInterval(timer);
    }

    if (visible) {
      setProgress(100);
      const t = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 450);
      return () => window.clearTimeout(t);
    }
  }, [active, visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={active}
      className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          {active && (
            <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
          )}
          <span
            className={`inline-block h-5 w-5 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 ${
              active ? "animate-spin" : ""
            }`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-100">
            {active ? "神対応メールを生成しています…" : "生成が完了しました"}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {active
              ? "状況を分析し、お詫び文を最適化しています"
              : "結果を表示します"}
          </p>
        </div>
        <span className="shrink-0 tabular-nums text-xs font-semibold text-cyan-300">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300 transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
