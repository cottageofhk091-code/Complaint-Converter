# Smartお詫びコンシェルジュ

〜クレーム対応からお詫びメールまで、AIが即座に最適化〜

Dark-mode Next.js app that converts claim / complaint situations into carefully crafted apology or response emails using the Gemini API.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure `.env.local`:

```
GEMINI_API_KEY=your_actual_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

- Checkout の success/cancel は `NEXT_PUBLIC_APP_URL` を優先（未設定時は `http://localhost:3000`）
- Webhook エンドポイント: `POST /api/stripe/webhook`（`checkout.session.completed` で PRO 解除を記録）
- 決済戻り後は `/api/stripe/verify` で session を検証してからロック解除
- ローカル Webhook 例: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js (App Router)
- Tailwind CSS
- TypeScript
- `@google/genai` (Gemini Interactions API)
- Stripe Checkout + Webhook（PRO ロック解除）
