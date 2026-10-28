"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthContext";
import { initFirebase } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function HomePage() {
  const router = useRouter();
  const { user, userData, isPro, loading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    streak: 3,
    quizzesCompleted: 12,
    studyHours: 8.5,
    masteryScore: 78,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user && !user.emailVerified) {
      router.push("/verify-email");
      return;
    }
    if (user) {
      initFirebase().then(async ({ db }) => {
        if (!db) return;
        try {
          const snap = await getDoc(doc(db, "users", user.uid, "learning", "profile"));
          if (snap.exists()) {
            setProfile(snap.data());
          }
        } catch {}
      });
    }
  }, [user, loading, router]);

  const greetingName =
    userData?.displayName ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "Student");

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Learning Allied — Today</span>
          </div>
          <div id="topbarGreeting" className="greeting" style={{ marginLeft: 16 }}>
            Hi, <strong>{greetingName}</strong>
          </div>
        </div>

        <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isPro ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#ff8a1f",
                background: "rgba(255,138,31,0.12)",
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,138,31,0.3)",
              }}
            >
              ★ PRO UNLIMITED
            </span>
          ) : (
            <Link
              href="/subscription"
              style={{
                fontSize: 12,
                color: "var(--la-accent, #ff8a1f)",
                border: "1px solid var(--border)",
                padding: "6px 14px",
                borderRadius: 999,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Upgrade to Pro
            </Link>
          )}
        </div>
      </div>

      <div className="chat-area" id="chatArea" style={{ maxWidth: 840, margin: "0 auto", padding: "32px 16px" }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: 8 }}>
            Welcome back, {greetingName}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
            Here is your daily learning snapshot for {profile?.targetExam || "JEE / Board preparation"}.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
              Active Streak
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)", marginTop: 6 }}>
              🔥 {stats.streak} Days
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Keep it up today</div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
              Mastery Index
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#4ade80", marginTop: 6 }}>
              {stats.masteryScore}%
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Across your active subjects</div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
              Quizzes Solved
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginTop: 6 }}>
              {stats.quizzesCompleted}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>With active recall analysis</div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
              Plan Status
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: isPro ? "var(--accent)" : "var(--text-primary)", marginTop: 10 }}>
              {isPro ? "Pro Member" : "Free Plan (20/day)"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {isPro ? "Unlimited chats & planner" : "Upgrade for unmetered AI"}
            </div>
          </div>
        </div>

        {/* Action Hub */}
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
          Recommended Actions Today
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 36 }}>
          <Link
            href="/chat"
            style={{
              textDecoration: "none",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 22,
              transition: "transform 0.2s, border-color 0.2s",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 24, marginBottom: 10 }}>💬</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                AI Tutor Chat
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Ask any question in Physics, Chemistry, or Math. Work through tricky concepts step-by-step.
              </p>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
              Open Tutor →
            </div>
          </Link>

          <Link
            href="/arena"
            style={{
              textDecoration: "none",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 22,
              transition: "transform 0.2s, border-color 0.2s",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 24, marginBottom: 10 }}>⚔️</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                Practice Arena
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Test your syllabus chapters in diagnostic test battles. Spot weaknesses before real exams.
              </p>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
              Enter Arena →
            </div>
          </Link>

          <Link
            href="/planner"
            style={{
              textDecoration: "none",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 22,
              transition: "transform 0.2s, border-color 0.2s",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 24, marginBottom: 10 }}>📅</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                Study Planner
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                View your target syllabus schedule and daily chapter tasks tailored to your exam target.
              </p>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
              Open Planner →
            </div>
          </Link>

          <Link
            href="/learning-hub"
            style={{
              textDecoration: "none",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 22,
              transition: "transform 0.2s, border-color 0.2s",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 24, marginBottom: 10 }}>🧠</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                Learning Hub
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Feynman technique explain-back mode, prerequisite graphs, and topic mastery models.
              </p>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
              Explore Hub →
            </div>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
