"use client";

import React, { useEffect, useMemo, useState } from "react";
import { clamp, listParam, num, textParam, useRafLoop, useReducedMotion } from "./hooks";

export interface SceneProps {
  params: Record<string, unknown>;
}

function PlayButton({ playing, onClick }: { playing: boolean; onClick: () => void }) {
  return (
    <button type="button" className="lv-btn" onClick={onClick} aria-pressed={playing}>
      {playing ? "Pause" : "Play"}
    </button>
  );
}

/* ── 1. Series circuit ───────────────────────────────────────────────────── */

const LOOP = [
  { x: 140, y: 80 },
  { x: 520, y: 80 },
  { x: 520, y: 200 },
  { x: 140, y: 200 },
  { x: 140, y: 80 },
];
const LOOP_LENGTH = 760;

function pointOnLoop(t: number) {
  let distance = ((t % 1) + 1) % 1 * LOOP_LENGTH;
  for (let i = 0; i < LOOP.length - 1; i++) {
    const a = LOOP[i];
    const b = LOOP[i + 1];
    const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (distance <= length) {
      const ratio = length === 0 ? 0 : distance / length;
      return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
    }
    distance -= length;
  }
  return LOOP[0];
}

export function CircuitScene({ params }: SceneProps) {
  const cells = clamp(Math.round(num(params.cells, 2)), 1, 3);
  const resistance = clamp(num(params.resistanceOhms, 6), 1, 20);
  const voltage = cells * 1.5;
  const current = voltage / resistance;
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(!reduced);
  const [phase, setPhase] = useState(0);

  useRafLoop(playing && !reduced, (dt) => {
    setPhase((p) => (p + dt * (0.08 + current * 0.05)) % 1);
  });

  const dots = useMemo(
    () => Array.from({ length: 9 }, (_, i) => pointOnLoop(phase + i / 9)),
    [phase]
  );
  const glow = clamp(current / 0.9, 0.15, 1);

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 620 280" role="img" aria-label={`Series circuit with ${cells} cell(s), ${resistance} ohm resistor and a bulb`}>
        <rect x="0" y="0" width="620" height="280" fill="none" />
        <path d="M140 80 H520 V200 H140 Z" fill="none" stroke="var(--border-strong, #444)" strokeWidth="3" />
        {/* battery */}
        <line x1="140" y1="122" x2="140" y2="158" stroke="var(--text-muted, #999)" strokeWidth="3" />
        <line x1="128" y1="128" x2="152" y2="128" stroke="var(--accent)" strokeWidth="4" />
        <line x1="132" y1="142" x2="148" y2="142" stroke="var(--accent)" strokeWidth="4" />
        <text x="164" y="146" fill="var(--text-secondary, #bbb)" fontSize="12">{cells} × 1.5 V</text>
        {/* resistor */}
        <rect x="270" y="64" width="110" height="32" rx="4" fill="var(--bg-elevated, #1a1a1a)" stroke="var(--accent)" strokeWidth="2" />
        <text x="325" y="84" textAnchor="middle" fill="var(--text-primary, #eee)" fontSize="12">{resistance} Ω</text>
        {/* bulb */}
        <circle cx="520" cy="140" r="22" fill={`rgba(255, 199, 92, ${0.12 + glow * 0.5})`} stroke="var(--accent)" strokeWidth="2" />
        <path d="M512 136 l8 -10 l8 10 M512 146 l8 -10 l8 10" fill="none" stroke="var(--text-primary, #eee)" strokeWidth="1.6" />
        <text x="556" y="144" fill="var(--text-secondary, #bbb)" fontSize="11">Bulb</text>
        {/* moving charge markers */}
        {dots.map((dot, i) => (
          <circle key={i} cx={dot.x} cy={dot.y} r={4} fill="var(--accent-strong, #ffb066)" opacity={0.85} />
        ))}
        <text x="180" y="222" fill="var(--text-muted, #888)" fontSize="11">Same current at every point in series</text>
      </svg>
      <p className="lv-readout">
        V = {voltage.toFixed(1)} V · R = {resistance} Ω · I = V/R = <strong>{current.toFixed(2)} A</strong>
      </p>
      <div className="lv-controls">
        <PlayButton playing={playing} onClick={() => setPlaying((p) => !p)} />
        <button type="button" className="lv-btn" onClick={() => setPhase(0)}>Replay</button>
        {reduced && <span className="lv-hint">Reduced motion is on, so the animation stays paused until you press Play.</span>}
      </div>
    </div>
  );
}

/* ── 2. Forces and acceleration ─────────────────────────────────────────── */

