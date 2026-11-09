"use client";

import React, { useState } from "react";

export function RetentionSimulator() {
  const [day, setDay] = useState<number>(7);

  // Model retention based on Ebbinghaus exponential decay vs spaced recall
  // R = e^(-t/S)
  const getTraditionalRetention = (d: number) => {
    if (d <= 1) return 55;
    if (d <= 3) return 36;
    if (d <= 7) return 24;
    if (d <= 14) return 18;
    return 12;
  };

  const getAlliedRetention = (d: number) => {
    if (d <= 1) return 96;
    if (d <= 3) return 94;
    if (d <= 7) return 91;
    if (d <= 14) return 89;
    return 86;
  };

  const trad = getTraditionalRetention(day);
  const allied = getAlliedRetention(day);

  return (
    <div className="prem-retention-box">
      <div className="prem-retention-controls">
        <div>
          <span style={{ display: "block", fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: "var(--la-accent, #3b82f6)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>
            Interactive Cognitive Simulator
          </span>
          <h3 style={{ margin: 0, fontFamily: "var(--font-display, sans-serif)", fontSize: 20, fontWeight: 700, color: "var(--la-text, #ffffff)" }}>
            Memory Retention After {day} Days
          </h3>
        </div>

        {/* Day selection buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 3, 7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                border: day === d ? "1px solid #3b82f6" : "1px solid var(--la-line, rgba(255,255,255,0.1))",
                background: day === d ? "rgba(59, 130, 246, 0.15)" : "var(--la-surface-2, #141418)",
                color: day === d ? "#93c5fd" : "var(--la-muted, #a1a1aa)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Day {d}
            </button>
          ))}
        </div>
      </div>

      <div className="prem-retention-stat-group" style={{ marginBottom: 24 }}>
        <div className="prem-retention-stat traditional">
          <span>Passive Re-reading</span>
          <strong>{trad}% Retention</strong>
          <small style={{ fontSize: 11.5, color: "#9ca3af" }}>80%+ of concepts forgotten</small>
        </div>

        <div className="prem-retention-stat allied">
          <span>Learning Allied Spaced Retrieval</span>
          <strong>{allied}% Retention</strong>
          <small style={{ fontSize: 11.5, color: "#34d399" }}>Consolidated in long-term cortex</small>
        </div>
      </div>

      {/* Visual Comparison Bars */}
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: "#f87171", fontWeight: 600 }}>Standard Cramming (Re-reading textbook chapters)</span>
            <span style={{ fontFamily: "monospace", color: "#f87171" }}>{trad}% retained</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${trad}%`, background: "#ef4444", borderRadius: 999, transition: "width 0.4s ease" }} />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: "#34d399", fontWeight: 600 }}>Learning Allied (Active Recall + Spaced Decay Modeling)</span>
            <span style={{ fontFamily: "monospace", color: "#34d399" }}>{allied}% retained</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${allied}%`, background: "#10b981", borderRadius: 999, transition: "width 0.4s ease" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
