"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "../../components/AppShell";

export default function StudySessionPage() {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionType, setSessionType] = useState<"focus" | "break">("focus");

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsActive(false);
      alert(sessionType === "focus" ? "Great focus session! Take a 5 minute break." : "Break finished! Ready to focus?");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft, sessionType]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = (mins: number, type: "focus" | "break") => {
    setIsActive(false);
    setSessionType(type);
    setSecondsLeft(mins * 60);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Study Session Timer</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 16px", textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
          Deep Work Focus
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 36 }}>
          Eliminate distractions. Work in uninterrupted blocks to build high-efficiency study habits.
        </p>

        {/* Big circular clock card */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: "48px 32px",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => resetTimer(25, "focus")}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: sessionType === "focus" ? "var(--accent)" : "transparent",
                color: sessionType === "focus" ? "#000" : "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              25m Pomodoro
            </button>
            <button
              type="button"
              onClick={() => resetTimer(50, "focus")}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              50m Deep Block
            </button>
            <button
              type="button"
              onClick={() => resetTimer(5, "break")}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: sessionType === "break" ? "var(--accent)" : "transparent",
                color: sessionType === "break" ? "#000" : "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              5m Rest Break
            </button>
          </div>

          <div
            style={{
              fontSize: "clamp(54px, 10vw, 84px)",
              fontFamily: "monospace",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: 2,
              marginBottom: 32,
            }}
          >
            {timeFormatted}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            <button
              type="button"
              onClick={toggleTimer}
              className="btn btn-primary btn-lg"
              style={{ minWidth: 140, fontWeight: 700 }}
            >
              {isActive ? "Pause" : "Start Session"}
            </button>
            <button
              type="button"
              onClick={() => resetTimer(25, "focus")}
              className="btn btn-secondary btn-lg"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
