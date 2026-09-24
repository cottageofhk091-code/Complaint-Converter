"use client";

export default function EmailConfirmedPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-14 sm:px-6">
      <div className="w-full rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-6 text-center shadow-2xl shadow-emerald-950/30 sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-2xl text-emerald-300">
          ✓
        </div>
        <h1 className="text-xl font-bold text-slate-50 sm:text-2xl">
          認証が完了しました
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          元の画面（タブ）に戻ってお続けください。
        </p>
        <p className="mt-3 text-xs text-slate-500">
          このタブはそのまま閉じて構いません。
        </p>
      </div>
    </main>
  );
}
