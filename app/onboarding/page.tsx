"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { initFirebase } from "../../lib/firebase";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [uid, setUid] = useState<string | null>(null);

  // Form states
  const [board, setBoard] = useState("CBSE");
  const [grade, setGrade] = useState("Class 12");
  const [targetExam, setTargetExam] = useState("JEE Main");
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
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#000", color: "#fff" }}>
        <div>Loading your learning profile…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 24, background: "#000" }}>
      <div style={{ width: "100%", maxWidth: 520, background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 20, padding: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--la-accent, #ff8a1f)", textTransform: "uppercase" }}>
            Personalize Learning Allied
          </span>
          <span style={{ fontSize: 13, color: "var(--la-muted, #a1a1aa)" }}>Step {step + 1} of 3</span>
        </div>

        {step === 0 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "#fff" }}>
              What exam are you preparing for?
            </h1>
            <p style={{ fontSize: 14, color: "var(--la-muted, #a1a1aa)", marginBottom: 24 }}>
              This tailors your syllabus, questions and study suggestions.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {["JEE Main & Advanced", "NEET UG Medical", "CBSE Board", "Maharashtra State Board", "General Science & Maths"].map((exam) => (
                <button
                  key={exam}
                  type="button"
                  onClick={() => setTargetExam(exam)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: `1px solid ${targetExam === exam ? "var(--la-accent, #ff8a1f)" : "var(--la-line, rgba(255,255,255,0.09))"}`,
                    background: targetExam === exam ? "rgba(255,138,31,0.12)" : "var(--la-surface-2, #17171a)",
                    color: targetExam === exam ? "var(--la-accent, #ff8a1f)" : "#fff",
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 15,
                  }}
                >
                  {exam}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-primary"
              style={{ width: "100%", padding: 13, borderRadius: 10, fontSize: 15, fontWeight: 700 }}
            >
              Next Step →
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "#fff" }}>
              Select your grade &amp; board
            </h1>
            <p style={{ fontSize: 14, color: "var(--la-muted, #a1a1aa)", marginBottom: 24 }}>
              Helps us match the exact difficulty and curriculum guidelines.
            </p>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--la-muted, #a1a1aa)" }}>
                Grade / Class
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                style={{ width: "100%", padding: 12, borderRadius: 10, background: "var(--la-surface-2, #17171a)", border: "1px solid var(--la-line, rgba(255,255,255,0.16))", color: "#fff" }}
              >
                <option>Class 9</option>
                <option>Class 10</option>
                <option>Class 11</option>
                <option>Class 12</option>
                <option>Dropper / Gap Year</option>
                <option>College / Other</option>
              </select>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--la-muted, #a1a1aa)" }}>
                Educational Board
              </label>
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                style={{ width: "100%", padding: 12, borderRadius: 10, background: "var(--la-surface-2, #17171a)", border: "1px solid var(--la-line, rgba(255,255,255,0.16))", color: "#fff" }}
              >
                <option>CBSE</option>
                <option>Maharashtra State Board</option>
                <option>ICSE / ISC</option>
                <option>Other State Board</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: 12, borderRadius: 10 }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-primary"
                style={{ flex: 2, padding: 12, borderRadius: 10, fontWeight: 700 }}
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "#fff" }}>
              Focus subjects &amp; study goals
            </h1>
            <p style={{ fontSize: 14, color: "var(--la-muted, #a1a1aa)", marginBottom: 20 }}>
              Choose subjects to prioritize for practice questions.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science"].map((sub) => {
                const isSelected = prioritySubjects.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubject(sub)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 999,
                      border: `1px solid ${isSelected ? "var(--la-accent, #ff8a1f)" : "var(--la-line, rgba(255,255,255,0.12))"}`,
                      background: isSelected ? "rgba(255,138,31,0.14)" : "var(--la-surface-2, #17171a)",
                      color: isSelected ? "var(--la-accent, #ff8a1f)" : "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {isSelected ? "✓ " : "+ "}{sub}
                  </button>
                );
              })}
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--la-muted, #a1a1aa)" }}>
                <span>Daily target study hours</span>
                <span style={{ color: "var(--la-accent, #ff8a1f)", fontWeight: 700 }}>{dailyHours} hours / day</span>
              </label>
              <input
                type="range"
                min={1}
                max={12}
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--la-accent, #ff8a1f)" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: 12, borderRadius: 10 }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="btn btn-primary"
                style={{ flex: 2, padding: 12, borderRadius: 10, fontWeight: 700 }}
              >
                Complete Onboarding →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
