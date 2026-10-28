"use client";

import React, { useMemo, useRef, useState } from "react";
import { clamp, textParam, useRafLoop, useReducedMotion } from "./hooks";

interface Point3 {
  x: number;
  y: number;
  z: number;
}

interface Atom {
  p: Point3;
  r: number;
  color: string;
  label: string;
}

interface Bond {
  a: number;
  b: number;
  order?: number;
}

interface ModelData {
  atoms: Atom[];
  bonds: Bond[];
  label: string;
  caption: string;
  dimensions: Array<{ text: string; p: Point3 }>;
}

const COLORS = {
  H: "#e5e7eb",
  C: "#9ca3af",
  N: "#60a5fa",
  O: "#f87171",
  S: "#facc15",
};

function moleculeData(kind: string): ModelData {
  const tetra = (length: number): Point3[] => {
    const raw = [
      { x: 1, y: 1, z: 1 },
      { x: 1, y: -1, z: -1 },
      { x: -1, y: 1, z: -1 },
      { x: -1, y: -1, z: 1 },
    ];
    return raw.map((p) => {
      const norm = Math.sqrt(3);
      return { x: (p.x / norm) * length, y: (p.y / norm) * length, z: (p.z / norm) * length };
    });
  };

  if (kind === "methane") {
    const hydrogens = tetra(1.15);
    return {
      atoms: [
        { p: { x: 0, y: 0, z: 0 }, r: 0.36, color: COLORS.C, label: "C" },
        ...hydrogens.map((p) => ({ p, r: 0.22, color: COLORS.H, label: "H" })),
      ],
      bonds: hydrogens.map((_, i) => ({ a: 0, b: i + 1 })),
      label: "CH₄ — methane",
      caption: "Four identical C–H bonds point to the corners of a tetrahedron (about 109.5°).",
      dimensions: [],
    };
  }
  if (kind === "ammonia") {
    return {
      atoms: [
        { p: { x: 0, y: 0.16, z: 0 }, r: 0.34, color: COLORS.N, label: "N" },
        { p: { x: -1.0, y: -0.42, z: 0.32 }, r: 0.21, color: COLORS.H, label: "H" },
        { p: { x: 1.0, y: -0.42, z: 0.32 }, r: 0.21, color: COLORS.H, label: "H" },
        { p: { x: 0, y: -0.42, z: -0.98 }, r: 0.21, color: COLORS.H, label: "H" },
      ],
      bonds: [
        { a: 0, b: 1 },
        { a: 0, b: 2 },
        { a: 0, b: 3 },
      ],
      label: "NH₃ — ammonia",
      caption: "Three N–H bonds and one lone pair give a trigonal pyramidal shape, not a flat triangle.",
      dimensions: [],
    };
  }
  if (kind === "carbon_dioxide") {
    return {
      atoms: [
        { p: { x: -1.18, y: 0, z: 0 }, r: 0.32, color: COLORS.O, label: "O" },
        { p: { x: 0, y: 0, z: 0 }, r: 0.34, color: COLORS.C, label: "C" },
        { p: { x: 1.18, y: 0, z: 0 }, r: 0.32, color: COLORS.O, label: "O" },
      ],
      bonds: [
        { a: 0, b: 1, order: 2 },
        { a: 1, b: 2, order: 2 },
      ],
      label: "CO₂ — carbon dioxide",
      caption: "Two polar C=O bonds point in opposite directions, so the molecule is linear and non-polar.",
      dimensions: [],
    };
  }
  return {
    atoms: [
      { p: { x: 0, y: 0.16, z: 0 }, r: 0.36, color: COLORS.O, label: "O" },
      { p: { x: -0.78, y: -0.5, z: 0 }, r: 0.22, color: COLORS.H, label: "H" },
      { p: { x: 0.78, y: -0.5, z: 0 }, r: 0.22, color: COLORS.H, label: "H" },
    ],
    bonds: [
      { a: 0, b: 1 },
      { a: 0, b: 2 },
    ],
    label: "H₂O — water",
    caption: "Two lone pairs on oxygen push the O–H bonds together, giving a bent shape and a polar molecule.",
    dimensions: [],
  };
}

