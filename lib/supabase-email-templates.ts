/**
 * 後方互換: 旧 import パス向け。正本は lib/auth-mail.ts。
 */
export {
  CONFIRM_SIGNUP_EMAIL,
  CONFIRM_SIGNUP_SUBJECT,
  RECOVERY_EMAIL,
  RECOVERY_SUBJECT,
  buildConfirmSignupEmail,
  buildRecoveryEmail,
} from "@/lib/auth-mail";
