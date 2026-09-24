/**
 * Supabase Auth など認証系エラーメッセージの日本語変換。
 * 画面表示前に必ずこの関数（または authErrorTranslator）を通す。
 */

const EXACT_MAP: Record<string, string> = {
  "Invalid login credentials":
    "メールアドレスまたはパスワードが正しくありません。",
  "Email not confirmed":
    "メールアドレスの確認が完了していません。届いたメールをご確認ください。",
  "User already registered": "このメールアドレスは既に登録されています。",
  "A user with this email address has already been registered":
    "このメールアドレスは既に登録されています。",
  user_already_exists: "このメールアドレスは既に登録されています。",
  email_exists: "このメールアドレスは既に登録されています。",
  "Password should be at least 6 characters":
    "パスワードは6文字以上で入力してください。",
  "Password should be at least 8 characters":
    "パスワードは8文字以上で入力してください。",
  "email rate limit exceeded":
    "メールの送信制限に達しました。1時間ほど時間を置いてから再度お試しください。",
  "Email rate limit exceeded":
    "メールの送信制限に達しました。1時間ほど時間を置いてから再度お試しください。",
  "Invalid email": "メールアドレスの形式が正しくありません。",
  "Unable to validate email address: invalid format":
    "メールアドレスの形式が正しくありません。",
  "User not found": "このメールアドレスは登録されていません。",
  "Same password":
    "新しいパスワードは現在のパスワードと異なるものを入力してください。",
  "New password should be different from the old password.":
    "新しいパスワードは現在のパスワードと異なるものを入力してください。",
  "For security purposes, you can only request this after":
    "セキュリティのため、しばらく時間を置いてから再度お試しください。",
  "Signup requires a valid password":
    "有効なパスワードを入力してください。",
  "Signups not allowed for this instance":
    "現在、新規登録を受け付けていません。",
  "Email link is invalid or has expired":
    "メール内のリンクが無効か、有効期限が切れています。もう一度お試しください。",
  "Token has expired or is invalid":
    "認証トークンが無効か、有効期限が切れています。もう一度お試しください。",
  "Auth session missing!":
    "ログインセッションが見つかりません。もう一度ログインしてください。",
  "OTP has expired or is invalid":
    "認証コードが無効か、有効期限が切れています。",
  over_email_send_rate_limit:
    "メールの送信制限に達しました。1時間ほど時間を置いてから再度お試しください。",
  "Database error saving new user":
    "ユーザーの登録処理でエラーが発生しました。時間をおいて再度お試しください。",
  "Invalid API key":
    "サーバー側の認証設定が不正です（APIキー無効）。管理者に SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY の確認を依頼してください。",
  "Invalid API key.":
    "サーバー側の認証設定が不正です（APIキー無効）。管理者に SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY の確認を依頼してください。",
  "API key is invalid":
    "メール送信の設定が不正です（RESEND_API_KEY が無効）。管理者にお問い合わせください。",
};

const PARTIAL_RULES: Array<{ test: RegExp; message: string }> = [
  {
    test: /invalid login credentials/i,
    message: "メールアドレスまたはパスワードが正しくありません。",
  },
  {
    test: /email not confirmed/i,
    message:
      "メールアドレスの確認が完了していません。届いたメールをご確認ください。",
  },
  {
    test: /already (been )?registered|user already exists|already exists|user_already_exists|email address has already been|email_exists/i,
    message: "このメールアドレスは既に登録されています。",
  },
  {
    test: /password should be at least\s*8/i,
    message: "パスワードは8文字以上で入力してください。",
  },
  {
    test: /password should be at least/i,
    message: "パスワードは8文字以上で入力してください。",
  },
  {
    test: /rate limit|too many requests|over_email_send_rate_limit/i,
    message:
      "メールの送信制限に達しました。1時間ほど時間を置いてから再度お試しください。",
  },
  {
    test: /invalid email|unable to validate email/i,
    message: "メールアドレスの形式が正しくありません。",
  },
  {
    test: /user not found|no user found/i,
    message: "このメールアドレスは登録されていません。",
  },
  {
    test: /same password|different from the old password/i,
    message:
      "新しいパスワードは現在のパスワードと異なるものを入力してください。",
  },
  {
    test: /expired|invalid.*(token|link|otp)/i,
    message:
      "リンクまたは認証コードが無効か、有効期限が切れています。もう一度お試しください。",
  },
  {
    test: /network|fetch failed|failed to fetch/i,
    message:
      "通信エラーが発生しました。ネットワーク接続を確認して再度お試しください。",
  },
  {
    test: /invalid api key|api key is invalid|jwt|not authorized/i,
    message:
      "サーバー側の認証／メール設定が不正です。管理者に環境変数（SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY）の確認を依頼してください。",
  },
  {
    test: /database error|service.?role/i,
    message:
      "サーバー側の認証設定エラーです。管理者にお問い合わせください。",
  },
];

const FALLBACK =
  "エラーが発生しました。時間をおいて再度お試しください。";

const DUPLICATE_MESSAGE = "このメールアドレスは既に登録されています。";

/**
 * Supabase Auth / API / 一般 Error を画面表示用の日本語に変換する。
 */
export function toJapaneseAuthError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "").trim()
      : "";

  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    /already.?registered|already.?exists/i.test(code)
  ) {
    return DUPLICATE_MESSAGE;
  }

  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : error && typeof error === "object" && "error" in error
          ? String((error as { error?: unknown }).error ?? "")
          : "";

  const message = raw.trim();
  if (!message) return FALLBACK;

  // すでに日本語っぽい場合はそのまま
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(message)) {
    return message;
  }

  if (EXACT_MAP[message]) return EXACT_MAP[message];
  if (code && EXACT_MAP[code]) return EXACT_MAP[code];

  for (const rule of PARTIAL_RULES) {
    if (rule.test.test(message) || (code && rule.test.test(code))) {
      return rule.message;
    }
  }

  console.error("[auth-errors] unmapped error:", { message, code, error });
  return FALLBACK;
}

/** 仕様名 alias */
export const authErrorTranslator = toJapaneseAuthError;

/**
 * API レスポンス JSON から画面用日本語エラーを作る。
 */
export function toJapaneseApiError(data: unknown, fallback?: string): string {
  if (!data || typeof data !== "object") {
    return fallback || FALLBACK;
  }
  const obj = data as { error?: unknown; detail?: unknown; message?: unknown };
  if (obj.detail) {
    console.error("[api-error] detail:", obj.detail);
  }
  const primary = obj.error ?? obj.message;
  if (primary == null) return fallback || FALLBACK;
  return toJapaneseAuthError(primary);
}