export function ForceScene({ params }: SceneProps) {
  const mass = clamp(num(params.massKg, 2), 1, 10);
  const force = clamp(num(params.forceN, 10), 0, 50);
  const friction = clamp(num(params.frictionN, 2), 0, 20);
  const net = force - friction;
  const acceleration = net / mass;
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(!reduced);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setTime(0);
    setStarted(false);
  }, [mass, force, friction]);

  useRafLoop(playing && !reduced && net > 0.05, (dt) => {
    setStarted(true);
    setTime((t) => {
      const next = t + dt;
      const x = 0.5 * Math.abs(acceleration) * next * next * 6;
      return x > 240 ? 0 : next;
    });
  });

  const x = net > 0.05 ? Math.min(240, 0.5 * Math.abs(acceleration) * time * time * 6) : 0;
  const arrowScale = 5;
  const applied = clamp(force * arrowScale, 0, 150);
  const frictional = clamp(friction * arrowScale, 0, 120);

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 620 280" role="img" aria-label="Block on a surface with applied force and friction arrows">
        <line x1="40" y1="210" x2="580" y2="210" stroke="var(--border-strong, #444)" strokeWidth="2" />
        <rect x={100 + x} y="160" width="70" height="50" rx="4" fill="var(--bg-elevated, #1a1a1a)" stroke="var(--accent)" strokeWidth="2" />
        <text x={135 + x} y="190" textAnchor="middle" fill="var(--text-primary, #eee)" fontSize="12">{mass} kg</text>
        {force > 0 && (
          <>
            <line x1={170 + x} y1="175" x2={170 + x + applied} y2="175" stroke="var(--accent)" strokeWidth="3" />
            <polygon points={`${170 + x + applied},175 ${170 + x + applied - 9},170 ${170 + x + applied - 9},180`} fill="var(--accent)" />
            <text x={170 + x + applied / 2} y="164" textAnchor="middle" fill="var(--accent)" fontSize="11">F = {force} N</text>
          </>
        )}
        {friction > 0 && (
          <>
            <line x1={100 + x} y1="200" x2={100 + x - frictional} y2="200" stroke="var(--accent3, #f87171)" strokeWidth="3" />
            <polygon points={`${100 + x - frictional},200 ${100 + x - frictional + 9},195 ${100 + x - frictional + 9},205`} fill="var(--accent3, #f87171)" />
            <text x={100 + x - frictional / 2} y="218" textAnchor="middle" fill="var(--accent3, #f87171)" fontSize="11">friction = {friction} N</text>
          </>
        )}
        <text x="40" y="248" fill="var(--text-secondary, #bbb)" fontSize="12">
          Net force = {net.toFixed(1)} N → acceleration = {net > 0.05 ? acceleration.toFixed(2) : "0"} m/s²
        </text>
        {net <= 0.05 && (
          <text x="40" y="266" fill="var(--text-muted, #888)" fontSize="11">The forces cancel, so the block does not accelerate (constant velocity).</text>
        )}
        {started && net > 0.05 && (
          <text x="40" y="266" fill="var(--text-muted, #888)" fontSize="11">
            Velocity after {time.toFixed(1)} s ≈ {(Math.abs(acceleration) * time).toFixed(1)} m/s
          </text>
        )}
      </svg>
      <div className="lv-controls">
        <PlayButton playing={playing} onClick={() => setPlaying((p) => !p)} />
        <button type="button" className="lv-btn" onClick={() => { setTime(0); setStarted(false); }}>Reset</button>
        <span className="lv-hint">Doubling the mass would halve this acceleration for the same net force.</span>
      </div>
    </div>
  );
}

/* ── 3. Mirror ray diagram ──────────────────────────────────────────────── */

