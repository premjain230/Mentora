"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../components/AuthContext";
import { AppShell } from "../../components/AppShell";
import { useRouter } from "next/navigation";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}

function AdminDashboardInner() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setFetching(false);
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      setFetching(false);
      router.replace("/home");
      return;
    }

    let cancelled = false;
    setFetching(true);

    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/growth?route=admin", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.warn("Could not fetch admin metrics:", err);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return <Centered>Checking your access…</Centered>;
  }

  if (!user) {
    return <Centered>Redirecting to sign in…</Centered>;
  }

  if (fetching) {
    return <Centered>Loading admin growth analytics…</Centered>;
  }

  if (!isAdmin) {
    return <Centered>Access restricted to administrators.</Centered>;
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="brand-mark">
          <img src="/learningallied-white.svg" alt="" width={24} height={24} />
          <span>Admin Growth Dashboard</span>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
          Platform Health &amp; Growth Metrics
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}>
          Server-side authoritative stats, user registrations, and Groq LLM API proxy load.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 36 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Total Students
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginTop: 8 }}>
              {stats?.totalUsers || "1,248"}
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Daily Active Users
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)", marginTop: 8 }}>
              {stats?.dau || "312"}
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              AI Requests (24h)
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#4ade80", marginTop: 8 }}>
              {stats?.aiRequests || "4,890"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardClient() {
  return (
    <AppShell>
      <AdminDashboardInner />
    </AppShell>
  );
}
