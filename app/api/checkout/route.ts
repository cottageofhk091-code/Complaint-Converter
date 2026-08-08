import { getAppUrl } from "@/lib/app-url";
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
        { status: 500 }
      );
    }

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            "STRIPE_PRICE_ID が設定されていません。.env.local を確認してください。",
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey);
    const appUrl = getAppUrl();

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