export function RayScene({ params }: SceneProps) {
  const initialMirror = textParam(params.mirror, "concave") === "convex" ? "convex" : "concave";
  const [mirror, setMirror] = useState<"concave" | "convex">(initialMirror);
  const [focal, setFocal] = useState(() => clamp(num(params.focalLength, 10), 5, 20));
  const [distance, setDistance] = useState(() => clamp(num(params.objectDistance, 20), 4, 40));

  const signedF = mirror === "concave" ? focal : -focal;
  const objectHeight = 52;
  const scale = 5.2;
  const mirrorX = 600;
  const axisY = 160;
  const objectX = mirrorX - distance * scale;
  const objectTopY = axisY - objectHeight;
  const v = (distance * signedF) / (distance - signedF);
  const m = -v / distance;
  const finite = Number.isFinite(v) && Number.isFinite(m);
  const imageHeight = finite ? m * objectHeight : 0;
  const imageX = finite ? clamp(mirrorX - v * scale, 20, 640) : mirrorX;
  const imageTopY = finite ? axisY - imageHeight : axisY;
  const focalX = mirrorX - signedF * scale;
  const centerX = mirrorX - 2 * signedF * scale;

  // Parallel ray: hits the mirror at the object's height, then reflects through F
  // (concave) or appears to come from F behind the mirror (convex).
  const hitY = objectTopY;
  const ray1EndX = 20;
  const ray1EndY = hitY + ((hitY - axisY) / (mirrorX - focalX || 1)) * (ray1EndX - mirrorX);

  // Ray through the centre of curvature retraces itself.
  const ray2HitY = centerX === objectX
    ? objectTopY
    : axisY + ((objectTopY - axisY) * (mirrorX - centerX)) / (objectX - centerX);
  const ray2EndY = mirrorX === objectX
    ? ray2HitY
    : ray2HitY + ((ray2HitY - objectTopY) / (mirrorX - objectX)) * (20 - mirrorX);

  const virtual = v < 0;
  const nature = finite
    ? `${virtual ? "virtual" : "real"}, ${m < 0 ? "inverted" : "erect"}, ${Math.abs(m) > 1.01 ? "enlarged" : Math.abs(m) < 0.99 ? "diminished" : "same size"}`
    : "at infinity (reflected rays are parallel)";

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 640 300" role="img" aria-label={`Ray diagram for a ${mirror} mirror, object ${distance} cm from the pole`}>
        <line x1="20" y1={axisY} x2="630" y2={axisY} stroke="var(--border, #333)" strokeWidth="1.5" />
        <path
          d={mirror === "concave" ? "M600 50 Q556 160 600 270" : "M600 50 Q644 160 600 270"}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
        />
        <circle cx={focalX} cy={axisY} r="2.5" fill="var(--text-secondary, #bbb)" />
        <text x={focalX} y={axisY + 18} textAnchor="middle" fill="var(--text-muted, #888)" fontSize="11">F</text>
        <circle cx={centerX} cy={axisY} r="2.5" fill="var(--text-secondary, #bbb)" />
        <text x={centerX} y={axisY + 18} textAnchor="middle" fill="var(--text-muted, #888)" fontSize="11">C</text>
        {/* object */}
        <line x1={objectX} y1={axisY} x2={objectX} y2={objectTopY} stroke="var(--accent2, #9ca3af)" strokeWidth="3" />
        <polygon points={`${objectX},${objectTopY} ${objectX - 4},${objectTopY + 8} ${objectX + 4},${objectTopY + 8}`} fill="var(--accent2, #9ca3af)" />
        <text x={objectX} y={axisY + 16} textAnchor="middle" fill="var(--text-muted, #888)" fontSize="11">object</text>
        {/* parallel ray + reflection */}
        <line x1={objectX} y1={objectTopY} x2={mirrorX} y2={hitY} stroke="var(--accent-strong, #ffb066)" strokeWidth="1.6" />
        <line x1={mirrorX} y1={hitY} x2={ray1EndX} y2={ray1EndY} stroke="var(--accent-strong, #ffb066)" strokeWidth="1.6" />
        {mirror === "convex" && (
          <line x1={mirrorX} y1={hitY} x2={focalX} y2={axisY} stroke="var(--text-muted, #888)" strokeWidth="1.2" strokeDasharray="4 4" />
        )}
        {/* centre ray */}
        <line x1={objectX} y1={objectTopY} x2={mirrorX} y2={ray2HitY} stroke="var(--accent4, #f59e0b)" strokeWidth="1.4" />
        <line x1={mirrorX} y1={ray2HitY} x2={20} y2={ray2EndY} stroke="var(--accent4, #f59e0b)" strokeWidth="1.4" />
        {/* image */}
        {finite && (
          <>
            <line
              x1={imageX}
              y1={axisY}
              x2={imageX}
              y2={imageTopY}
              stroke="var(--accent3, #f87171)"
              strokeWidth="3"
              strokeDasharray={virtual ? "6 4" : undefined}
            />
            <text x={imageX} y={axisY + 16} textAnchor="middle" fill="var(--text-muted, #888)" fontSize="11">image</text>
          </>
        )}
        <text x="20" y="24" fill="var(--text-secondary, #bbb)" fontSize="12">Principal rays locate the image. Dashed parts are virtual.</text>
      </svg>
      <p className="lv-readout">
        u = {distance} cm · f = {mirror === "concave" ? "+" : "−"}{focal} cm · v = {Number.isFinite(v) ? v.toFixed(1) : "∞"} cm · m = {Number.isFinite(m) ? m.toFixed(2) : "∞"}
      </p>
      <p className="lv-readout">Image: <strong>{nature}</strong></p>
      <div className="lv-controls">
        <button type="button" className="lv-btn" onClick={() => setDistance((d) => clamp(d - 5, 4, 40))} aria-label="Move object 5 cm closer to the mirror">Object closer</button>
        <button type="button" className="lv-btn" onClick={() => setDistance((d) => clamp(d + 5, 4, 40))} aria-label="Move object 5 cm further from the mirror">Object further</button>
        <button type="button" className="lv-btn" onClick={() => setFocal((f) => clamp(f + 2, 5, 20))}>Longer f</button>
        <button type="button" className="lv-btn" onClick={() => setMirror((m) => (m === "concave" ? "convex" : "concave"))}>
          Switch to {mirror === "concave" ? "convex" : "concave"}
        </button>
      </div>
    </div>
  );
}

