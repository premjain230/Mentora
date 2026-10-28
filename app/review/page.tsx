"use client";

import React, { useState } from "react";
import { AppShell } from "../../components/AppShell";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
}

export default function ReviewPage() {
  const [cards] = useState<Flashcard[]>([
    { id: "1", subject: "Physics", front: "State Gauss's Law in electrostatics and its integral form.", back: "Integral of E · dA over a closed surface = Q_enclosed / epsilon_0." },
    { id: "2", subject: "Chemistry", front: "What is Markovnikov's rule?", back: "When an unsymmetrical reagent (e.g. HBr) adds to an unsymmetrical alkene, the negative part adds to the carbon having fewer hydrogen atoms." },
    { id: "3", subject: "Mathematics", front: "Formula for integration of sec(x) dx.", back: "ln |sec(x) + tan(x)| + C." },
  ]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[currentIdx];

  const handleNext = () => {
    setFlipped(false);
    setCurrentIdx((i) => (i + 1) % cards.length);
  };

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Spaced Review</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 16px", textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
          Spaced Repetition Review Deck
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}>
          Card {currentIdx + 1} of {cards.length} · Tap the card to flip and verify your recall.
        </p>

        <div
          onClick={() => setFlipped(!flipped)}
          style={{
            minHeight: 240,
            background: "var(--bg-card)",
            border: `2px solid ${flipped ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 20,
            padding: "40px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            marginBottom: 28,
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>
            {card.subject} · {flipped ? "Answer" : "Question"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.6 }}>
            {flipped ? card.back : card.front}
          </div>
          <div style={{ marginTop: 24, fontSize: 12, color: "var(--text-faint)" }}>
            (Click to {flipped ? "see question" : "flip answer"})
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <button
            type="button"
            onClick={handleNext}
            className="btn btn-secondary"
          >
            Hard (Review in 1 day)
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="btn btn-primary"
          >
            Easy (Review in 4 days) →
          </button>
        </div>
      </div>
    </AppShell>
  );
}
