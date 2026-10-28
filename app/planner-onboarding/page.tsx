"use client";

import React, { useEffect, useState } from "react";
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
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#000", color: "#fff" }}>
        <div>Setting up your planner…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 24, background: "#000" }}>
      <div style={{ width: "100%", maxWidth: 520, background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 20, padding: 36 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "#fff" }}>
          Setup your Study Planner
        </h1>
        <p style={{ fontSize: 14, color: "var(--la-muted, #a1a1aa)", marginBottom: 24 }}>
          Generate your personalized chapter timetable based on your exam date and available hours.
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--la-muted, #a1a1aa)" }}>
            Target Exam Date
          </label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 10, background: "var(--la-surface-2, #17171a)", border: "1px solid var(--la-line, rgba(255,255,255,0.16))", color: "#fff" }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--la-muted, #a1a1aa)" }}>
            Study Days Each Week
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
              const active = studyDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: `1px solid ${active ? "var(--la-accent, #ff8a1f)" : "var(--la-line, rgba(255,255,255,0.12))"}`,
                    background: active ? "rgba(255,138,31,0.14)" : "var(--la-surface-2, #17171a)",
                    color: active ? "var(--la-accent, #ff8a1f)" : "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--la-muted, #a1a1aa)" }}>
            <span>Target daily hours</span>
            <span style={{ color: "var(--la-accent, #ff8a1f)", fontWeight: 700 }}>{hoursPerDay}h / day</span>
          </label>
          <input
            type="range"
            min={1}
            max={12}
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--la-accent, #ff8a1f)" }}
          />
        </div>

        <button
          type="button"
          onClick={handleSavePlan}
          className="btn btn-primary"
          style={{ width: "100%", padding: 13, borderRadius: 10, fontSize: 15, fontWeight: 700 }}
        >
          Generate Study Calendar →
        </button>
      </div>
    </div>
  );
}
