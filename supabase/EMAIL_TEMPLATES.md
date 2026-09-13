# Supabase Auth メール日本語化

このアプリは **Supabase 標準の Auth メール送信** を使います。  
件名・本文の日本語化は、アプリの `fetch` では書き換えられないため、次のいずれかで反映します。

## 本番（推奨）: Supabase Dashboard

1. [Supabase Dashboard](https://supabase.com/dashboard) → 対象プロジェクト
2. **Authentication → Email Templates → Confirm signup**
3. 次を設定して Save

**Subject**
```text
【Smartお詫びコンシェルジュ】メールアドレスの確認
```

**Body（HTML）**  
`supabase/templates/confirm-signup.html` の内容をそのまま貼り付け  
（確認リンクは必ず `{{ .ConfirmationURL }}`）

**Body（テキストのみ使う場合）**
```text
Smartお詫びコンシェルジュへのご登録ありがとうございます。
以下のリンクをクリックして登録を完了してください。

{{ .ConfirmationURL }}
```

4. **URL Configuration**
   - Site URL: 本番ドメイン
   - Redirect URLs: `https://あなたのドメイン/auth/callback`

アプリ側の定数正本: `lib/supabase-email-templates.ts`

## ローカル（Supabase CLI）

`supabase/config.toml` の:

```toml
[auth.email.template.confirmation]
subject = "【Smartお詫びコンシェルジュ】メールアドレスの確認"
content_path = "./supabase/templates/confirm-signup.html"
```

## 補足

Custom Email Hook（自前 API で Resend 等送信）に切り替える場合は、  
`lib/supabase-email-templates.ts` の件名・本文を Hook 実装から参照してください。  
現状は標準メーラー + テンプレート運用です。
