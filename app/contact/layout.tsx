import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "Smartお詫びコンシェルジュへのお問い合わせフォームです。",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
