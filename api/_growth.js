// ─────────────────────────────────────────────────────────────
// Aquila Growth Agent — shared analytics module.
//
// Reads/writes growth data with the Admin SDK:
//   growth_events/{id}   — first-party event stream { ev, visitorId, uid, props, ts, day }
//   visitors/{id}        — attribution & identity merge { firstSeen, lastSeen, utm, uid, signupUid }
// Metrics are DERIVED from real Firestore data only. Nothing is
// fabricated; below-minimum samples are reported as "insufficient".
// ─────────────────────────────────────────────────────────────

const { adminSdk, firestore, streamDocs, MIN_SAMPLE } = require("./_admin");

const EVENT_TYPES = new Set([
  "page_view",
  "first_visit",
  "signup",
  "login",
  "first_session",
  "ai_chat_started",
  "study_plan_created",
  "quiz_started",
  "quiz_completed",
  "test_analysis_started",
  "test_analysis_completed",
  "session_started",
  "subscription_started",
  "task_completed",
  "referral_created",
  "experiment_view",
  "experiment_conversion",
]);

const PROP_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
  "landing",
  "topic",
  "subject",
  "exam",
  "quizType",
  "mode",
  "experiment",
  "variant",
  "source",
]);

function sanitizeProps(props) {
  if (!props || typeof props !== "object") return {};
  const out = {};
  for (const k of PROP_KEYS) {
    const v = props[k];
    if (v === undefined || v === null) continue;
    let s = String(v).slice(0, 200);
    if (s.trim()) out[k] = s;
  }
  return out;
}

/** Records an event into growth_events and touches the visitor doc. */
async function recordEvent({ ev, visitorId, uid, props, nowDate }) {
  const db = firestore();
  const serverTs = adminSdk().firestore.FieldValue.serverTimestamp();
  await db.collection("growth_events").add({
    ev,
    visitorId,
    uid: uid || null,
    props: sanitizeProps(props),
    ts: serverTs,
    day: nowDate,
  });
  const visitorRef = db.collection("visitors").doc(visitorId);
  const visitorUpdate = {
    lastSeen: serverTs,
    lastEvent: ev,
    lastDay: nowDate,
  };
  if (uid) {
    visitorUpdate.uid = uid;
    if (ev === "signup") visitorUpdate.signupUid = uid;
  }
  await visitorRef.set(visitorUpdate, { merge: true });
}

/** Enriches a visitor doc for attribution (fires before signup). */
async function ensureVisitor(visitorId, props, nowDate) {
  if (!visitorId) return;
  const db = firestore();
  const serverTs = adminSdk().firestore.FieldValue.serverTimestamp();
  const doc = { lastSeen: serverTs, lastDay: nowDate };
  const p = sanitizeProps(props);
  if (p.utm_source || p.utm_campaign || p.referrer || p.landing) {
    doc.utm = {
      source: p.utm_source || "",
      medium: p.utm_medium || "",
      campaign: p.utm_campaign || "",
      content: p.utm_content || "",
      term: p.utm_term || "",
    };
    doc.referrer = p.referrer || "";
    doc.landing = p.landing || "";
  }
  doc.firstSeen = adminSdk().firestore.FieldValue.serverTimestamp();
  await db
    .collection("visitors")
    .doc(visitorId)
    .set(doc, { merge: true });
}

async function eventRange(fromDate, toDate) {
  const db = firestore();
  const from = new Date(fromDate);
  const to = new Date(toDate);
  return streamDocs(
    db.collection("growth_events").where("ts", ">=", from).where("ts", "<", to),
    40000
  );
}

async function visitorsFrom(firstSeenFrom, firstSeenTo) {
  const db = firestore();
  return streamDocs(
    db.collection("visitors").where("firstSeen", ">=", firstSeenFrom).where("firstSeen", "<", firstSeenTo),
    20000
  );
}

/** Users created in [from, to); returns aquila-user docs keyed by uid. */
async function usersCreated(fromDate, toDate) {
  const db = firestore();
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const docs = await streamDocs(
    db.collection("users").where("createdAt", ">=", from).where("createdAt", "<", to),
    30000
  );
  const byUid = new Map();
  for (const d of docs) {
    const data = d.data() || {};
    byUid.set(d.id, data);
  }
  return byUid;
}

/** Distinct-day activity map keyed by uid (for returning/retention). */
function activeDays(events) {
  const map = new Map(); // uid -> Set(day)
  for (const e of events) {
    const d = e.data() || {};
    if (!d.day || !d.uid) continue;
    if (!map.has(d.uid)) map.set(d.uid, new Set());
    map.get(d.uid).add(d.day);
  }
  return map;
}

/** uids that hit an "activation" event type at least once. */
function activatedUids(events) {
  const set = new Set();
  const ACT = new Set([
    "ai_chat_started",
    "study_plan_created",
    "quiz_completed",
    "test_analysis_completed",
  ]);
  for (const e of events) {
    const d = e.data() || {};
    if (d.uid && d.ev && ACT.has(d.ev)) set.add(d.uid);
  }
  return set;
}

function diffDays(a, b) {
  const MS = 86400000;
  return Math.floor((a - b) / MS);
}

module.exports = {
  EVENT_TYPES,
  recordEvent,
  ensureVisitor,
  eventRange,
  visitorsFrom,
  usersCreated,
  activeDays,
  activatedUids,
  diffDays,
  MIN_SAMPLE,
  sanitizeProps,
};