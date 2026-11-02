"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { initFirebase } from "../../lib/firebase";

export default function PlannerOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [examDate, setExamDate] = useState("2027-01-20");
  const [studyDays, setStudyDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    initFirebase().then(({ auth }) => {
      if (!auth) {
        setLoading(false);
        return;
      }
      unsubscribe = onAuthStateChanged(auth, (user) => {
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

  const toggleDay = (day: string) => {
    if (studyDays.includes(day)) {
      setStudyDays(studyDays.filter((d) => d !== day));
    } else {
      setStudyDays([...studyDays, day]);
    }
  };

  const handleSkip = async () => {
    if (uid) {
      try {
        const { db } = await initFirebase();
        if (db) {
          await setDoc(
            doc(db, "users", uid, "planner", "config"),
            {
              examDate: examDate || "2027-01-20",
              studyDays: studyDays && studyDays.length ? studyDays : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              hoursPerDay: hoursPerDay || 4,
              configuredAt: serverTimestamp(),
              skipped: true,
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.error("Planner skip error:", err);
      }
    }
    router.push("/planner");
  };

  const handleSavePlan = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const { db } = await initFirebase();
      if (!db) return;

      await setDoc(
        doc(db, "users", uid, "planner", "config"),
        {
          examDate,
          studyDays,
          hoursPerDay,
          configuredAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.push("/planner");
    } catch (err) {
      console.error("Planner onboarding error:", err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="planner-onboard-viewport">
        <div className="planner-onboard-loading">
          <div className="planner-onboard-spinner" aria-hidden="true" />
          <p>Configuring your study planner…</p>
        </div>
        <style jsx>{`
          .planner-onboard-viewport {
            min-height: 100vh;
            min-height: 100dvh;
            display: grid;
            place-items: center;
            background: var(--bg-base, #000000);
            color: var(--text-primary, #FFFFFF);
            font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          }
          .planner-onboard-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          .planner-onboard-spinner {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid var(--border, rgba(255, 255, 255, 0.1));
            border-top-color: var(--accent, #3b82f6);
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="planner-onboard-viewport">
      <div className="planner-onboard-container">
        <div className="planner-onboard-header">
          <Link href="/planner" className="planner-onboard-brand">
            <img
              src="/learningallied-white.svg"
              alt="Learning Allied"
              width={28}
              height={28}
              className="planner-logo-dark"
            />
            <img
              src="/learningallied-black.svg"
              alt="Learning Allied"
              width={28}
              height={28}
              className="planner-logo-light"
            />
            <span className="planner-brand-text">Learning Allied</span>
          </Link>
          <div className="planner-badge">
            <span>Adaptive Planner</span>
          </div>
        </div>

        <div className="planner-onboard-card">
          <div className="planner-tag">Exam Countdown &amp; Schedule</div>
          <h1 className="planner-title">Setup your Study Plan</h1>
          <p className="planner-desc">
            Generate an intelligent day-by-day roadmap tailored to your target exam date and weekly routine.
          </p>

          <div className="form-field">
            <label className="field-label" htmlFor="exam-date-input">
              Target Exam Date
            </label>
            <div className="input-wrap">
              <input
                id="exam-date-input"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="planner-input"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Active Study Days Each Week</label>
            <div className="day-chips">
              {allDays.map((day) => {
                const active = studyDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`day-chip ${active ? "active" : ""}`}
                    aria-pressed={active}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="slider-card">
            <div className="slider-header">
              <span className="slider-label">Daily study availability</span>
              <span className="slider-val">{hoursPerDay} hours / day</span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className="planner-slider"
              aria-label="Daily study hours"
            />
            <div className="slider-ticks">
              <span>1h</span>
              <span>4h (Balanced)</span>
              <span>8h</span>
              <span>12h</span>
            </div>
          </div>

          <div className="action-row action-row-dual">
            <button
              type="button"
              onClick={handleSkip}
              className="btn-planner-skip"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleSavePlan}
              className="btn-planner-submit"
            >
              Generate Personalized Timetable →
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .planner-onboard-viewport {
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

        .planner-onboard-container {
          width: 100%;
          max-width: 520px;
        }

        .planner-onboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .planner-onboard-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text-primary, #FFFFFF);
          font-weight: 700;
          font-size: 15px;
          letter-spacing: -0.02em;
        }

        .planner-logo-light {
          display: none;
        }
        :global(.light-mode) .planner-logo-dark {
          display: none;
        }
        :global(.light-mode) .planner-logo-light {
          display: block;
        }

        .planner-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px;
          border-radius: 999px;
          background: var(--bg-card, #0A0A0A);
          border: 1px solid var(--border, #262626);
          font-size: 12px;
          font-weight: 600;
          color: var(--accent, #3b82f6);
        }

        .planner-onboard-card {
          background: var(--bg-card, #0A0A0A);
          border: 1px solid var(--border, #262626);
          border-radius: 24px;
          padding: 36px 32px;
          box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.45);
        }

        :global(.light-mode) .planner-onboard-card {
          background: #ffffff;
          border-color: #E5E5E5;
          box-shadow: 0 16px 48px -12px #E5E5E5;
        }

        .planner-tag {
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--accent, #3b82f6);
          margin-bottom: 8px;
        }

        .planner-title {
          font-family: var(--font-display, "Space Grotesk", sans-serif);
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.25;
          color: var(--text-primary, #FFFFFF);
          margin: 0 0 8px 0;
        }

        :global(.light-mode) .planner-title {
          color: #111111;
        }

        .planner-desc {
          font-size: 14px;
          line-height: 1.55;
          color: var(--text-secondary, #A3A3A3);
          margin: 0 0 28px 0;
        }

        .form-field {
          margin-bottom: 24px;
        }

        .field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary, #A3A3A3);
          margin-bottom: 8px;
        }

        .planner-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid var(--border-strong, #404040);
          background: var(--bg-elevated, #111111);
          color: var(--text-primary, #FFFFFF);
          font-family: inherit;
          font-size: 14.5px;
          outline: none;
          transition: border-color 0.16s ease;
        }

        :global(.light-mode) .planner-input {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.12);
          color: #111111;
        }

        .planner-input:focus {
          border-color: var(--accent, #3b82f6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .day-chips {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }

        .day-chip {
          padding: 10px 0;
          border-radius: 10px;
          border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
          background: var(--bg-elevated, #111111);
          color: var(--text-secondary, #A3A3A3);
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
          transition: all 0.16s ease;
        }

        :global(.light-mode) .day-chip {
          background: #FFFFFF;
          border-color: #E5E5E5;
          color: #666666;
        }

        .day-chip:hover {
          border-color: var(--border-hover, rgba(255, 255, 255, 0.25));
          color: var(--text-primary, #FFFFFF);
        }

        .day-chip.active {
          background: var(--accent, #3b82f6);
          border-color: var(--accent, #3b82f6);
          color: #ffffff;
        }

        .slider-card {
          padding: 18px 20px;
          border-radius: 16px;
          background: var(--bg-elevated, #111111);
          border: 1px solid var(--border, #262626);
          margin-bottom: 28px;
        }

        :global(.light-mode) .slider-card {
          background: #FFFFFF;
          border-color: #F0F0F0;
        }

        .slider-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .slider-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary, #A3A3A3);
        }

        .slider-val {
          font-size: 14px;
          font-weight: 700;
          color: var(--accent, #3b82f6);
        }

        .planner-slider {
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

        .action-row-dual {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-planner-skip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 600;
          border-radius: 12px;
          padding: 14px 20px;
          cursor: pointer;
          border: 1px solid var(--border-strong, #404040);
          background: transparent;
          color: var(--text-secondary, #A3A3A3);
          transition: all 0.16s ease;
          white-space: nowrap;
        }

        .btn-planner-skip:hover {
          color: var(--text-primary, #FFFFFF);
          border-color: var(--border-hover, rgba(255, 255, 255, 0.3));
          background: rgba(255, 255, 255, 0.04);
        }

        .btn-planner-submit {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 600;
          border-radius: 12px;
          padding: 14px 24px;
          cursor: pointer;
          border: none;
          background: var(--accent, #3b82f6);
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.32);
          transition: all 0.16s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .btn-planner-submit:hover {
          background: var(--accent-strong, #60a5fa);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.42);
        }

        .btn-planner-submit:active {
          transform: translateY(0);
        }

        @media (max-width: 600px) {
          .planner-onboard-card {
            padding: 24px 18px;
            border-radius: 20px;
          }
          .day-chips {
            gap: 4px;
          }
          .day-chip {
            font-size: 12px;
            padding: 8px 0;
          }
        }
      `}</style>
    </div>
  );
}