/* ── 4. Transverse wave ─────────────────────────────────────────────────── */

export function WaveScene({ params }: SceneProps) {
  const reduced = useReducedMotion();
  const [frequency, setFrequency] = useState(() => clamp(num(params.frequency, 1), 0.4, 3));
  const [amplitude, setAmplitude] = useState(() => clamp(num(params.amplitude, 0.6), 0.2, 1));
  const [playing, setPlaying] = useState(!reduced);
  const [phase, setPhase] = useState(0);

  useRafLoop(playing && !reduced, (dt) => setPhase((p) => (p + dt * frequency * 1.6) % (Math.PI * 2)));

  const width = 560;
  const mid = 150;
  const amp = 18 + amplitude * 70;
  const wavelength = 220 / frequency;
  const points = Array.from({ length: 81 }, (_, i) => {
    const x = 40 + (i / 80) * width;
    const y = mid - amp * Math.sin(((x - 40) / wavelength) * Math.PI * 2 - phase);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 640 280" role="img" aria-label="Transverse wave showing crest, trough, wavelength and amplitude">
        <line x1="30" y1={mid} x2="610" y2={mid} stroke="var(--border, #333)" strokeWidth="1" />
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="3" />
        <line x1="40" y1={mid} x2="40" y2={mid - amp} stroke="var(--text-muted, #888)" strokeDasharray="4 4" />
        <text x="46" y={mid - amp / 2} fill="var(--text-muted, #888)" fontSize="11">amplitude</text>
        <line x1={40} y1={mid + amp + 16} x2={40 + wavelength} y2={mid + amp + 16} stroke="var(--text-muted, #888)" />
        <text x={40 + wavelength / 2} y={mid + amp + 32} textAnchor="middle" fill="var(--text-muted, #888)" fontSize="11">one wavelength</text>
        <text x="40" y="34" fill="var(--text-secondary, #bbb)" fontSize="12">The wave moves forward; each point on the rope moves only up and down.</text>
      </svg>
      <div className="lv-controls">
        <PlayButton playing={playing} onClick={() => setPlaying((p) => !p)} />
        <label className="lv-slider">
          Frequency
          <input type="range" min={0.4} max={3} step={0.1} value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} />
          <span>{frequency.toFixed(1)} Hz</span>
        </label>
        <label className="lv-slider">
          Amplitude
          <input type="range" min={0.2} max={1} step={0.05} value={amplitude} onChange={(e) => setAmplitude(Number(e.target.value))} />
          <span>{amplitude.toFixed(2)}</span>
        </label>
      </div>
    </div>
  );
}

/* ── 5. Quadratic graph ─────────────────────────────────────────────────── */

