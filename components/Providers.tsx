"use client";

import AuthDebugPanel from "@/components/AuthDebugPanel";
import { AuthProvider } from "@/components/AuthProvider";
import PasswordChangeModal from "@/components/PasswordChangeModal";
import PasswordRecoveryUrlSync from "@/components/PasswordRecoveryUrlSync";
import WelcomeBanner from "@/components/WelcomeBanner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PasswordRecoveryUrlSync />
      {children}
      <WelcomeBanner />
      <PasswordChangeModal />
      <AuthDebugPanel />
    </AuthProvider>
  );
}
