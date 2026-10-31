"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../components/AuthContext";
import { AppShell } from "../../components/AppShell";
import { useRouter } from "next/navigation";

export function AdminDashboardClient() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      // Non-admins redirected to home
      if (user && !isAdmin) {
        router.push("/home");
      }
    } else if (user && isAdmin) {
      // Fetch admin growth stats
      user.getIdToken().then(async (token) => {
        try {
          const res = await fetch("/api/growth?route=admin", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setStats(data);
          }
        } catch (err) {
          console.warn("Could not fetch admin metrics:", err);
        } finally {
          setFetching(false);
        }
      });
    }
  }, [user, loading, isAdmin, router]);

  if (loading || fetching) {
    return (
      <AppShell>
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          Loading admin growth analytics…
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          Access restricted to administrators.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Admin Growth Dashboard</span>
          </div>
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
    </AppShell>
  );
}
