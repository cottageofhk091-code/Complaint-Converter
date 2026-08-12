"use client";

import { useAuth } from "@/components/AuthProvider";
import { useState } from "react";

const IS_DEV = process.env.NODE_ENV === "development";

const btnClass =
  "w-full rounded-lg border border-slate-600/80 bg-slate-900/90 px-2.5 py-2 text-left text-[11px] font-medium text-slate-200 transition hover:border-violet-500/50 hover:bg-violet-900/30";

export default function AuthDebugPanel() {
  const { user, isProUnlocked, proSessionId, logout, clearProAccess, ready } =
    useAuth();
  const [open, setOpen] = useState(true);

  if (!IS_DEV || !ready) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-xl border border-violet-500/40 bg-slate-950/95 p-3 shadow-2xl shadow-black/50 backdrop-blur">
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-violet-300 uppercase">
            Debug Panel (dev only)
          </p>
          <div className="mb-3 rounded-lg border border-slate-700/60 bg-slate-900/80 px-2.5 py-2 text-[11px] text-slate-300">
            <p>
              認証:{" "}
              <span className="font-medium text-slate-100">
                {user ? "ログイン中" : "未ログイン"}
              </span>
            </p>
            {user && (
              <p className="mt-0.5 truncate text-slate-400">
                {user.name} / {user.plan}
              </p>
            )}
            <p className="mt-1">
              有料機能:{" "}
              <span
                className={
                  isProUnlocked ? "font-medium text-emerald-400" : "text-slate-400"
                }
              >
                {isProUnlocked ? "Session 保持中" : "ロック中"}
              </span>
            </p>
            {proSessionId && (
              <p className="mt-1 truncate font-mono text-[10px] text-slate-500">
                {proSessionId}
              </p>
            )}
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
              偽の PRO 解除は不可。全文はサーバーが Session
              を検証した場合のみ返します。
            </p>
          </div>

          <div className="grid gap-1.5">
            <button
              type="button"
              className={btnClass}
              onClick={() => {
                clearProAccess();
              }}
            >
              ロックする（Session 破棄）
            </button>
            <button
              type="button"
              className={`${btnClass} border-red-500/40 text-red-300 hover:bg-red-500/10`}
              onClick={() => {
                logout();
              }}
            >
              ログアウト
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-violet-500/50 bg-violet-600/90 px-3 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-violet-500"
        aria-expanded={open}
      >
        {open ? "Debug ×" : "Debug"}
      </button>
    </div>
  );
}
