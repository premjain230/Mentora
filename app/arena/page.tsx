"use client";

import React, { useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthContext";

interface BattleQuestion {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

const SAMPLE_BATTLES: Record<string, BattleQuestion[]> = {
  jee: [
    {
      q: "A particle of mass m moves under a central force F = -k/r^2. What is the relation between total energy E and kinetic energy K in a circular orbit?",
      options: ["E = -K", "E = K", "E = 2K", "E = -2K"],
      correct: 0,
      explanation: "By the virial theorem for an inverse-square force, potential energy U = -2K, so total energy E = K + U = -K.",
    },
    {
      q: "Which compound exhibits optical isomerism?",
      options: ["Lactic acid", "Acetic acid", "Propionic acid", "Formic acid"],
      correct: 0,
      explanation: "Lactic acid (2-hydroxypropanoic acid) possesses a chiral carbon with four different groups attached: -H, -OH, -CH3, and -COOH.",
    },
  ],
  neet: [
    {
      q: "Which hormone is responsible for triggering ovulation during the menstrual cycle?",
      options: ["LH surge", "Progesterone", "FSH", "Estrogen alone"],
      correct: 0,
      explanation: "A rapid secretion of Luteinizing Hormone (LH) leading to its maximum level midway through the cycle (LH surge) induces rupture of Graafian follicle.",
    },
  ],
  cbse: [
    {
      q: "What is the SI unit of electric flux?",
      options: ["N·m^2/C", "N/C", "V/m", "C/m^2"],
      correct: 0,
      explanation: "Electric flux Φ = E · A, so its unit is (N/C) * m^2 = N·m^2/C (or Volt-meters).",
    },
  ],
};

export default function ArenaPage() {
  const { user } = useAuth();
  const [selectedBattle, setSelectedBattle] = useState<string | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);

  const startBattle = (key: string) => {
    setSelectedBattle(key);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setShowFeedback(false);
    setScore(0);
  };

  const currentQuestions = selectedBattle ? SAMPLE_BATTLES[selectedBattle] || SAMPLE_BATTLES.jee : [];
  const currentQ = currentQuestions[currentQIndex];

  const handleSelectOption = (idx: number) => {
    if (showFeedback) return;
    setSelectedOption(idx);
    setShowFeedback(true);
    if (idx === currentQ.correct) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQIndex + 1 < currentQuestions.length) {
      setCurrentQIndex((i) => i + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    } else {
      // Completed battle
      alert(`Battle Complete! You scored ${score + (selectedOption === currentQ.correct ? 1 : 0)} / ${currentQuestions.length}`);
      setSelectedBattle(null);
    }
  };

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Practice Arena</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 840, margin: "0 auto", padding: "32px 16px" }}>
        {!selectedBattle ? (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                Syllabus Battlefield
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
                Select your track to fight through chapter nodes, unlock boss quizzes and calibrate your mastery.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {[
                { id: "jee", title: "JEE Main & Advanced Arena", desc: "Mechanics, Calculus, GOC & Electromagnetism questions.", icon: "⚡" },
                { id: "neet", title: "NEET UG Medical Arena", desc: "High-yield NCERT Biology, Organic Mechanisms, and Physics.", icon: "🧬" },
                { id: "cbse", title: "CBSE Class 12 Science Arena", desc: "Board-standard questions and numericals with instant step reviews.", icon: "📚" },
                { id: "state", title: "State Board Arena", desc: "Textbook syllabus questions with diagnostic recall.", icon: "🎯" },
              ].map((card) => (
                <div
                  key={card.id}
                  onClick={() => startBattle(card.id)}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 24,
                    cursor: "pointer",
                    transition: "transform 0.2s, border-color 0.2s",
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{card.icon}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                    {card.title}
                  </h3>
                  <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
                    {card.desc}
                  </p>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                    Enter Battle →
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setSelectedBattle(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ← Back to Battlefields
              </button>
              <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
                Question {currentQIndex + 1} of {currentQuestions.length}
              </span>
            </div>

            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: "32px 28px",
              }}
            >
              <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 24 }}>
                {currentQ.q}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                {currentQ.options.map((opt, idx) => {
                  let bg = "var(--bg-input)";
                  let borderColor = "var(--border)";
                  if (showFeedback) {
                    if (idx === currentQ.correct) {
                      bg = "rgba(74, 222, 128, 0.14)";
                      borderColor = "#4ade80";
                    } else if (idx === selectedOption) {
                      bg = "rgba(239, 68, 68, 0.14)";
                      borderColor = "#f87171";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={showFeedback}
                      onClick={() => handleSelectOption(idx)}
                      style={{
                        padding: "14px 18px",
                        borderRadius: 12,
                        background: bg,
                        border: `1px solid ${borderColor}`,
                        color: "var(--text-primary)",
                        textAlign: "left",
                        cursor: showFeedback ? "default" : "pointer",
                        fontSize: 14.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "var(--bg-card)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {showFeedback && (
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 18,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      marginBottom: 6,
                      color: selectedOption === currentQ.correct ? "#4ade80" : "#f87171",
                    }}
                  >
                    {selectedOption === currentQ.correct ? "✓ Correct!" : "✗ Review this concept:"}
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {currentQ.explanation}
                  </div>
                </div>
              )}

              {showFeedback && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn btn-primary"
                  style={{ padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700 }}
                >
                  {currentQIndex + 1 < currentQuestions.length ? "Next Question →" : "Finish Battle →"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
