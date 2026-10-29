"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { initFirebase } from "../../lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setErrorMsg("Please enter your first name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setErrorMsg("");
    setStep(2);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setErrorMsg("Please select who you are.");
      return;
    }
    if (!goal) {
      setErrorMsg("Please select your main goal.");
      return;
    }
    if (!agreeTerms) {
      setErrorMsg("Please accept the terms and privacy policy to proceed.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { auth, db } = await initFirebase();
      if (!auth || !db) throw new Error("Firebase is not initialized.");

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      await updateProfile(user, { displayName: fullName });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: fullName,
        email: user.email,
        role,
        goal,
        exam: role.includes("JEE") ? "JEE" : role.includes("NEET") ? "NEET" : "Board",
        plan: "free",
        createdAt: serverTimestamp(),
      });

      try {
        await sendEmailVerification(user);
      } catch (err) {
        console.warn("Email verification send warning:", err);
      }

      router.push("/verify-email");
    } catch (err: any) {
      console.error("Signup error:", err);
      let msg = "Could not create account. Please check your details.";
      if (err.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Please log in.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      }
      setErrorMsg(msg);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setErrorMsg("");

    try {
      const { auth, db, googleProvider } = await initFirebase();
      if (!auth || !db) throw new Error("Firebase is not initialized.");

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            displayName: user.displayName || "Student",
            email: user.email,
            plan: "free",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        router.push("/onboarding");
      }
    } catch (err: any) {
      console.error("Google signup error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setErrorMsg("Google sign-in was not completed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
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
          <img src="/learningallied-white.svg" alt="Learning Allied logo" width={38} height={38} style={{ width: 38, height: 38 }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: "var(--la-text, #fff)" }}>
            Learning Allied
          </span>
        </Link>
      </div>

      <div
        className="auth-box"
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--la-surface, #111113)",
          border: "1px solid var(--la-line, rgba(255,255,255,0.09))",
          borderRadius: 20,
          padding: "36px 32px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--la-accent, #ff8a1f)" }}>
            Step {step} of 2
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <span style={{ width: 24, height: 4, borderRadius: 2, background: "var(--la-accent, #ff8a1f)" }} />
            <span style={{ width: 24, height: 4, borderRadius: 2, background: step === 2 ? "var(--la-accent, #ff8a1f)" : "var(--la-line, rgba(255,255,255,0.16))" }} />
          </div>
        </div>

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

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} noValidate>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "var(--la-text, #fff)" }}>
              Create your account
            </h1>
            <p style={{ fontSize: 14, color: "var(--la-muted, #a1a1aa)", marginBottom: 24 }}>
              Join thousands of students learning smarter with Learning Allied.
            </p>

            <div className="auth-row-2">
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--la-muted, #a1a1aa)" }}>
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prem"
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))",
                    background: "var(--la-surface-2, #17171a)",
                    color: "var(--la-text, #fff)",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--la-muted, #a1a1aa)" }}>
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Jain"
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))",
                    background: "var(--la-surface-2, #17171a)",
                    color: "var(--la-text, #fff)",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
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

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--la-muted, #a1a1aa)" }}>
                Password (min 6 characters)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
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

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Continue to Step 2 →
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0", color: "var(--la-faint, #71717a)", fontSize: 13 }}>
              <div style={{ flex: 1, height: 1, background: "var(--la-line, rgba(255,255,255,0.09))" }} />
              <span>or</span>
              <div style={{ flex: 1, height: 1, background: "var(--la-line, rgba(255,255,255,0.09))" }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
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
              <span>{googleLoading ? "Connecting…" : "Sign up with Google"}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateAccount} noValidate>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "var(--la-text, #fff)" }}>
              Tell us about you
            </h1>
            <p style={{ fontSize: 14, color: "var(--la-muted, #a1a1aa)", marginBottom: 24 }}>
              We&apos;ll personalise Learning Allied around your targets.
            </p>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--la-muted, #a1a1aa)" }}>
                I am a…
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))",
                  background: "var(--la-surface-2, #17171a)",
                  color: "var(--la-text, #fff)",
                  fontSize: 14,
                  outline: "none",
                }}
              >
                <option value="">Select an option</option>
                <option value="JEE / Engineering aspirant">JEE / Engineering aspirant</option>
                <option value="NEET / Medical aspirant">NEET / Medical aspirant</option>
                <option value="High school student">High school student (Class 9–12)</option>
                <option value="Undergraduate student">Undergraduate student</option>
                <option value="Self-learner">Self-learner</option>
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--la-muted, #a1a1aa)" }}>
                My main goal is to…
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))",
                  background: "var(--la-surface-2, #17171a)",
                  color: "var(--la-text, #fff)",
                  fontSize: 14,
                  outline: "none",
                }}
              >
                <option value="">Select an option</option>
                <option value="Crack JEE / NEET">Crack JEE / NEET</option>
                <option value="Score better in board exams">Score 90%+ in board exams</option>
                <option value="Learn a subject deeply">Learn subjects deeply</option>
                <option value="Build a daily study habit">Build a daily study habit</option>
                <option value="Revise faster before exams">Revise faster before exams</option>
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--la-muted, #a1a1aa)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>
                  I agree to the Terms of Service and Privacy Policy.
                </span>
              </label>
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
                marginBottom: 10,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-secondary"
              style={{ width: "100%", padding: "12px", borderRadius: 10, fontSize: 14 }}
            >
              ← Back
            </button>
          </form>
        )}

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 13.5, color: "var(--la-muted, #a1a1aa)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--la-accent, #ff8a1f)", fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}