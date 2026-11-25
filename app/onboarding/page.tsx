"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { initFirebase } from "../../lib/firebase";
import {
  COUNTRY_OPTIONS,
  GOAL_OPTIONS,
  LANGUAGE_OPTIONS,
  getTracksForCountry,
  getGradesForTrack,
  getSubjectsForTrack,
  getCountryOption,
} from "../../lib/learning/curriculum-options";

const PERSONA_OPTIONS = [
  { id: "mentor", emoji: "🧭", name: "Mentor", desc: "Patient, first-principles guidance with deep insight" },
  { id: "friendly", emoji: "🤝", name: "Companion", desc: "Supportive study partner who keeps you motivated" },
  { id: "motivator", emoji: "⚡", name: "Motivator", desc: "High energy, celebrates streaks and crushes goals" },
  { id: "deep-thinker", emoji: "🧠", name: "Deep Thinker", desc: "Explores why formulas work and mathematical intuition" },
  { id: "coach", emoji: "🎯", name: "Coach", desc: "Structured, exam-oriented precision and rigorous feedback" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [uid, setUid] = useState<string | null>(null);

  // Form State: Cascading Curriculum (detected from browser/storage, never hardcoded to a single country)
  const [country, setCountry] = useState("US");
  const [trackId, setTrackId] = useState("us_ap");
  const [grade, setGrade] = useState("Grade 12");
  const [prioritySubjects, setPrioritySubjects] = useState<string[]>(["Physics", "Chemistry", "Mathematics"]);
  const [academicGoal, setAcademicGoal] = useState("concept_mastery");
  const [dailyHours, setDailyHours] = useState(4);
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [personality, setPersonality] = useState("mentor");

  // Computed Cascades
  const availableTracks = getTracksForCountry(country);
  const availableGrades = getGradesForTrack(trackId);
  const availableSubjects = getSubjectsForTrack(trackId);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    initFirebase().then(({ auth, db }) => {
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

        // Preload any existing profile data if returning
        if (db) {
          try {
            const profileSnap = await getDoc(doc(db, "users", user.uid, "learning", "profile"));
            if (profileSnap.exists()) {
              const data = profileSnap.data();
              if (data.country) setCountry(data.country);
              if (data.board || data.trackId) setTrackId(data.board || data.trackId);
              if (data.grade) setGrade(data.grade);
              if (Array.isArray(data.subjects) && data.subjects.length > 0) setPrioritySubjects(data.subjects);
              if (data.academicGoal) setAcademicGoal(data.academicGoal);
              if (data.dailyHours) setDailyHours(Number(data.dailyHours));
              if (data.preferredLanguage) setPreferredLanguage(data.preferredLanguage);
              if (data.personality) setPersonality(data.personality);
            }
          } catch (e) {
            console.warn("Could not preload profile:", e);
          }
        }

        setLoading(false);
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  // When Country changes, update track, grade, and subjects cascade
  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const countryTracks = getTracksForCountry(newCountry);
    const firstTrack = countryTracks[0]?.id || "";
    setTrackId(firstTrack);

    const countryGrades = getGradesForTrack(firstTrack);
    setGrade(countryGrades[countryGrades.length - 1]?.id || countryGrades[0]?.id || "");

    const countrySubjects = getSubjectsForTrack(firstTrack);
    setPrioritySubjects(countrySubjects.slice(0, 3));
  };

  // When Track changes, update grade and subjects cascade
  const handleTrackChange = (newTrackId: string) => {
    setTrackId(newTrackId);
    const trackGrades = getGradesForTrack(newTrackId);
    setGrade(trackGrades[trackGrades.length - 1]?.id || trackGrades[0]?.id || "Class 12");

    const trackSubjects = getSubjectsForTrack(newTrackId);
    setPrioritySubjects(trackSubjects.slice(0, 3));
  };

  const toggleSubject = (sub: string) => {
    if (prioritySubjects.includes(sub)) {
      if (prioritySubjects.length === 1) return; // Keep at least one subject
      setPrioritySubjects(prioritySubjects.filter((s) => s !== sub));
    } else {
      setPrioritySubjects([...prioritySubjects, sub]);
    }
  };

  const handleComplete = async () => {
    if (!uid || submitting) return;
    setSubmitting(true);
    try {
      const { auth, db } = await initFirebase();
      if (!db) return;
      const currentUser = auth?.currentUser;

      const trackInfo = availableTracks.find((t) => t.id === trackId) || availableTracks[0];

      // 1. Save detailed profile in users/{uid}/learning/profile
      const profileRef = doc(db, "users", uid, "learning", "profile");
      await setDoc(
        profileRef,
        {
          country,
          board: trackId,
          trackId,
          trackName: trackInfo?.name || trackId,
          grade,
          subjects: prioritySubjects,
          academicGoal,
          dailyHours,
          preferredLanguage,
          personality,
          onboardingComplete: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 2. Mirror high-level preferences to root user doc for platform-wide compatibility
      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          displayName: currentUser?.displayName || "Student",
          email: currentUser?.email || null,
          country,
          board: trackId,
          trackId,
          grade,
          exam: trackInfo?.name || trackId,
          subjects: prioritySubjects,
          academicGoal,
          dailyHours,
          preferredLanguage,
          personality,
          onboardingComplete: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 3. Cache locally so immediate navigation across Learning Hub, Arena, and Tutor uses it
      try {
        localStorage.setItem("learning_allied_country", country);
        localStorage.setItem(
          "learning_allied_education_profile",
          JSON.stringify({
            country,
            track: trackId,
            classNum: grade,
            subjects: prioritySubjects,
            academicGoal,
            preferredLanguage,
            dailyHours,
            updatedAt: new Date().toISOString(),
          })
        );
        localStorage.setItem("learning-allied-personality", personality);
      } catch (_) {}

      router.push("/home");
    } catch (err) {
      console.error("Onboarding completion error:", err);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="onboard-viewport">
        <div className="onboard-loading-box">
          <div className="onboard-spinner" aria-hidden="true" />
          <p className="onboard-loading-text">Personalizing your learning environment…</p>
        </div>
        <style jsx>{`
          .onboard-viewport {
            min-height: 100vh;
            min-height: 100dvh;
            display: grid;
            place-items: center;
            background: var(--bg-base, #000000);
            color: var(--text-primary, #ffffff);
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
            color: var(--text-muted, #a3a3a3);
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const selectedCountryObj = getCountryOption(country);

  return (
    <div className="onboard-viewport">
      <div className="onboard-container">
        {/* Top Header */}
        <header className="onboard-header">
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
            <span>Step {step + 1} of 4</span>
          </div>
        </header>

        {/* Multi-step Progressive Card */}
        <main className="onboard-card">
          {/* ── STEP 1: Country & Educational Board ────────────────── */}
          {step === 0 && (
            <div className="onboard-step-content">
              <div className="step-tag">Step 1 — Global Education Origin</div>
              <h1 className="step-title">Where and what do you study?</h1>
              <p className="step-desc">
                Select your country and educational curriculum. Learning Allied dynamically adapts concepts, terminologies, and exam patterns.
              </p>

              {/* Country Selection Dropdown */}
              <div className="field-group">
                <label className="field-label" htmlFor="onboard-country-select">
                  Country of Study
                </label>
                <div className="select-wrap">
                  <select
                    id="onboard-country-select"
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="onboard-select"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.region})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cascading Board / Curriculum List */}
              <div className="field-group">
                <label className="field-label">
                  Curriculum / Education Board in {selectedCountryObj.name}
                </label>
                <div className="option-list">
                  {availableTracks.map((item) => {
                    const isSelected = trackId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTrackChange(item.id)}
                        className={`option-card ${isSelected ? "selected" : ""}`}
                      >
                        <div className="option-check">{isSelected ? "✓" : ""}</div>
                        <div className="option-text">
                          <div className="option-title-row">
                            <span className="option-title">{item.name}</span>
                            <span className="option-badge">{item.shortName}</span>
                          </div>
                          <span className="option-sub">{item.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="action-row">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-onboard primary"
                >
                  Continue to Grade & Subjects →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Grade Level & Priority Subjects ────────────── */}
          {step === 1 && (
            <div className="onboard-step-content">
              <div className="step-tag">Step 2 — Grade & Curriculum Focus</div>
              <h1 className="step-title">Select your grade and focus subjects</h1>
              <p className="step-desc">
                We calibrate topic depth, prerequisites, question banks, and Socratic hints to your stage.
              </p>

              <div className="field-group">
                <label className="field-label" htmlFor="onboard-grade-select">
                  Current Grade / Level ({selectedCountryObj.flag} {selectedCountryObj.name})
                </label>
                <div className="select-wrap">
                  <select
                    id="onboard-grade-select"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="onboard-select"
                  >
                    {availableGrades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">
                  Priority Subjects to Master First (Select 2 to 5)
                </label>
                <div className="subject-chip-cloud">
                  {availableSubjects.map((sub) => {
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
                  Continue to Academic Goal →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Academic Goal & Daily Schedule ─────────────── */}
          {step === 2 && (
            <div className="onboard-step-content">
              <div className="step-tag">Step 3 — Target & Daily Commitment</div>
              <h1 className="step-title">What is your primary academic goal?</h1>
              <p className="step-desc">
                Set your standard of excellence. Your Study Planner and spaced review queues will align with this pace.
              </p>

              <div className="option-list">
                {GOAL_OPTIONS.map((goal) => {
                  const isSelected = academicGoal === goal.id;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setAcademicGoal(goal.id)}
                      className={`option-card ${isSelected ? "selected" : ""}`}
                    >
                      <div className="option-check">{isSelected ? "✓" : ""}</div>
                      <div className="option-text">
                        <div className="option-title-row">
                          <span className="option-title">{goal.title}</span>
                          <span className="option-badge">{goal.badge}</span>
                        </div>
                        <span className="option-sub">{goal.description}</span>
                      </div>
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
                  max={10}
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Number(e.target.value))}
                  className="onboard-slider"
                  aria-label="Daily target study hours"
                />
                <div className="slider-ticks">
                  <span>1h Light</span>
                  <span>3h Standard</span>
                  <span>5h Intensive</span>
                  <span>8h+ Competitive</span>
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
                  onClick={() => setStep(3)}
                  className="btn-onboard primary"
                >
                  Continue to Personalization →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: AI Companion Persona & Language ────────────── */}
          {step === 3 && (
            <div className="onboard-step-content">
              <div className="step-tag">Step 4 — AI Tutoring Personalization</div>
              <h1 className="step-title">Choose your learning companion & language</h1>
              <p className="step-desc">
                Your AI Tutor adapts its explanation style, socratic hints, and language to make learning intuitive.
              </p>

              <div className="field-group">
                <label className="field-label" htmlFor="onboard-language-select">
                  Preferred Tutoring Language
                </label>
                <div className="select-wrap">
                  <select
                    id="onboard-language-select"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="onboard-select"
                  >
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName} — {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">AI Tutor Persona</label>
                <div className="persona-grid">
                  {PERSONA_OPTIONS.map((p) => {
                    const isSelected = personality === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPersonality(p.id)}
                        className={`persona-card ${isSelected ? "selected" : ""}`}
                      >
                        <div className="persona-emoji">{p.emoji}</div>
                        <div className="persona-title">{p.name}</div>
                        <div className="persona-desc">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="action-row dual">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-onboard secondary"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={submitting}
                  className="btn-onboard primary"
                >
                  {submitting ? "Launching Workspace…" : "Complete Setup & Launch →"}
                </button>
              </div>
            </div>
          )}
        </main>
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
          color: var(--text-primary, #ffffff);
          font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          -webkit-font-smoothing: antialiased;
        }

        .onboard-container {
          width: 100%;
          max-width: 600px;
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
          color: var(--text-primary, #ffffff);
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
          padding: 6px 14px;
          border-radius: 999px;
          background: var(--bg-card, #0a0a0a);
          border: 1px solid var(--border, #262626);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary, #a3a3a3);
        }

        .step-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent, #3b82f6);
        }

        .onboard-card {
          background: var(--bg-card, #0a0a0a);
          border: 1px solid var(--border, #262626);
          border-radius: 16px;
          padding: 36px 32px;
          box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(16px);
        }

        :global(.light-mode) .onboard-card {
          background: #ffffff;
          border-color: #e5e5e5;
          box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.08);
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
          font-size: 23px;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.25;
          color: var(--text-primary, #ffffff);
          margin: 0 0 8px 0;
        }

        :global(.light-mode) .step-title {
          color: #111111;
        }

        .step-desc {
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--text-secondary, #a3a3a3);
          margin: 0 0 24px 0;
        }

        .field-group {
          margin-bottom: 20px;
        }

        .field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary, #a3a3a3);
          margin-bottom: 8px;
        }

        .select-wrap {
          position: relative;
        }

        .onboard-select {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--border-strong, #333333);
          background: var(--bg-elevated, #141414);
          color: var(--text-primary, #ffffff);
          font-family: inherit;
          font-size: 14px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.16s ease, box-shadow 0.16s ease;
        }

        :global(.light-mode) .onboard-select {
          background: #ffffff;
          border-color: #d4d4d4;
          color: #111111;
        }

        .onboard-select:focus {
          border-color: var(--accent, #3b82f6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .option-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
          max-height: 290px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .option-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--border, #262626);
          background: var(--bg-elevated, #111111);
          color: var(--text-primary, #ffffff);
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: all 0.16s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        :global(.light-mode) .option-card {
          background: #fafafa;
          border-color: #e5e5e5;
          color: #111111;
        }

        .option-card:hover {
          border-color: var(--border-hover, rgba(255, 255, 255, 0.24));
          transform: translateY(-1px);
        }

        .option-card.selected {
          border-color: var(--accent, #3b82f6);
          background: rgba(59, 130, 246, 0.12);
          box-shadow: 0 0 0 1px var(--accent, #3b82f6);
        }

        :global(.light-mode) .option-card.selected {
          background: rgba(37, 99, 235, 0.08);
          border-color: #2563eb;
        }

        .option-check {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1.5px solid var(--border-strong, #525252);
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .option-card.selected .option-check {
          background: var(--accent, #3b82f6);
          border-color: var(--accent, #3b82f6);
        }

        .option-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }

        .option-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .option-title {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .option-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-secondary, #a3a3a3);
          flex-shrink: 0;
        }

        :global(.light-mode) .option-badge {
          background: #eeeeee;
          color: #555555;
        }

        .option-sub {
          font-size: 12px;
          color: var(--text-muted, #888888);
          line-height: 1.4;
        }

        .subject-chip-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
        }

        .subject-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          border-radius: 999px;
          border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
          background: var(--bg-elevated, #111111);
          color: var(--text-secondary, #a3a3a3);
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.16s ease;
        }

        :global(.light-mode) .subject-chip {
          background: #fafafa;
          border-color: #e5e5e5;
          color: #555555;
        }

        .subject-chip:hover {
          border-color: var(--border-hover, rgba(255, 255, 255, 0.25));
          color: var(--text-primary, #ffffff);
        }

        .subject-chip.selected {
          background: var(--accent, #3b82f6);
          border-color: var(--accent, #3b82f6);
          color: #ffffff;
        }

        .chip-icon {
          font-weight: 700;
          font-size: 12px;
        }

        .slider-card {
          padding: 18px;
          border-radius: 14px;
          background: var(--bg-elevated, #111111);
          border: 1px solid var(--border, #262626);
          margin-top: 18px;
          margin-bottom: 24px;
        }

        :global(.light-mode) .slider-card {
          background: #fafafa;
          border-color: #e5e5e5;
        }

        .slider-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .slider-label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary, #a3a3a3);
        }

        .slider-value {
          font-size: 13.5px;
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

        .persona-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
          margin-bottom: 24px;
        }

        .persona-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid var(--border, #262626);
          background: var(--bg-elevated, #111111);
          color: var(--text-primary, #ffffff);
          cursor: pointer;
          text-align: left;
          transition: all 0.16s ease;
        }

        :global(.light-mode) .persona-card {
          background: #fafafa;
          border-color: #e5e5e5;
          color: #111111;
        }

        .persona-card:hover {
          border-color: var(--border-hover, rgba(255, 255, 255, 0.24));
          transform: translateY(-1px);
        }

        .persona-card.selected {
          border-color: var(--accent, #3b82f6);
          background: rgba(59, 130, 246, 0.12);
          box-shadow: 0 0 0 1px var(--accent, #3b82f6);
        }

        .persona-emoji {
          font-size: 20px;
          margin-bottom: 6px;
        }

        .persona-title {
          font-size: 13.5px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .persona-desc {
          font-size: 11.5px;
          color: var(--text-muted, #888888);
          line-height: 1.35;
        }

        .action-row {
          display: flex;
          margin-top: 10px;
        }

        .action-row.dual {
          gap: 12px;
        }

        .btn-onboard {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          border-radius: 12px;
          padding: 12px 20px;
          cursor: pointer;
          transition: all 0.16s cubic-bezier(0.2, 0.7, 0.2, 1);
          border: none;
        }

        .btn-onboard:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-onboard.primary {
          flex: 1;
          background: var(--accent, #3b82f6);
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.32);
        }

        .btn-onboard.primary:hover:not(:disabled) {
          background: var(--accent-strong, #60a5fa);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.42);
        }

        .btn-onboard.primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-onboard.secondary {
          background: transparent;
          border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.16));
          color: var(--text-secondary, #a3a3a3);
        }

        :global(.light-mode) .btn-onboard.secondary {
          border-color: rgba(0, 0, 0, 0.12);
          color: #666666;
        }

        .btn-onboard.secondary:hover {
          border-color: var(--text-primary, #ffffff);
          color: var(--text-primary, #ffffff);
        }

        @media (max-width: 600px) {
          .onboard-card {
            padding: 24px 18px;
            border-radius: 16px;
          }
          .step-title {
            font-size: 20px;
          }
          .persona-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
