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
        setMsg("Verification email resent! Please check your inbox and spam folder.");
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
          setErrorMsg("Your email is not verified yet. Please click the link in your email and try again.");
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
    <div className="verify-viewport">
      <div className="verify-container">
        <div className="verify-brand-row">
          <Link href="/" className="verify-brand">
            <img
              src="/learningallied-white.svg"
              alt="Learning Allied"
              width={32}
              height={32}
              className="verify-logo-dark"
            />
            <img
              src="/learningallied-black.svg"
              alt="Learning Allied"
              width={32}
              height={32}
              className="verify-logo-light"
            />
            <span className="verify-brand-name">Learning Allied</span>
          </Link>
        </div>

        <div className="verify-card">
          <div className="verify-icon-box" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <h1 className="verify-title">Verify your email address</h1>
          <p className="verify-desc">
            We sent a verification link to <strong className="verify-email-text">{email || "your email"}</strong>.
            Click the link in the message to activate your student account.
          </p>

          {msg && (
            <div className="verify-alert success" role="status">
              <span className="alert-dot" />
              <span>{msg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="verify-alert error" role="alert">
              <span className="alert-dot" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="verify-actions">
            <button
              type="button"
              onClick={handleCheckVerified}
              disabled={checking}
              className="btn-verify primary"
            >
              {checking ? "Checking status…" : "I've verified my email"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="btn-verify secondary"
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
          </div>

          <div className="verify-footer">
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-signout"
            >
              Sign out and return to login
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .verify-viewport {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 32px 20px;
          background: var(--bg-base, #08090d);
          color: var(--text-primary, #f8fafc);
          font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          -webkit-font-smoothing: antialiased;
        }

        .verify-container {
          width: 100%;
          max-width: 460px;
        }

        .verify-brand-row {
          display: flex;
          justify-content: center;
          margin-bottom: 28px;
        }

        .verify-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text-primary, #f8fafc);
          font-weight: 700;
          font-size: 16px;
          letter-spacing: -0.02em;
        }

        .verify-logo-light {
          display: none;
        }
        :global(.light-mode) .verify-logo-dark {
          display: none;
        }
        :global(.light-mode) .verify-logo-light {
          display: block;
        }

        .verify-card {
          background: var(--bg-card, #0f1420);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.09));
          border-radius: 24px;
          padding: 40px 32px;
          box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.45);
          text-align: center;
        }

        :global(.light-mode) .verify-card {
          background: #ffffff;
          border-color: rgba(0, 0, 0, 0.08);
          box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.08);
        }

        .verify-icon-box {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: rgba(59, 130, 246, 0.12);
          color: var(--accent, #3b82f6);
          border: 1px solid rgba(59, 130, 246, 0.22);
          display: grid;
          place-items: center;
          margin: 0 auto 20px;
        }

        .verify-title {
          font-family: var(--font-display, "Space Grotesk", sans-serif);
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-primary, #f8fafc);
          margin: 0 0 10px 0;
        }

        :global(.light-mode) .verify-title {
          color: #0f172a;
        }

        .verify-desc {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-secondary, #94a3b8);
          margin: 0 0 24px 0;
        }

        .verify-email-text {
          color: var(--text-primary, #f8fafc);
          word-break: break-all;
        }

        :global(.light-mode) .verify-email-text {
          color: #0f172a;
        }

        .verify-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.45;
          text-align: left;
          margin-bottom: 20px;
        }

        .verify-alert.success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
        }

        .verify-alert.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .alert-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }

        .verify-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
        }

        .btn-verify {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 600;
          border-radius: 12px;
          padding: 13px 20px;
          cursor: pointer;
          transition: all 0.16s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .btn-verify.primary {
          background: var(--accent, #3b82f6);
          color: #ffffff;
          border: none;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.32);
        }

        .btn-verify.primary:hover:not(:disabled) {
          background: var(--accent-strong, #60a5fa);
          transform: translateY(-1px);
        }

        .btn-verify.secondary {
          background: transparent;
          border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.16));
          color: var(--text-secondary, #94a3b8);
        }

        :global(.light-mode) .btn-verify.secondary {
          border-color: rgba(0, 0, 0, 0.12);
          color: #475569;
        }

        .btn-verify.secondary:hover:not(:disabled) {
          border-color: var(--text-primary, #f8fafc);
          color: var(--text-primary, #f8fafc);
        }

        .btn-verify:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-signout {
          background: none;
          border: none;
          font-family: inherit;
          font-size: 13px;
          color: var(--text-muted, #64748b);
          cursor: pointer;
          transition: color 0.15s ease;
        }

        .btn-signout:hover {
          color: var(--text-primary, #f8fafc);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
