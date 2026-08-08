import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン",
  description: "Smartお詫びコンシェルジュへのログイン",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
