"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MathText } from "@/components/learning/MathText";

type WorkbenchTab = "understand" | "visualize" | "evaluate" | "adapt" | "remember";
type Scenario = "horizontal" | "vertical" | "static";

interface TabMeta {
  id: WorkbenchTab;
  num: string;
  label: string;
  badge: string;
  routeLabel: string;
  routeHref: string;
  headline: string;
  summary: string;
  points: string[];
  evidenceTitle: string;
  evidenceBody: string;
}

const TABS: TabMeta[] = [
  {
    id: "understand",
    num: "01",
    label: "Understand & Explain",
    badge: "Socratic Tutor + Learning Hub",
    routeLabel: "Open Learning Hub",
    routeHref: "/signup",
    headline: "Build real intuition before seeing the final step.",
    summary:
      "Instead of dumping complete homework solutions, Learning Allied prompts your reasoning step-by-step and checks prerequisite foundations so advanced topics actually click.",
    points: [
      "First-principles Socratic dialogue instead of answer dumping",
      "Prerequisite knowledge mapping catches foundational gaps early",
      "Personalized explanations calibrated to your grade and board",
    ],
    evidenceTitle: "Generation Effect · Slamecka & Graf",
    evidenceBody:
      "Constructing a derivation yourself creates stronger long-term recall than passively reading a solution.",
  },
  {
    id: "visualize",
    num: "02",
    label: "Visualize Concepts",
    badge: "Interactive Concept Models",
    routeLabel: "Explore Visual Lessons",
    routeHref: "/signup",
    headline: "See how variables interact in real time.",
    summary:
      "Difficult topics in physics, chemistry, and mathematics become clear when you can inspect vectors, angles, forces, and graphs interactively alongside the derivation.",
    points: [
      "Interactive 2D force, motion, wave, circuit, and graph scenes",
      "Live formula updates as physical conditions change",
      "Paired directly with structured textbook explanations",
    ],
    evidenceTitle: "Dual Coding · Paivio",
    evidenceBody:
      "Combining visual spatial models with verbal derivations lowers cognitive load on complex problems.",
  },
  {
    id: "evaluate",
    num: "03",
    label: "Practice & Evaluate",
    badge: "Quiz Arena + Diagnostic Engine",
    routeLabel: "Try Practice Arena",
    routeHref: "/signup",
    headline: "Pinpoint why an answer failed — not just a red mark.",
    summary:
      "Practice with curriculum-calibrated questions and rubrics. When you miss a problem, Learning Allied distinguishes a quick arithmetic slip from a deeper conceptual misconception.",
    points: [
      "Exam-calibrated questions with instant step-by-step rubrics",
      "Separates calculation errors from false mental models",
      "Metacognitive confidence checks prevent false certainty",
    ],
    evidenceTitle: "Retrieval & Formative Diagnosis",
    evidenceBody:
      "Immediate diagnostic feedback stops conceptual traps from hardening before exam day.",
  },
  {
    id: "adapt",
    num: "04",
    label: "Adapt & Plan",
    badge: "Dynamic Study Planner",
    routeLabel: "Build Study Plan",
    routeHref: "/signup",
    headline: "A daily study plan that adapts when your schedule shifts.",
    summary:
      "Static paper timetables break the first time you fall behind. Your Study Planner paces chapters toward your exam date and automatically rebalances missed sessions without overwhelming backlogs.",
    points: [
      "Exam countdown pacing across your active subjects",
      "One-click replanning when life interrupts your routine",
      "Blends new concepts, practice drills, and due reviews",
    ],
    evidenceTitle: "Adaptive Pacing",
    evidenceBody:
      "Daily queues adjust dynamically to your recent mastery and upcoming exam milestones.",
  },
  {
    id: "remember",
    num: "05",
    label: "Remember & Revise",
    badge: "Spaced Review Engine",
    routeLabel: "View Spaced Review",
    routeHref: "/signup",
    headline: "Revise concepts right before memory begins to fade.",
    summary:
      "Cramming fades within days. Learning Allied models topic retention over time and schedules short active-recall sessions right as memory strength drops toward the forgetting threshold.",
    points: [
      "Ebbinghaus decay tracking per concept and chapter",
      "Targeted daily review queue instead of re-reading whole chapters",
      "Tracks high-confidence vs. high-accuracy calibration",
    ],
    evidenceTitle: "Spaced Retrieval · Ebbinghaus",
    evidenceBody:
      "Timed recall intervals interrupt forgetting curves and consolidate knowledge for exam day.",
  },
];

