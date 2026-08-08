import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/terms", label: "利用規約・免責事項" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/tokushoho", label: "特定商取引法に基づく表記" },
  { href: "/contact", label: "お問い合わせ" },
] as const;

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/40">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <nav
          aria-label="フッターナビゲーション"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-xs text-slate-400 sm:gap-x-4 sm:text-sm"
        >
          {FOOTER_LINKS.map((link, i) => (
            <span key={link.href} className="inline-flex items-center gap-x-3 sm:gap-x-4">
              {i > 0 && (
                <span className="hidden text-slate-700 sm:inline" aria-hidden>
                  |
                </span>
              )}
              <Link
                href={link.href}
                className="transition hover:text-blue-300"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
        <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-600">
          © {new Date().getFullYear()} Smartお詫びコンシェルジュ
          <br className="sm:hidden" />
          <span className="sm:ml-1">
            〜クレーム対応からお詫びメールまで、AIが即座に最適化〜
          </span>
        </p>
      </div>
    </footer>
  );
}
