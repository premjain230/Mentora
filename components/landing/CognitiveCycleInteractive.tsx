"use client";

import React, { useState } from "react";

interface PhaseData {
  id: string;
  step: string;
  name: string;
  title: string;
  lede: string;
  tagline: string;
  citation: string;
  researchBasis: string;
}

const PHASES: PhaseData[] = [
  {
    id: "understand",
    step: "01",
    name: "Understand",
    title: "Socratic guidance that builds intuition, not dependency.",
    lede: "When you ask a difficult question, ordinary AI immediately prints the solution. This creates an illusion of competence—you nod along, but cannot solve it in an exam. Learning Allied prompts your reasoning step-by-step so your brain encodes the neural pathway.",
    tagline: "Socratic First-Principles Dialogue",
    citation: "Generation Effect — Slamecka & Graf, 1978",
    researchBasis: "Generating an answer or premise independently produces substantially stronger long-term memory traces than passively reading an explanation.",
  },
  {
    id: "explain",
    step: "02",
    name: "Explain",
    title: "Prerequisite mapping: Never build on shaky foundations.",
    lede: "Advanced concepts feel impossible when foundational building blocks are missing. Learning Allied maps your curriculum into a connected knowledge graph. If you struggle with Rotational Inertia, it diagnoses the underlying gap in Center of Mass or Vectors before moving forward.",
    tagline: "Curriculum Knowledge Graph",
    citation: "Cognitive Load Theory — Sweller, 1988",
    researchBasis: "Complex schema acquisition fails when working memory is overloaded by unmastered prerequisite concepts.",
  },
  {
    id: "practice",
    step: "03",
    name: "Practice",
    title: "Exam-calibrated retrieval under real test conditions.",
    lede: "Practice shouldn't be random drills. Every question is rigorously calibrated to official JEE Main & Advanced, NEET UG, CBSE, and Maharashtra Board schemas. Timed retrieval forces effortful cognitive recall under realistic exam constraints.",
    tagline: "Curriculum-Calibrated Retrieval",
    citation: "Retrieval Practice Paradigm — Roediger & Butler, 2011",
    researchBasis: "Testing is not merely an assessment tool—the act of retrieving information from memory reorganizes and strengthens neural connectivity.",
  },
  {
    id: "evaluate",
    step: "04",
    name: "Evaluate",
    title: "Misconception diagnosis: Why you were wrong, not just a score.",
    lede: "A red 'Incorrect' mark teaches you nothing. Learning Allied's diagnostic engine classifies errors: Was it an algebraic calculation slip? A unit conversion oversight? Or a fundamental misconception such as assuming normal force is always equal to mg?",
    tagline: "Deep Diagnostic Engine",
    citation: "Formative Misconception Analysis — Sadler et al., 2013",
    researchBasis: "Targeting specific conceptual misconceptions prevents errors from becoming calcified into student mental models.",
  },
  {
    id: "improve",
    step: "05",
    name: "Improve",
    title: "Metacognitive calibration: Close the illusion-of-competence gap.",
    lede: "The most dangerous mistake in competitive exams is feeling 100% confident about a wrong approach. Learning Allied calibrates your subjective confidence against actual accuracy, shining a spotlight directly onto your genuine blind spots.",
    tagline: "Confidence vs Accuracy Calibration",
    citation: "Metacognition Calibration — Flavell, 1979",
    researchBasis: "Accurate self-monitoring is the strongest predictor of high-stakes examination performance.",
  },
  {
    id: "remember",
    step: "06",
    name: "Remember",
    title: "Spaced repetition: Review just as memory begins to fade.",
    lede: "Human memory decays exponentially. Re-reading whole textbooks is a waste of precious time. Learning Allied models your individual forgetting curve and resurfaces concepts exactly when neural decay begins, cutting revision time by more than 50%.",
    tagline: "Exponential Decay Scheduling",
    citation: "Forgetting Curve & Spaced Retrieval — Ebbinghaus, 1885 / Leitner, 1972",
    researchBasis: "Spaced retrieval intervals interrupt synaptic pruning and consolidate working memories into permanent long-term storage.",
  },
];

