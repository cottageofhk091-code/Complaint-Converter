import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "クレーム・お詫びメール神対応変換器",
  description:
    "クレーム状況を入力するだけで、炎上リスクを抑えたお詫び・返信メールを自動生成します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
