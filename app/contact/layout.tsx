import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ | クレーム・お詫びメール神対応変換器",
  description:
    "クレーム・お詫びメール神対応変換器へのお問い合わせフォームです。",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
