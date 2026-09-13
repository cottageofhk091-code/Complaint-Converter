# Supabase Auth メール日本語化

このアプリは **Supabase 標準の Auth メール送信** を使います。  
件名・本文の日本語化は、アプリの `fetch` では書き換えられないため、次のいずれかで反映します。

## 本番（推奨）: Supabase Dashboard

1. [Supabase Dashboard](https://supabase.com/dashboard) → 対象プロジェクト
2. **Authentication → Email Templates**

### Confirm signup（新規登録確認）

**Subject**
```text
【Smartお詫びコンシェルジュ】メールアドレスの確認
```

**Body（HTML）**  
`supabase/templates/confirm-signup.html` の内容をそのまま貼り付け  

確認リンク（Token Hash / PKCE 不要）:
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup`

**Body（テキスト）**  
`supabase/templates/confirm-signup.txt`

### Reset password（パスワード再設定 / Recover）

**Subject**
```text
【Smartお詫びコンシェルジュ】パスワードの再設定
```

**Body（HTML）**  
`supabase/templates/reset-password.html`

再設定リンク:
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password`

**Body（テキスト）**  
`supabase/templates/reset-password.txt`

> 重要: デフォルトの `{{ .ConfirmationURL }}`（PKCE code）だと、
> メーラー内ブラウザ等で `PKCE code verifier not found` になることがあります。
> **Token Hash 方式**（上記 URL）を使ってください。アプリの `/auth/callback` が `verifyOtp` で処理します。

### URL Configuration

- Site URL: 本番ドメイン
- Redirect URLs:
  - `https://あなたのドメイン/auth/callback`
  - `https://あなたのドメイン/auth/update-password`

アプリ側の定数正本: `lib/supabase-email-templates.ts`

## ローカル（Supabase CLI）

`supabase/config.toml` の:

```toml
[auth.email.template.confirmation]
subject = "【Smartお詫びコンシェルジュ】メールアドレスの確認"
content_path = "./supabase/templates/confirm-signup.html"

[auth.email.template.recovery]
subject = "【Smartお詫びコンシェルジュ】パスワードの再設定"
content_path = "./supabase/templates/reset-password.html"
```

## 補足

Custom Email Hook（自前 API で Resend 等送信）に切り替える場合は、  
`lib/supabase-email-templates.ts` の件名・本文を Hook 実装から参照してください。  
現状は標準メーラー + テンプレート運用です。
