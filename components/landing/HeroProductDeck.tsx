"use client";

import React, { useState } from "react";

interface DeckItem {
  id: string;
  kicker: string;
  title: string;
  snippet: string;
  footLeft: string;
  footRight: string;
  themeClass: string;
  captionTag: string;
  captionText: string;
  renderArtifact: () => React.ReactNode;
}

const DECK_ITEMS: DeckItem[] = [
  {
    id: "understand",
    kicker: "01 · Understand",
    title: "Socratic First-Principles",
    snippet: "Guides your reasoning step by step instead of dumping answers.",
    footLeft: "Tutor",
    footRight: "W = F·d·cos θ",
    themeClass: "deck-card--tutor",
    captionTag: "AI Tutor & Learning Hub",
    captionText: "Prompts your derivation from first principles before revealing the final step.",
    renderArtifact: () => (
      <div className="deck-card-artifact">
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Prompt:</div>
        <div style={{ opacity: 0.88 }}>
          &ldquo;Which component of the upward lift force acts along the horizontal displacement?&rdquo;
        </div>
      </div>
    ),
  },
  {
    id: "visualize",
    kicker: "02 · Visualize",
    title: "Interactive Force Diagrams",
    snippet: "Turn abstract formulas into observable vector and wave models.",
    footLeft: "Visuals",
    footRight: "θ = 90°",
    themeClass: "deck-card--visual",
    captionTag: "2D & 3D Concept Visuals",
    captionText: "Manipulate angles, vectors, and motion to see why cos(90°) yields zero work.",
    renderArtifact: () => (
      <div className="deck-card-artifact" style={{ padding: "6px 8px" }}>
        <svg viewBox="0 0 160 54" width="100%" height="50" fill="none" aria-hidden="true">
          <line x1="12" y1="46" x2="148" y2="46" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
          <rect x="48" y="26" width="26" height="18" rx="3" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.08" />
          <line x1="61" y1="26" x2="61" y2="6" stroke="#2563eb" strokeWidth="2" />
          <polygon points="61,3 58,9 64,9" fill="#2563eb" />
          <line x1="74" y1="35" x2="128" y2="35" stroke="#059669" strokeWidth="2" strokeDasharray="3 2" />
          <polygon points="132,35 126,32 126,38" fill="#059669" />
          <text x="68" y="13" fill="currentColor" fontSize="8" fontWeight="700" fontFamily="monospace">F ↑</text>
          <text x="108" y="29" fill="currentColor" fontSize="8" fontWeight="700" fontFamily="monospace">d →</text>
        </svg>
      </div>
    ),
  },
  {
    id: "diagnose",
    kicker: "03 · Evaluate",
    title: "Misconception Diagnosis",
    snippet: "Separates careless arithmetic slips from broken mental models.",
    footLeft: "Diagnostic",
    footRight: "N = mg cos θ",
    themeClass: "deck-card--diagnose",
    captionTag: "Diagnostic Engine",
    captionText: "Catches conceptual traps like assuming N = mg on an incline and queues targeted drills.",
    renderArtifact: () => (
      <div className="deck-card-artifact">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "#dc2626", fontWeight: 700 }}>✕ N = mg</span>
          <span style={{ color: "#059669", fontWeight: 700 }}>✓ mg cos 30°</span>
        </div>
        <div style={{ opacity: 0.85 }}>
          Resolve gravity perpendicular to the incline before solving.
        </div>
      </div>
    ),
  },
  {
    id: "practice",
    kicker: "04 · Practice",
    title: "Curriculum-Calibrated Arena",
    snippet: "Timed retrieval drills grounded in AP, GCSE, CBSE, JEE & NEET.",
    footLeft: "Arena",
    footRight: "+4 / -1",
    themeClass: "deck-card--practice",
    captionTag: "Practice & Quiz Arena",
    captionText: "Test under real exam patterns with instant step-by-step marking rubrics.",
    renderArtifact: () => (
      <div className="deck-card-artifact">
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Q14 · Electrostatics</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ padding: "2px 6px", borderRadius: 4, background: "rgba(5,150,105,0.18)", fontWeight: 700 }}>
            A: V = 0 ✓
          </span>
          <span style={{ opacity: 0.65 }}>Equatorial bisector</span>
        </div>
      </div>
    ),
  },
  {
    id: "remember",
    kicker: "05 · Remember",
    title: "Spaced Memory Revision",
    snippet: "Tracks memory decay and schedules review right before it fades.",
    footLeft: "Review",
    footRight: "91% Kept",
    themeClass: "deck-card--remember",
    captionTag: "Ebbinghaus Review Queue",
    captionText: "Resurfaces fading topics automatically in your Study Planner & Review queue.",
    renderArtifact: () => (
      <div className="deck-card-artifact" style={{ padding: "6px 8px" }}>
        <svg viewBox="0 0 160 44" width="100%" height="42" fill="none" aria-hidden="true">
          <path d="M8 10 Q46 36 150 40" stroke="#ef4444" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M8 10 Q32 22 50 12 Q88 20 105 12 Q132 16 150 13" stroke="#059669" strokeWidth="2.2" />
          <circle cx="50" cy="12" r="2.8" fill="#059669" />
          <circle cx="105" cy="12" r="2.8" fill="#059669" />
          <circle cx="150" cy="13" r="2.8" fill="#059669" />
        </svg>
      </div>
    ),
  },
];

export function HeroProductDeck() {
  const [activeIndex, setActiveIndex] = useState<number>(2);
  const activeItem = DECK_ITEMS[activeIndex] || DECK_ITEMS[2];

  return (
    <div className="deck-stage">
      {/* Subtle callout pills echoing the gallery reference composition */}
      <div className="deck-pills-row" aria-hidden="true">
        <span className="deck-float-pill blue">Socratic Tutor</span>
        <span className="deck-float-pill mint">Spaced Recall</span>
      </div>

      {/* Fanned Showcase Deck */}
      <div className="deck-fan" role="group" aria-label="Learning Allied core learning capabilities">
        {DECK_ITEMS.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={item.id}
              type="button"
              data-pos={idx}
              className={`deck-card ${item.themeClass} ${isActive ? "is-active" : ""}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onFocus={() => setActiveIndex(idx)}
              onClick={() => setActiveIndex(idx)}
              aria-pressed={isActive}
            >
              <div>
                <div className="deck-card-top">
                  <span className="deck-card-kicker">{item.kicker}</span>
                  <span className="deck-card-dot" aria-hidden="true" />
                </div>
                <div className="deck-card-body" style={{ marginTop: 10 }}>
                  <span className="deck-card-title">{item.title}</span>
                  <p className="deck-card-snippet">{item.snippet}</p>
                </div>
              </div>

              <div>
                {item.renderArtifact()}
                <div className="deck-card-foot" style={{ marginTop: 8 }}>
                  <span>{item.footLeft}</span>
                  <span>{item.footRight}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive micro-caption */}
      <div className="deck-caption-bar" aria-live="polite">
        <span className="deck-caption-pill">{activeItem.captionTag}</span>
        <span>{activeItem.captionText}</span>
      </div>
    </div>
  );
}