export function CognitiveCycleInteractive() {
  const [activeTab, setActiveTab] = useState<string>("understand");

  const current = PHASES.find((p) => p.id === activeTab) || PHASES[0];

  return (
    <div className="prem-cognitive-section">
      {/* 6-Phase Segmented Navigation Bar */}
      <div className="prem-story-nav" role="tablist" aria-label="Learning methodology steps">
        {PHASES.map((p) => {
          const isActive = p.id === activeTab;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`prem-story-tab ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(p.id)}
            >
              <span className="prem-story-tab-idx">{p.step}</span>
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Showcase Stage */}
      <div className="prem-phase-stage">
        <div className="prem-phase-grid">
          {/* Narrative Column */}
          <div className="prem-phase-info">
            <div className="prem-phase-step-tag">
              <span>Phase {current.step}</span>
              <span>·</span>
              <span>{current.tagline}</span>
            </div>
            <h3 className="prem-phase-title">{current.title}</h3>
            <p className="prem-phase-desc">{current.lede}</p>

            <div className="prem-phase-evidence">
              <strong>{current.citation}</strong>
              {current.researchBasis}
            </div>
          </div>

          {/* Code-Built Interactive Preview Column */}
          <div className="prem-phase-preview">
            {activeTab === "understand" && (
              <div style={{ width: "100%", maxWidth: 460 }}>
                {/* Comparison Card */}
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ padding: 16, borderRadius: 12, background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#f87171", marginBottom: 6 }}>
                      <span>✗ Typical AI Chatbot</span>
                      <span style={{ fontSize: 9, opacity: 0.8 }}>(Passive Dependency)</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: "#d1d5db", lineHeight: 1.5 }}>
                      &ldquo;Here is the exact solution to homework problem #4: Step 1, plug in numbers... Step 2, answer is 42.5 J.&rdquo;
                    </p>
                    <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "#9ca3af" }}>
                      Result: Student copies answer. Memory vanishes within 48 hours.
                    </span>
                  </div>

                  <div style={{ padding: 16, borderRadius: 12, background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#60a5fa", marginBottom: 6 }}>
                      <span>✓ Learning Allied</span>
                      <span style={{ fontSize: 9, opacity: 0.8 }}>(Active Cognitive Scaffolding)</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: "#f3f4f6", lineHeight: 1.5 }}>
                      &ldquo;Before we calculate: Which conservative force is acting on the body during this ascent, and how does work relate to potential energy?&rdquo;
                    </p>
                    <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "#34d399", fontWeight: 600 }}>
                      Result: Student constructs the deduction. Neural pathway firmly established.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "explain" && (
              <div style={{ width: "100%", maxWidth: 460 }}>
                {/* Knowledge Graph Tree Preview */}
                <div style={{ padding: 20, borderRadius: 14, background: "var(--la-surface-2, #121216)", border: "1px solid var(--la-line, rgba(255,255,255,0.1))" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a1a1aa" }}>
                      Knowledge Graph Traversal
                    </span>
                    <span style={{ fontSize: 11, color: "#3b82f6", background: "rgba(59,130,246,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                      Target: Rotational Torque
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.25)", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#34d399", fontWeight: 600 }}>✓ Prerequisite 1: Vector Cross Product</span>
                      <span style={{ color: "#10b981" }}>Mastered (98%)</span>
                    </div>
                    <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.25)", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#34d399", fontWeight: 600 }}>✓ Prerequisite 2: Newton&apos;s 2nd Law (F = ma)</span>
                      <span style={{ color: "#10b981" }}>Mastered (92%)</span>
                    </div>
                    <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(59, 130, 246, 0.15)", border: "1px solid #3b82f6", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#93c5fd", fontWeight: 700 }}>→ Active Concept: Torque (τ = r × F)</span>
                      <span style={{ color: "#60a5fa" }}>Synthesizing</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "practice" && (
              <div style={{ width: "100%", maxWidth: 460 }}>
                {/* Practice Terminal Preview */}
                <div style={{ padding: 18, borderRadius: 14, background: "var(--la-surface-2, #111114)", border: "1px solid var(--la-line, rgba(255,255,255,0.1))" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#a1a1aa", marginBottom: 12 }}>
                    <span>JEE Advanced Diagnostic Drill</span>
                    <span style={{ color: "#eab308", fontWeight: 600 }}>⏱ 02:45 remaining</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#ffffff", lineHeight: 1.5, margin: "0 0 14px" }}>
                    A uniform disc of mass M and radius R rolls without slipping down an inclined plane of angle &theta;.
                    Find the acceleration of its center of mass.
                  </p>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "#d1d5db" }}>
                      (A) a = g · sin(&theta;)
                    </div>
                    <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(59, 130, 246, 0.12)", border: "1px solid #3b82f6", fontSize: 12, color: "#93c5fd", fontWeight: 600 }}>
                      (B) a = (2/3) · g · sin(&theta;) [Retrieval Target]
                    </div>
                    <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "#d1d5db" }}>
                      (C) a = (1/2) · g · sin(&theta;)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "evaluate" && (
              <div style={{ width: "100%", maxWidth: 460 }}>
                {/* Diagnostic Analysis Preview */}
                <div style={{ padding: 18, borderRadius: 14, background: "var(--la-surface-2, #111114)", border: "1px solid var(--la-line, rgba(255,255,255,0.1))" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ padding: "3px 8px", borderRadius: 4, background: "rgba(239, 68, 68, 0.15)", color: "#f87171", fontSize: 11, fontWeight: 700 }}>
                      Misconception Classified
                    </span>
                    <span style={{ fontSize: 12, color: "#a1a1aa" }}>Question #14</span>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#e5e7eb", marginBottom: 12 }}>
                    <strong>Student mistake:</strong> Substituted moment of inertia of a spherical shell (2/3 MR²) instead of a solid cylinder (1/2 MR²).
                  </div>
                  <div style={{ padding: 12, borderRadius: 8, background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", fontSize: 12, color: "#93c5fd" }}>
                    <strong>Targeted Remediation:</strong> Mass distribution is continuous throughout the volume, shifting average radius closer to axis than a hollow shell.
                  </div>
                </div>
              </div>
            )}

            {activeTab === "improve" && (
              <div style={{ width: "100%", maxWidth: 460 }}>
                {/* Confidence Calibration Matrix Preview */}
                <div style={{ padding: 18, borderRadius: 14, background: "var(--la-surface-2, #111114)", border: "1px solid var(--la-line, rgba(255,255,255,0.1))" }}>
                  <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a1a1aa", marginBottom: 12 }}>
                    Metacognitive Calibration Matrix
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ padding: 12, borderRadius: 8, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                      <span style={{ display: "block", fontSize: 11, color: "#10b981", fontWeight: 700 }}>High Confidence · Correct</span>
                      <strong style={{ fontSize: 18, color: "#34d399" }}>78%</strong>
                      <span style={{ display: "block", fontSize: 10.5, color: "#9ca3af" }}>Solid Mastery</span>
                    </div>
                    <div style={{ padding: 12, borderRadius: 8, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
                      <span style={{ display: "block", fontSize: 11, color: "#ef4444", fontWeight: 700 }}>High Confidence · Wrong</span>
                      <strong style={{ fontSize: 18, color: "#f87171" }}>4%</strong>
                      <span style={{ display: "block", fontSize: 10.5, color: "#9ca3af" }}>Illusion of Competence (Tombstoned)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "remember" && (
              <div style={{ width: "100%", maxWidth: 460 }}>
                {/* Spaced Retrieval Curve Preview */}
                <div style={{ padding: 18, borderRadius: 14, background: "var(--la-surface-2, #111114)", border: "1px solid var(--la-line, rgba(255,255,255,0.1))" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#a1a1aa", marginBottom: 14 }}>
                    <span>Ebbinghaus Decay Curve</span>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>Active Recall Active</span>
                  </div>

                  <svg viewBox="0 0 380 120" fill="none" style={{ width: "100%", height: "auto" }}>
                    {/* Axes */}
                    <line x1="30" y1="100" x2="360" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                    <line x1="30" y1="10" x2="30" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

                    {/* Unreviewed Cramming Decay (Red dotted curve) */}
                    <path d="M 30 20 Q 90 85 360 98" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 3" />

                    {/* Spaced Retrieval Curve (Green stepped curve) */}
                    {/* Review 1 at x=110 */}
                    <path d="M 30 20 Q 70 50 110 65" fill="none" stroke="#10b981" strokeWidth="2.5" />
                    <line x1="110" y1="65" x2="110" y2="25" stroke="#3b82f6" strokeWidth="2" />
                    {/* Review 2 at x=220 */}
                    <path d="M 110 25 Q 165 42 220 50" fill="none" stroke="#10b981" strokeWidth="2.5" />
                    <line x1="220" y1="50" x2="220" y2="22" stroke="#3b82f6" strokeWidth="2" />
                    {/* Retention at day 30 */}
                    <path d="M 220 22 Q 290 28 360 32" fill="none" stroke="#10b981" strokeWidth="2.5" />

                    {/* Labels */}
                    <text x="35" y="112" fill="#71717a" fontSize="9" fontFamily="sans-serif">Day 0</text>
                    <text x="110" y="112" fill="#60a5fa" fontSize="9" fontFamily="sans-serif">Rev 1</text>
                    <text x="220" y="112" fill="#60a5fa" fontSize="9" fontFamily="sans-serif">Rev 2</text>
                    <text x="340" y="112" fill="#71717a" fontSize="9" fontFamily="sans-serif">Day 30</text>

                    <text x="310" y="26" fill="#34d399" fontSize="10" fontWeight="700" fontFamily="sans-serif">92% Kept</text>
                    <text x="310" y="94" fill="#f87171" fontSize="10" fontFamily="sans-serif">18% Kept</text>
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
