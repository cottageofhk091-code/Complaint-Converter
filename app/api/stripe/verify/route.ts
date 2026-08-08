import {
  getEntitlementBySessionId,
  hasEntitlementForEmail,
  recordCheckoutCompleted,
} from "@/lib/stripe-entitlements";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

/**
 * Checkout 戻り後に session_id を検証し、PRO 解除してよいか返す。
 * Webhook 未到着でも Stripe API で paid を確認してフォールバックする。
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      email?: string;
    };
    const sessionId = body.sessionId?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!sessionId && !email) {
      return NextResponse.json(
        { error: "sessionId または email が必要です。" },
        { status: 400 }
      );
    }

    if (sessionId) {
      const existing = getEntitlementBySessionId(sessionId);
      if (existing) {
        return NextResponse.json({
          unlocked: true,
          source: "webhook",
          email: existing.email,
          sessionId: existing.sessionId,
        });
      }

      const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
      if (secretKey) {
        const stripe = new Stripe(secretKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paid =
          session.payment_status === "paid" ||
          session.payment_status === "no_charge" ||
          session.status === "complete";

        if (paid) {
          const sessionEmail =
            session.customer_details?.email ||
            session.customer_email ||
            email ||
            null;
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id ?? null;

          const entitlement = recordCheckoutCompleted({
            sessionId: session.id,
            email: sessionEmail,
            customerId,
            mode: session.mode,
          });

          return NextResponse.json({
            unlocked: true,
            source: "stripe_api",
            email: entitlement.email,
            sessionId: entitlement.sessionId,
          });
        }
      }
    }

    if (email && hasEntitlementForEmail(email)) {
      return NextResponse.json({
        unlocked: true,
        source: "email",
        email,
      });
    }

    return NextResponse.json({ unlocked: false }, { status: 200 });
  } catch (err) {
    console.error("[/api/stripe/verify]", err);
    const message =
      err instanceof Error ? err.message : "検証に失敗しました。";
    return NextResponse.json({ error: message, unlocked: false }, { status: 500 });
  }
}