function solidData(kind: string): ModelData {
  const vertex = (x: number, y: number, z: number): Point3 => ({ x, y, z });
  const cubeEdges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const circlePoints = (radius: number, y: number, segments = 28): Point3[] =>
    Array.from({ length: segments }, (_, i) => {
      const a = (i / segments) * Math.PI * 2;
      return { x: Math.cos(a) * radius, y, z: Math.sin(a) * radius };
    });

  if (kind === "sphere") {
    const atoms: Atom[] = [];
    const bonds: Bond[] = [];
    for (const ring of [0, 1, 2]) {
      const pts = ring === 0 ? circlePoints(1, 0) : ring === 1
        ? Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2; return { x: Math.cos(a), y: Math.sin(a), z: 0 }; })
        : Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2; return { x: 0, y: Math.cos(a), z: Math.sin(a) }; });
      const offset = atoms.length;
      pts.forEach((p) => atoms.push({ p, r: 0.045, color: "#8892a0", label: "" }));
      pts.forEach((_, i) => bonds.push({ a: offset + i, b: offset + ((i + 1) % pts.length) }));
    }
    atoms.push({ p: { x: 0, y: 0, z: 0 }, r: 0.06, color: "var(--accent)", label: "" });
    bonds.push({ a: atoms.length - 1, b: 0 });
    return {
      atoms,
      bonds,
      label: "Sphere",
      caption: "Every point on the surface is the same distance r from the centre. Volume = 4/3 πr³; surface area = 4πr².",
      dimensions: [{ text: "r", p: { x: 0.5, y: 0.5, z: 0 } }],
    };
  }

  if (kind === "cone" || kind === "cylinder") {
    const radius = 0.85;
    const height = kind === "cone" ? 1.25 : 1.1;
    const atoms: Atom[] = [];
    const bonds: Bond[] = [];
    const bottom = circlePoints(radius, -height / 2);
    const top = kind === "cone" ? [] : circlePoints(radius, height / 2);
    const start = atoms.length;
    bottom.forEach((p) => atoms.push({ p, r: 0.05, color: "#8892a0", label: "" }));
    bottom.forEach((_, i) => bonds.push({ a: start + i, b: start + ((i + 1) % bottom.length) }));
    if (kind === "cone") {
      const apexIndex = atoms.length;
      atoms.push({ p: { x: 0, y: height / 2, z: 0 }, r: 0.07, color: "var(--accent)", label: "" });
      [0, 7, 14, 21].forEach((i) => bonds.push({ a: start + i, b: apexIndex }));
      bonds.push({ a: apexIndex, b: start });
    } else {
      const topStart = atoms.length;
      top.forEach((p) => atoms.push({ p, r: 0.05, color: "#8892a0", label: "" }));
      top.forEach((_, i) => bonds.push({ a: topStart + i, b: topStart + ((i + 1) % top.length) }));
      [0, 7, 14, 21].forEach((i) => bonds.push({ a: start + i, b: topStart + i }));
    }
    return {
      atoms,
      bonds,
      label: kind === "cone" ? "Cone" : "Cylinder",
      caption: kind === "cone"
        ? "Volume = 1/3 πr²h. The slant height, radius and height form a right triangle."
        : "Volume = πr²h. The curved surface unwraps into a rectangle of width 2πr.",
      dimensions: [{ text: "h", p: { x: 0, y: 0, z: 0 } }, { text: "r", p: { x: radius / 2, y: -height / 2, z: 0 } }],
    };
  }

  const isCuboid = kind === "cuboid";
  const sx = isCuboid ? 1.25 : 0.95;
  const sy = isCuboid ? 0.7 : 0.95;
  const sz = isCuboid ? 0.95 : 0.95;
  const corners: Point3[] = [
    vertex(-sx, -sy, -sz), vertex(sx, -sy, -sz), vertex(sx, sy, -sz), vertex(-sx, sy, -sz),
    vertex(-sx, -sy, sz), vertex(sx, -sy, sz), vertex(sx, sy, sz), vertex(-sx, sy, sz),
  ];
  return {
    atoms: corners.map((p) => ({ p, r: 0.07, color: "var(--accent)", label: "" })),
    bonds: cubeEdges.map(([a, b]) => ({ a, b })),
    label: isCuboid ? "Cuboid" : "Cube",
    caption: isCuboid
      ? "Volume = lbh; surface area = 2(lb + bh + hl). Opposite faces are congruent."
      : "Volume = a³; surface area = 6a². All twelve edges are equal.",
    dimensions: isCuboid
      ? [{ text: "l", p: { x: 0, y: -sy, z: sz } }, { text: "b", p: { x: sx, y: -sy, z: 0 } }, { text: "h", p: { x: -sx, y: 0, z: -sz } }]
      : [{ text: "a", p: { x: 0, y: -sy, z: sz } }],
  };
}

