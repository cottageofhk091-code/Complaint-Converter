import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ContactBody = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

function truncate(text: string, max = 1000): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

const APP_NAME = "Smartお詫びコンシェルジュ";

function buildGmailComposeUrl(email: string): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: email,
    su: `【お問い合わせへの返信】${APP_NAME}`,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

async function notifyDiscord(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<"sent" | "skipped" | "failed"> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    console.warn(
      "[/api/contact] DISCORD_WEBHOOK_URL が未設定のため Discord 通知をスキップします。"
    );
    return "skipped";
  }

  const displayName =
    payload.name && payload.name !== "未入力"
      ? `${truncate(payload.name, 200)} 様`
      : "未入力";
  const emailCode = `\`${truncate(payload.email, 250)}\``;
  const gmailUrl = buildGmailComposeUrl(payload.email);
  const contentValue = truncate(
    `【件名】${payload.subject || "未入力"}\n\n${payload.message || "未入力"}`,
    1000
  );

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `${APP_NAME} お問い合わせ通知`,
        embeds: [
          {
            title: "📩 新しいお問い合わせが届きました",
            color: 3447003,
            description: [
              "👤 送信者メールアドレス:",
              `${emailCode} (クリックでコピー)`,
              "",
              `🚀 [✉️ Web版Gmailで返信画面を開く](${gmailUrl})`,
            ].join("\n"),
            fields: [
              {
                name: "お名前",
                value: displayName,
                inline: true,
              },
              {
                name: "メールアドレス",
                value: emailCode,
                inline: true,
              },
              {
                name: "お問い合わせ内容",
                value: contentValue,
                inline: false,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[/api/contact] Discord webhook failed: ${res.status} ${detail}`
      );
      return "failed";
    }

    console.log("[/api/contact] Discord webhook notification sent");
    return "sent";
  } catch (err) {
    console.error("[/api/contact] Discord webhook error:", err);
    return "failed";
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: ContactBody;
    try {
      body = (await req.json()) as ContactBody;
    } catch {
      return NextResponse.json(
        { error: "リクエスト本文のJSONが不正です。" },
        { status: 400 }
      );
    }

    const name = body.name?.trim() || "";
    const email = body.email?.trim() || "";
    const subject = body.subject?.trim() || "";
    const message = body.message?.trim() || "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください。" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "お問い合わせ内容を入力してください。" },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: "件名を入力してください。" },
        { status: 400 }
      );
    }

    const discordStatus = await notifyDiscord({
      name: name || "未入力",
      email,
      subject,
      message,
    });

    // Webhook 未設定でも受付自体は成功扱い（開発環境向け）
    // 送信失敗時のみ 502
    if (discordStatus === "failed") {
      return NextResponse.json(
        {
          error:
            "お問い合わせの通知送信に失敗しました。しばらくしてから再度お試しください。",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      notified: discordStatus === "sent",
    });
  } catch (err) {
    console.error("[/api/contact]", err);
    return NextResponse.json(
      { error: "お問い合わせの受付中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
