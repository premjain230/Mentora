import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { VisualLesson } from "../../components/learning/VisualLesson";

/**
 * The animated lesson visuals are a self-contained widget (SVG scenes plus a
 * lazily loaded 3D renderer). The surrounding pages are framework-free, so
 * this island is only imported when a lesson actually carries a visual.
 */
export function mountVisual(host, visual, options = {}) {
  if (!host || !visual) return null;
  const root = createRoot(host);
  root.render(createElement(VisualLesson, { visual, ...options }));
  return () => {
    root.unmount();
  };
}
