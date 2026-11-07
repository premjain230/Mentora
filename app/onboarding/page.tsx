"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { initFirebase } from "../../lib/firebase";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [uid, setUid] = useState<string | null>(null);

  // Form states
  const [board, setBoard] = useState("CBSE");
  const [grade, setGrade] = useState("Class 12");
  const [targetExam, setTargetExam] = useState("JEE Main & Advanced");
  const [dailyHours, setDailyHours] = useState(4);
  const [prioritySubjects, setPrioritySubjects] = useState<string[]>(["Physics", "Chemistry"]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    initFirebase().then(({ auth }) => {
      if (!auth) {
        setLoading(false);
        return;
      }
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          router.push("/login");
          return;
        }
        setUid(user.uid);
        setLoading(false);
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  const toggleSubject = (sub: string) => {
    if (prioritySubjects.includes(sub)) {
      setPrioritySubjects(prioritySubjects.filter((s) => s !== sub));
    } else {
      setPrioritySubjects([...prioritySubjects, sub]);
    }
  };

  const handleComplete = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const { db } = await initFirebase();
      if (!db) return;

      const profileRef = doc(db, "users", uid, "learning", "profile");
      await setDoc(
        profileRef,
        {
          board,
          grade,
          targetExam,
          dailyHours,
          subjects: prioritySubjects,
          onboardingComplete: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.push("/home");
    } catch (err) {
      console.error("Onboarding error:", err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="onboard-viewport">
        <div className="onboard-loading-box">
          <div className="onboard-spinner" aria-hidden="true" />
          <p className="onboard-loading-text">Preparing your learning environment…</p>
        </div>
        <style jsx>{`
          .onboard-viewport {
            min-height: 100vh;
            min-height: 100dvh;
            display: grid;
            place-items: center;
            background: var(--bg-base, #000000);
            color: var(--text-primary, #FFFFFF);
            font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          }
          .onboard-loading-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          .onboard-spinner {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid var(--border, rgba(255, 255, 255, 0.1));
            border-top-color: var(--accent, #3b82f6);
            animation: spin 0.8s linear infinite;
          }
          .onboard-loading-text {
            font-size: 14px;
            color: var(--text-muted, #A3A3A3);
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="onboard-viewport">
      <div className="onboard-container">
        <div className="onboard-header">
          <Link href="/" className="onboard-brand">
            <img
              src="/learningallied-white.svg"
              alt="Learning Allied"
              width={28}
              height={28}
              className="onboard-logo onboard-logo-dark"
            />
            <img
              src="/learningallied-black.svg"
              alt="Learning Allied"
              width={28}
              height={28}
              className="onboard-logo onboard-logo-light"
            />
            <span className="onboard-brand-name">Learning Allied</span>
          </Link>
          <div className="onboard-step-badge">
            <span className="step-dot" />
            <span>Step {step + 1} of 3</span>
          </div>
        </div>

        <div className="onboard-card">
          {step === 0 && (
            <div className="onboard-step-content">
              <div className="step-tag">Step 1 — Foundation</div>
              <h1 className="step-title">What exam are you preparing for?</h1>
              <p className="step-desc">
                Your syllabus, adaptive questions, and daily AI tutor hints will match this target.
              </p>

              <div className="option-list">
                {[
                  { id: "JEE Main & Advanced", title: "JEE Main & Advanced", sub: "Physics, Chemistry & Mathematics for Engineering" },
                  { id: "NEET UG Medical", title: "NEET UG Medical", sub: "Physics, Chemistry & Biology for Medicine" },
                  { id: "CBSE Board", title: "CBSE Board", sub: "Standardized NCERT Class 9-12 curriculum" },
                  { id: "Maharashtra State Board", title: "Maharashtra State Board", sub: "State syllabus with full board alignment" },
                  { id: "General Science & Maths", title: "Foundation & General Prep", sub: "Core STEM concepts and problem-solving skills" },
                ].map((item) => {
                  const selected = targetExam === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTargetExam(item.id)}
                      className={`option-card ${selected ? "selected" : ""}`}
                    >
                      <div className="option-check">{selected ? "✓" : ""}</div>
                      <div className="option-text">
                        <span className="option-title">{item.title}</span>
                        <span className="option-sub">{item.sub}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="action-row">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-onboard primary"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="onboard-step-content">
              <div className="step-tag">Step 2 — Curriculum</div>
              <h1 className="step-title">Select your grade and board</h1>
              <p className="step-desc">
                We calibrate difficulty, topic prerequisites, and question style according to your level.
              </p>

              <div className="field-group">
                <label className="field-label" htmlFor="onboard-grade">Grade / Year</label>
                <div className="select-wrap">
                  <select
                    id="onboard-grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="onboard-select"
                  >
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                    <option value="Dropper / Gap Year">Dropper / Gap Year</option>
                    <option value="College / Other">College / Other</option>
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="onboard-board">Educational Board</label>
                <div className="select-wrap">
                  <select
                    id="onboard-board"
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="onboard-select"
                  >
                    <option value="CBSE">CBSE (Central Board)</option>
                    <option value="Maharashtra State Board">Maharashtra State Board</option>
                    <option value="ICSE / ISC">ICSE / ISC</option>
                    <option value="Other State Board">Other State Board</option>
                  </select>
                </div>
              </div>

              <div className="action-row dual">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="btn-onboard secondary"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-onboard primary"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboard-step-content">
              <div className="step-tag">Step 3 — Schedule</div>
              <h1 className="step-title">Priority subjects and daily focus</h1>
              <p className="step-desc">
                Choose the subjects you want to tackle first, and set an achievable daily study target.
              </p>

              <div className="subject-chip-cloud">
                {["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science"].map((sub) => {
                  const isSelected = prioritySubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubject(sub)}
                      className={`subject-chip ${isSelected ? "selected" : ""}`}
                    >
                      <span className="chip-icon">{isSelected ? "✓" : "+"}</span>
                      <span>{sub}</span>
                    </button>
                  );
                })}
              </div>

              <div className="slider-card">
                <div className="slider-head">
                  <span className="slider-label">Daily target study time</span>
                  <span className="slider-value">{dailyHours} hours / day</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Number(e.target.value))}
                  className="onboard-slider"
                  aria-label="Daily target study hours"
                />
                <div className="slider-ticks">
                  <span>1h</span>
                  <span>4h (Recommended)</span>
                  <span>8h</span>
                  <span>12h</span>
                </div>
              </div>

              <div className="action-row dual">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-onboard secondary"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  className="btn-onboard primary"
                >
                  Start Learning →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .onboard-viewport {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 32px 20px;
          background: var(--bg-base, #000000);
          color: var(--text-primary, #FFFFFF);
          font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          -webkit-font-smoothing: antialiased;
        }

        .onboard-container {
          width: 100%;
          max-width: 540px;
        }

        .onboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .onboard-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text-primary, #FFFFFF);
          font-weight: 700;
          font-size: 15px;
          letter-spacing: -0.02em;
        }

        .onboard-logo-light {
          display: none;
        }
        :global(.light-mode) .onboard-logo-dark {
          display: none;
        }
        :global(.light-mode) .onboard-logo-light {
          display: block;
        }

        .onboard-step-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px;
          border-radius: 999px;
          background: var(--bg-card, #0A0A0A);
          border: 1px solid var(--border, #262626);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary, #A3A3A3);
        }

        .step-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent, #3b82f6);
        }

        .onboard-card {
          background: var(--bg-card, #0A0A0A);
          border: 1px solid var(--border, #262626);
          border-radius: 14px;
          padding: 40px 36px;
          box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(16px);
        }

        :global(.light-mode) .onboard-card {
          background: #ffffff;
          border-color: #E5E5E5;
          box-shadow: 0 16px 48px -12px #E5E5E5;
        }

        .step-tag {
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--accent, #3b82f6);
          margin-bottom: 8px;
        }

        .step-title {
          font-family: var(--font-display, "Space Grotesk", sans-serif);
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.25;
          color: var(--text-primary, #FFFFFF);
          margin: 0 0 8px 0;
        }

        :global(.light-mode) .step-title {
          color: #111111;
        }

        .step-desc {
          font-size: 14px;
          line-height: 1.55;
          color: var(--text-secondary, #A3A3A3);
          margin: 0 0 28px 0;
        }

        .option-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 32px;
        }

        .option-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid var(--border, #262626);
          background: var(--bg-elevated, #111111);
          color: var(--text-primary, #FFFFFF);
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: all 0.18s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        :global(.light-mode) .option-card {
          background: #FFFFFF;
          border-color: #F0F0F0;
          color: #111111;
        }

        .option-card:hover {
          border-color: var(--border-hover, rgba(255, 255, 255, 0.22));
          transform: translateY(-1px);
        }

        .option-card.selected {
          border-color: var(--accent, #3b82f6);
          background: color-mix(in srgb, var(--accent, #3b82f6) 12%, var(--bg-elevated, #111111));
          box-shadow: 0 0 0 1px var(--accent, #3b82f6);
        }

        :global(.light-mode) .option-card.selected {
          background: rgba(37, 99, 235, 0.08);
        }

        .option-check {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 1.5px solid var(--border-strong, #525252);
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .option-card.selected .option-check {
          background: var(--accent, #3b82f6);
          border-color: var(--accent, #3b82f6);
        }

        .option-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .option-title {
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .option-sub {
          font-size: 12.5px;
          color: var(--text-muted, #A3A3A3);
        }

        .field-group {
          margin-bottom: 22px;
        }

        .field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary, #A3A3A3);
          margin-bottom: 8px;
        }

        .select-wrap {
          position: relative;
        }

        .onboard-select {
          width: 100%;
          padding: 13px 16px;
          border-radius: 12px;
          border: 1px solid var(--border-strong, #404040);
          background: var(--bg-elevated, #111111);
          color: var(--text-primary, #FFFFFF);
          font-family: inherit;
          font-size: 14.5px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.16s ease;
        }

        :global(.light-mode) .onboard-select {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.12);
          color: #111111;
        }

        .onboard-select:focus {
          border-color: var(--accent, #3b82f6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .subject-chip-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 28px;
        }

        .subject-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
          border-radius: 999px;
          border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
          background: var(--bg-elevated, #111111);
          color: var(--text-secondary, #A3A3A3);
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.16s ease;
        }

        :global(.light-mode) .subject-chip {
          background: #FFFFFF;
          border-color: #E5E5E5;
          color: #666666;
        }

        .subject-chip:hover {
          border-color: var(--border-hover, rgba(255, 255, 255, 0.25));
          color: var(--text-primary, #FFFFFF);
        }

        .subject-chip.selected {
          background: var(--accent, #3b82f6);
          border-color: var(--accent, #3b82f6);
          color: #ffffff;
        }

        .chip-icon {
          font-weight: 700;
          font-size: 13px;
        }

        .slider-card {
          padding: 20px;
          border-radius: 16px;
          background: var(--bg-elevated, #111111);
          border: 1px solid var(--border, #262626);
          margin-bottom: 32px;
        }

        :global(.light-mode) .slider-card {
          background: #FFFFFF;
          border-color: #F0F0F0;
        }

        .slider-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .slider-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary, #A3A3A3);
        }

        .slider-value {
          font-size: 14px;
          font-weight: 700;
          color: var(--accent, #3b82f6);
        }

        .onboard-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--border-strong, rgba(255, 255, 255, 0.16));
          outline: none;
          accent-color: var(--accent, #3b82f6);
          cursor: pointer;
        }

        .slider-ticks {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-muted, #737373);
          margin-top: 8px;
        }

        .action-row {
          display: flex;
        }

        .action-row.dual {
          gap: 12px;
        }

        .btn-onboard {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 600;
          border-radius: 12px;
          padding: 13px 24px;
          cursor: pointer;
          transition: all 0.16s cubic-bezier(0.2, 0.7, 0.2, 1);
          border: none;
        }

        .btn-onboard.primary {
          flex: 1;
          background: var(--accent, #3b82f6);
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.32);
        }

        .btn-onboard.primary:hover {
          background: var(--accent-strong, #60a5fa);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.42);
        }

        .btn-onboard.primary:active {
          transform: translateY(0);
        }

        .btn-onboard.secondary {
          background: transparent;
          border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.16));
          color: var(--text-secondary, #A3A3A3);
        }

        :global(.light-mode) .btn-onboard.secondary {
          border-color: rgba(0, 0, 0, 0.12);
          color: #666666;
        }

        .btn-onboard.secondary:hover {
          border-color: var(--text-primary, #FFFFFF);
          color: var(--text-primary, #FFFFFF);
        }

        @media (max-width: 600px) {
          .onboard-card {
            padding: 28px 20px;
            border-radius: 20px;
          }
          .step-title {
            font-size: 21px;
          }
        }
      `}</style>
    </div>
  );
}
