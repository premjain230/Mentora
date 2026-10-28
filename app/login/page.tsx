"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { initFirebase } from "../../lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      const { auth } = await initFirebase();
      if (!auth) throw new Error("Firebase auth unavailable.");

      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        router.push("/verify-email");
      } else {
        router.push("/home");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      let msg = "Could not sign in. Please verify your credentials.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        msg = "Invalid email or password.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Access temporarily disabled due to failed attempts. Try again later.";
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      const { auth, googleProvider } = await initFirebase();
      if (!auth) throw new Error("Firebase auth unavailable.");

      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        router.push("/home");
      }
    } catch (err: any) {
      console.error("Google sign-in failed:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setErrorMsg("Google sign-in was not completed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg("Enter your email address above to reset password.");
      return;
    }
    try {
      const { auth } = await initFirebase();
      if (!auth) throw new Error("Firebase auth unavailable.");

      await sendPasswordResetEmail(auth, email.trim());
      setInfoMsg("Password reset email sent! Check your inbox.");
      setErrorMsg("");
    } catch (err: any) {
      console.error("Reset email error:", err);
      setErrorMsg("Could not send password reset email. Check the email address.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        background: "var(--bg-base, #000)",
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/learningallied-white.svg" alt="Learning Allied logo" width={38} height={38} />
          <span style={{ fontSize: 20, fontWeight: 700, color: "var(--la-text, #fff)" }}>
            Learning Allied
          </span>
        </Link>
      </div>

      <div
        className="auth-box"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--la-surface, #111113)",
          border: "1px solid var(--la-line, rgba(255,255,255,0.09))",
          borderRadius: 20,
          padding: "36px 32px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "var(--la-text, #fff)" }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 14, color: "var(--la-muted, #a1a1aa)", marginBottom: 24 }}>
          Log in to continue your learning journey.
        </p>

        {errorMsg && (
          <div
            id="authMsg"
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
            }}
          >
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
            }}
          >
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleEmailLogin} noValidate>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--la-muted, #a1a1aa)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))",
                background: "var(--la-surface-2, #17171a)",
                color: "var(--la-text, #fff)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--la-muted, #a1a1aa)" }}>
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 12,
                  color: "var(--la-accent, #ff8a1f)",
                  cursor: "pointer",
                }}
              >
                Forgot password?
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))",
                  background: "var(--la-surface-2, #17171a)",
                  color: "var(--la-text, #fff)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--la-muted, #a1a1aa)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 16,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0", color: "var(--la-faint, #71717a)", fontSize: 13 }}>
          <div style={{ flex: 1, height: 1, background: "var(--la-line, rgba(255,255,255,0.09))" }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--la-line, rgba(255,255,255,0.09))" }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="btn btn-secondary"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            cursor: googleLoading ? "not-allowed" : "pointer",
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>{googleLoading ? "Connecting…" : "Continue with Google"}</span>
        </button>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 13.5, color: "var(--la-muted, #a1a1aa)" }}>
          New to Learning Allied?{" "}
          <Link href="/signup" style={{ color: "var(--la-accent, #ff8a1f)", fontWeight: 600 }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
