/**
 * Learning Allied — Vercel Analytics + Speed Insights, loaded only when the
 * platform is actually serving the instrumentation routes.
 *
 * Why this exists: both SDKs inject `<script src="/_vercel/{insights,speed-insights}/script.js">`.
 * Those routes only exist on a Vercel deployment. On `vercel dev`, or any other
 * host, they 404 and the browser then refuses to execute them because the 404
 * body is served as `text/plain`:
 *
 *   Refused to execute script ... because its MIME type ('text/plain') is not
 *   executable, and strict MIME type checking is enabled.
 *
 * That is a real error in the console, not a harmless one, so it is fixed rather
 * than hidden. We probe the route once, without blocking paint or navigation, and
 * only pull the SDKs in when the platform answers.
 *
 * Usage (replaces two inline module scripts per page):
 *   <script type="module">
 *     import { initAnalytics } from "./js/vercel-analytics.js";
 *     initAnalytics();
 *   </script>
 */

/** Matches the local-host list api-base.js already uses. */
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"]);

const PROBE_PATH = "/_vercel/insights/script.js";

let started = false;

function platformServesInsights() {
  // No point probing a laptop — and nothing to inject there anyway.
  if (LOCAL_HOSTNAMES.has(location.hostname)) return Promise.resolve(false);

  return fetch(PROBE_PATH, { method: "HEAD", credentials: "omit", cache: "no-store" })
    .then((res) => res.ok || res.status === 405) // 405 = exists, HEAD just not routed
    .catch(() => false);
}

/**
 * Start Analytics and Speed Insights if, and only if, the routes exist.
 * Fire-and-forget: never delays first paint or blocks the page on the network.
 */
export function initAnalytics() {
  if (started) return;
  started = true;

  platformServesInsights().then((available) => {
    if (!available) return;
    // Imported dynamically so a local dev machine never fetches esm.sh at all.
    Promise.all([
      import("https://esm.sh/@vercel/analytics").catch(() => null),
      import("https://esm.sh/@vercel/speed-insights").catch(() => null),
    ]).then(([analytics, speed]) => {
      try {
        analytics && analytics.inject();
      } catch (e) {
        console.warn("[analytics] inject failed:", e);
      }
      try {
        speed && speed.injectSpeedInsights();
      } catch (e) {
        console.warn("[analytics] speed insights inject failed:", e);
      }
    });
  });
}