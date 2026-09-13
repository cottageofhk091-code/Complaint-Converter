"use client";

import AuthDebugPanel from "@/components/AuthDebugPanel";
import { AuthProvider } from "@/components/AuthProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthDebugPanel />
    </AuthProvider>
  );
}