const SCENARIOS: Record<
  Scenario,
  { label: string; formula: string; work: string; note: string }
> = {
  horizontal: {
    label: "1. Horizontal Walk (θ=90°)",
    formula: "W = F · d · cos(90°) = 400 · 50 · 0",
    work: "0 J",
    note: "Upward support force is perpendicular to horizontal displacement.",
  },
  vertical: {
    label: "2. Vertical Lift (θ=0°)",
    formula: "W = F · d · cos(0°) = 400 · 1.5 · 1",
    work: "+600 J",
    note: "Force and displacement align, transferring +600 J of potential energy.",
  },
  static: {
    label: "3. Static Hold (d=0)",
    formula: "W = F · d · cos(θ) = 400 · 0 · 1",
    work: "0 J",
    note: "Muscles burn ATP internally, but macroscopic displacement d = 0.",
  },
};

export function ProductShowcase() {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("understand");
  const [tutorStep, setTutorStep] = useState<number>(1);
  const [scenario, setScenario] = useState<Scenario>("horizontal");
  const [evalView, setEvalView] = useState<"practice" | "diagnosis">("practice");
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [plannerDay, setPlannerDay] = useState<"today" | "tomorrow">("today");
  const [simDay, setSimDay] = useState<number>(7);

  const current = TABS.find((t) => t.id === activeTab) || TABS[0];
  const currScenario = SCENARIOS[scenario];

  const getTradRetention = (d: number) => {
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

  const tradPct = getTradRetention(simDay);
  const alliedPct = getAlliedRetention(simDay);

  return (
    <section id="workspace" className="land-section" aria-labelledby="workspace-heading">
      <div className="landing-wrap">
        <div className="land-section-head">
          <div className="land-eyebrow">Inside Learning Allied</div>
          <h2 id="workspace-heading" className="land-heading">
            One complete study loop — from first confusion to long-term recall.
          </h2>
          <p className="land-lede">
            Explore the actual learning stages built into the platform. Every tool works together
            to help you understand deeply, test accurately, and remember on exam day.
          </p>
        </div>

        {/* Segmented Stage Switcher */}
        <div className="wb-tabs-wrap">
          <div className="wb-tabs" role="tablist" aria-label="Learning Allied workflow stages">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`wb-tab ${isActive ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="wb-tab-num">{tab.num}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workbench Stage Frame */}
        <div className="wb-window">
          <div className="wb-chrome">
            <div className="wb-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div className="wb-chrome-title">
              <span className="wb-chrome-badge">{current.badge}</span>
              <span>Learning Allied Workspace</span>
            </div>
            <Link href={current.routeHref} className="wb-chrome-link">
              <span>{current.routeLabel}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="wb-grid">
            {/* Left Column: Educational Value */}
            <div className="wb-sidebar">
              <div>
                <div className="wb-step-code">
                  Stage {current.num} · {current.label}
                </div>
                <h3 className="wb-title">{current.headline}</h3>
                <p className="wb-desc">{current.summary}</p>

                <ul className="wb-points">
                  {current.points.map((pt) => (
                    <li key={pt}>
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="wb-point-icon"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="wb-evidence">
                <strong>{current.evidenceTitle}</strong>
                {current.evidenceBody}
              </div>
            </div>

            {/* Right Column: Live Interactive Representation */}
            <div className="wb-stage">
              {/* 01 · UNDERSTAND & EXPLAIN */}
              {activeTab === "understand" && (
                <div className="wb-inner-card">
                  <div className="wb-inner-head">
                    <div className="wb-chip-row">
                      <span className="wb-chip accent">Physics · Rotational Motion</span>
                      <span className="wb-chip">Socratic Mode</span>
                    </div>
                    <span className="wb-chip mint">Prerequisites Verified</span>
                  </div>

                  <div className="wb-inner-body">
                    <div className="wb-msg student">
                      <div className="wb-msg-role">Student Question</div>
                      A solid sphere and a hollow cylinder of equal mass and radius roll down an
                      incline without slipping. Which reaches the bottom first?
                    </div>

                    <div className="wb-msg tutor">
                      <div className="wb-msg-role">Learning Allied AI Tutor</div>
                      Let&apos;s derive the acceleration from energy conservation rather than
                      guessing:
                      <div className="wb-eq-box">
                        mgh = ½mv² + ½Iω² = ½mv²(1 + k²/R²)
                      </div>
                      Notice mass <code>m</code> cancels out! Step through the reasoning below:
                    </div>

                    <div className="wb-step-box">
                      <div className="wb-seg-group" role="tablist" aria-label="Derivation steps">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tutorStep === 1}
                          className={`wb-seg-btn ${tutorStep === 1 ? "active" : ""}`}
                          onClick={() => setTutorStep(1)}
                        >
                          1. Energy Balance
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tutorStep === 2}
                          className={`wb-seg-btn ${tutorStep === 2 ? "active" : ""}`}
                          onClick={() => setTutorStep(2)}
                        >
                          2. Acceleration
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tutorStep === 3}
                          className={`wb-seg-btn ${tutorStep === 3 ? "active" : ""}`}
                          onClick={() => setTutorStep(3)}
                        >
                          3. Inertia Ratio
                        </button>
                      </div>

                      <div className="wb-step-copy">
                        {tutorStep === 1 && (
                          <>
                            <strong>Energy Balance:</strong> Potential energy <code>mgh</code> splits
                            into translational (<code>½mv²</code>) and rotational (
                            <code>½I(v/R)²</code>) kinetic energy.
                          </>
                        )}
                        {tutorStep === 2 && (
                          <>
                            <strong>Acceleration Formula:</strong> Solving along the incline yields{" "}
                            <code>a = (g sin θ) / (1 + k²/R²)</code>. Smaller <code>k²/R²</code>{" "}
                            means faster acceleration.
                          </>
                        )}
                        {tutorStep === 3 && (
                          <>
                            <strong>Conclusion:</strong> Solid sphere has <code>k²/R² = 2/5</code>{" "}
                            (0.4) vs. hollow cylinder <code>k²/R² = 1.0</code>. The solid sphere
                            wins regardless of mass or radius.
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 02 · VISUALIZE CONCEPTS */}
              {activeTab === "visualize" && (
                <div className="wb-inner-card">
                  <div className="wb-inner-head">
                    <span className="wb-chip accent">Interactive Force &amp; Work Model</span>
                    <div className="wb-seg-group" role="tablist" aria-label="Physics scenarios">
                      {(Object.keys(SCENARIOS) as Scenario[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={scenario === key}
                          className={`wb-seg-btn ${scenario === key ? "active" : ""}`}
                          onClick={() => setScenario(key)}
                        >
                          {SCENARIOS[key].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="wb-inner-body">
                    <div className="wb-svg-stage">
                      <svg
                        viewBox="0 0 520 150"
                        width="100%"
                        height="100%"
                        fill="none"
                        preserveAspectRatio="xMidYMid meet"
                        aria-label={`Vector diagram for ${currScenario.label}`}
                      >
                        <line
                          x1="28"
                          y1="128"
                          x2="492"
                          y2="128"
                          stroke="var(--land-line-strong)"
                          strokeWidth="2"
                        />
                        <rect
                          x="220"
                          y="70"
                          width="80"
                          height="56"
                          rx="6"
                          fill="var(--land-surface)"
                          stroke="var(--land-accent)"
                          strokeWidth="1.8"
                        />
                        <text
                          x="260"
                          y="102"
                          textAnchor="middle"
                          fill="var(--land-text)"
                          fontSize="12"
                          fontWeight="700"
                          fontFamily="sans-serif"
                        >
                          m = 40 kg
                        </text>

                        {scenario === "horizontal" && (
                          <>
                            <line x1="260" y1="70" x2="260" y2="20" stroke="var(--land-accent)" strokeWidth="2.5" />
                            <polygon points="260,13 255,23 265,23" fill="var(--land-accent)" />
                            <text x="272" y="31" fill="var(--land-accent)" fontSize="11.5" fontWeight="700" fontFamily="monospace">
                              F(lift) = 400 N ↑
                            </text>

                            <line x1="300" y1="98" x2="430" y2="98" stroke="var(--land-mint)" strokeWidth="2.5" strokeDasharray="5 3" />
                            <polygon points="436,98 426,93 426,103" fill="var(--land-mint)" />
                            <text x="355" y="86" fill="var(--land-mint)" fontSize="11.5" fontWeight="700" fontFamily="monospace">
                              d = 50 m →
                            </text>

                            <path d="M 276 98 L 276 82 L 260 82" fill="none" stroke="var(--land-warn)" strokeWidth="1.6" />
                            <text x="282" y="75" fill="var(--land-warn)" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                              θ = 90°
                            </text>
                          </>
                        )}

                        {scenario === "vertical" && (
                          <>
                            <line x1="250" y1="70" x2="250" y2="18" stroke="var(--land-accent)" strokeWidth="2.5" />
                            <polygon points="250,11 245,21 255,21" fill="var(--land-accent)" />
                            <text x="164" y="30" fill="var(--land-accent)" fontSize="11.5" fontWeight="700" fontFamily="monospace">
                              F = 400 N ↑
                            </text>

                            <line x1="270" y1="70" x2="270" y2="26" stroke="var(--land-mint)" strokeWidth="2.2" strokeDasharray="4 3" />
                            <polygon points="270,20 265,28 275,28" fill="var(--land-mint)" />
                            <text x="282" y="42" fill="var(--land-mint)" fontSize="11.5" fontWeight="700" fontFamily="monospace">
                              d = 1.5 m ↑ (θ = 0°)
                            </text>
                          </>
                        )}

                        {scenario === "static" && (
                          <>
                            <line x1="260" y1="70" x2="260" y2="20" stroke="var(--land-accent)" strokeWidth="2.5" />
                            <polygon points="260,13 255,23 265,23" fill="var(--land-accent)" />
                            <text x="272" y="31" fill="var(--land-accent)" fontSize="11.5" fontWeight="700" fontFamily="monospace">
                              F = 400 N (Tension)
                            </text>
                            <circle cx="260" cy="128" r="4.5" fill="var(--land-danger)" />
                            <text x="274" y="122" fill="var(--land-danger)" fontSize="11.5" fontWeight="700" fontFamily="monospace">
                              d = 0 m (Stationary)
                            </text>
                          </>
                        )}
                      </svg>
                    </div>

                    <div className="wb-formula-bar">
                      <span className="math">{currScenario.formula}</span>
                      <span className="res">Work = {currScenario.work}</span>
                    </div>

                    <div className="wb-prereq-list">
                      <div className="wb-prereq-row done">
                        <span>Prerequisite 1 · Scalar Dot Product</span>
                        <span className="wb-prereq-badge">Mastered</span>
                      </div>
                      <div className="wb-prereq-row active">
                        <span>Active Concept · {currScenario.note}</span>
                        <span className="wb-prereq-badge">In Focus</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 03 · PRACTICE & EVALUATE */}
              {activeTab === "evaluate" && (
                <div className="wb-inner-card">
                  <div className="wb-inner-head">
                    <div className="wb-seg-group" role="tablist" aria-label="Evaluation mode">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={evalView === "practice"}
                        className={`wb-seg-btn ${evalView === "practice" ? "active" : ""}`}
                        onClick={() => setEvalView("practice")}
                      >
                        Practice Arena
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={evalView === "diagnosis"}
                        className={`wb-seg-btn ${evalView === "diagnosis" ? "active" : ""}`}
                        onClick={() => setEvalView("diagnosis")}
                      >
                        Misconception Diagnosis
                      </button>
                    </div>
                    <span className="wb-chip">Rubric: +4 / -1</span>
                  </div>

                  {evalView === "practice" ? (
                    <div className="wb-inner-body">
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--land-text)", lineHeight: 1.5 }}>
                        Two point charges <MathText text="$+q$" /> and <MathText text="$-q$" /> are
                        separated by <MathText text="$2a$" />. What is the electric potential at a
                        point <MathText text="$P$" /> on the equatorial bisector at distance{" "}
                        <MathText text="$r$" /> from the midpoint?
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        {[
                          { id: "A", label: "V = 0", correct: true },
                          { id: "B", label: "V = (1 / 4πε₀) · (p / r²)", correct: false },
                          { id: "C", label: "V = (1 / 4πε₀) · (2p / r³)", correct: false },
                        ].map((opt) => {
                          const selected = quizAnswer === opt.id;
                          const stateClass = selected ? (opt.correct ? "ok" : "miss") : "";
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              className={`wb-quiz-opt ${stateClass}`}
                              onClick={() => setQuizAnswer(opt.id)}
                            >
                              <span>
                                <strong>{opt.id}.</strong> {opt.label}
                              </span>
                              {selected && (
                                <span style={{ fontWeight: 700, fontSize: 11.5 }}>
                                  {opt.correct ? "✓ Correct (+4)" : "✕ Misconception (-1)"}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {quizAnswer && (
                        <div className={`wb-feedback ${quizAnswer === "A" ? "ok" : "miss"}`}>
                          {quizAnswer === "A" ? (
                            <>
                              <strong>Verified:</strong> Every point on the equatorial plane is
                              equidistant from <MathText text="$+q$" /> and <MathText text="$-q$" />
                              . Scalar potentials sum to zero (<MathText text="$V = 0$" />).
                            </>
                          ) : (
                            <>
                              <strong>Diagnostic Note:</strong> That formula applies along the{" "}
                              <em>axial</em> line, not the equatorial bisector. Scalar potential from
                              equal opposite charges cancels at equal distances.
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="wb-inner-body">
                      <div style={{ fontSize: 13, color: "var(--land-muted)", lineHeight: 1.5 }}>
                        <strong style={{ color: "var(--land-text)" }}>Problem:</strong> A 10 kg
                        crate rests on a 30° incline. Calculate the normal reaction force.
                      </div>

                      <div className="wb-diag-split">
                        <div className="wb-diag-box err">
                          <strong>✕ Student Input: N = 98 N</strong>
                          Defaulted to flat-surface formula <code>N = mg</code> without resolving
                          gravity perpendicular to the slope.
                        </div>
                        <div className="wb-diag-box fix">
                          <strong>✓ Root-Cause Correction: 84.9 N</strong>
                          Zero acceleration normal to the plane gives{" "}
                          <code>N = mg cos(30°)</code>. Remediation drill queued for tonight.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 04 · ADAPT & PLAN */}
              {activeTab === "adapt" && (
                <div className="wb-inner-card">
                  <div className="wb-inner-head">
                    <div className="wb-seg-group" role="tablist" aria-label="Study plan day">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={plannerDay === "today"}
                        className={`wb-seg-btn ${plannerDay === "today" ? "active" : ""}`}
                        onClick={() => setPlannerDay("today")}
                      >
                        Today&apos;s Queue
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={plannerDay === "tomorrow"}
                        className={`wb-seg-btn ${plannerDay === "tomorrow" ? "active" : ""}`}
                        onClick={() => setPlannerDay("tomorrow")}
                      >
                        Tomorrow
                      </button>
                    </div>
                    <span className="wb-chip mint">Pacing: On Track</span>
                  </div>

                  <div className="wb-inner-body">
                    {plannerDay === "today" ? (
                      <>
                        <div className="wb-task-item done">
                          <div>
                            <span className="wb-task-title">Spaced Recall: Chemical Bonding</span>
                            <span className="wb-task-meta">15 min · Scheduled before memory decay</span>
                          </div>
                          <span className="wb-task-tag ok">Retained</span>
                        </div>
                        <div className="wb-task-item done">
                          <div>
                            <span className="wb-task-title">Socratic Lesson: Carnot Cycle</span>
                            <span className="wb-task-meta">35 min · Thermodynamics Ch 12</span>
                          </div>
                          <span className="wb-task-tag ok">Mastered</span>
                        </div>
                        <div className="wb-task-item now">
                          <div>
                            <span className="wb-task-title">Practice Quiz: Definite Integrals</span>
                            <span className="wb-task-meta">25 min · 15 timed questions</span>
                          </div>
                          <span className="wb-task-tag now">Active</span>
                        </div>
                        <div className="wb-task-item">
                          <div>
                            <span className="wb-task-title">Misconception Drill: Inclined Planes</span>
                            <span className="wb-task-meta">15 min · Auto-added from evaluation</span>
                          </div>
                          <span className="wb-task-tag queue">Queued</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="wb-task-item now">
                          <div>
                            <span className="wb-task-title">Morning Review: Rotational Torque</span>
                            <span className="wb-task-meta">12 min · Approaching 50% decay threshold</span>
                          </div>
                          <span className="wb-task-tag now">Due Tomorrow</span>
                        </div>
                        <div className="wb-task-item">
                          <div>
                            <span className="wb-task-title">Concept Session: Electrostatics Gauss Law</span>
                            <span className="wb-task-meta">40 min · Next milestone unit</span>
                          </div>
                          <span className="wb-task-tag queue">Planned</span>
                        </div>
                        <div className="wb-task-item">
                          <div>
                            <span className="wb-task-title">Evening Checkpoint: Mixed Physics Set</span>
                            <span className="wb-task-meta">20 min · Confidence calibration check</span>
                          </div>
                          <span className="wb-task-tag queue">Planned</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 05 · REMEMBER & REVISE */}
              {activeTab === "remember" && (
                <div className="wb-inner-card">
                  <div className="wb-inner-head">
                    <span className="wb-chip mint">Ebbinghaus Decay Model · Day {simDay}</span>
                    <div className="wb-seg-group" role="tablist" aria-label="Simulation day">
                      {[1, 3, 7, 14, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          role="tab"
                          aria-selected={simDay === d}
                          className={`wb-seg-btn ${simDay === d ? "active" : ""}`}
                          onClick={() => setSimDay(d)}
                        >
                          Day {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="wb-inner-body">
                    <div className="wb-meter-row">
                      <div className="wb-meter-head">
                        <span>Passive Re-reading (Cramming)</span>
                        <strong style={{ color: "var(--land-danger)" }}>{tradPct}% retained</strong>
                      </div>
                      <div className="wb-meter-track">
                        <div className="wb-meter-fill danger" style={{ width: `${tradPct}%` }} />
                      </div>
                    </div>

                    <div className="wb-meter-row">
                      <div className="wb-meter-head">
                        <span>Learning Allied Spaced Retrieval</span>
                        <strong style={{ color: "var(--land-mint)" }}>{alliedPct}% retained</strong>
                      </div>
                      <div className="wb-meter-track">
                        <div className="wb-meter-fill mint" style={{ width: `${alliedPct}%` }} />
                      </div>
                    </div>

                    <div className="wb-step-box">
                      <div className="wb-step-copy">
                        <strong>Metacognitive Calibration:</strong> Topics are resurfaced when your
                        retention drops toward 55%, separating topics you genuinely know from
                        topics that only felt familiar.
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
