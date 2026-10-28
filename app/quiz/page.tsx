"use client";

import React, { useState } from "react";
import { AppShell } from "../../components/AppShell";

interface Question {
  id: string;
  subject: string;
  chapter: string;
  question: string;
  options: string[];
  correct: number;
}

export default function QuizPage() {
  const [questions] = useState<Question[]>([
    {
      id: "q1",
      subject: "Physics",
      chapter: "Thermodynamics",
      question: "In an adiabatic expansion of an ideal gas, the product PV^(gamma) remains constant. What happens to the temperature of the gas?",
      options: ["Decreases", "Increases", "Remains constant", "First increases then decreases"],
      correct: 0,
    },
    {
      id: "q2",
      subject: "Chemistry",
      chapter: "Chemical Equilibrium",
      question: "According to Le Chatelier's principle, what is the effect of increasing pressure on the equilibrium N2(g) + 3H2(g) <=> 2NH3(g)?",
      options: ["Shifts in forward direction (towards fewer moles)", "Shifts in reverse direction", "No effect", "Equilibrium constant K increases"],
      correct: 0,
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);

  const q = questions[currentIndex];

  const handleSelect = (optionIndex: number) => {
    setSelectedAnswers({ ...selectedAnswers, [currentIndex]: optionIndex });
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  };

  const score = Object.entries(selectedAnswers).filter(
    ([qIdx, ansIdx]) => questions[Number(qIdx)].correct === ansIdx
  ).length;

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Adaptive Quiz</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 16px" }}>
        {!finished ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
                {q.subject} · {q.chapter}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Question {currentIndex + 1} of {questions.length}
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
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 24 }}>
                {q.question}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                {q.options.map((opt, idx) => {
                  const isSelected = selectedAnswers[currentIndex] === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelect(idx)}
                      style={{
                        padding: "14px 18px",
                        borderRadius: 12,
                        background: isSelected ? "rgba(255, 138, 31, 0.14)" : "var(--bg-input)",
                        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                        color: "var(--text-primary)",
                        textAlign: "left",
                        cursor: "pointer",
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
                          background: isSelected ? "var(--accent)" : "var(--bg-card)",
                          color: isSelected ? "#000" : "var(--text-primary)",
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

              <button
                type="button"
                disabled={selectedAnswers[currentIndex] === undefined}
                onClick={handleNext}
                className="btn btn-primary"
                style={{
                  padding: "12px 28px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: selectedAnswers[currentIndex] === undefined ? "not-allowed" : "pointer",
                  opacity: selectedAnswers[currentIndex] === undefined ? 0.5 : 1,
                }}
              >
                {currentIndex + 1 < questions.length ? "Next Question →" : "Finish Quiz"}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: "48px 32px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
              Quiz Completed!
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 16, marginBottom: 24 }}>
              You scored {score} out of {questions.length} questions correctly.
            </p>
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(0);
                setSelectedAnswers({});
                setFinished(false);
              }}
              className="btn btn-primary"
            >
              Take Another Quiz
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
