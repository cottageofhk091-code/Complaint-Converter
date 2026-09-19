import { NextResponse } from "next/server";

const APP_NAME = "Smartお詫びコンシェルジュ";
/** フォールバック通知先（本番は Vercel の CONTACT_EMAIL を優先） */
const DEFAULT_CONTACT_EMAIL = "cottageofhk091@gmail.com";
const DEFAULT_FROM_EMAIL = "noreply@cloudflowriver.com";

function getContactEmail(): string {
  return (process.env.CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL).trim();
}

/**
 * Resend で Verified なドメインの From。
 * 表示名に日本語を入れると一部経路で弾かれることがあるため、アドレス本体は ASCII 固定。
 */
function getContactFromEmail(): string {
  const from = process.env.CONTACT_FROM_EMAIL?.trim();
  if (from) {
    // support@ など Verified でない From は無視して noreply に寄せる
    if (/noreply@cloudflowriver\.com/i.test(from)) return from;
    console.warn(
      "[contact] CONTACT_FROM_EMAIL ignored (must use noreply@cloudflowriver.com):",
      from
    );
  }
  return `${APP_NAME} <${DEFAULT_FROM_EMAIL}>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchResendLastEvent(
  apiKey: string,
  emailId: string
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "smart-owabi-contact/1.1",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[contact] Resend get email failed:", res.status, body);
      return null;
    }
    const data = (await res.json()) as { last_event?: string };
    return data.last_event || null;
  } catch (err) {
    console.warn("[contact] Resend get email error:", err);
    return null;
  }
}

async function sendContactEmail(params: {
  to: string;
  replyTo: string;
  name: string;
  type: string;
  message: string;
}): Promise<{ id: string; lastEvent: string | null }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("[contact] RESEND_API_KEY is not set");
    throw new Error("メール送信の設定エラーです（RESEND_API_KEY）。");
  }

  const from = getContactFromEmail();
  const subject = `【${APP_NAME}】お問い合わせ: ${params.type || "一般"}`;
  const textBody = [
    `${APP_NAME} にお問い合わせが届きました。`,
    "",
    `お名前: ${params.name}`,
    `メールアドレス: ${params.replyTo}`,
    `種別: ${params.type || "（未選択）"}`,
    "",
    "--- お問い合わせ内容 ---",
    params.message,
    "",
    `通知先: ${params.to}`,
  ].join("\n");

  const htmlBody = `
    <div style="font-family:sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px">${escapeHtml(APP_NAME)}｜新しいお問い合わせ</h2>
      <p style="margin:0 0 8px"><strong>お名前:</strong> ${escapeHtml(params.name)}</p>
      <p style="margin:0 0 8px"><strong>メールアドレス:</strong> ${escapeHtml(params.replyTo)}</p>
      <p style="margin:0 0 16px"><strong>種別:</strong> ${escapeHtml(params.type || "（未選択）")}</p>
      <div style="padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;white-space:pre-wrap">${escapeHtml(params.message)}</div>
      <p style="margin:16px 0 0;font-size:12px;color:#64748b">このメールに返信すると、お客様（${escapeHtml(params.replyTo)}）へ返信できます。</p>
    </div>
  `;

  console.info("[contact] Resend send start", {
    from,
    to: params.to,
    replyTo: params.replyTo,
    subject,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "smart-owabi-contact/1.1",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      reply_to: params.replyTo,
      subject,
      text: textBody,
      html: htmlBody,
    }),
  });

  const rawBody = await res.text().catch(() => "");
  let parsed: { id?: string; error?: unknown } = {};
  try {
    parsed = rawBody ? (JSON.parse(rawBody) as typeof parsed) : {};
  } catch {
    parsed = {};
  }

  console.info("[contact] Resend send response", {
    status: res.status,
    ok: res.ok,
    id: parsed.id || null,
    body: rawBody.slice(0, 500),
  });

  if (!res.ok || !parsed.id) {
    console.error("[contact] Resend email failed:", res.status, rawBody);
    throw new Error("お問い合わせメールの送信に失敗しました。");
  }

  // delivered 反映まで短いポーリング（最大 ~6s）
  let lastEvent: string | null = null;
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    lastEvent = await fetchResendLastEvent(apiKey, parsed.id);
    console.info("[contact] Resend last_event poll", {
      id: parsed.id,
      attempt: i + 1,
      lastEvent,
    });
    if (lastEvent && lastEvent !== "queued" && lastEvent !== "sent") break;
  }

  return { id: parsed.id, lastEvent };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      type?: string;
      subject?: string;
      message?: string;
    };

    const { name, email, message } = body;
    // フロントは subject、API は type を使うため両対応
    const type = body.type || body.subject || "";

    if (!email || !message) {
      return NextResponse.json(
        { error: "メールアドレスとお問い合わせ内容は必須です。" },
        { status: 400 }
      );
    }

    const contactEmail = getContactEmail();
    if (!contactEmail.includes("@")) {
      console.error("[contact] CONTACT_EMAIL is invalid:", contactEmail);
      return NextResponse.json(
        { error: "サーバー側の設定エラーです。" },
        { status: 500 }
      );
    }

    const trimmedEmail = String(email).trim();
    const displayName = name?.trim() ? String(name).trim() : "（未入力）";
    const inquiryType = String(type).trim();
    const inquiryMessage = String(message).trim();

    const result = await sendContactEmail({
      to: contactEmail,
      replyTo: trimmedEmail,
      name: displayName,
      type: inquiryType,
      message: inquiryMessage,
    });

    return NextResponse.json({
      success: true,
      notified: contactEmail,
      resendId: result.id,
      lastEvent: result.lastEvent,
    });
  } catch (error) {
    console.error("Contact Error:", error);
    const message =
      error instanceof Error &&
      /RESEND_API_KEY|メール送信の設定/.test(error.message)
        ? "サーバー側のメール設定エラーです。管理者にお問い合わせください。"
        : "送信中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
