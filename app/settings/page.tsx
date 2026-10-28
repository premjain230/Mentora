"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthContext";
import { initFirebase } from "../../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function SettingsPage() {
  const { user, isPro, signOut } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("learning-allied-theme");
      if (stored === "light") {
        setTheme("light");
      }
    } catch {}
  }, []);

  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    try {
      localStorage.setItem("learning-allied-theme", newTheme);
      if (newTheme === "light") {
        document.documentElement.classList.add("light-mode");
      } else {
        document.documentElement.classList.remove("light-mode");
      }
    } catch {}
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      const { auth } = await initFirebase();
      if (auth) {
        await sendPasswordResetEmail(auth, user.email);
        setResetSent(true);
      }
    } catch (err) {
      console.error("Password reset error:", err);
    }
  };

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Settings</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
          Account Settings &amp; Preferences
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}>
          Manage your theme, security and active session preferences.
        </p>

        {/* Theme Settings */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            Interface Theme
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Choose between true-black Orbit mode or light mode.
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: `1px solid ${theme === "dark" ? "var(--accent)" : "var(--border)"}`,
                background: theme === "dark" ? "rgba(255,138,31,0.14)" : "var(--bg-elevated)",
                color: theme === "dark" ? "var(--accent)" : "var(--text-muted)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              🌙 Dark (Orbit)
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: `1px solid ${theme === "light" ? "var(--accent)" : "var(--border)"}`,
                background: theme === "light" ? "rgba(255,138,31,0.14)" : "var(--bg-elevated)",
                color: theme === "light" ? "var(--accent)" : "var(--text-muted)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              ☀ Light Mode
            </button>
          </div>
        </div>

        {/* Security & Password */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            Security &amp; Password
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Send a password reset link to your email ({user?.email || "registered email"}).
          </p>

          {resetSent ? (
            <div style={{ fontSize: 13, color: "#4ade80", fontWeight: 600 }}>
              ✓ Reset email sent! Check your inbox.
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePasswordReset}
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: "8px 16px" }}
            >
              Send Password Reset Email
            </button>
          )}
        </div>

        {/* Session Management */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            Session
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Sign out of your account on this device.
          </p>

          <button
            type="button"
            onClick={signOut}
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: "8px 16px", color: "#f87171", borderColor: "rgba(239, 68, 68, 0.3)" }}
          >
            Sign out of Learning Allied
          </button>
        </div>
      </div>
    </AppShell>
  );
}