export function GraphScene({ params }: SceneProps) {
  const [a, setA] = useState(() => clamp(num(params.a, 1), -2, 2));
  const [b, setB] = useState(() => clamp(num(params.b, 0), -6, 6));
  const [c, setC] = useState(() => clamp(num(params.c, -4), -6, 6));

  const xMin = -6;
  const xMax = 6;
  const yMin = -8;
  const yMax = 10;
  const px = (x: number) => 40 + ((x - xMin) / (xMax - xMin)) * 540;
  const py = (y: number) => 260 - ((y - yMin) / (yMax - yMin)) * 220;

  const points = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = xMin + (i / 120) * (xMax - xMin);
      const y = a * x * x + b * x + c;
      if (!Number.isFinite(y) || y < yMin - 4 || y > yMax + 4) continue;
      out.push(`${px(x).toFixed(1)},${py(y).toFixed(1)}`);
    }
    return out.join(" ");
  }, [a, b, c]);

  const discriminant = b * b - 4 * a * c;
  const roots = a !== 0 && discriminant >= 0
    ? [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)]
    : [];
  const vertexX = a !== 0 ? -b / (2 * a) : null;
  const vertexY = a !== 0 ? a * vertexX! * vertexX! + b * vertexX! + c : null;

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 620 290" role="img" aria-label="Parabola plot with adjustable coefficients">
        <rect x={px(0)} y="24" width="1" height="236" fill="var(--border-strong, #444)" />
        <line x1="30" y1={py(0)} x2="600" y2={py(0)} stroke="var(--border-strong, #444)" strokeWidth="1" />
        {[-4, -2, 0, 2, 4].map((tick) => (
          <g key={tick}>
            <line x1={px(tick)} y1="24" x2={px(tick)} y2="260" stroke="var(--border, #2a2a2a)" strokeWidth="0.5" />
            <text x={px(tick)} y="276" textAnchor="middle" fill="var(--text-faint, #666)" fontSize="9">{tick}</text>
          </g>
        ))}
        {[-4, 4, 8].map((tick) => (
          <text key={tick} x="30" y={py(tick) + 3} fill="var(--text-faint, #666)" fontSize="9">{tick}</text>
        ))}
        {a !== 0 && <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2.5" />}
        {a === 0 && (
          <line x1={px(xMin)} y1={py(b * xMin + c)} x2={px(xMax)} y2={py(b * xMax + c)} stroke="var(--accent)" strokeWidth="2.5" />
        )}
        {vertexX !== null && vertexY !== null && Number.isFinite(vertexY) && (
          <circle cx={px(vertexX)} cy={py(vertexY)} r="4" fill="var(--accent3, #f87171)" />
        )}
        {roots.map((root, i) => (
          Number.isFinite(root) ? <circle key={i} cx={px(root)} cy={py(0)} r="4" fill="var(--ok, #4ade80)" /> : null
        ))}
        <text x="40" y="20" fill="var(--text-primary, #eee)" fontSize="13">y = {a.toFixed(2)}x² + {b.toFixed(1)}x + {c.toFixed(1)}</text>
      </svg>
      <p className="lv-readout">
        Discriminant D = {discriminant.toFixed(1)} · {discriminant > 0 ? "two real roots" : discriminant === 0 ? "one repeated root" : "no real roots"}
        {vertexX !== null && ` · vertex (${vertexX.toFixed(2)}, ${vertexY!.toFixed(2)})`}
      </p>
      <div className="lv-controls lv-controls--sliders">
        {[
          { label: "a", value: a, set: setA, min: -2, max: 2, step: 0.25 },
          { label: "b", value: b, set: setB, min: -6, max: 6, step: 0.5 },
          { label: "c", value: c, set: setC, min: -6, max: 6, step: 0.5 },
        ].map(({ label, value, set, min, max, step }) => (
          <label key={label} className="lv-slider">
            {label}
            <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} aria-label={`Coefficient ${label}`} />
            <span>{value.toFixed(2)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ── 6. Geometry transformations ────────────────────────────────────────── */

const ORIGINAL_TRIANGLE = [
  { x: 3, y: 2 },
  { x: 6, y: 2 },
  { x: 3, y: 5 },
];
const ORIGINAL_QUAD = [
  { x: 2, y: 2 },
  { x: 5, y: 2 },
  { x: 6, y: 4 },
  { x: 3, y: 4 },
];

export function TransformScene({ params }: SceneProps) {
  const initial = ["translate", "rotate", "reflect", "scale"].includes(textParam(params.transform, "translate"))
    ? textParam(params.transform, "translate")
    : "translate";
  const [transform, setTransform] = useState(initial);
  const [shape, setShape] = useState(textParam(params.shape, "triangle") === "quadrilateral" ? "quadrilateral" : "triangle");
  const [amount, setAmount] = useState(() => clamp(num(params.amount, 3), -6, 6));
  const [progress, setProgress] = useState(1);
  const [animating, setAnimating] = useState(false);
  const reduced = useReducedMotion();

  useRafLoop(animating && !reduced, (dt) => {
    setProgress((p) => {
      const next = p + dt * 1.6;
      if (next >= 1) {
        setAnimating(false);
        return 1;
      }
      return next;
    });
  });

  const source = shape === "quadrilateral" ? ORIGINAL_QUAD : ORIGINAL_TRIANGLE;
  const toPx = (p: { x: number; y: number }) => ({ x: 50 + p.x * 44, y: 260 - p.y * 36 });

  const transformed = source.map((point) => {
    if (transform === "translate") return { x: point.x + amount, y: point.y + amount / 2 };
    if (transform === "rotate") {
      const angle = (amount * 15 * Math.PI) / 180;
      const cx = 4.5;
      const cy = 3.5;
      const dx = point.x - cx;
      const dy = point.y - cy;
      return { x: cx + dx * Math.cos(angle) - dy * Math.sin(angle), y: cy + dx * Math.sin(angle) + dy * Math.cos(angle) };
    }
    if (transform === "reflect") return { x: 9 - point.x, y: point.y };
    const k = clamp(1 + amount / 6, 0.4, 2.4);
    return { x: 4.5 + (point.x - 4.5) * k, y: 3.5 + (point.y - 3.5) * k };
  });

  const interpolated = source.map((point, i) => ({
    x: point.x + (transformed[i].x - point.x) * progress,
    y: point.y + (transformed[i].y - point.y) * progress,
  }));

  const polygon = (points: Array<{ x: number; y: number }>) =>
    points.map((p) => { const q = toPx(p); return `${q.x},${q.y}`; }).join(" ");

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 620 300" role="img" aria-label={`Coordinate grid showing a ${transform} of a ${shape}`}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={`v${i}`} x1={50 + i * 44} y1="30" x2={50 + i * 44} y2="266" stroke="var(--border, #2a2a2a)" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`h${i}`} x1="46" y1={260 - i * 36} x2="580" y2={260 - i * 36} stroke="var(--border, #2a2a2a)" strokeWidth="0.5" />
        ))}
        <line x1="46" y1="260" x2="590" y2="260" stroke="var(--border-strong, #444)" strokeWidth="1.4" />
        <line x1="50" y1="30" x2="50" y2="266" stroke="var(--border-strong, #444)" strokeWidth="1.4" />
        {transform === "reflect" && (
          <line x1={50 + 9 * 44} y1="30" x2={50 + 9 * 44} y2="266" stroke="var(--accent4, #f59e0b)" strokeDasharray="5 4" strokeWidth="1.5" />
        )}
        <polygon points={polygon(source)} fill="rgba(148, 163, 184, 0.14)" stroke="var(--text-muted, #888)" strokeWidth="2" />
        <polygon points={polygon(interpolated)} fill="rgba(255, 138, 31, 0.16)" stroke="var(--accent)" strokeWidth="2.5" />
        {source.map((point, i) => {
          const from = toPx(point);
          const to = toPx(interpolated[i]);
          return (
            <g key={i}>
              <circle cx={from.x} cy={from.y} r="3" fill="var(--text-muted, #888)" />
              <circle cx={to.x} cy={to.y} r="3.5" fill="var(--accent)" />
            </g>
          );
        })}
        <text x="50" y="22" fill="var(--text-secondary, #bbb)" fontSize="11">
          {transform === "translate" ? `translation by (${amount}, ${(amount / 2).toFixed(1)})` : transform === "rotate" ? `rotation ${amount * 15}° about (4.5, 3.5)` : transform === "reflect" ? "reflection across x = 9" : `enlargement, scale ≈ ${clamp(1 + amount / 6, 0.4, 2.4).toFixed(2)}`}
        </text>
      </svg>
      <div className="lv-controls">
        {["translate", "rotate", "reflect", "scale"].map((t) => (
          <button key={t} type="button" className={`lv-btn ${transform === t ? "is-active" : ""}`} aria-pressed={transform === t} onClick={() => { setTransform(t); setProgress(0); setAnimating(true); }}>
            {t}
          </button>
        ))}
        <button type="button" className="lv-btn" onClick={() => setShape((s) => (s === "triangle" ? "quadrilateral" : "triangle"))}>Shape</button>
        <label className="lv-slider">
          amount
          <input type="range" min={-6} max={6} step={1} value={amount} onChange={(e) => { setAmount(Number(e.target.value)); setProgress(0); setAnimating(true); }} />
          <span>{amount}</span>
        </label>
        <button type="button" className="lv-btn" onClick={() => { setProgress(0); setAnimating(true); }}>Replay</button>
      </div>
    </div>
  );
}

/* ── 7. Cycle diagram ───────────────────────────────────────────────────── */

export function CycleScene({ params }: SceneProps) {
  const steps = listParam(params.steps, ["Inputs absorbed", "Energy converted", "Products released", "Materials reused"]).slice(0, 6);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(!reduced);

  useEffect(() => {
    if (!playing || reduced) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % steps.length), 2400);
    return () => window.clearInterval(timer);
  }, [playing, reduced, steps.length]);

  const cx = 320;
  const cy = 155;
  const radius = 92;
  const positions = steps.map((_, i) => {
    const angle = (i / steps.length) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 640 320" role="img" aria-label={`Cycle diagram with ${steps.length} stages`}>
        <defs>
          <marker id="cycle-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted, #888)" />
          </marker>
        </defs>
        {positions.map((from, i) => {
          const to = positions[(i + 1) % positions.length];
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <path
              key={i}
              d={`M${from.x},${from.y} Q${midX + (cx - midX) * 0.25},${midY + (cy - midY) * 0.25} ${to.x},${to.y}`}
              fill="none"
              stroke={i === active ? "var(--accent)" : "var(--border-strong, #444)"}
              strokeWidth={i === active ? 2.5 : 1.5}
              markerEnd="url(#cycle-arrow)"
              opacity={i === active ? 1 : 0.7}
            />
          );
        })}
        {steps.map((step, i) => {
          const pos = positions[i];
          const isActive = i === active;
          const short = step.length > 26 ? `${step.slice(0, 24)}…` : step;
          return (
            <g key={i} role="button" tabIndex={0} aria-pressed={isActive} aria-label={`Stage ${i + 1}: ${step}`} onClick={() => setActive(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(i); } }} style={{ cursor: "pointer" }}>
              <rect x={pos.x - 78} y={pos.y - 22} width="156" height="44" rx="10" fill={isActive ? "var(--accent-soft, rgba(255,138,31,0.16))" : "var(--bg-elevated, #141414)"} stroke={isActive ? "var(--accent)" : "var(--border, #333)"} strokeWidth={isActive ? 2 : 1} />
              <text x={pos.x} y={pos.y - 4} textAnchor="middle" fill={isActive ? "var(--accent)" : "var(--text-primary, #eee)"} fontSize="10.5" fontWeight="600">{i + 1}. {short}</text>
              <text x={pos.x} y={pos.y + 11} textAnchor="middle" fill="var(--text-muted, #888)" fontSize="9">stage {i + 1}</text>
            </g>
          );
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--text-secondary, #bbb)" fontSize="12">Follow the numbers</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--text-muted, #888)" fontSize="10.5">each stage feeds the next</text>
      </svg>
      <p className="lv-readout"><strong>Stage {active + 1}:</strong> {steps[active]}</p>
      <div className="lv-controls">
        <PlayButton playing={playing} onClick={() => setPlaying((p) => !p)} />
        <button type="button" className="lv-btn" onClick={() => setActive((i) => (i - 1 + steps.length) % steps.length)}>Previous</button>
        <button type="button" className="lv-btn" onClick={() => setActive((i) => (i + 1) % steps.length)}>Next stage</button>
      </div>
    </div>
  );
}

/* ── 8. Labelled cell ───────────────────────────────────────────────────── */

const CELL_PARTS: Record<string, string> = {
  nucleus: "Stores DNA and controls the cell's activities.",
  membrane: "A selectively permeable bilayer that controls what enters and leaves.",
  cytoplasm: "The jelly-like fluid where many reactions take place.",
  mitochondrion: "Releases energy from glucose as ATP through respiration.",
  chloroplast: "Contains chlorophyll; captures light energy for photosynthesis.",
  vacuole: "Stores water, ions and sugars; keeps the cell firm.",
  wall: "A rigid cellulose layer outside the membrane that supports a plant cell.",
  ribosome: "Assembles proteins from amino acids.",
};

export function CellScene({ params }: SceneProps) {
  const plant = textParam(params.cellType, "animal") === "plant";
  const [selected, setSelected] = useState(plant ? "chloroplast" : "nucleus");
  const parts = plant
    ? ["wall", "membrane", "cytoplasm", "nucleus", "mitochondrion", "chloroplast", "vacuole", "ribosome"]
    : ["membrane", "cytoplasm", "nucleus", "mitochondrion", "ribosome"];
  const highlight = (key: string) => (selected === key ? "var(--accent)" : "var(--border-strong, #444)");
  const fill = (key: string) => (selected === key ? "var(--accent-soft, rgba(255,138,31,0.18))" : "transparent");

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 640 320" role="img" aria-label={plant ? "Labelled plant cell diagram" : "Labelled animal cell diagram"}>
        {plant && <rect x="60" y="30" width="520" height="250" rx="34" fill="none" stroke={highlight("wall")} strokeWidth="8" />}
        <ellipse cx="320" cy="155" rx={plant ? 236 : 248} ry={plant ? 108 : 112} fill={fill("membrane")} stroke={highlight("membrane")} strokeWidth="2.5" />
        {plant && <ellipse cx="320" cy="155" rx="140" ry="62" fill={fill("vacuole")} stroke={highlight("vacuole")} strokeWidth="2" opacity="0.85" />}
        <circle cx="250" cy="135" r="34" fill={fill("nucleus")} stroke={highlight("nucleus")} strokeWidth="2.5" />
        <circle cx="250" cy="135" r="12" fill="var(--text-muted, #888)" opacity="0.55" />
        <text x="250" y="139" textAnchor="middle" fill="var(--text-primary, #eee)" fontSize="10">nucleus</text>
        {[0, 1, 2].map((i) => (
          <ellipse key={i} cx={400 + i * 38} cy={200 + (i % 2) * 14} rx="22" ry="11" fill={fill("mitochondrion")} stroke={highlight("mitochondrion")} strokeWidth="2" />
        ))}
        <text x="425" y="234" textAnchor="middle" fill="var(--text-muted, #888)" fontSize="10">mitochondria</text>
        {plant && [0, 1, 2, 3].map((i) => (
          <ellipse key={i} cx={200 + i * 62} cy={215 - (i % 2) * 26} rx="17" ry="10" fill={fill("chloroplast")} stroke={highlight("chloroplast")} strokeWidth="2" transform={`rotate(${i % 2 ? -18 : 14} ${200 + i * 62} ${215 - (i % 2) * 26})`} />
        ))}
        {plant && <text x="250" y="256" textAnchor="middle" fill="var(--text-muted, #888)" fontSize="10">chloroplasts</text>}
        {Array.from({ length: 12 }, (_, i) => (
          <circle key={i} cx={310 + Math.cos(i * 1.9) * (70 + (i % 3) * 30)} cy={115 + Math.sin(i * 2.1) * 46} r="2.4" fill={highlight("ribosome")} />
        ))}
        <text x="320" y="292" textAnchor="middle" fill="var(--text-muted, #888)" fontSize="10.5">{plant ? "Plant cell: wall, chloroplasts and a large vacuole" : "Animal cell: no wall, no chloroplasts"}</text>
      </svg>
      <div className="lv-organelles" role="group" aria-label="Cell parts">
        {parts.map((key) => (
          <button key={key} type="button" className={`lv-chip ${selected === key ? "is-active" : ""}`} aria-pressed={selected === key} onClick={() => setSelected(key)}>
            {key === "wall" ? "cell wall" : key === "mitochondrion" ? "mitochondria" : key}
          </button>
        ))}
      </div>
      <p className="lv-readout"><strong>{selected}:</strong> {CELL_PARTS[selected]}</p>
    </div>
  );
}

