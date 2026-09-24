/**
 * Learning Allied Growth Agent — first-party analytics.
 *
 * Lightweight, privacy-conscious event tracking shared by every page.
 *  - anonymous visitorId cookie (aq_visitor)
 *  - one-time UTM capture (aq_utm) from the very first landing URL
 *  - events POSTed to /api/track, which validates types server-side and
 *    binds the Firebase uid when an ID token is available.
 *
 * Usage:        window.AquaTrack.track('ai_chat_started', { topic: 'biology' })
 * Optional:     window.AquaTrack.trackOnce('signup', props)
 */

import { auth } from "../firebase-config.js";

const VISITOR_KEY = "aq_visitor";
const UTM_KEY = "aq_utm";
const FIRST_KEY = "aq_first_seen";
const API = "/api/track";
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function uuid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
}

function getCookie(name) {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days * 86400000);
  document.cookie =
    name + "=" + encodeURIComponent(value) + "; expires=" + d.toUTCString() + "; path=/; SameSite=Lax";
}

function visitorId() {
  let id = getCookie(VISITOR_KEY);
  if (!id) {
    id = uuid();
    setCookie(VISITOR_KEY, id, 365);
  }
  return id;
}

function captureUtmOnce() {
  let utm = {};
  try {
    utm = JSON.parse(getCookie(UTM_KEY) || "null") || {};
  } catch (_) {
    utm = {};
  }
  const params = new URLSearchParams(location.search);
  let changed = false;
  for (const k of UTM_PARAMS) {
    const v = params.get(k);
    if (v && !utm[k]) {
      utm[k] = v.slice(0, 200);
      changed = true;
    }
  }
  if (!utm.referrer && document.referrer) {
    utm.referrer = String(document.referrer).slice(0, 500);
    changed = true;
  }
  if (!utm.landing) {
    utm.landing = location.pathname;
    changed = true;
  }
  if (changed) setCookie(UTM_KEY, JSON.stringify(utm), 365);
  return utm;
}

async function idToken() {
  try {
    return auth && auth.currentUser ? await auth.currentUser.getIdToken() : null;
  } catch (_) {
    return null;
  }
}

let firstSeenSent = false;
async function send(ev, props) {
  const body = {
    ev,
    visitorId: visitorId(),
    props: { ...utmOnce(), ...(props || {}) },
  };
  try {
    const token = await idToken();
    const resp = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (!resp.ok && ev === "first_visit") firstSeenSent = false; // allow retry
  } catch (_) {
    /* best-effort tracking, never blocks the page */
  }
}

const utmOnce = (() => {
  let u = null;
  return () => {
    if (!u) u = captureUtmOnce();
    return u;
  };
})();

let pageViewSent = false;
async function maybeFirstVisit() {
  if (!getCookie(FIRST_KEY)) {
    setCookie(FIRST_KEY, "1", 365);
    await send("first_visit", {});
  }
  if (!pageViewSent) {
    pageViewSent = true;
    await send("page_view", {});
  }
}

let seenOnce = new Set();
const track = (ev, props) => {
  send(ev, props).catch(() => {});
};
const trackOnce = (ev, props) => {
  if (seenOnce.has(ev)) return;
  seenOnce.add(ev);
  track(ev, props);
};

maybeFirstVisit();
captureUtmOnce();

window.AquaTrack = { track, trackOnce, visitorId, captureUtmOnce };

// Bind identity as soon as the user is known (helps attribution like signups).
if (auth && auth.currentUser == null) {
  auth.onAuthStateChanged(() => {});
}

export { track, trackOnce, visitorId };