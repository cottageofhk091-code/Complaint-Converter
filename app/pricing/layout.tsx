import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "有料プラン・料金 | Smartお詫びコンシェルジュ",
  description:
    "Smartお詫びコンシェルジュの有料プラン（PRO）料金とお申し込み。Stripe Checkoutで安全に決済できます。",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
