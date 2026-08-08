"use client";

import AuthDebugPanel from "@/components/AuthDebugPanel";
import { AuthProvider } from "@/components/AuthProvider";
import Header from "@/components/Header";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Header />
      {children}
      <AuthDebugPanel />
    </AuthProvider>
  );
}
