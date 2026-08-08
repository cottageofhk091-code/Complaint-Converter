import {
  getEntitlementBySessionId,
  recordCheckoutCompleted,
} from "@/lib/stripe-entitlements";
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
      { status: 500 }
    );
  }

  if (!webhookSecret) {
    console.error("[/api/stripe/webhook] STRIPE_WEBHOOK_SECRET missing");
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET が設定されていません。" },
      { status: 500 }
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
    console.error("[/api/stripe/webhook] signature verification failed:", message);
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
          session.customer_details?.email ||
          session.customer_email ||
          null;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

        // 支払い完了 or サブスク開始をロック解除条件とする
        const paid =
          session.payment_status === "paid" ||
          session.payment_status === "no_charge" ||
          session.status === "complete";

        if (paid) {
          recordCheckoutCompleted({
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
    return NextResponse.json(
      { error: "Webhook 処理中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

/** デバッグ用: セッション記録の有無確認（本番では不要なら削除可） */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ ok: true, hint: "pass ?session_id=" });
  }
  return NextResponse.json({
    entitlement: getEntitlementBySessionId(sessionId),
  });
}
