"use client";

import React, { useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthContext";

export default function SubscriptionPage() {
  const { user, isPro } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setUpgrading(true);
    // Simulate payment / plan checkout
    setTimeout(() => {
      setUpgrading(false);
      alert("Payment checkout initiated! You will receive confirmation on your registered email.");
    }, 1000);
  };

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Subscription &amp; Plans</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)",
              background: "rgba(255,138,31,0.12)",
              padding: "4px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,138,31,0.3)",
            }}
          >
            Learning Allied Membership
          </span>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 800, marginTop: 14, marginBottom: 8, color: "var(--text-primary)" }}>
            Unlock Unlimited Socratic AI Tutoring
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 520, margin: "0 auto" }}>
            Invest in your rank. Get unmetered chapter practice, active recall analysis, and priority speed.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 48 }}>
          {/* Free Plan */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Free Starter
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                Essential AI study tools to kick off your preparation.
              </p>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", marginBottom: 24 }}>
                ₹0 <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)" }}>/ forever</span>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: "var(--text-secondary)" }}>
                <li style={{ display: "flex", gap: 10 }}>✓ 20 AI tutor chats / day</li>
                <li style={{ display: "flex", gap: 10 }}>✓ 20 active recall analyses / day</li>
                <li style={{ display: "flex", gap: 10 }}>✓ 30 mins daily study planner time</li>
                <li style={{ display: "flex", gap: 10 }}>✓ Chapter-wise syllabus benchmarks</li>
              </ul>
            </div>

            <div style={{ marginTop: 32 }}>
              <button
                type="button"
                disabled
                className="btn btn-secondary"
                style={{ width: "100%", opacity: 0.6, cursor: "default" }}
              >
                {!isPro ? "Current Active Plan" : "Downgrade to Free"}
              </button>
            </div>
          </div>

          {/* Pro Plan */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "2px solid var(--accent)",
              borderRadius: 20,
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              boxShadow: "0 0 30px rgba(255,138,31,0.12)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -12,
                right: 24,
                background: "var(--accent)",
                color: "#000",
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 12px",
                borderRadius: 999,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Recommended
            </div>

            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Learning Allied Pro
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                Unmetered access for serious JEE, NEET and Board aspirants.
              </p>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent)", marginBottom: 24 }}>
                ₹299 <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)" }}>/ month</span>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: "var(--text-primary)" }}>
                <li style={{ display: "flex", gap: 10 }}>★ <strong>Unlimited</strong> AI tutor chat questions</li>
                <li style={{ display: "flex", gap: 10 }}>★ <strong>Unlimited</strong> quiz analysis &amp; step solving</li>
                <li style={{ display: "flex", gap: 10 }}>★ <strong>Unlimited</strong> Study Planner scheduling</li>
                <li style={{ display: "flex", gap: 10 }}>★ Priority GPT-OSS 120B reasoning models</li>
                <li style={{ display: "flex", gap: 10 }}>★ Pro flame ring on student avatar</li>
              </ul>
            </div>

            <div style={{ marginTop: 32 }}>
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgrading || isPro}
                className="btn btn-primary"
                style={{ width: "100%", padding: 13, fontWeight: 700 }}
              >
                {isPro ? "✓ Pro Plan Active" : upgrading ? "Processing…" : "Upgrade to Pro →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