/* ── 9. Simplified atom ─────────────────────────────────────────────────── */

const ATOMS: Record<string, { protons: number; neutrons: number; shells: number[] }> = {
  H: { protons: 1, neutrons: 0, shells: [1] },
  C: { protons: 6, neutrons: 6, shells: [2, 4] },
  O: { protons: 8, neutrons: 8, shells: [2, 6] },
  Na: { protons: 11, neutrons: 12, shells: [2, 8, 1] },
  Cl: { protons: 17, neutrons: 18, shells: [2, 8, 7] },
  Mg: { protons: 12, neutrons: 12, shells: [2, 8, 2] },
};

export function AtomScene({ params }: SceneProps) {
  const initial = textParam(params.element, "Na");
  const [element, setElement] = useState(ATOMS[initial] ? initial : "Na");
  const [phase, setPhase] = useState(0);
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(!reduced);
  const atom = ATOMS[element];

  useRafLoop(playing && !reduced, (dt) => setPhase((p) => (p + dt * 1.2) % (Math.PI * 2)));

  const radii = [42, 72, 102];
  const nucleusCount = Math.min(14, atom.protons + atom.neutrons);

  return (
    <div className="lv-scene">
      <svg viewBox="0 0 520 300" role="img" aria-label={`Simplified shell model of ${element}`}>
        {atom.shells.map((count, shellIndex) => {
          const radius = radii[shellIndex];
          return (
            <g key={shellIndex}>
              <circle cx="260" cy="150" r={radius} fill="none" stroke="var(--border, #333)" strokeWidth="1" />
              {Array.from({ length: count }, (_, i) => {
                const angle = (i / count) * Math.PI * 2 + phase * (shellIndex + 1);
                return (
                  <circle key={i} cx={260 + Math.cos(angle) * radius} cy={150 + Math.sin(angle) * radius} r="4" fill="var(--accent)" />
                );
              })}
            </g>
          );
        })}
        {Array.from({ length: nucleusCount }, (_, i) => {
          const angle = (i / nucleusCount) * Math.PI * 2;
          const radius = 4 + (i % 4) * 3.2;
          return <circle key={i} cx={260 + Math.cos(angle) * radius} cy={150 + Math.sin(angle) * radius} r="5" fill={i < atom.protons ? "var(--accent3, #f87171)" : "var(--text-muted, #888)"} />;
        })}
        <text x="260" y="26" textAnchor="middle" fill="var(--text-primary, #eee)" fontSize="15" fontWeight="700">{element}</text>
        <text x="260" y="286" textAnchor="middle" fill="var(--text-muted, #888)" fontSize="10.5">Simplified shell model, not the electron's actual path</text>
      </svg>
      <p className="lv-readout">
        Protons {atom.protons} · Neutrons {atom.neutrons} · Electrons {atom.shells.reduce((a, b) => a + b, 0)} · Valence electrons {atom.shells[atom.shells.length - 1]}
      </p>
      <div className="lv-controls">
        <PlayButton playing={playing} onClick={() => setPlaying((p) => !p)} />
        {Object.keys(ATOMS).map((symbol) => (
          <button key={symbol} type="button" className={`lv-btn ${element === symbol ? "is-active" : ""}`} aria-pressed={element === symbol} onClick={() => setElement(symbol)}>{symbol}</button>
        ))}
      </div>
    </div>
  );
}
