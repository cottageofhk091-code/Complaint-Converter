/**
 * Resend 共通送信ヘルパー（認証メール・問い合わせ等）。
 */

export const AUTH_FROM_EMAIL = "noreply@cloudflowriver.com";
export const AUTH_FROM_DISPLAY = `スマートお詫びコンシェルジュ <${AUTH_FROM_EMAIL}>`;

export type ResendConfigError = {
  error: string;
  detail: string;
  status: 503;
};

export function getResendApiKeyOrError():
  | { ok: true; apiKey: string }
  | { ok: false; response: ResendConfigError } {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    const response: ResendConfigError = {
      error: "メール送信の設定が完了していません。",
      detail: "RESEND_API_KEY が未設定です。Vercel の環境変数を確認してください。",
      status: 503,
    };
    console.error("[resend]", response.detail);
    return { ok: false, response };
  }
  return { ok: true, apiKey };
}

export function getAuthFromEmail(): string {
  const from = process.env.CONTACT_FROM_EMAIL?.trim();
  if (from && /noreply@cloudflowriver\.com/i.test(from)) return from;
  return AUTH_FROM_DISPLAY;
}

export async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id: string } | { error: string; detail: string; status: number }> {
  const key = getResendApiKeyOrError();
  if (!key.ok) {
    return {
      error: key.response.error,
      detail: key.response.detail,
      status: key.response.status,
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "smart-owabi-auth-mail/1.0",
      },
      body: JSON.stringify({
        from: getAuthFromEmail(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    const raw = await res.text().catch(() => "");
    let parsed: { id?: string; message?: string; name?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = {};
    }

    if (!res.ok || !parsed.id) {
      const detail =
        parsed.message ||
        raw.slice(0, 400) ||
        `Resend HTTP ${res.status}`;
      console.error("[resend] send failed:", res.status, detail);
      return {
        error: "メールの送信に失敗しました。",
        detail,
        status: res.status >= 500 ? 503 : 502,
      };
    }

    console.info("[resend] sent", { id: parsed.id, to: params.to, subject: params.subject });
    return { id: parsed.id };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[resend] network error:", detail);
    return {
      error: "メール送信サービスに接続できませんでした。",
      detail,
      status: 503,
    };
  }
}
