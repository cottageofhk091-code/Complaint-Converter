import { getEntitlement } from "@/lib/entitlements";
import { isKvConfigured } from "@/lib/kv";
import {
  isCheckoutSessionPaid,
  persistPaidCheckout,
} from "@/lib/pro-access";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

/** Stripe 署名検証のため raw body が必要 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secretKey) {
    console.error("[/api/stripe/webhook] STRIPE_SECRET_KEY missing");
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY が設定されていません。" },
      { status: 503 }
    );
  }

  if (!webhookSecret) {
    console.error("[/api/stripe/webhook] STRIPE_WEBHOOK_SECRET missing");
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET が設定されていません。" },
      { status: 503 }
    );
  }

  if (!isKvConfigured()) {
    console.error(
      "[/api/stripe/webhook] KV not configured (KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN)"
    );
    return NextResponse.json(
      {
        error:
          "KV（Upstash Redis）が未設定のため entitlement を永続化できません。",
      },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "stripe-signature ヘッダーがありません。" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();
  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[/api/stripe/webhook] signature verification failed:",
      message
    );
    return NextResponse.json(
      { error: `Webhook 署名検証に失敗しました: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email =
          session.customer_details?.email || session.customer_email || null;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

        const paid = isCheckoutSessionPaid(session);

        if (paid) {
          await persistPaidCheckout({
            sessionId: session.id,
            email,
            customerId,
            mode: session.mode,
          });
        } else {
          console.warn(
            `[/api/stripe/webhook] session ${session.id} completed but payment_status=${session.payment_status}`
          );
        }
        break;
      }
      default:
        console.log(`[/api/stripe/webhook] ignored event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[/api/stripe/webhook] handler error:", err);
    // Stripe に再送させる
    return NextResponse.json(
      { error: "Webhook 処理中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

/** デバッグ用: KV entitlement 確認 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const email = req.nextUrl.searchParams.get("email");
  if (!sessionId && !email) {
    return NextResponse.json({
      ok: true,
      kvConfigured: isKvConfigured(),
      hint: "pass ?session_id= or ?email=",
    });
  }

  return NextResponse.json({
    kvConfigured: isKvConfigured(),
    bySession: sessionId ? await getEntitlement(sessionId) : null,
    byEmail: email ? await getEntitlement(email) : null,
  });
}
