"use client";

import React, { useState } from "react";
import { AppShell } from "../../components/AppShell";

interface HubTopic {
  id: string;
  name: string;
  subject: string;
  mastery: number;
  status: "Mastered" | "Review Soon" | "Needs Practice";
  prereqs: string[];
}

export default function LearningHubPage() {
  const [selectedTopic, setSelectedTopic] = useState<HubTopic | null>(null);
  const [explainText, setExplainText] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);

  const topics: HubTopic[] = [
    { id: "1", name: "Newton's Second Law & Variable Mass", subject: "Physics", mastery: 88, status: "Mastered", prereqs: ["Vectors", "Kinematics 1D"] },
    { id: "2", name: "Rotational Equilibrium & Torque", subject: "Physics", mastery: 52, status: "Review Soon", prereqs: ["Center of Mass", "Newton's Laws"] },
    { id: "3", name: "Sn1 vs Sn2 Nucleophilic Substitution", subject: "Chemistry", mastery: 42, status: "Needs Practice", prereqs: ["Carbocation Stability", "Steric Hindrance"] },
    { id: "4", name: "Integration by Partial Fractions", subject: "Mathematics", mastery: 90, status: "Mastered", prereqs: ["Polynomial Division", "Logarithms"] },
  ];

  const handleExplainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!explainText.trim()) return;

    setEvaluating(true);
    setTimeout(() => {
      setEvaluating(false);
      setEvalResult("Excellent explanation! You clearly articulated the fundamental mechanics. To score full marks in numerical problems, remember to also account for frame-of-reference transformations.");
    }, 1200);
  };

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>AI Learning Hub</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
            Concept Mastery &amp; Feynman Explain-Back
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Test your genuine understanding. Select a topic, explain it back in simple words, and get AI critique on blind spots.
          </p>
        </div>

        {/* Topic Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 32 }}>
          {topics.map((t) => (
            <div
              key={t.id}
              onClick={() => {
                setSelectedTopic(t);
                setEvalResult(null);
                setExplainText("");
              }}
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${selectedTopic?.id === t.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 16,
                padding: 18,
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  {t.subject}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: t.status === "Mastered" ? "#4ade80" : t.status === "Review Soon" ? "#fbbf24" : "#f87171",
                  }}
                >
                  {t.mastery}%
                </span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                {t.name}
              </h3>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Prereqs: {t.prereqs.join(", ")}
              </div>
            </div>
          ))}
        </div>

        {/* Feynman Explain Modal / Section */}
        {selectedTopic && (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 28,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Feynman Exercise: Explain &ldquo;{selectedTopic.name}&rdquo;
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13.5, lineHeight: 1.5, marginBottom: 18 }}>
              Explain this concept in plain English as if teaching a younger classmate. Avoid jargon without defining it.
            </p>

            <form onSubmit={handleExplainSubmit}>
              <textarea
                value={explainText}
                onChange={(e) => setExplainText(e.target.value)}
                placeholder="In simple terms, this works because..."
                rows={5}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "vertical",
                  marginBottom: 16,
                  outline: "none",
                }}
              />

              <button
                type="submit"
                disabled={evaluating || !explainText.trim()}
                className="btn btn-primary"
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: evaluating || !explainText.trim() ? "not-allowed" : "pointer",
                }}
              >
                {evaluating ? "Evaluating explanation…" : "Submit for AI Critique"}
              </button>
            </form>

            {evalResult && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text-primary)",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--accent)" }}>
                  💡 AI Tutor Feedback
                </div>
                {evalResult}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
