import type { Metadata } from "next";
import LegalPageShell, { LegalSection } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "Smartお詫びコンシェルジュのプライバシーポリシーです。",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="プライバシーポリシー" updatedAt="2026年9月15日">
      <LegalSection title="1. 基本方針">
        <p>
          「Smartお詫びコンシェルジュ」（以下「本サービス」）の運営者（以下「当方」）は、利用者の個人情報および入力データの取扱いについて、本プライバシーポリシーに従い適切に保護します。
        </p>
      </LegalSection>

      <LegalSection title="2. 取得する情報">
        <p>当方は、本サービスの提供にあたり、以下の情報を取得することがあります。</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-slate-200">入力本文・設定情報</strong>
            ：状況説明、メール本文、過失状況、対応方針、トーン選択等、生成のために送信される内容
          </li>
          <li>
            <strong className="font-medium text-slate-200">生成履歴データ</strong>
            ：有料プラン（PRO）機能として提供するマイページ保存機能のため、生成されたお詫び文章、推奨件名案、二次炎上防止メモ等の最新5件のデータ
          </li>
          <li>
            <strong className="font-medium text-slate-200">利用ログ</strong>
            ：アクセス日時、IPアドレス、ブラウザ情報、エラーログ、生成リクエストのメタデータ等
          </li>
          <li>
            <strong className="font-medium text-slate-200">お問い合わせ情報</strong>
            ：氏名、メールアドレス、件名、お問い合わせ内容
          </li>
          <li>
            <strong className="font-medium text-slate-200">決済関連情報</strong>
            ：有料プラン（PRO等）申込時の決済ステータス、顧客ID等。クレジットカード番号等の機密情報は決済事業者（Stripe等）が直接取り扱い、当方では保持しません
          </li>
          <li>
            Cookie等の端末識別情報（セキュリティ・利便性向上のため）
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 利用目的">
        <ul className="list-disc space-y-2 pl-5">
          <li>本サービスの提供、維持、改善（返信メール案の生成を含む）</li>
          <li>マイページにおける生成履歴（最大5件）の保管および表示機能の提供</li>
          <li>
            AI精度向上のための匿名化・統計的分析（個人を特定できない形での利用）
          </li>
          <li>お問い合わせ・サポート対応</li>
          <li>不正利用の防止、セキュリティ確保、障害対応</li>
          <li>有料プランの課金・契約管理、重要なお知らせの送付</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. 第三者提供・外部サービスへの送信">
        <p>
          当方は、法令に基づく場合や本人の同意がある場合を除き、個人情報を第三者に販売・提供しません。ただし、サービス提供のため以下の外部サービスに必要なデータを送信することがあります。
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-slate-200">Google Gemini API</strong>
            ：メール生成処理のため、入力本文およびプロンプトに含まれる情報が Google
            の Generative AI / Gemini API に送信されます。取扱いは Google
            の利用規約・プライバシーポリシーに従います。機密性の高い情報や個人を特定しうる情報の入力は、利用者ご自身の判断と責任において行ってください。
          </li>
          <li>
            <strong className="font-medium text-slate-200">Stripe（予定）</strong>
            ：有料プランの決済処理のため
          </li>
          <li>ホスティング・インフラ提供事業者（サーバーログの保管等）</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. 保管・安全管理">
        <p>
          当方は、取得した情報の漏えい、滅失、毀損の防止のため、合理的な安全管理措置を講じます。保存期間は利用目的の達成に必要な期間とし、不要となった情報は適切に削除または匿名化します。
        </p>
      </LegalSection>

      <LegalSection title="6. 開示・訂正・削除等の請求">
        <p>
          利用者ご本人から、保有個人データの開示・訂正・削除・利用停止等の請求があった場合、法令に従い合理的な範囲で対応します。ご請求は
          <a href="/contact" className="text-blue-400 hover:underline">
            お問い合わせフォーム
          </a>
          よりご連絡ください。
        </p>
      </LegalSection>

      <LegalSection title="7. 改定">
        <p>
          本ポリシーは必要に応じて改定することがあります。重要な変更がある場合は、本サービス上で告知します。
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
