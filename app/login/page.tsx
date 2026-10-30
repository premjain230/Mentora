"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { initFirebase } from "../../lib/firebase";

const SUPPORT_EMAIL = "hello@learningallied.com";

function authErrorMessage(error: any, fallback: string): string {
  const code = error?.code as string | undefined;
  const message = String(error?.message || "");

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "That email and password combination doesn't match an account.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support if you need help.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled for your account. Contact support.";
    case "auth/unauthorized-domain":
      return "Google sign-in is not available on this domain yet. Please use email and password.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using another sign-in method.";
    default:
      break;
  }

  if (message.toLowerCase().includes("configuration")) {
    return "Sign-in is temporarily unavailable. Please refresh the page and try again.";
  }

  return fallback;
}

/**
 * Errors the UI already explains to the user. They are normal outcomes of a
 * mistyped password or a dismissed popup, so they should not be reported as
 * console errors — only genuinely unexpected failures are.
 */
function isExpectedAuthError(error: any): boolean {
  const code = String(error?.code || "");
  return [
    "auth/invalid-credential",
    "auth/wrong-password",
    "auth/user-not-found",
    "auth/invalid-email",
    "auth/too-many-requests",
    "auth/popup-closed-by-user",
    "auth/cancelled-popup-request",
    "auth/popup-blocked",
    "auth/unauthorized-domain",
    "auth/account-exists-with-different-credential",
  ].includes(code);
}

function logAuthFailure(label: string, error: any) {
  if (isExpectedAuthError(error)) {
    console.warn(`${label}: ${error?.code || "unknown"}`);
    return;
  }
  console.error(`${label}:`, error);
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.9 10.9 0 0112 5c5 0 9 4.5 9 7 0 .9-.6 2.1-1.7 3.2M6.2 6.7C3.9 8.2 3 10.1 3 12c0 2.5 4 7 9 7 1.4 0 2.7-.35 3.8-.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ThemeIcon({ theme }: { theme: "dark" | "light" }) {
  return theme === "dark" ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 14.3A8.5 8.5 0 019.7 3.5a8.5 8.5 0 1010.8 10.8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`auth-brand-link ${className}`.trim()}>
      <img
        src="/learningallied-white.svg"
        alt=""
        width={32}
        height={32}
        className="auth-logo auth-logo-dark"
      />
      <img
        src="/learningallied-black.svg"
        alt=""
        width={32}
        height={32}
        className="auth-logo auth-logo-light"
      />
      <span>Learning Allied</span>
    </Link>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("learning-allied-theme");
      setTheme(stored === "light" ? "light" : "dark");
    } catch {
      /* Theme persistence is optional. */
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("learning-allied-theme", nextTheme);
      document.documentElement.classList.toggle("light-mode", nextTheme === "light");
    } catch {
      /* Ignore storage failures (private mode). */
    }
  };

  const clearMessages = () => {
    if (errorMsg) setErrorMsg("");
    if (infoMsg) setInfoMsg("");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setErrorMsg("Enter your email address and password to continue.");
      setInfoMsg("");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      const { auth } = await initFirebase();
      if (!auth) throw new Error("Firebase configuration is unavailable.");

      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push(cred.user.emailVerified ? "/home" : "/verify-email");
    } catch (err) {
      logAuthFailure("Login failed", err);
      setErrorMsg(
        authErrorMessage(err, "Could not sign in. Please check your details and try again.")
      );
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
      if (!auth) throw new Error("Firebase configuration is unavailable.");

      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) router.push("/home");
    } catch (err: any) {
      if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      logAuthFailure("Google sign-in failed", err);
      setErrorMsg(
        authErrorMessage(err, "Google sign-in didn't complete. Please try again.")
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg("Enter your email address above, then choose “Forgot password?”.");
      setInfoMsg("");
      return;
    }

    setErrorMsg("");
    setInfoMsg("");

    try {
      const { auth } = await initFirebase();
      if (!auth) throw new Error("Firebase configuration is unavailable.");

      await sendPasswordResetEmail(auth, email.trim());
      setInfoMsg("Password reset link sent. Check your inbox and spam folder.");
    } catch (err) {
      logAuthFailure("Reset email error", err);
      setErrorMsg(
        authErrorMessage(
          err,
          "We couldn't send the reset email. Check the address and try again."
        )
      );
    }
  };

  const busy = loading || googleLoading;

  return (
    <div className="auth-page">
      <button
        type="button"
        className="auth-theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      >
        <ThemeIcon theme={theme} />
      </button>

      <div className="auth-layout">
        <aside className="auth-brand" aria-label="About Learning Allied">
          <BrandMark />

          <div className="auth-brand-copy">
            <p className="auth-eyebrow">Your study desk</p>
            <h1 className="auth-headline">
              Pick up exactly
              <br />
              where you left off.
            </h1>
            <p className="auth-subhead">
              Your plan, progress and AI tutor are waiting. Sign in to continue
              preparing for JEE, NEET and your board exams.
            </p>

            <ul className="auth-points">
              <li>
                <span className="auth-check" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6.2l2.2 2.2 4.8-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Adaptive AI tutor for every topic
              </li>
              <li>
                <span className="auth-check" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6.2l2.2 2.2 4.8-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Daily plans, spaced review and practice
              </li>
              <li>
                <span className="auth-check" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6.2l2.2 2.2 4.8-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Progress that stays in sync across devices
              </li>
            </ul>
          </div>

          <p className="auth-legal">
            Private by default. Your study data is never sold.
          </p>
        </aside>

        <main className="auth-panel">
          <BrandMark className="auth-mobile-brand" />

          <div className="auth-card">
            <header className="auth-card-head">
              <h2>Log in</h2>
              <p>Welcome back. Enter your details to continue.</p>
            </header>

            <div className="auth-messages" aria-live="polite">
              {errorMsg && (
                <div className="auth-alert auth-alert-error" role="alert">
                  <span className="auth-alert-dot" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {infoMsg && (
                <div className="auth-alert auth-alert-info" role="status">
                  <span className="auth-alert-dot" aria-hidden="true" />
                  <span>{infoMsg}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleEmailLogin} noValidate>
              <div className="auth-field">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearMessages();
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="email"
                />
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="login-password">Password</label>
                  <button
                    type="button"
                    className="auth-link"
                    onClick={handleForgotPassword}
                    disabled={busy}
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="auth-input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearMessages();
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-reveal"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    tabIndex={-1}
                  >
                    <EyeIcon hidden={showPassword} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={busy}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    Logging in…
                  </>
                ) : (
                  "Log in"
                )}
              </button>
            </form>

            <div className="auth-divider" aria-hidden="true">
              <span>or</span>
            </div>

            <button
              type="button"
              className="auth-google"
              onClick={handleGoogleLogin}
              disabled={busy}
              aria-busy={googleLoading}
            >
              {googleLoading ? (
                <span className="auth-spinner auth-spinner-neutral" aria-hidden="true" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>{googleLoading ? "Connecting…" : "Continue with Google"}</span>
            </button>

            <p className="auth-switch">
              New to Learning Allied?{" "}
              <Link href="/signup">Create an account</Link>
            </p>
          </div>

          <p className="auth-support">
            Trouble signing in?{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>Contact support</a>
          </p>
        </main>
      </div>
    </div>
  );
}
