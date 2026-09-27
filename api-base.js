/**
 * api-base.js — environment-aware URL helpers for local dev vs production.
 *
 * WHY THIS EXISTS
 * Vercel serverless functions in /api cannot be executed by VS Code Live Server
 * (or any static file server). So when the page is served from a local origin we
 * point API requests at the already-deployed backend instead. In production we
 * keep using same-origin relative /api paths so nothing changes for real users.
 *
 *   local (Live Server)  ->  https://learningallied.world/api/...
 *   production (Vercel)  ->  /api/...
 *
 * The same problem applies to navigation: Vercel resolves clean URLs such as
 * /chat to chat.html via `cleanUrls: true` in vercel.json, but Live Server has no
 * such rewrite. pageUrl() maps clean URLs to real .html files locally while
 * leaving them untouched in production.
 *
 * USAGE (ES modules — the codebase is all ESM):
 *   import { apiUrl, apiFetch, pageUrl } from "./api-base.js";
 *   await apiFetch("/api/groq-proxy", { method: "POST", body });
 *   location.href = pageUrl("/chat");
 *
 * The same helpers are mirrored onto `window` so the few legacy classic
 * <script> blocks (which cannot use `import`) can still reach them.
 */

// NOTE: the apex domain https://learningallied.world answers with a 308 redirect to
// https://www.learningallied.world. Browsers do not follow redirects for CORS
// preflighted (Authorization-bearing) requests, so we must target the host that
// actually serves the API directly.
const DEPLOYED_ORIGIN = "https://www.learningallied.world";

const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

/** True when the page is being served from a local static file server. */
export const IS_LOCAL = (() => {
  try {
    return LOCAL_HOSTNAMES.has(location.hostname);
  } catch {
    return false;
  }
})();

/** Empty string in production, deployed origin locally. */
export const API_BASE = IS_LOCAL ? DEPLOYED_ORIGIN : "";

const ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** Resolve an /api path against the correct backend for this environment. */
export function apiUrl(path) {
  if (!path) return API_BASE || "/";
  if (ABSOLUTE_URL.test(path)) return path;
  return `${API_BASE}${path.charAt(0) === "/" ? path : `/${path}`}`;
}

/** fetch() against the correct backend for this environment. */
export function apiFetch(path, init) {
  return fetch(apiUrl(path), init);
}

/**
 * Resolve a page path for navigation.
 * Production: returned unchanged, so Vercel's clean URLs keep working.
 * Local: clean URLs are rewritten to the real .html file.
 */
export function pageUrl(path) {
  const raw = path == null ? "/" : String(path);
  if (!IS_LOCAL) return raw;

  // Absolute URLs, anchors and query-only links need no rewriting.
  if (ABSOLUTE_URL.test(raw)) return raw;
  if (raw.charAt(0) === "#" || raw.charAt(0) === "?") return raw;

  // Keep any ?query / #hash intact across the rewrite.
  const parts = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(raw);
  const pathname = parts[1] || "";
  const search = parts[2] || "";
  const hash = parts[3] || "";

  // "/" is served as index.html by Live Server already.
  if (pathname === "" || pathname === "/") return `/${search}${hash}`;

  // A relative path that already points at a real file (e.g. "signup.html")
  // resolves correctly under Live Server — leave the author's path untouched.
  if (pathname.charAt(0) !== "/" && /\.(?:html?|php)$/i.test(pathname)) return raw;

  // Stay root-relative so links keep working from subdirectories (e.g. /blog).
  const rooted = pathname.charAt(0) === "/" ? pathname : `/${pathname}`;
  const target = /\.html?$/i.test(rooted) ? rooted : `${rooted}.html`;

  return `${target}${search}${hash}`;
}

/**
 * Rewrite already-rendered clean-URL links for local development.
 * Only does anything under Live Server; a no-op in production.
 * Safe to call on DOMContentLoaded — must run after the links are parsed.
 */
export function applyCleanUrlLinks(scope) {
  if (!IS_LOCAL) return;
  const root = scope || document;
  const links = root.querySelectorAll("a[href]");
  for (let i = 0; i < links.length; i += 1) {
    const link = links[i];
    const href = link.getAttribute("href");
    if (!href) continue;
    const next = pageUrl(href);
    if (next !== href) link.setAttribute("href", next);
  }
}

if (typeof window !== "undefined") {
  window.IS_LOCAL = IS_LOCAL;
  window.API_BASE = API_BASE;
  window.apiUrl = apiUrl;
  window.apiFetch = apiFetch;
  window.pageUrl = pageUrl;
  window.applyCleanUrlLinks = applyCleanUrlLinks;
}
