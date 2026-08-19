import {
  grantProEntitlement,
  hasActiveProEntitlement,
} from "@/lib/entitlements";
import { isKvConfigured } from "@/lib/kv";
import { recordCheckoutCompleted } from "@/lib/stripe-entitlements";
import Stripe from "stripe";

export type ProAccessResult = {
  entitled: boolean;
  sessionId: string | null;
  email: string | null;
  source: "kv" | "stripe_api" | "email" | "dev_bypass" | null;
};

/**
 * ローカル撮影用の PRO バイパス。
 * 二重（＋三重）ガードで本番 / Vercel では絶対に有効化しない。
 */
export function isDevProBypassEnabled(): boolean {
  // 1) 本番ビルドでは常に無効（Fail-closed）
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  // 2) Vercel 上では環境変数があっても無効（本番・Preview 含む）
  if (process.env.VERCEL === "1" || process.env.VERCEL_ENV) {
    return false;
  }
  // 3) 明示オプトインのみ
  return process.env.ALLOW_DEV_BYPASS_PRO?.trim() === "true";
}

/** 支払い完了とみなす条件（status=complete 単独では解除しない） */
export function isCheckoutSessionPaid(
  session: Pick<Stripe.Checkout.Session, "payment_status">
): boolean {
  return (
    session.payment_status === "paid" ||
    session.payment_status === "no_charge"
  );
}

function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

/**
 * 決済完了を KV（+ 互換用ローカルストア）に永続化する。
 * KV 書き込み失敗時は throw。
 */
export async function persistPaidCheckout(input: {
  sessionId: string;
  email?: string | null;
  customerId?: string | null;
  mode?: string | null;
  expiresAt?: number;
}): Promise<{
  sessionId: string;
  email: string | null;
}> {
  const data = await grantProEntitlement({
    sessionId: input.sessionId,
    customerEmail: input.email,
    customerId: input.customerId,
    mode: input.mode,
    expiresAt: input.expiresAt,
  });

  // 互換: ローカルメモリ/ファイルにも記録（デバッグ GET 用）
  try {
    recordCheckoutCompleted({
      sessionId: input.sessionId,
      email: input.email,
      customerId: input.customerId,
      mode: input.mode,
    });
  } catch (err) {
    console.warn("[pro-access] legacy store write failed (non-fatal):", err);
  }

  return {
    sessionId: data.checkoutSessionId || input.sessionId,
    email: data.customerEmail ?? null,
  };
}

/**
 * PRO 権限を解決する。
 * - 通常: KV →（未ヒット時）Stripe API で paid 確認して KV へ永続化
 * - kvOnly: KV のみ（generate の fail-closed）。Stripe / ローカルメモリは見ない。
 */
export async function resolveProAccess(input: {
  sessionId?: string | null;
  email?: string | null;
  /** true のとき email キーの entitlement も許可（verify 用）。generate では false。 */
  allowEmailLookup?: boolean;
  /** true のとき KV のみ参照（Paywall fail-closed） */
  kvOnly?: boolean;
}): Promise<ProAccessResult> {
  const sessionId = input.sessionId?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;
  const allowEmailLookup = input.allowEmailLookup === true;
  const kvOnly = input.kvOnly === true;

  // ローカル note 撮影用: development + 明示フラグのみ PRO 扱い
  if (isDevProBypassEnabled()) {
    console.warn(
      "[pro-access] ALLOW_DEV_BYPASS_PRO active (local development only)"
    );
    return {
      entitled: true,
      sessionId: sessionId || "dev_bypass",
      email,
      source: "dev_bypass",
    };
  }

  if (!sessionId && !(allowEmailLookup && email)) {
    return { entitled: false, sessionId, email, source: null };
  }

  // --- KV 正本 ---
  if (isKvConfigured() || kvOnly) {
    const kvHit = await hasActiveProEntitlement({
      sessionId,
      email,
      allowEmailLookup,
    });

    if (kvHit.active) {
      return {
        entitled: true,
        sessionId:
          kvHit.data?.checkoutSessionId ||
          sessionId ||
          null,
        email: kvHit.data?.customerEmail || email,
        source: kvHit.matchedBy === "email" ? "email" : "kv",
      };
    }

    if (kvOnly) {
      // generate: Stripe フォールバック禁止（fail-closed）
      return { entitled: false, sessionId, email, source: null };
    }
  } else if (kvOnly) {
    console.warn(
      "[pro-access] kvOnly requested but KV is not configured — fail-closed"
    );
    return { entitled: false, sessionId, email, source: null };
  }

  // --- Stripe API フォールバック（verify / webhook 補完用）---
  if (sessionId) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (isCheckoutSessionPaid(session)) {
          const sessionEmail =
            session.customer_details?.email ||
            session.customer_email ||
            email ||
            null;
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id ?? null;

          if (!isKvConfigured()) {
            console.error(
              "[pro-access] paid session but KV not configured — cannot grant durable PRO"
            );
            return { entitled: false, sessionId, email: sessionEmail, source: null };
          }

          const persisted = await persistPaidCheckout({
            sessionId: session.id,
            email: sessionEmail,
            customerId,
            mode: session.mode,
          });

          return {
            entitled: true,
            sessionId: persisted.sessionId,
            email: persisted.email,
            source: "stripe_api",
          };
        }
      } catch (err) {
        console.error("[pro-access] stripe retrieve / persist failed:", err);
        // fail-closed
        return { entitled: false, sessionId, email, source: null };
      }
    }
  }

  return {
    entitled: false,
    sessionId,
    email,
    source: null,
  };
}
