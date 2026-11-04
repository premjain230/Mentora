"use client";

import React, { useState, useMemo } from "react";
import { clamp, num, textParam } from "./hooks";

export interface SceneProps {
  params: Record<string, unknown>;
}

/* ── 1. Motion Simulation (Distance vs Displacement / Projectile) ────────── */

export function MotionSimulationScene({ params }: SceneProps) {
  const mode = textParam(params.mode, "distance_displacement");
  const [progress, setProgress] = useState(50);
  const [showPath, setShowPath] = useState(true);

  if (mode === "projectile_motion") {
    const u = clamp(num(params.u, 25), 10, 50);
    const theta = clamp(num(params.theta, 45), 15, 75);
    const rad = (theta * Math.PI) / 180;
    const g = 9.8;
    const tFlight = (2 * u * Math.sin(rad)) / g;
    const hMax = (u * u * Math.sin(rad) * Math.sin(rad)) / (2 * g);
    const rMax = (u * u * Math.sin(2 * rad)) / g;
    const currentT = (progress / 100) * tFlight;
    const currentX = u * Math.cos(rad) * currentT;
    const currentY = u * Math.sin(rad) * currentT - 0.5 * g * currentT * currentT;

    // Scale to SVG 620x260
    const scaleX = 480 / Math.max(rMax, 1);
    const scaleY = 160 / Math.max(hMax, 1);
    const svgX = 60 + currentX * scaleX;
    const svgY = 220 - currentY * scaleY;

    // Build parabola points
    const parabolaPoints = useMemo(() => {
      const pts = [];
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * tFlight;
        const x = 60 + (u * Math.cos(rad) * t) * scaleX;
        const y = 220 - (u * Math.sin(rad) * t - 0.5 * g * t * t) * scaleY;
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      return pts.join(" ");
    }, [u, theta, tFlight, scaleX, scaleY]);

    return (
      <div className="lv-scene">
        <svg viewBox="0 0 620 280" role="img" aria-label="2D Projectile Motion Simulation">
          <line x1="40" y1="220" x2="580" y2="220" stroke="var(--border-strong, #555)" strokeWidth="2" />
          {/* Ground ticks */}
          <text x="60" y="240" fill="var(--text-muted, #888)" fontSize="11" textAnchor="middle">0 m</text>
          <text x={60 + rMax * scaleX} y="240" fill="var(--text-muted, #888)" fontSize="11" textAnchor="middle">R = {rMax.toFixed(1)} m</text>
          {/* Parabola path */}
          <polyline points={parabolaPoints} fill="none" stroke="var(--accent, #3b82f6)" strokeWidth="2.5" strokeDasharray="4 4" opacity="0.8" />
          {/* Projectile ball */}
          <circle cx={svgX} cy={svgY} r="7" fill="var(--accent-strong, #ef4444)" stroke="#fff" strokeWidth="2" />
          {/* Velocity vectors */}
          <line x1={svgX} y1={svgY} x2={svgX + (u * Math.cos(rad) * 0.8)} y2={svgY} stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow-green)" />
          <line x1={svgX} y1={svgY} x2={svgX} y2={svgY - ((u * Math.sin(rad) - g * currentT) * 0.8)} stroke="#3b82f6" strokeWidth="2" />
          {/* Readout at ball */}
          <text x={svgX} y={svgY - 14} fill="var(--text-primary, #eee)" fontSize="11" textAnchor="middle">
            ({currentX.toFixed(1)}m, {Math.max(0, currentY).toFixed(1)}m)
          </text>
        </svg>
        <p className="lv-readout">
          Time: <strong>{currentT.toFixed(2)}s</strong> / {tFlight.toFixed(2)}s · H_max: <strong>{hMax.toFixed(1)} m</strong> · Range: <strong>{rMax.toFixed(1)} m</strong>
        </p>
        <div className="lv-controls" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <label style={{ fontSize: "12px", color: "var(--text-secondary, #bbb)" }}>Trajectory Time Scrub:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            style={{ flex: 1, accentColor: "var(--accent, #3b82f6)" }}
          />
        </div>
      </div>
    );
  }

  // Default: Distance vs Displacement
  const pathDist = num(params.pathDistanceMeters, 650);
  const dispDist = num(params.displacementMeters, 410);

  // Path coordinates
  const pA = { x: 80, y: 190 };
  const pB = { x: 500, y: 90 };
  const currentRatio = progress / 100;
  // Interpolated position along winding path
  const currX = pA.x + (pB.x - pA.x) * currentRatio + Math.sin(currentRatio * Math.PI * 2) * 50;
  const currY = pA.y + (pB.y - pA.y) * currentRatio + Math.cos(currentRatio * Math.PI * 2) * 35;

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 620 280" role="img" aria-label="Distance versus Displacement comparison">
        <rect x="0" y="0" width="620" height="280" fill="none" />
        {/* Direct Displacement Vector (Straight line) */}
        <line x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y} stroke="#ef4444" strokeWidth="3" />
        <polygon points={`${pB.x},${pB.y} ${pB.x - 12},${pB.y - 4} ${pB.x - 10},${pB.y + 7}`} fill="#ef4444" />
        <text x="280" y="125" fill="#ef4444" fontSize="12" fontWeight="700">Displacement: {dispDist} m (Straight Vector)</text>

        {/* Winding Distance Path */}
        {showPath && (
          <path
            d={`M${pA.x} ${pA.y} Q 180 250, 260 170 T 400 190 T ${pB.x} ${pB.y}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray="6 4"
          />
        )}
        <text x="220" y="240" fill="#3b82f6" fontSize="12" fontWeight="700">Distance: {pathDist} m (Winding Path)</text>

        {/* Start and End landmarks */}
        <circle cx={pA.x} cy={pA.y} r="8" fill="#10b981" />
        <text x={pA.x} y={pA.y + 24} textAnchor="middle" fill="var(--text-primary, #eee)" fontSize="12" fontWeight="600">Start (A)</text>
        <circle cx={pB.x} cy={pB.y} r="8" fill="#8b5cf6" />
        <text x={pB.x} y={pB.y - 14} textAnchor="middle" fill="var(--text-primary, #eee)" fontSize="12" fontWeight="600">End (B)</text>

        {/* Moving traveler */}
        <circle cx={currX} cy={currY} r="7" fill="#fbbf24" stroke="#000" strokeWidth="2" />
      </svg>
      <p className="lv-readout">
        Actual Path Distance: <strong>{Math.round(pathDist * currentRatio)} m</strong> / {pathDist} m · Net Displacement: <strong>{dispDist} m</strong> at 62° North of East
      </p>
      <div className="lv-controls" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <label style={{ fontSize: "12px", color: "var(--text-secondary, #bbb)" }}>Scrub Movement:</label>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          style={{ flex: 1, accentColor: "#fbbf24" }}
        />
        <button
          type="button"
          className="lv-btn"
          onClick={() => setShowPath((p) => !p)}
        >
          {showPath ? "Hide Path" : "Show Path"}
        </button>
      </div>
    </div>
  );
}

/* ── 2. Vector Diagram Scene ─────────────────────────────────────────────── */

export function VectorDiagramScene({ params }: SceneProps) {
  const [angle, setAngle] = useState(35);
  const [magnitude, setMagnitude] = useState(80);
  const rad = (angle * Math.PI) / 180;
  const vx = magnitude * Math.cos(rad);
  const vy = magnitude * Math.sin(rad);

  const originX = 120;
  const originY = 200;
  const scale = 1.8;
  const endX = originX + vx * scale;
  const endY = originY - vy * scale;

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 620 280" role="img" aria-label="Vector Resolution into X and Y Components">
        {/* Axes */}
        <line x1="80" y1={originY} x2="520" y2={originY} stroke="var(--border-strong, #555)" strokeWidth="1.5" />
        <line x1={originX} y1="40" x2={originX} y2="240" stroke="var(--border-strong, #555)" strokeWidth="1.5" />
        <text x="510" y={originY - 8} fill="var(--text-muted, #888)" fontSize="11">+X Axis</text>
        <text x={originX + 8} y="55" fill="var(--text-muted, #888)" fontSize="11">+Y Axis</text>

        {/* Vector A */}
        <line x1={originX} y1={originY} x2={endX} y2={endY} stroke="#3b82f6" strokeWidth="3.5" />
        <circle cx={endX} cy={endY} r="4" fill="#3b82f6" />
        <text x={endX + 8} y={endY - 6} fill="#3b82f6" fontSize="13" fontWeight="700">
          vec(A) = {magnitude}
        </text>

        {/* X component */}
        <line x1={originX} y1={originY} x2={endX} y2={originY} stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 3" />
        <text x={(originX + endX) / 2} y={originY + 20} textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="600">
          A_x = A cos θ = {vx.toFixed(1)}
        </text>

        {/* Y component */}
        <line x1={endX} y1={originY} x2={endX} y2={endY} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4 3" />
        <text x={endX + 10} y={(originY + endY) / 2} fill="#f59e0b" fontSize="12" fontWeight="600">
          A_y = A sin θ = {vy.toFixed(1)}
        </text>

        {/* Angle arc */}
        <path
          d={`M ${originX + 35} ${originY} A 35 35 0 0 0 ${originX + 35 * Math.cos(rad)} ${originY - 35 * Math.sin(rad)}`}
          fill="none"
          stroke="#fff"
          strokeWidth="1.5"
        />
        <text x={originX + 42} y={originY - 10} fill="#fff" fontSize="11">θ = {angle}°</text>
      </svg>
      <p className="lv-readout">
        |vec(A)| = sqrt(A_x² + A_y²) = sqrt({vx.toFixed(1)}² + {vy.toFixed(1)}²) = <strong>{magnitude}</strong> · tan θ = {vy.toFixed(1)} / {vx.toFixed(1)}
      </p>
      <div className="lv-controls" style={{ display: "flex", gap: "16px" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "11px", color: "var(--text-secondary, #bbb)" }}>Angle (θ): {angle}°</label>
          <input
            type="range"
            min="10"
            max="80"
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#3b82f6" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "11px", color: "var(--text-secondary, #bbb)" }}>Magnitude: {magnitude}</label>
          <input
            type="range"
            min="30"
            max="120"
            value={magnitude}
            onChange={(e) => setMagnitude(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#10b981" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── 3. Chemical Reaction & Equation Balancer Scene ───────────────────────── */

export function ChemicalReactionScene({ params }: SceneProps) {
  const [fe, setFe] = useState(3);
  const [h2o, setH2o] = useState(4);
  const [fe3o4, setFe3o4] = useState(1);
  const [h2, setH2] = useState(4);

  const leftFe = fe * 1;
  const leftH = h2o * 2;
  const leftO = h2o * 1;

  const rightFe = fe3o4 * 3;
  const rightH = h2 * 2;
  const rightO = fe3o4 * 4;

  const isBalanced = leftFe === rightFe && leftH === rightH && leftO === rightO;

  return (
    <div className="lv-scene">
      <div style={{ padding: "16px", background: "var(--bg-elevated, #18181b)", borderRadius: "8px", border: "1px solid var(--border-subtle, #27272a)" }}>
        <div style={{ textAlign: "center", fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "var(--text-primary, #fff)" }}>
          <span style={{ color: "#3b82f6" }}>{fe}</span> Fe + <span style={{ color: "#10b981" }}>{h2o}</span> H₂O ⟶{" "}
          <span style={{ color: "#f59e0b" }}>{fe3o4}</span> Fe₃O₄ + <span style={{ color: "#ec4899" }}>{h2}</span> H₂
        </div>

        {/* Atom Counts Ledger */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", textAlign: "center" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "6px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted, #888)" }}>Iron (Fe)</div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: leftFe === rightFe ? "#10b981" : "#ef4444" }}>
              {leftFe} vs {rightFe} {leftFe === rightFe ? "✓" : "✗"}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "6px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted, #888)" }}>Hydrogen (H)</div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: leftH === rightH ? "#10b981" : "#ef4444" }}>
              {leftH} vs {rightH} {leftH === rightH ? "✓" : "✗"}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "6px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted, #888)" }}>Oxygen (O)</div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: leftO === rightO ? "#10b981" : "#ef4444" }}>
              {leftO} vs {rightO} {leftO === rightO ? "✓" : "✗"}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "12px", fontSize: "13px", fontWeight: "600", color: isBalanced ? "#10b981" : "#ef4444" }}>
          {isBalanced ? "Equation is balanced! Conservation of Mass holds." : "Unbalanced! Adjust stoichiometric coefficients."}
        </div>
      </div>

      <div className="lv-controls" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "12px" }}>
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-muted, #888)" }}>Fe coeff:</label>
          <input type="number" min="1" max="6" value={fe} onChange={(e) => setFe(Number(e.target.value))} style={{ width: "100%", padding: "4px" }} />
        </div>
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-muted, #888)" }}>H₂O coeff:</label>
          <input type="number" min="1" max="6" value={h2o} onChange={(e) => setH2o(Number(e.target.value))} style={{ width: "100%", padding: "4px" }} />
        </div>
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-muted, #888)" }}>Fe₃O₄ coeff:</label>
          <input type="number" min="1" max="6" value={fe3o4} onChange={(e) => setFe3o4(Number(e.target.value))} style={{ width: "100%", padding: "4px" }} />
        </div>
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-muted, #888)" }}>H₂ coeff:</label>
          <input type="number" min="1" max="6" value={h2} onChange={(e) => setH2(Number(e.target.value))} style={{ width: "100%", padding: "4px" }} />
        </div>
      </div>
    </div>
  );
}

/* ── 4. Labelled Biological Diagram Scene ─────────────────────────────────── */

export function LabelledDiagramScene({ params }: SceneProps) {
  const [activePin, setActivePin] = useState<string>("nucleus");

  const pins = [
    { id: "nucleus", x: 260, y: 130, title: "Nucleus", info: "Contains linear chromosomes and nucleolus for rRNA synthesis." },
    { id: "mitochondria", x: 420, y: 170, title: "Mitochondria", info: "Sites of aerobic ATP synthesis with double membrane, cristae, and 70S ribosomes." },
    { id: "golgi", x: 340, y: 80, title: "Golgi Apparatus", info: "Modifies, packages and secretes glycoproteins and glycolipids from cis to trans face." },
    { id: "rer", x: 190, y: 90, title: "Rough ER", info: "Lined with 80S ribosomes; synthesizes and folds membrane and secretory proteins." },
    { id: "plasma_mem", x: 530, y: 140, title: "Plasma Membrane", info: "Fluid mosaic lipid bilayer regulating selective permeability and active transport." }
  ];

  const current = pins.find((p) => p.id === activePin) || pins[0];

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 620 280" role="img" aria-label="Labelled Eukaryotic Cell Diagram">
        {/* Cell Outer Membrane */}
        <ellipse cx="310" cy="140" rx="240" ry="110" fill="rgba(59, 130, 246, 0.05)" stroke="#3b82f6" strokeWidth="2.5" />
        {/* Nucleus */}
        <ellipse cx="260" cy="130" rx="60" ry="45" fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" strokeWidth="2" />
        <circle cx="270" cy="125" r="14" fill="#8b5cf6" opacity="0.6" />
        {/* Mitochondria */}
        <ellipse cx="420" cy="170" rx="35" ry="18" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="2" transform="rotate(-15 420 170)" />
        {/* Golgi */}
        <path d="M 320 70 Q 340 60 360 70 M 315 80 Q 340 70 365 80 M 310 90 Q 340 80 370 90" fill="none" stroke="#f59e0b" strokeWidth="3" />
        {/* Rough ER folds */}
        <path d="M 180 85 Q 210 100 210 120 T 170 145" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="2 3" />

        {/* Clickable pins */}
        {pins.map((pin) => (
          <g key={pin.id} onClick={() => setActivePin(pin.id)} style={{ cursor: "pointer" }}>
            <circle cx={pin.x} cy={pin.y} r={pin.id === activePin ? 10 : 7} fill={pin.id === activePin ? "#fff" : "var(--accent, #3b82f6)"} stroke="#000" strokeWidth="2" />
            <text x={pin.x} y={pin.y - 12} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
              {pin.title}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ padding: "12px", background: "var(--bg-elevated, #18181b)", borderRadius: "6px", marginTop: "8px", border: "1px solid var(--border-subtle, #27272a)" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "#3b82f6", marginBottom: "4px" }}>
          Selected: {current.title}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary, #ccc)" }}>{current.info}</div>
      </div>
    </div>
  );
}

/* ── 5. Historical Timeline Scene ────────────────────────────────────────── */

export function HistoricalTimelineScene({ params }: SceneProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const events = [
    { year: "1960", title: "FTII Established", desc: "Film and Television Institute of India founded in Pune to record educational newsreels." },
    { year: "1961", title: "National Archives Expansion", desc: "Preservation of post-independence modern state records and treaties." },
    { year: "1971", title: "War & Independence Records", desc: "Verbatim audio-visual and newspaper documentation of the Liberation of Bangladesh." },
    { year: "1977", title: "Jal Cooper Stamp Series", desc: "Commemorative philatelic issue honoring renowned Indian philatelist Jal Cooper." },
    { year: "1991", title: "Economic Modernization", desc: "Digital media era, private satellite channels, and internet archival repositories." }
  ];

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 620 180" role="img" aria-label="Interactive Historical Timeline">
        <line x1="40" y1="90" x2="580" y2="90" stroke="var(--border-strong, #555)" strokeWidth="3" />
        {events.map((ev, i) => {
          const x = 60 + i * 125;
          const isSelected = i === selectedIdx;
          return (
            <g key={i} onClick={() => setSelectedIdx(i)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy="90" r={isSelected ? 11 : 7} fill={isSelected ? "#f59e0b" : "#3b82f6"} stroke="#fff" strokeWidth="2" />
              <text x={x} y="65" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="700">{ev.year}</text>
              <text x={x} y="125" textAnchor="middle" fill="var(--text-primary, #eee)" fontSize="10" width="100">
                {ev.title.slice(0, 15)}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ padding: "12px", background: "var(--bg-elevated, #18181b)", borderRadius: "6px", border: "1px solid var(--border-subtle, #27272a)" }}>
        <span style={{ fontSize: "14px", fontWeight: "700", color: "#f59e0b" }}>{events[selectedIdx].year} — {events[selectedIdx].title}: </span>
        <span style={{ fontSize: "12px", color: "var(--text-secondary, #ccc)" }}>{events[selectedIdx].desc}</span>
      </div>
    </div>
  );
}

/* ── 6. Step-by-Step Derivation Scene ────────────────────────────────────── */

export function StepByStepDerivationScene({ params }: SceneProps) {
  const [step, setStep] = useState(1);

  const steps = [
    { num: 1, title: "Standard Quadratic Form", math: "a*x² + b*x + c = 0, where a ≠ 0", note: "Divide the entire equation by leading coefficient a." },
    { num: 2, title: "Isolate Constant Term", math: "x² + (b/a)*x = -c/a", note: "Prepare the left side for completing the square." },
    { num: 3, title: "Complete the Square", math: "[x + b/(2a)]² = (b² - 4ac) / (4a²)", note: "Add [b/(2a)]² = b²/(4a²) to both sides." },
    { num: 4, title: "Take Square Roots", math: "x + b/(2a) = ± √(b² - 4ac) / (2a)", note: "D = b² - 4ac is the discriminant." },
    { num: 5, title: "Final Quadratic Formula", math: "x = [-b ± √(b² - 4ac)] / (2a)", note: "Sridharacharya's Rule: Yields both roots directly." }
  ];

  return (
    <div className="lv-scene" style={{ padding: "16px", background: "var(--bg-elevated, #18181b)", borderRadius: "8px", border: "1px solid var(--border-subtle, #27272a)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "14px", fontWeight: "700", color: "#3b82f6" }}>Derivation Step {step} of {steps.length}</span>
        <div>
          <button type="button" className="lv-btn" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} style={{ marginRight: "6px" }}>Previous</button>
          <button type="button" className="lv-btn" onClick={() => setStep((s) => Math.min(steps.length, s + 1))} disabled={step === steps.length}>Next Step</button>
        </div>
      </div>

      <div style={{ padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", textAlign: "center" }}>
        <div style={{ fontSize: "13px", color: "var(--text-muted, #888)", marginBottom: "6px" }}>{steps[step - 1].title}</div>
        <div style={{ fontSize: "18px", fontWeight: "700", color: "#fff", fontFamily: "monospace", margin: "10px 0" }}>{steps[step - 1].math}</div>
        <div style={{ fontSize: "12px", color: "#10b981", fontStyle: "italic" }}>💡 {steps[step - 1].note}</div>
      </div>
    </div>
  );
}

/* ── 7. Geographic Thematic Map Scene ─────────────────────────────────────── */

export function GeographicMapScene({ params }: SceneProps) {
  const [method, setMethod] = useState<"dot" | "choropleth" | "isopleth">("dot");

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 620 240" role="img" aria-label="Thematic Map Methods in Geography">
        <rect x="0" y="0" width="620" height="240" fill="none" />
        {/* District outlines */}
        <polygon points="120,60 260,40 320,110 240,180 110,150" fill="rgba(255,255,255,0.03)" stroke="var(--border-strong, #555)" strokeWidth="2" />
        <polygon points="260,40 460,30 500,120 320,110" fill="rgba(255,255,255,0.03)" stroke="var(--border-strong, #555)" strokeWidth="2" />
        <polygon points="320,110 500,120 470,210 240,180" fill="rgba(255,255,255,0.03)" stroke="var(--border-strong, #555)" strokeWidth="2" />

        {method === "dot" && (
          <g fill="#f59e0b">
            {/* Random uniform dots */}
            <circle cx="160" cy="100" r="3" /><circle cx="180" cy="120" r="3" /><circle cx="200" cy="95" r="3" />
            <circle cx="220" cy="140" r="3" /><circle cx="150" cy="140" r="3" /><circle cx="360" cy="70" r="3" />
            <circle cx="410" cy="80" r="3" /><circle cx="380" cy="100" r="3" /><circle cx="440" cy="65" r="3" />
            <circle cx="310" cy="150" r="3" /><circle cx="360" cy="160" r="3" /><circle cx="400" cy="170" r="3" />
            <text x="50" y="30" fill="#f59e0b" fontSize="12" fontWeight="700">Dot Method: 1 Dot = 10,000 Rural Population</text>
          </g>
        )}

        {method === "choropleth" && (
          <g>
            <polygon points="120,60 260,40 320,110 240,180 110,150" fill="rgba(59, 130, 246, 0.25)" />
            <polygon points="260,40 460,30 500,120 320,110" fill="rgba(59, 130, 246, 0.55)" />
            <polygon points="320,110 500,120 470,210 240,180" fill="rgba(59, 130, 246, 0.8)" />
            <text x="50" y="30" fill="#3b82f6" fontSize="12" fontWeight="700">{"Choropleth: Population Density (<200, 201-400, >400 per km²)"}</text>
          </g>
        )}

        {method === "isopleth" && (
          <g stroke="#10b981" strokeWidth="2.5" fill="none">
            <path d="M 80 100 Q 240 60 520 80" />
            <text x="530" y="85" fill="#10b981" fontSize="10">800 mm</text>
            <path d="M 90 140 Q 260 110 510 130" />
            <text x="520" y="135" fill="#10b981" fontSize="10">1200 mm</text>
            <path d="M 110 180 Q 280 150 490 170" />
            <text x="500" y="175" fill="#10b981" fontSize="10">2000 mm</text>
            <text x="50" y="30" fill="#10b981" fontSize="12" fontWeight="700">Isopleth: Isohyets (Continuous Annual Rainfall Contours)</text>
          </g>
        )}
      </svg>
      <div className="lv-controls" style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button type="button" className={`lv-btn ${method === "dot" ? "is-active" : ""}`} onClick={() => setMethod("dot")}>Dot Method</button>
        <button type="button" className={`lv-btn ${method === "choropleth" ? "is-active" : ""}`} onClick={() => setMethod("choropleth")}>Choropleth Method</button>
        <button type="button" className={`lv-btn ${method === "isopleth" ? "is-active" : ""}`} onClick={() => setMethod("isopleth")}>Isopleth Method</button>
      </div>
    </div>
  );
}
