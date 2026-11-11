"use client";

import React, { useState } from "react";
import Link from "next/link";

type ShowcasePillar =
  | "tutor"
  | "hub"
  | "misconception"
  | "practice"
  | "planner"
  | "analytics"
  | "exams";

interface PillarMeta {
  id: ShowcasePillar;
  number: string;
  tabLabel: string;
  badge: string;
  headline: string;
  summary: string;
  keyPoints: string[];
  ctaText: string;
  ctaHref: string;
}

const PILLARS: PillarMeta[] = [
  {
    id: "tutor",
    number: "01",
    tabLabel: "AI Tutor",
    badge: "Socratic First-Principles",
    headline: "An AI tutor that prompts your thinking instead of spoon-feeding answers.",
    summary:
      "When you ask a difficult question at midnight, ordinary chatbots print the complete answer. Your brain nods along, but under exam conditions you cannot reproduce the derivation. Learning Allied prompts your reasoning step-by-step, builds intuition from first principles, and validates your logic.",
    keyPoints: [
      "Zero answer dumping: Guided Socratic questioning",
      "Dynamic first-principles formula derivations",
      "Interactive scratchpad for student proofs",
      "Available 24/7 with infinite patience",
    ],
    ctaText: "Try AI Tutor",
    ctaHref: "/signup",
  },
  {
    id: "hub",
    number: "02",
    tabLabel: "Learning Hub",
    badge: "Curriculum Knowledge Graph",
    headline: "Structured syllabus blueprints mapped directly to official textbooks.",
    summary:
      "No disconnected trivia or college-level rabbit holes. The Learning Hub structures every chapter into an interconnected knowledge tree, linking prerequisites so you never attempt advanced kinematics before mastering vector resolution.",
    keyPoints: [
      "Strictly aligned to NCERT & Balbharati syllabi",
      "Prerequisite gap diagnosis before difficult chapters",
      "Visual concept blueprints & formula summaries",
      "Direct PYQ (Previous Year Question) relevance tags",
    ],
    ctaText: "Explore Curriculum",
    ctaHref: "/jee-preparation",
  },
  {
    id: "misconception",
    number: "03",
    tabLabel: "Misconception Diagnosis",
    badge: "Deep Diagnostic Engine",
    headline: "Identify why you were wrong, not just a red 'Incorrect' mark.",
    summary:
      "A failed problem is an opportunity to eliminate a false mental model. Our diagnostic engine distinguishes an algebraic slip from a deep physics trap (such as assuming normal force is always equal to mg on an inclined plane) and delivers immediate targeted remediation.",
    keyPoints: [
      "Distinguishes careless slips from conceptual traps",
      "Underlying physics & math mental model correction",
      "Personalized counter-example problems",
      "Prevents false intuitions from solidifying before exams",
    ],
    ctaText: "See Diagnostic Engine",
    ctaHref: "/signup",
  },
  {
    id: "practice",
    number: "04",
    tabLabel: "Practice & Assessments",
    badge: "Curriculum-Calibrated Arena",
    headline: "Timed exam simulation with official NTA marking and instant rubrics.",
    summary:
      "Test yourself under real examination constraints. Timed question sets calibrated for JEE Main, JEE Advanced, NEET UG, and Board descriptive exams with negative marking penalties and step-by-step evaluation rubrics.",
    keyPoints: [
      "Official exam patterns: Single choice, numerical, multi-correct",
      "Full negative marking simulation (+4 / -1)",
      "Cognitive classification: Recall vs Application vs Synthesis",
      "Instant step-by-step marking rubric",
    ],
    ctaText: "Enter Practice Arena",
    ctaHref: "/signup",
  },
  {
    id: "planner",
    number: "05",
    tabLabel: "Study Planner",
    badge: "Dynamic Adaptive Scheduling",
    headline: "A realistic daily study schedule that automatically adapts when you fall behind.",
    summary:
      "Static paper timetables fail the moment life happens. The Learning Allied planner calculates your exact exam deadline, dynamically paces your syllabus, and automatically replans your revision queue when you miss a session without overwhelming backlogs.",
    keyPoints: [
      "Dynamic deadline pacing to finish syllabus before exam day",
      "Intelligent backlog rebalancing with zero guilt",
      "Automatic spaced repetition triggers built into daily queue",
      "Balanced daily mix of theory, practice drills, and revision",
    ],
    ctaText: "Build Your Study Plan",
    ctaHref: "/signup",
  },
  {
    id: "analytics",
    number: "06",
    tabLabel: "Performance & Memory",
    badge: "Neuroscience Analytics",
    headline: "Real-time memory decay curves and metacognitive calibration.",
    summary:
      "Based on Hermann Ebbinghaus's forgetting curve research, the engine models individual topic decay rates and flags concepts right when neural retention drops below 60%. It also compares confidence vs accuracy to cure overconfidence.",
    keyPoints: [
      "Predictive memory retention decay tracking",
      "Metacognitive calibration: Eliminates dangerous blind spots",
      "Subject & chapter mastery heatmaps",
      "Actionable revision priorities generated every morning",
    ],
    ctaText: "View Analytics Demo",
    ctaHref: "/signup",
  },
  {
    id: "exams",
    number: "07",
    tabLabel: "Exam Engines",
    badge: "High-Stakes Prep",
    headline: "Dedicated preparation engines engineered for India's hardest exams.",
    summary:
      "Each exam requires fundamentally different test stamina. We maintain dedicated tracks for JEE Main & Advanced (multi-concept physics & calculus), NEET UG (NCERT line-by-line bio speed), CBSE (step marks & proofs), and Maharashtra State Board.",
    keyPoints: [
      "JEE Main & Advanced: Deep first-principles engineering",
      "NEET UG Medical: High-yield NCERT speed & numerical precision",
      "CBSE Class 9–12: Descriptive proofs & marking scheme adherence",
      "Maharashtra State Board: Complete Balbharati syllabus coverage",
    ],
    ctaText: "Select Your Track",
    ctaHref: "/jee-preparation",
  },
];

