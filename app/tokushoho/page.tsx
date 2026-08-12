import type { Metadata } from "next";
import LegalPageShell, { LegalSection } from "@/components/LegalPageShell";
import { formatTokushohoPriceLine } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: "Smartお詫びコンシェルジュの特定商取引法に基づく表記です。",
};

const SELLER = {
  name: "Nomad Flow Lab",
  operator: "Hiroki matsushita",
  email: "support@example.com",
  address: "請求があった場合に遅滞なく開示します",
  phone: "請求があった場合に遅滞なく開示します",
} as const;

export default function TokushohoPage() {
  return (
    <LegalPageShell
      title="特定商取引法に基づく表記"
      updatedAt="2026年8月5日"
    >
      <div className="overflow-x-auto rounded-xl border border-slate-700/60">
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
          <tbody className="divide-y divide-slate-700/60">
            <TokushoRow label="販売事業者">
              {SELLER.name}
              <br />
              運営責任者：{SELLER.operator}
            </TokushoRow>
            <TokushoRow label="所在地">{SELLER.address}</TokushoRow>
            <TokushoRow label="電話番号">{SELLER.phone}</TokushoRow>
            <TokushoRow label="メールアドレス">
              <a
                href={`mailto:${SELLER.email}`}
                className="text-blue-400 hover:underline"
              >
                {SELLER.email}
              </a>
              <br />
              <span className="text-xs text-slate-500">
                ※お問い合わせは
                <a href="/contact" className="text-blue-400 hover:underline">
                  フォーム
                </a>
                もご利用ください
              </span>
            </TokushoRow>
            <TokushoRow label="販売価格">
              {formatTokushohoPriceLine()}
              <br />
              <span className="text-xs text-slate-500">
                ※無料機能の範囲はトップページの表示に従います。価格改定時は事前に告知します。
              </span>
            </TokushoRow>
            <TokushoRow label="支払方法">
              クレジットカード決済（Stripe）
            </TokushoRow>
            <TokushoRow label="支払時期">
              申込時に決済手続きが完了した時点
            </TokushoRow>
            <TokushoRow label="役務の提供時期">
              決済完了後、即時にPRO機能をご利用いただけます
            </TokushoRow>
            <TokushoRow label="商品以外の必要料金">
              インターネット接続料金、通信費等はお客様負担となります
            </TokushoRow>
            <TokushoRow label="キャンセル・返金">
              本サービスはデジタルコンテンツ／オンライン役務であり、決済完了後のお客様都合によるキャンセル・返金は原則お受けできません。法令上認められる場合、または当方の責めに帰すべき事由がある場合はこの限りではありません。
            </TokushoRow>
            <TokushoRow label="動作環境">
              最新の主要ブラウザ（Chrome / Edge / Safari / Firefox
              等）および安定したインターネット接続
            </TokushoRow>
          </tbody>
        </table>
      </div>

      <LegalSection title="補足">
        <p>
          所在地・電話番号等は、請求があった場合に遅滞なく開示します。ご不明点は
          <a href="/contact" className="text-blue-400 hover:underline">
            お問い合わせ
          </a>
          までご連絡ください。
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}

function TokushoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="align-top">
      <th className="w-36 bg-slate-950/50 px-3 py-3 font-medium text-slate-200 sm:w-48 sm:px-4">
        {label}
      </th>
      <td className="px-3 py-3 text-slate-300 sm:px-4">{children}</td>
    </tr>
  );
}
