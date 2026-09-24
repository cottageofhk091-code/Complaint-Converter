"use client";

import { useAuth } from "@/components/AuthProvider";

export default function WelcomeBanner() {
  const { welcomeMessage, clearWelcomeMessage } = useAuth();
  if (!welcomeMessage) return null;

  return (
    <div className="fixed inset-x-0 top-16 z-[70] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex max-w-lg items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/95 px-4 py-3 shadow-xl shadow-black/40">
        <p className="flex-1 text-sm leading-relaxed text-emerald-50">
          {welcomeMessage}
        </p>
        <button
          type="button"
          onClick={clearWelcomeMessage}
          className="shrink-0 text-xs text-emerald-300/80 hover:text-emerald-100"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
