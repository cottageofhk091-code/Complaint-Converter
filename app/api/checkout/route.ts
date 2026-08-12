import { getAppUrl } from "@/lib/app-url";
import {
  formatProPriceTaxIncluded,
  getProPriceYen,
  PRO_PRICE_CURRENCY,
  PRO_PRICE_INTERVAL,
} from "@/lib/pricing";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const priceId = process.env.STRIPE_PRICE_ID?.trim();

    if (!secretKey) {
      return NextResponse.json(
        {
          error:
            "STRIPE_SECRET_KEY が設定されていません。.env.local を確認してください。",
        },
        { status: 503 }
      );
    }

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            "STRIPE_PRICE_ID が設定されていません。.env.local を確認してください。",
        },
        { status: 503 }
      );
    }

    const stripe = new Stripe(secretKey);
    const appUrl = getAppUrl();
    const expectedYen = getProPriceYen();

    let customerEmail: string | undefined;
    try {
      const body = (await req.json()) as { email?: string };
      const email = body?.email?.trim();
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        customerEmail = email;
      }
    } catch {
      // body なし・不正 JSON はメール未指定として続行
    }

    const price = await stripe.prices.retrieve(priceId);

    if (price.currency !== PRO_PRICE_CURRENCY) {
      console.error(
        `[/api/checkout] currency mismatch: stripe=${price.currency} expected=${PRO_PRICE_CURRENCY}`
      );
      return NextResponse.json(
        {
          error: `Stripe Price の通貨が不正です（${price.currency}）。${PRO_PRICE_CURRENCY.toUpperCase()} の Price を設定してください。`,
        },
        { status: 503 }
      );
    }

    if (price.unit_amount !== expectedYen) {
      console.error(
        `[/api/checkout] amount mismatch: stripe=${price.unit_amount} expected=${expectedYen}`
      );
      return NextResponse.json(
        {
          error: `Stripe Price の金額（${price.unit_amount}）がアプリ表記（${formatProPriceTaxIncluded()} = ${expectedYen}）と一致しません。STRIPE_PRICE_ID または NEXT_PUBLIC_PRO_PRICE_YEN を揃えてください。`,
        },
        { status: 503 }
      );
    }

    if (price.recurring && price.recurring.interval !== PRO_PRICE_INTERVAL) {
      console.error(
        `[/api/checkout] interval mismatch: stripe=${price.recurring.interval} expected=${PRO_PRICE_INTERVAL}`
      );
      return NextResponse.json(
        {
          error: `Stripe Price の課金周期が「${PRO_PRICE_INTERVAL}」ではありません。月額 Price を設定してください。`,
        },
        { status: 503 }
      );
    }

    const mode: Stripe.Checkout.SessionCreateParams.Mode = price.recurring
      ? "subscription"
      : "payment";

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?unlocked=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: "ja",
      metadata: {
        app_price_yen: String(expectedYen),
        app_price_interval: PRO_PRICE_INTERVAL,
      },
      ...(customerEmail ? { customer_email: customerEmail } : {}),
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout URL の取得に失敗しました。" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      url: session.url,
      sessionId: session.id,
      priceYen: expectedYen,
      mode,
    });
  } catch (err) {
    console.error("[/api/checkout]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Checkout セッションの作成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
