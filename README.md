# クレーム・お詫びメール神対応変換器

Dark-mode Next.js app that converts claim / complaint situations into carefully crafted apology or response emails using the Gemini API.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure `.env.local`:

```
GEMINI_API_KEY=your_actual_api_key
NEXT_PUBLIC_STRIPE_PAYMENT_LINK=https://buy.stripe.com/xxxxx
```

- `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` … Stripe Payment Link の URL
- Stripe Dashboard 側の決済完了後リダイレクト先を `https://あなたのドメイン/?unlocked=true` に設定してください
- 未設定の場合は「980円で鍵を解除」クリックで `/?payment=success` によるデモ解除が動作します

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
- Stripe Payment Link（PRO ロック解除）
