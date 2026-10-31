"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.emailVerified) router.replace("/verify-email");
  }, [user, loading, router]);

  if (loading || !user || !user.emailVerified) {
    return (
      <div
        className="ld-splash auth-gate-splash"
        role="status"
        aria-label="Loading Learning Allied"
      >
        <div className="ld">
          <img
            src="/learningallied-white.svg"
            alt=""
            width={60}
            height={60}
            decoding="async"
          />
          <div className="ld-bar" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
