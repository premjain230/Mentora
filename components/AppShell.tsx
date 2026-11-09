"use client";

import "@/lib/dom-guard";
import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { AppSidebar } from "./AppSidebar";
import { UpgradeModal } from "./UpgradeModal";
import { FeedbackModal } from "./feedback/FeedbackModal";

function ShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="shell">
        <div id="sidebarMount">
          <AppSidebar />
        </div>
        <main className="main" style={{ opacity: 0 }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <div id="sidebarMount">
        <AppSidebar />
      </div>
      <main className="main">
        {children}
      </main>
      <UpgradeModal />
      <FeedbackModal />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellInner>{children}</ShellInner>
    </AuthProvider>
  );
}
