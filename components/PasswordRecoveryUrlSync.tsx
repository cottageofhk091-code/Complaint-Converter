"use client";

import { useAuth } from "@/components/AuthProvider";
import { PASSWORD_RESET_ACTION } from "@/lib/auth-redirects";
import { isAuthNoticePath } from "@/lib/auth-recovery-sync";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/**
 * 旧リンク互換: トップに ?action=reset-password / #type=recovery で着地した場合。
 * 案内ページ上ではモーダルを開かない（元タブ完結）。
 */
function PasswordRecoveryUrlSyncInner() {
  const { openPasswordRecovery } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAuthNoticePath(pathname)) return;

    const action = searchParams.get("action");
    const typeQ = searchParams.get("type");
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const typeH = hash.get("type");
    const hasAccessToken = hash.has("access_token");

    const shouldOpen =
      action === PASSWORD_RESET_ACTION ||
      typeQ === "recovery" ||
      typeH === "recovery" ||
      (hasAccessToken && typeH === "recovery");

    if (!shouldOpen) return;

    openPasswordRecovery();

    if (action === PASSWORD_RESET_ACTION) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      const qs = params.toString();
      const next = `${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
      router.replace(next || "/");
    }
  }, [searchParams, pathname, openPasswordRecovery, router]);

  return null;
}

export default function PasswordRecoveryUrlSync() {
  return (
    <Suspense fallback={null}>
      <PasswordRecoveryUrlSyncInner />
    </Suspense>
  );
}
