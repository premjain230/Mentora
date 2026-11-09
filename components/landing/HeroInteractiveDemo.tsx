"use client";

import React, { useState } from "react";

type Scenario = "horizontal" | "vertical" | "static";

export function HeroInteractiveDemo() {
  const [scenario, setScenario] = useState<Scenario>("horizontal");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Scenarios:
  // 1. horizontal: porter walking horizontally holding luggage on head
  // 2. vertical: lifting luggage straight up by 1.5 m
  // 3. static: standing holding heavy barbell without displacement
  const scenarioData = {
    horizontal: {
      label: "Horizontal Carry",
      force: 400, // Newtons (upward support force to balance weight mg)
      displacement: 50, // meters
      angle: 90, // degrees between force (upward) and displacement (horizontal)
      work: 0,
      formula: "W = F · d · cos(90°) = 400 · 50 · 0 = 0 J",
      insight: "Displacement is strictly perpendicular to the upward lift force. Zero mechanical work is done by the vertical lift force.",
      examNote: "Frequently tested in JEE Main & CBSE Class 11 Physics Ch 6",
    },
    vertical: {
      label: "Vertical Lift",
      force: 400,
      displacement: 1.5,
      angle: 0,
      work: 600,
      formula: "W = F · d · cos(0°) = 400 · 1.5 · 1 = +600 J",
      insight: "Force and displacement are in the exact same direction. Positive work transfers 600 J of gravitational potential energy.",
      examNote: "Standard conservative force calculation: W = ΔU = mgh",
    },
    static: {
      label: "Stationary Hold",
      force: 400,
      displacement: 0,
      angle: 0,
      work: 0,
      formula: "W = F · d · cos(θ) = 400 · 0 · 1 = 0 J",
      insight: "Despite extreme physical fatigue, physical displacement is d = 0. Mechanical physics requires d > 0 for work.",
      examNote: "High-frequency conceptual trap: biological fatigue ≠ mechanical work",
    },
  };

  const curr = scenarioData[scenario];

  const handleOptionSelect = (idx: number) => {
    setSelectedOption(idx);
    setShowFeedback(true);
  };

  return (
    <div className="prem-demo-container">
      <div className="prem-app-window">
        {/* Topbar */}
        <div className="prem-app-topbar">
          <div className="prem-app-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="prem-app-title">
            <span>Socratic Workbench</span>
            <span className="curr-tag">NCERT Class 11 · Physics Ch 6</span>
          </div>
          <div className="prem-app-status">
            <i /> Live Lesson
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="prem-demo-grid">
          {/* Main Learning Stream */}
          <div className="prem-demo-main">
            {/* Socratic Dialogue */}
            <div className="prem-chat-thread">
              <div className="prem-chat-bubble prem-chat-student">
                <div className="prem-bubble-sender">Student Question</div>
                <span>
                  &ldquo;A coolie carries a 40 kg suitcase on his head across a 50-meter railway platform.
                  Why does my coaching test say mechanical work done is 0 J if he feels completely exhausted?&rdquo;
                </span>
              </div>

              <div className="prem-chat-bubble prem-chat-tutor">
                <div className="prem-bubble-sender">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Learning Allied AI Tutor
                </div>
                <span>
                  <strong>Let&apos;s derive this from first principles.</strong> In physics, mechanical work is not measured
                  by biological effort, but by the scalar dot product of force and displacement:
                  <code style={{ display: "inline-block", margin: "4px 0", padding: "2px 6px", background: "rgba(59, 130, 246, 0.15)", borderRadius: "4px", color: "#93c5fd" }}>
                    W = \vec&#123;F&#125; \cdot \vec&#123;d&#125; = F \cdot d \cdot \cos\theta
                  </code>.
                  Explore the 3 scenarios below to observe how the angle &theta; changes the work done:
                </span>
              </div>
            </div>

            {/* Interactive Concept Simulator */}
            <div className="prem-sim-card">
              <div className="prem-sim-head">
                <span className="prem-sim-title">Interactive Vector Breakdown</span>
                <div className="prem-sim-tabs" role="tablist" aria-label="Physics scenarios">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={scenario === "horizontal"}
                    className={`prem-sim-tab ${scenario === "horizontal" ? "active" : ""}`}
                    onClick={() => {
                      setScenario("horizontal");
                      setSelectedOption(null);
                      setShowFeedback(false);
                    }}
                  >
                    1. Horizontal Walk (θ=90°)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={scenario === "vertical"}
                    className={`prem-sim-tab ${scenario === "vertical" ? "active" : ""}`}
                    onClick={() => {
                      setScenario("vertical");
                      setSelectedOption(null);
                      setShowFeedback(false);
                    }}
                  >
                    2. Vertical Lift (θ=0°)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={scenario === "static"}
                    className={`prem-sim-tab ${scenario === "static" ? "active" : ""}`}
                    onClick={() => {
                      setScenario("static");
                      setSelectedOption(null);
                      setShowFeedback(false);
                    }}
                  >
                    3. Static Hold (d=0)
                  </button>
                </div>
              </div>

              {/* Dynamic SVG Visualizer */}
              <div className="prem-sim-canvas-wrap">
                <svg className="prem-sim-svg" viewBox="0 0 520 150" fill="none" preserveAspectRatio="xMidYMid meet">
                  {/* Grid Lines */}
                  <line x1="20" y1="130" x2="500" y2="130" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
                  
                  {/* Ground or platform */}
                  <rect x="30" y="128" width="460" height="4" fill="rgba(255,255,255,0.12)" rx="2" />

                  {/* Mass / Box */}
                  <rect x="220" y="70" width="80" height="58" rx="6" fill="#17171c" stroke="#3b82f6" strokeWidth="1.5" />
                  <text x="260" y="104" textAnchor="middle" fill="#f4f4f5" fontSize="12" fontWeight="600" fontFamily="sans-serif">
                    m = 40 kg
                  </text>

                  {/* Vectors based on scenario */}
                  {scenario === "horizontal" && (
                    <>
                      {/* Upward Force Vector */}
                      <line x1="260" y1="70" x2="260" y2="20" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#blue-arrow)" />
                      <polygon points="260,14 255,24 265,24" fill="#3b82f6" />
                      <text x="272" y="32" fill="#60a5fa" fontSize="11" fontWeight="700" fontFamily="monospace">
                        F(lift) = 400 N ↑
                      </text>

                      {/* Horizontal Displacement Vector */}
                      <line x1="260" y1="99" x2="420" y2="99" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="4 2" />
                      <polygon points="426,99 416,94 416,104" fill="#06b6d4" />
                      <text x="360" y="88" fill="#22d3ee" fontSize="11" fontWeight="700" fontFamily="monospace">
                        d = 50 m →
                      </text>

                      {/* Right angle arc */}
                      <path d="M 276 99 L 276 83 L 260 83" fill="none" stroke="#eab308" strokeWidth="1.5" />
                      <text x="282" y="76" fill="#facc15" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                        θ = 90°
                      </text>
                    </>
                  )}

                  {scenario === "vertical" && (
                    <>
                      {/* Upward Force Vector */}
                      <line x1="250" y1="70" x2="250" y2="18" stroke="#3b82f6" strokeWidth="2.5" />
                      <polygon points="250,12 245,22 255,22" fill="#3b82f6" />
                      <text x="180" y="32" fill="#60a5fa" fontSize="11" fontWeight="700" fontFamily="monospace">
                        F = 400 N ↑
                      </text>

                      {/* Upward Displacement Vector parallel */}
                      <line x1="270" y1="70" x2="270" y2="28" stroke="#06b6d4" strokeWidth="2" strokeDasharray="3 2" />
                      <polygon points="270,22 266,30 274,30" fill="#06b6d4" />
                      <text x="280" y="44" fill="#22d3ee" fontSize="11" fontWeight="700" fontFamily="monospace">
                        d = 1.5 m ↑ (θ = 0°)
                      </text>
                    </>
                  )}

                  {scenario === "static" && (
                    <>
                      {/* Force vector exists */}
                      <line x1="260" y1="70" x2="260" y2="20" stroke="#3b82f6" strokeWidth="2.5" />
                      <polygon points="260,14 255,24 265,24" fill="#3b82f6" />
                      <text x="272" y="32" fill="#60a5fa" fontSize="11" fontWeight="700" fontFamily="monospace">
                        F = 400 N (Muscular Tension)
                      </text>
                      
                      {/* Zero displacement indicator */}
                      <circle cx="260" cy="128" r="4" fill="#ef4444" />
                      <text x="272" y="125" fill="#f87171" fontSize="11" fontWeight="700" fontFamily="monospace">
                        d = 0 m (Displacement zero)
                      </text>
                    </>
                  )}
                </svg>
              </div>

              {/* Dynamic Formula Calculation */}
              <div className="prem-sim-formula-bar">
                <span className="math">{curr.formula}</span>
                <span className="result">Work Done: {curr.work} J</span>
              </div>
            </div>

            {/* Active Retrieval / Understanding-Check Question */}
            <div className="prem-check-card">
              <div className="prem-check-prompt">
                <strong>Concept Verification Check:</strong> Why does biological exhaustion occur if mechanical work is 0 Joules?
              </div>
              <div className="prem-check-options">
                {[
                  {
                    id: 0,
                    text: "Chemical ATP is consumed by contracting muscle fibers (isometric contraction), but no macroscopic displacement occurs.",
                    correct: true,
                  },
                  {
                    id: 1,
                    text: "Earth's gravitational field continuously absorbs the kinetic energy of the stationary suitcase.",
                    correct: false,
                  },
                  {
                    id: 2,
                    text: "Negative atmospheric work cancels out the positive physiological work.",
                    correct: false,
                  },
                ].map((opt) => {
                  let cls = "prem-check-opt";
                  if (selectedOption === opt.id) {
                    cls += opt.correct ? " correct" : " incorrect";
                  }
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={cls}
                      onClick={() => handleOptionSelect(opt.id)}
                    >
                      <span>{opt.text}</span>
                      {selectedOption === opt.id && (
                        <span style={{ fontWeight: 700, marginLeft: 8 }}>
                          {opt.correct ? "✓ Correct" : "✗ Review"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {showFeedback && (
                <div
                  className={`prem-check-feedback ${
                    selectedOption === 0 ? "ok" : "miss"
                  }`}
                >
                  {selectedOption === 0 ? (
                    <span>
                      <strong>Distinction Mastered:</strong> You cleanly separated biological muscle physiology (internal biochemical ATP hydrolysis) from classical mechanical work ($W = \vec&#123;F&#125; \cdot \vec&#123;d&#125;$). This eliminates a classic JEE Main conceptual trap.
                    </span>
                  ) : (
                    <span>
                      <strong>Misconception Detected:</strong> Be careful not to invent non-physical forces. Mechanical work strictly depends on macroscopic displacement. When $d = 0$ or $\cos(90^\circ) = 0$, mechanical work is identically zero.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Rail: Memory Strength & Cognitive Telemetry */}
          <div className="prem-demo-sidebar">
            <div className="prem-side-panel">
              <span className="prem-side-title">Memory Strength (Decay Model)</span>

              <div className="prem-meter-card">
                <div className="prem-meter-head">
                  <strong>Work-Energy Theorem</strong>
                  <span className="val ok">94% Solid</span>
                </div>
                <div className="prem-meter-bar">
                  <div className="prem-meter-fill ok" style={{ width: "94%" }} />
                </div>
              </div>

              <div className="prem-meter-card">
                <div className="prem-meter-head">
                  <strong>Dot Products &amp; Vectors</strong>
                  <span className="val ok">88% Strong</span>
                </div>
                <div className="prem-meter-bar">
                  <div className="prem-meter-fill ok" style={{ width: "88%" }} />
                </div>
              </div>

              <div className="prem-meter-card">
                <div className="prem-meter-head">
                  <strong>Rotational Dynamics</strong>
                  <span className="val warn">48% Fading</span>
                </div>
                <div className="prem-meter-bar">
                  <div className="prem-meter-fill warn" style={{ width: "48%" }} />
                </div>
              </div>
            </div>

            <div className="prem-side-panel">
              <span className="prem-side-title">Spaced Repetition Queue</span>
              <div className="prem-decay-card">
                <p>
                  <strong>Scheduled for Recall:</strong> Rotational Torque &amp; Angular Momentum is approaching the 50% forgetting threshold.
                </p>
                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#60a5fa" }}>
                  <span>Targeted Review</span>
                  <strong>Today · 12 minutes</strong>
                </div>
              </div>
            </div>

            <div className="prem-side-panel">
              <span className="prem-side-title">Curriculum Grounding</span>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--la-muted, #a1a1aa)" }}>
                <div>• Strict NTA JEE &amp; NEET 2026 syllabus compliance</div>
                <div>• NCERT Class 11 Physics Chapter 6</div>
                <div>• Zero off-syllabus or hallucinated questions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