export default function Model3D({ renderer, params }: { renderer: string; params: Record<string, unknown> }) {
  const isMolecule = renderer === "molecule3d";
  const kind = isMolecule
    ? textParam(params.molecule, "water")
    : textParam(params.solid, "cube");
  const model = useMemo(() => (isMolecule ? moleculeData(kind) : solidData(kind)), [isMolecule, kind]);

  const reduced = useReducedMotion();
  const [yaw, setYaw] = useState(0.6);
  const [pitch, setPitch] = useState(-0.25);
  const [zoom, setZoom] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  useRafLoop(autoRotate && !reduced, (dt) => setYaw((y) => (y + dt * 0.55) % (Math.PI * 2)));

  const width = 560;
  const height = 340;
  const cx = width / 2;
  const cy = height / 2;
  const baseScale = isMolecule ? 108 : 105;

  const project = (p: Point3) => {
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const x1 = p.x * cosY - p.z * sinY;
    const z1 = p.x * sinY + p.z * cosY;
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const y1 = p.y * cosP - z1 * sinP;
    const z2 = p.y * sinP + z1 * cosP;
    const perspective = clamp(1 / (1 - z2 * 0.14), 0.7, 1.45);
    const scale = baseScale * zoom * perspective;
    return { x: cx + x1 * scale, y: cy - y1 * scale, z: z2 };
  };

  const projectedAtoms = model.atoms.map((atom, index) => ({ atom, index, screen: project(atom.p) }));
  const sortedBonds = [...model.bonds].sort((a, b) => {
    const za = (model.atoms[a.a].p.z + model.atoms[a.b].p.z) / 2;
    const zb = (model.atoms[b.a].p.z + model.atoms[b.b].p.z) / 2;
    return za - zb;
  });
  const sortedAtoms = [...projectedAtoms].sort((a, b) => a.screen.z - b.screen.z);
  const dimensionLabels = model.dimensions.map((d) => ({ text: d.text, screen: project(d.p) }));

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, yaw, pitch };
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    setYaw(drag.current.yaw + dx * 0.012);
    setPitch(clamp(drag.current.pitch - dy * 0.01, -1.35, 1.35));
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="lv-scene">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Interactive 3D model: ${model.label}. Drag to rotate, use plus and minus to zoom.`}
        tabIndex={0}
        style={{ touchAction: "none", cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onWheel={(event) => {
          event.preventDefault();
          setZoom((z) => clamp(z - event.deltaY * 0.001, 0.6, 1.9));
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); setYaw((y) => y - 0.14); }
          if (event.key === "ArrowRight") { event.preventDefault(); setYaw((y) => y + 0.14); }
          if (event.key === "ArrowUp") { event.preventDefault(); setPitch((p) => clamp(p + 0.1, -1.35, 1.35)); }
          if (event.key === "ArrowDown") { event.preventDefault(); setPitch((p) => clamp(p - 0.1, -1.35, 1.35)); }
          if (event.key === "+" || event.key === "=") { event.preventDefault(); setZoom((z) => clamp(z + 0.1, 0.6, 1.9)); }
          if (event.key === "-") { event.preventDefault(); setZoom((z) => clamp(z - 0.1, 0.6, 1.9)); }
        }}
      >
        <defs>
          <radialGradient id="atom-shade" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        {sortedBonds.map((bond, index) => {
          const a = project(model.atoms[bond.a].p);
          const b = project(model.atoms[bond.b].p);
          const depth = (a.z + b.z) / 2;
          const opacity = clamp(0.75 - depth * 0.18, 0.28, 0.95);
          if (bond.order === 2) {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = (-dy / len) * 3.2;
            const ny = (dx / len) * 3.2;
            return (
              <g key={index} opacity={opacity}>
                <line x1={a.x + nx} y1={a.y + ny} x2={b.x + nx} y2={b.y + ny} stroke="var(--text-muted, #9aa3ad)" strokeWidth="2.5" />
                <line x1={a.x - nx} y1={a.y - ny} x2={b.x - nx} y2={b.y - ny} stroke="var(--text-muted, #9aa3ad)" strokeWidth="2.5" />
              </g>
            );
          }
          return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--text-muted, #9aa3ad)" strokeWidth="3" opacity={opacity} strokeLinecap="round" />;
        })}
        {sortedAtoms.map(({ atom, index, screen }) => {
          const radius = atom.r * baseScale * zoom * clamp(1 / (1 - screen.z * 0.14), 0.7, 1.45);
          const color = atom.color.startsWith("var(") ? "var(--accent)" : atom.color;
          return (
            <g key={index} opacity={clamp(1 + screen.z * 0.08, 0.72, 1)}>
              <circle cx={screen.x} cy={screen.y} r={radius} fill={color} />
              <circle cx={screen.x} cy={screen.y} r={radius} fill="url(#atom-shade)" />
              {atom.label && (
                <text x={screen.x} y={screen.y + 4} textAnchor="middle" fill="#111" fontSize={Math.max(10, radius * 0.9)} fontWeight="700">
                  {atom.label}
                </text>
              )}
            </g>
          );
        })}
        {dimensionLabels.map((label, index) => (
          <text key={index} x={label.screen.x} y={label.screen.y} textAnchor="middle" fill="var(--text-secondary, #bbb)" fontSize="13" fontWeight="600">
            {label.text}
          </text>
        ))}
        <text x="14" y="22" fill="var(--text-faint, #666)" fontSize="10.5">drag to rotate · scroll to zoom</text>
      </svg>
      <p className="lv-readout"><strong>{model.label}.</strong> {model.caption}</p>
      <div className="lv-controls">
        <button type="button" className="lv-btn" onClick={() => setYaw((y) => y + 0.3)} aria-label="Rotate model left">Rotate ⟲</button>
        <button type="button" className="lv-btn" onClick={() => setYaw((y) => y - 0.3)} aria-label="Rotate model right">Rotate ⟳</button>
        <button type="button" className="lv-btn" onClick={() => setZoom((z) => clamp(z - 0.15, 0.6, 1.9))} aria-label="Zoom out">−</button>
        <button type="button" className="lv-btn" onClick={() => setZoom((z) => clamp(z + 0.15, 0.6, 1.9))} aria-label="Zoom in">+</button>
        <button
          type="button"
          className={`lv-btn ${autoRotate ? "is-active" : ""}`}
          aria-pressed={autoRotate}
          onClick={() => setAutoRotate((v) => !v)}
          disabled={reduced}
        >
          {autoRotate ? "Stop spin" : "Auto-spin"}
        </button>
        <button type="button" className="lv-btn" onClick={() => { setYaw(0.6); setPitch(-0.25); setZoom(1); }}>Reset view</button>
      </div>
      {reduced && <p className="lv-hint">Reduced motion is on, so auto-spin is disabled. You can still rotate manually.</p>}
      <details className="lv-details">
        <summary>Text alternative</summary>
        <p>{model.caption}</p>
      </details>
    </div>
  );
}
