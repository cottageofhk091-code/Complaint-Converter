"use client";

import AuthDebugPanel from "@/components/AuthDebugPanel";
import { AuthProvider } from "@/components/AuthProvider";
import PasswordChangeModal from "@/components/PasswordChangeModal";
import WelcomeBanner from "@/components/WelcomeBanner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <WelcomeBanner />
      <PasswordChangeModal />
      <AuthDebugPanel />
    </AuthProvider>
  );
}
