import Link from "next/link";

export default function LegalPageShell({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
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

      <article className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-8">
        <header className="mb-8 border-b border-slate-700/60 pb-6">
          <p className="mb-2 text-xs font-medium tracking-[0.15em] text-blue-400/80 uppercase">
            Legal
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            {title}
          </h1>
          {updatedAt && (
            <p className="mt-2 text-xs text-slate-500">最終更新日：{updatedAt}</p>
          )}
        </header>

        <div className="legal-prose space-y-8 text-sm leading-relaxed text-slate-300">
          {children}
        </div>
      </article>

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

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
