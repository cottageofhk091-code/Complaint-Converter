import { isKvConfigured } from "@/lib/kv";
import { resolveProAccess } from "@/lib/pro-access";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Checkout 戻り後に session_id を検証し、PRO 解除してよいか返す。
 * 成功時は KV に entitlement を永続化する。
 */
export async function POST(req: NextRequest) {
  try {
    if (!isKvConfigured()) {
      return NextResponse.json(
        {
          unlocked: false,
          error:
            "KV（Upstash Redis）が未設定です。KV_REST_API_URL / KV_REST_API_TOKEN を設定してください。",
        },
        { status: 503 }
      );
    }

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

    const access = await resolveProAccess({
      sessionId,
      email,
      allowEmailLookup: true,
      kvOnly: false,
    });

    if (!access.entitled) {
      return NextResponse.json({ unlocked: false }, { status: 200 });
    }

    return NextResponse.json({
      unlocked: true,
      source: access.source,
      email: access.email,
      sessionId: access.sessionId,
    });
  } catch (err) {
    console.error("[/api/stripe/verify]", err);
    const message =
      err instanceof Error ? err.message : "検証に失敗しました。";
    // fail-closed
    return NextResponse.json(
      { error: message, unlocked: false },
      { status: 500 }
    );
  }
}
