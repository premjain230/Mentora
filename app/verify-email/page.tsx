"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, sendEmailVerification, signOut } from "firebase/auth";
import { initFirebase } from "../../lib/firebase";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    initFirebase().then(({ auth }) => {
      if (!auth) return;
      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!user) {
          router.push("/login");
        } else {
          setEmail(user.email || "");
          if (user.emailVerified) {
            router.push("/home");
          }
        }
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  const handleResend = async () => {
    setResending(true);
    setMsg("");
    setErrorMsg("");
    try {
      const { auth } = await initFirebase();
      if (auth?.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setMsg("Verification email resent! Please check your spam folder too.");
      }
    } catch (err: any) {
      console.error("Resend error:", err);
      setErrorMsg("Please wait a moment before requesting another email.");
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    setChecking(true);
    setMsg("");
    setErrorMsg("");
    try {
      const { auth } = await initFirebase();
      if (auth?.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          router.push("/home");
        } else {
          setErrorMsg("Your email is not verified yet. Click the link in your email and try again.");
        }
      }
    } catch (err) {
      console.error("Check error:", err);
      setErrorMsg("Could not verify status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    const { auth } = await initFirebase();
    if (auth) await signOut(auth);
    router.push("/login");
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
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--la-surface, #111113)",
          border: "1px solid var(--la-line, rgba(255,255,255,0.09))",
          borderRadius: 20,
          padding: "36px 32px",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(255, 138, 31, 0.12)",
            color: "#ff8a1f",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 20px",
            fontSize: 24,
          }}
        >
          ✉
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "var(--la-text, #fff)" }}>
          Verify your email
        </h1>
        <p style={{ fontSize: 14, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.6, marginBottom: 20 }}>
          We sent a verification link to <strong style={{ color: "var(--la-text, #fff)" }}>{email || "your email"}</strong>.
          Please click the link in that email to activate your account.
        </p>

        {msg && (
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
            {msg}
          </div>
        )}

        {errorMsg && (
          <div
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

        <button
          type="button"
          onClick={handleCheckVerified}
          disabled={checking}
          className="btn btn-primary"
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 12,
            cursor: checking ? "not-allowed" : "pointer",
          }}
        >
          {checking ? "Checking status…" : "I&apos;ve verified my email"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="btn btn-secondary"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            fontSize: 14,
            marginBottom: 16,
            cursor: resending ? "not-allowed" : "pointer",
          }}
        >
          {resending ? "Sending…" : "Resend verification email"}
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          style={{
            background: "none",
            border: "none",
            fontSize: 13,
            color: "var(--la-faint, #71717a)",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