export function ProductShowcase() {
  const [activePillar, setActivePillar] = useState<ShowcasePillar>("tutor");
  const [tutorStep, setTutorStep] = useState<number>(1);
  const [activeSubject, setActiveSubject] = useState<"physics" | "chem" | "math">("physics");
  const [diagToggled, setDiagToggled] = useState<boolean>(true);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [plannerDay, setPlannerDay] = useState<"today" | "tomorrow">("today");

  const current = PILLARS.find((p) => p.id === activePillar) || PILLARS[0];

  return (
    <section id="product-showcase" className="prem-section" aria-labelledby="showcase-heading">
      <div className="landing-wrap">
        {/* Section Header */}
        <div className="prem-section-header">
          <div className="prem-eyebrow">
            <span className="dot" />
            <span>Complete Product Architecture</span>
          </div>
          <h2 id="showcase-heading" className="prem-heading">
            Engineered for genuine understanding.
            <br />
            <span className="accent-blue">Built for high-stakes exam performance.</span>
          </h2>
          <p className="prem-lede">
            Explore the core pillars of Learning Allied. Every module is purpose-built to eliminate
            rote-memorization and replace it with lasting conceptual mastery.
          </p>
        </div>

        {/* Linear/Apple-style Segmented Switcher */}
        <div className="showcase-tabs-scroll" role="tablist" aria-label="Product Showcase Navigation">
          <div className="showcase-tabs-container">
            {PILLARS.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={activePillar === p.id}
                className={`showcase-nav-pill ${activePillar === p.id ? "active" : ""}`}
                onClick={() => setActivePillar(p.id)}
                type="button"
              >
                <span className="showcase-pill-num">{p.number}</span>
                <span className="showcase-pill-label">{p.tabLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Pillar Stage Window */}
        <div className="showcase-stage-window prem-border-strong prem-surface">
          {/* Window Chrome */}
          <div className="showcase-window-chrome">
            <div className="showcase-window-dots" aria-hidden="true">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <div className="showcase-window-title">
              <span className="badge-live-tag">{current.badge}</span>
              <span className="title-text">Learning Allied · {current.tabLabel}</span>
            </div>
            <div className="showcase-window-action">
              <Link href={current.ctaHref} className="showcase-quick-link">
                <span>{current.ctaText}</span>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3.5 8h9M8.8 4.3 12.5 8l-3.7 3.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Main Grid: Description Sidebar + Live Interactive UI Preview */}
          <div className="showcase-grid">
            {/* Left: Pillar Story & Educational Value */}
            <div className="showcase-sidebar">
              <div className="showcase-sidebar-num">{current.number}</div>
              <h3 className="showcase-sidebar-title">{current.headline}</h3>
              <p className="showcase-sidebar-summary">{current.summary}</p>

              <div className="showcase-keypoints">
                <div className="showcase-kp-title">Architectural Features</div>
                <ul className="showcase-kp-list">
                  {current.keyPoints.map((pt, i) => (
                    <li key={i} className="showcase-kp-item">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="kp-icon" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="showcase-sidebar-action">
                <Link href={current.ctaHref} className="prem-btn prem-btn-primary">
                  <span>{current.ctaText}</span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3.5 8h9M8.8 4.3 12.5 8l-3.7 3.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right: Realistic Interactive Product UI Simulation */}
            <div className="showcase-preview-area">
              {/* 1. AI TUTOR PREVIEW */}
              {activePillar === "tutor" && (
                <div className="preview-card tutor-preview">
                  <div className="preview-topbar">
                    <div className="preview-tag-group">
                      <span className="preview-chip active">Physics Ch 7</span>
                      <span className="preview-chip">Rotational Motion</span>
                      <span className="preview-chip highlight">JEE Advanced Level</span>
                    </div>
                    <span className="preview-status-pill">
                      <span className="live-dot" /> Socratic Mode
                    </span>
                  </div>

                  <div className="preview-chat-body">
                    {/* Student Query */}
                    <div className="msg-row student">
                      <div className="msg-avatar student-av">Student</div>
                      <div className="msg-bubble">
                        A solid sphere and a hollow cylinder of equal mass and radius roll down an inclined plane from rest without slipping. Which reaches the bottom first, and does mass matter?
                      </div>
                    </div>

                    {/* AI Tutor Socratic Response */}
                    <div className="msg-row tutor">
                      <div className="msg-avatar tutor-av">AI Tutor</div>
                      <div className="msg-bubble tutor-bubble">
                        <div className="tutor-header">
                          <span className="tutor-title">Let&apos;s derive the acceleration from first principles.</span>
                        </div>
                        <p className="tutor-text">
                          Consider the total mechanical energy conservation: potential energy transforms into both translational and rotational kinetic energy:
                        </p>
                        <div className="tutor-equation">
                          {"mgh = ½mv² + ½Iω² = ½mv²(1 + k²/R²)"}
                        </div>
                        <p className="tutor-text">
                          Notice that mass <code className="inline-code">m</code> cancels completely on both sides!
                          What parameter alone determines which object accelerates faster down the incline?
                        </p>

                        {/* Interactive Step Switcher */}
                        <div className="tutor-interactive-panel">
                          <div className="interactive-label">Step-by-step reasoning derivation:</div>
                          <div className="step-switcher">
                            <button
                              type="button"
                              className={`step-btn ${tutorStep === 1 ? "active" : ""}`}
                              onClick={() => setTutorStep(1)}
                            >
                              1. Energy Balance
                            </button>
                            <button
                              type="button"
                              className={`step-btn ${tutorStep === 2 ? "active" : ""}`}
                              onClick={() => setTutorStep(2)}
                            >
                              2. Acceleration Formula
                            </button>
                            <button
                              type="button"
                              className={`step-btn ${tutorStep === 3 ? "active" : ""}`}
                              onClick={() => setTutorStep(3)}
                            >
                              3. Moment of Inertia Comparison
                            </button>
                          </div>

                          <div className="step-explanation">
                            {tutorStep === 1 && (
                              <div className="step-content">
                                <strong>Energy Balance:</strong> At the top, E = mgh. At the bottom, E = ½mv² + ½I(v/R)². Since I = mk², we have E = ½mv²[1 + k²/R²].
                              </div>
                            )}
                            {tutorStep === 2 && (
                              <div className="step-content">
                                <strong>Acceleration Formula:</strong> Differentiating with respect to distance gives a = (g sin θ) / (1 + k²/R²). The smaller the value of k²/R², the greater the acceleration!
                              </div>
                            )}
                            {tutorStep === 3 && (
                              <div className="step-content highlight-box">
                                <strong>Result:</strong> Solid Sphere has k²/R² = 2/5 = 0.4. Hollow Cylinder has k²/R² = 1.0.
                                Therefore, the <strong>solid sphere</strong> always reaches the bottom first, independent of mass and radius!
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. LEARNING HUB PREVIEW */}
              {activePillar === "hub" && (
                <div className="preview-card hub-preview">
                  <div className="preview-topbar">
                    <div className="hub-subject-tabs">
                      <button
                        type="button"
                        className={`hub-sub-tab ${activeSubject === "physics" ? "active" : ""}`}
                        onClick={() => setActiveSubject("physics")}
                      >
                        Physics (NCERT 11 &amp; 12)
                      </button>
                      <button
                        type="button"
                        className={`hub-sub-tab ${activeSubject === "chem" ? "active" : ""}`}
                        onClick={() => setActiveSubject("chem")}
                      >
                        Chemistry
                      </button>
                      <button
                        type="button"
                        className={`hub-sub-tab ${activeSubject === "math" ? "active" : ""}`}
                        onClick={() => setActiveSubject("math")}
                      >
                        Mathematics
                      </button>
                    </div>
                    <span className="preview-counter">38 Chapters Mapped</span>
                  </div>

                  <div className="hub-content-view">
                    <div className="hub-chapter-header">
                      <div>
                        <span className="hub-badge">Class 11 · Unit 3</span>
                        <h4 className="hub-ch-title">Work, Energy and Power</h4>
                      </div>
                      <div className="hub-status-tag mastered">Prerequisites 100% Cleared</div>
                    </div>

                    {/* Concept Blueprint Tree */}
                    <div className="concept-tree">
                      <div className="concept-node mastered">
                        <div className="node-status-icon">✓</div>
                        <div className="node-details">
                          <span className="node-name">Scalar Dot Product &amp; Definition of Work</span>
                          <span className="node-meta">Formula: W = F · d · cos(θ) · Mastered</span>
                        </div>
                        <span className="node-score">96%</span>
                      </div>

                      <div className="concept-node current">
                        <div className="node-status-icon current-icon">●</div>
                        <div className="node-details">
                          <span className="node-name">Work-Energy Theorem (Variable &amp; Constant Force)</span>
                          <span className="node-meta">Curriculum Anchor: NCERT §6.3 · 8 Practice Problems</span>
                        </div>
                        <span className="node-score in-prog">Active</span>
                      </div>

                      <div className="concept-node upcoming">
                        <div className="node-status-icon">○</div>
                        <div className="node-details">
                          <span className="node-name">Conservative vs Non-Conservative Forces &amp; Potential Wells</span>
                          <span className="node-meta">High weightage for JEE Advanced · Unlocks next</span>
                        </div>
                        <span className="node-score lock">Queued</span>
                      </div>

                      <div className="concept-node upcoming">
                        <div className="node-status-icon">○</div>
                        <div className="node-details">
                          <span className="node-name">Elastic &amp; Inelastic Collisions in One and Two Dimensions</span>
                          <span className="node-meta">Coefficient of restitution $e$ analysis</span>
                        </div>
                        <span className="node-score lock">Queued</span>
                      </div>
                    </div>

                    <div className="hub-callout-footer">
                      <div className="hub-callout-item">
                        <strong>Official Syllabus:</strong> Strictly calibrated to NTA JEE Main, NEET UG &amp; CBSE 2026.
                      </div>
                      <div className="hub-callout-item">
                        <strong>Knowledge Graph:</strong> Detects if you struggle with vectors before teaching forces.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. MISCONCEPTION DIAGNOSIS PREVIEW */}
              {activePillar === "misconception" && (
                <div className="preview-card misconception-preview">
                  <div className="preview-topbar">
                    <span className="diag-header-tag">Deep Diagnostic Engine · Diagnostic Case #309</span>
                    <button
                      type="button"
                      className="diag-toggle-btn"
                      onClick={() => setDiagToggled(!diagToggled)}
                    >
                      {diagToggled ? "Show Raw Student Answer" : "Show Diagnostic Breakdown"}
                    </button>
                  </div>

                  <div className="diag-body">
                    <div className="diag-problem-box">
                      <div className="diag-problem-label">Exam Question (NEET UG / JEE Main):</div>
                      <p className="diag-problem-text">
                        A crate of mass m = 10 kg rests on a stationary incline tilted at θ = 30°.
                        Calculate the normal reaction force exerted by the incline on the crate. (Take g = 9.8 m/s²).
                      </p>
                    </div>

                    {diagToggled ? (
                      <div className="diag-result-card">
                        <div className="diag-badge-row">
                          <span className="diag-error-pill conceptual">Diagnostic: Conceptual Boundary Trap</span>
                          <span className="diag-severity">Critical Misconception</span>
                        </div>

                        <div className="diag-comparison-grid">
                          <div className="diag-box student-error">
                            <div className="diag-box-head">
                              <span className="cross-icon">✕</span>
                              <span>Student Error</span>
                            </div>
                            <div className="diag-val">{"N = mg = 10 × 9.8 = 98 N"}</div>
                            <div className="diag-explanation">
                              <strong>Root-cause diagnosis:</strong> The student defaulted to the flat-surface formula N = mg, failing to resolve forces along the axis perpendicular to the inclined plane.
                            </div>
                          </div>

                          <div className="diag-box correction">
                            <div className="diag-box-head">
                              <span className="check-icon">✓</span>
                              <span>First-Principles Correction</span>
                            </div>
                            <div className="diag-val">{"N = mg cos(30°) = 98 × (√3/2) ≈ 84.87 N"}</div>
                            <div className="diag-explanation">
                              <strong>Free-Body Analysis:</strong> Acceleration perpendicular to the incline is zero (ΣF⊥ = 0). Hence, N - mg cos θ = 0 ⟹ N = mg cos θ.
                            </div>
                          </div>
                        </div>

                        <div className="diag-remediation">
                          <strong>Automated Remediation Generated:</strong> 1 targeted drill on inclined-plane free-body diagrams added to your evening spaced review queue.
                        </div>
                      </div>
                    ) : (
                      <div className="diag-raw-view">
                        <div className="raw-bubble">
                          Student input: &ldquo;The normal force must be N = mg = 98 N because gravity acts on the box.&rdquo;
                        </div>
                        <p className="raw-note">
                          Click &ldquo;Show Diagnostic Breakdown&rdquo; above to see how Learning Allied diagnoses the underlying conceptual gap.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. PRACTICE & ASSESSMENTS PREVIEW */}
              {activePillar === "practice" && (
                <div className="preview-card practice-preview">
                  <div className="preview-topbar">
                    <div className="exam-mode-timer">
                      <span className="timer-icon">⏱</span>
                      <span className="timer-val">02:14</span>
                      <span className="timer-label">Remaining in Session</span>
                    </div>
                    <div className="marking-scheme-pill">
                      <span>NTA Marking:</span>
                      <strong className="pos">+4</strong> / <strong className="neg">-1</strong>
                    </div>
                  </div>

                  <div className="practice-workbench">
                    <div className="question-meta-bar">
                      <span className="q-num">Question 14 of 25</span>
                      <span className="q-tag">JEE Main 2024 Calibrated · Electrostatics</span>
                    </div>

                    <div className="q-prompt">
                      Two point charges $+q$ and $-q$ are separated by a distance $2a$. What is the electric potential at a point $P$ lying on the equatorial bisector at a distance $r$ from the dipole midpoint?
                    </div>

                    <div className="q-options-grid">
                      {[
                        { id: "A", text: "V = 0", isCorrect: true },
                        { id: "B", text: "V = \\frac{1}{4\\pi\\varepsilon_0} \\frac{p}{r^2}", isCorrect: false },
                        { id: "C", text: "V = \\frac{1}{4\\pi\\varepsilon_0} \\frac{2p}{r^3}", isCorrect: false },
                        { id: "D", text: "V = \\frac{1}{4\\pi\\varepsilon_0} \\frac{q}{\\sqrt{r^2 + a^2}}", isCorrect: false },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`q-opt-btn ${quizAnswer === opt.id ? (opt.isCorrect ? "opt-correct" : "opt-wrong") : ""}`}
                          onClick={() => setQuizAnswer(opt.id)}
                        >
                          <span className="opt-letter">{opt.id}</span>
                          <span className="opt-text">{opt.text}</span>
                          {quizAnswer === opt.id && (
                            <span className="opt-feedback-tag">
                              {opt.isCorrect ? "✓ Correct (+4)" : "✕ Incorrect (-1)"}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {quizAnswer && (
                      <div className="practice-rubric-box">
                        <strong>Instant Scoring Rubric:</strong>{" Any point on the equatorial plane is equidistant from +q and -q (√(r² + a²)). Since electric potential is a scalar sum of two equal and opposite charges, V = 0 at every point on the equatorial plane."}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. ADAPTIVE STUDY PLANNER PREVIEW */}
              {activePillar === "planner" && (
                <div className="preview-card planner-preview">
                  <div className="preview-topbar">
                    <div className="planner-day-switcher">
                      <button
                        type="button"
                        className={`planner-day-btn ${plannerDay === "today" ? "active" : ""}`}
                        onClick={() => setPlannerDay("today")}
                      >
                        Today&apos;s Focus
                      </button>
                      <button
                        type="button"
                        className={`planner-day-btn ${plannerDay === "tomorrow" ? "active" : ""}`}
                        onClick={() => setPlannerDay("tomorrow")}
                      >
                        Tomorrow
                      </button>
                    </div>
                    <span className="planner-pace-badge">Pacing: 2 Days Ahead</span>
                  </div>

                  <div className="planner-queue">
                    <div className="planner-queue-header">
                      <div>
                        <h4 className="planner-q-title">Daily Socratic Agenda</h4>
                        <span className="planner-q-sub">Target Exam: JEE Main 2026 · Target: 99.4th Percentile</span>
                      </div>
                      <div className="planner-progress-metric">
                        <span className="prog-num">2 / 4 Completed</span>
                      </div>
                    </div>

                    <div className="planner-task-list">
                      <div className="planner-task-card completed">
                        <div className="task-check">✓</div>
                        <div className="task-info">
                          <span className="task-time">07:00 AM · Completed</span>
                          <strong className="task-name">Spaced Retrieval: Chemical Bonding &amp; Molecular Orbitals</strong>
                          <span className="task-type">Memory decay maintenance drill · 15 mins</span>
                        </div>
                        <span className="task-status ok">Retained</span>
                      </div>

                      <div className="planner-task-card completed">
                        <div className="task-check">✓</div>
                        <div className="task-info">
                          <span className="task-time">04:30 PM · Completed</span>
                          <strong className="task-name">First-Principles Derivation: Carnot Cycle &amp; Entropy</strong>
                          <span className="task-type">Physics Ch 12 Socratic session · 40 mins</span>
                        </div>
                        <span className="task-status ok">Mastered</span>
                      </div>

                      <div className="planner-task-card current-task">
                        <div className="task-check current-dot">●</div>
                        <div className="task-info">
                          <span className="task-time">07:30 PM · In Progress</span>
                          <strong className="task-name">Practice Arena: 15 Definite Integrals Under Time Pressure</strong>
                          <span className="task-type">Math high-yield test · 30 mins</span>
                        </div>
                        <span className="task-status active-pulse">Active</span>
                      </div>

                      <div className="planner-task-card upcoming-task">
                        <div className="task-check upcoming-circle">○</div>
                        <div className="task-info">
                          <span className="task-time">09:30 PM · Queued</span>
                          <strong className="task-name">Misconception Review: Rotational Equilibrium Questions</strong>
                          <span className="task-type">Auto-scheduled from yesterday&apos;s diagnostic · 20 mins</span>
                        </div>
                        <span className="task-status queue">Up Next</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. PERFORMANCE & MEMORY ANALYTICS PREVIEW */}
              {activePillar === "analytics" && (
                <div className="preview-card analytics-preview">
                  <div className="preview-topbar">
                    <span className="analytics-header-title">Ebbinghaus Retention &amp; Metacognitive Index</span>
                    <span className="analytics-status-pill">Overall Retention: 91.4%</span>
                  </div>

                  <div className="analytics-grid">
                    {/* Retention Curve Card */}
                    <div className="analytics-sub-card">
                      <div className="analytics-card-head">
                        <strong>Neural Retention Curve</strong>
                        <span className="decay-tag">Spaced Recall Enabled</span>
                      </div>

                      <div className="analytics-mini-chart">
                        <svg viewBox="0 0 340 100" className="chart-svg" aria-label="Retention graph">
                          {/* Unspaced forgetting curve */}
                          <path
                            d="M 10 20 Q 80 85 330 92"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                          {/* Spaced repetition curve */}
                          <path
                            d="M 10 20 Q 50 45 70 20 Q 140 38 170 20 Q 250 28 330 22"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2.5"
                          />
                          {/* Recall Points */}
                          <circle cx="70" cy="20" r="4" fill="#10b981" />
                          <circle cx="170" cy="20" r="4" fill="#10b981" />
                          <circle cx="330" cy="22" r="4" fill="#10b981" />
                        </svg>
                        <div className="chart-legend">
                          <span className="legend-item red">Passive Cramming (Decays to 21%)</span>
                          <span className="legend-item green">Learning Allied (Maintains 91%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Metacognitive Calibration Index */}
                    <div className="analytics-sub-card">
                      <div className="analytics-card-head">
                        <strong>Metacognitive Calibration</strong>
                        <span className="decay-tag">Self-Awareness</span>
                      </div>

                      <div className="calibration-meter">
                        <div className="calib-row">
                          <span>High Confidence + High Accuracy</span>
                          <strong className="text-ok">88% (Mastery)</strong>
                        </div>
                        <div className="calib-progress-bar">
                          <div className="calib-fill ok" style={{ width: "88%" }} />
                        </div>

                        <div className="calib-row" style={{ marginTop: 12 }}>
                          <span>High Confidence + Low Accuracy (Dangerous Trap)</span>
                          <strong className="text-warn">4% (Eliminated)</strong>
                        </div>
                        <div className="calib-progress-bar">
                          <div className="calib-fill warn" style={{ width: "4%" }} />
                        </div>
                      </div>
                      <p className="calib-note">
                        Our engine actively eliminates the illusion of competence where students feel confident but commit conceptual errors under pressure.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. COMPETITIVE EXAM ENGINES PREVIEW */}
              {activePillar === "exams" && (
                <div className="preview-card exams-preview">
                  <div className="preview-topbar">
                    <span className="exams-header-title">National &amp; State Curriculum Calibration</span>
                    <span className="exams-tag">Official Syllabus Calibrated</span>
                  </div>

                  <div className="exam-engines-grid">
                    <div className="exam-engine-box">
                      <div className="engine-head">
                        <span className="engine-badge jee">Engineering</span>
                        <strong>JEE Main &amp; Advanced</strong>
                      </div>
                      <p className="engine-desc">
                        Multi-concept physics, advanced calculus proofs, and physical chemistry mechanics.
                      </p>
                      <div className="engine-stats">
                        <span>Percentile Target: 99.5+</span>
                        <span>PYQs: 2014–2025</span>
                      </div>
                    </div>

                    <div className="exam-engine-box">
                      <div className="engine-head">
                        <span className="engine-badge neet">Medical</span>
                        <strong>NEET UG Medical</strong>
                      </div>
                      <p className="engine-desc">
                        NCERT line-by-line active recall, biological classifications, and rapid physics calculation.
                      </p>
                      <div className="engine-stats">
                        <span>Target: 680+ / 720</span>
                        <span>100% NCERT Calibrated</span>
                      </div>
                    </div>

                    <div className="exam-engine-box">
                      <div className="engine-head">
                        <span className="engine-badge cbse">National Board</span>
                        <strong>CBSE Class 9–12</strong>
                      </div>
                      <p className="engine-desc">
                        Step-by-step marking rubrics, NCERT Exemplar drills, and descriptive derivations.
                      </p>
                      <div className="engine-stats">
                        <span>Board Pattern Practice</span>
                        <span>Official Marking Schemes</span>
                      </div>
                    </div>

                    <div className="exam-engine-box">
                      <div className="engine-head">
                        <span className="engine-badge mh">State Board</span>
                        <strong>Maharashtra SSC &amp; HSC</strong>
                      </div>
                      <p className="engine-desc">
                        Complete Balbharati textbook curriculum mapping for Class 10 SSC and Class 12 HSC.
                      </p>
                      <div className="engine-stats">
                        <span>Balbharati Grounded</span>
                        <span>State Board Question Bank</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
