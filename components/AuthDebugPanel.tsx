"use client";

import { useAuth } from "@/components/AuthProvider";
import { useState } from "react";

const IS_DEV = process.env.NODE_ENV === "development";

const btnClass =
  "w-full rounded-lg border border-slate-600/80 bg-slate-900/90 px-2.5 py-2 text-left text-[11px] font-medium text-slate-200 transition hover:border-violet-500/50 hover:bg-violet-900/30";

export default function AuthDebugPanel() {
  const { user, isProUnlocked, loginAs, logout, setProUnlocked, ready } =
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
                {isProUnlocked ? "解除中" : "ロック中"}
              </span>
            </p>
          </div>

          <div className="grid gap-1.5">
            <button
              type="button"
              className={btnClass}
              onClick={() => {
                // 無料・ロック状態へ即時切替
                if (user) {
                  loginAs("free");
                }
                setProUnlocked(false);
              }}
            >
              🔒 無料状態にする（ロック）
            </button>
            <button
              type="button"
              className={btnClass}
              onClick={() => {
                // 有料・解除状態へ即時切替（未ログインなら PRO でログイン）
                loginAs("pro");
                setProUnlocked(true);
              }}
            >
              🔓 有料状態にする（解除）
            </button>
            <button
              type="button"
              className={`${btnClass} border-red-500/40 text-red-300 hover:bg-red-500/10`}
              onClick={() => {
                logout();
              }}
            >
              🚪 ログアウト
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
