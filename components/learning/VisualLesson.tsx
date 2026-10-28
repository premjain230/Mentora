"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import type { LearningVisual } from "../../lib/learning/types";
import {
  AtomScene,
  CellScene,
  CircuitScene,
  CycleScene,
  ForceScene,
  GraphScene,
  RayScene,
  TransformScene,
  WaveScene,
} from "./scenes2d";

// 3D is only downloaded when a lesson actually contains a 3D visual.
const Model3D = dynamic(() => import("./Model3D"), {
  ssr: false,
  loading: () => <div className="lv-loading" role="status">Loading the 3D model…</div>,
});

const TRUSTED_IMAGE_HOSTS = ["wikimedia.org", "upload.wikimedia.org", "commons.wikimedia.org", "nasa.gov", "noaa.gov", "usgs.gov", "openstax.org", "si.edu"];

function trustedImage(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return TRUSTED_IMAGE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch (_) {
    return false;
  }
}

function PhotoCard({ visual }: { visual: LearningVisual }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = typeof visual.params.imageUrl === "string" ? visual.params.imageUrl : "";
  const sourceUrl = typeof visual.params.sourceUrl === "string" ? visual.params.sourceUrl : "";
  const title = typeof visual.params.title === "string" ? visual.params.title : visual.title;
  const sourceLabel = typeof visual.params.sourceLabel === "string" ? visual.params.sourceLabel : "source";
  const licenseNote = typeof visual.params.licenseNote === "string" ? visual.params.licenseNote : "Licence: check the linked source page.";

  if (!imageUrl || !trustedImage(imageUrl) || !sourceUrl || !trustedImage(sourceUrl)) {
    return (
      <div className="lv-photo-fallback" role="status">
        No trusted photograph is available for this question. The explanation and diagram above still apply.
      </div>
    );
  }

  if (failed) {
    return (
      <div className="lv-photo-fallback" role="status">
        The photograph could not be loaded right now. The explanation above is unaffected.
      </div>
    );
  }

  return (
    <figure className="lv-photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={visual.altText || title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="lv-photo-img"
      />
      <figcaption className="lv-photo-caption">
        <span className="lv-photo-title">{title}</span>
        <span className="lv-photo-source">
          Image source:{" "}
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            {sourceLabel}
          </a>
          . {licenseNote}
        </span>
      </figcaption>
    </figure>
  );
}

function renderScene(visual: LearningVisual) {
  const params = visual.params || {};
  switch (visual.renderer) {
    case "circuit":
      return <CircuitScene params={params} />;
    case "force":
      return <ForceScene params={params} />;
    case "ray":
      return <RayScene params={params} />;
    case "wave":
      return <WaveScene params={params} />;
    case "graph":
      return <GraphScene params={params} />;
    case "transform":
      return <TransformScene params={params} />;
    case "cycle":
      return <CycleScene params={params} />;
    case "cell":
      return <CellScene params={params} />;
    case "atom":
      return <AtomScene params={params} />;
    case "molecule3d":
    case "solid3d":
      return <Model3D renderer={visual.renderer} params={params} />;
    case "photo":
      return <PhotoCard visual={visual} />;
    default:
      return null;
  }
}

export function VisualLesson({ visual, compact = false }: { visual: LearningVisual | null | undefined; compact?: boolean }) {
  if (!visual) return null;
  const body = renderScene(visual);
  if (!body) return null;

  const badge = visual.dimension === "3d" ? "3D model" : visual.dimension === "image" ? "Photograph" : "Diagram";

  return (
    <figure className={`learn-figure ${compact ? "is-compact" : ""}`} aria-label={visual.title}>
      <div className="learn-figure-head">
        <span className="learn-figure-title">{visual.title}</span>
        <span className="learn-badge">{badge}</span>
      </div>
      {visual.observe && (
        <p className="learn-observe">
          <span aria-hidden="true">👀 </span>
          <span><strong>What to notice:</strong> {visual.observe}</span>
        </p>
      )}
      <div className="learn-figure-body">{body}</div>
      {visual.followUp && <p className="learn-figure-followup">{visual.followUp}</p>}
    </figure>
  );
}
