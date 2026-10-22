/**
 * Learning Allied — AI Learning Hub (page controller)
 *
 * Journey: Board → Class → Subject → Chapter → READ (paged) → QUIZ (5-7 MCQs)
 *          → AI REVIEW (what you got wrong + final explanation of the chapter)
 *
 * Curriculum source of truth: js/learning/curriculum-data.js, read through the
 * existing js/learning/arena-curriculum.js helpers. Nothing here invents a
 * chapter that is not in that dataset.
 *
 * AI: POST /api/learn-hub
 *   action "plan"   -> the reading pages + quiz. Served from a Firestore cache,
 *                      so it costs no AI call on every visit after the first.
 *   action "review" -> what the learner got wrong + the final explanation.
 *
 * Progress/analytics: the existing js/learning/evidence.js -> /api/learning-event
 *   pipeline, which is what writes users/{uid}/mastery, /reviews and /misconceptions.
 *   The hub only adds a resume-state doc at users/{uid}/learning/learningHub.
 */

import { auth, db, firebaseReady } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { apiUrl, pageUrl } from "./api-base.js";
import { escapeHtml } from "./xss.js";
import { getSubjectsForTrack, getChapters, searchChapters } from "./js/learning/arena-curriculum.js";
import { emitLearningEvent } from "./js/learning/evidence.js";

/* ─────────────────────────────────────────────────────────────
   Configuration
   ───────────────────────────────────────────────────────────── */

const ENDPOINT = "/api/learn-hub";
const HUB_DOC_SEGMENT = "learningHub"; // users/{uid}/learning/learningHub (rules: /learning/{doc})

/**
 * Hub tracks. `curriculumTrack` is the id understood by
 * js/learning/arena-curriculum.js; `notice` is shown verbatim so coverage
 * limitations are stated rather than hidden.
 */
const HUB_TRACKS = [
  {
    id: "maharashtra",
    label: "Maharashtra State Board",
    short: "Maharashtra",
    sub: "Classes 9–12",
    dotRgb: "234, 88, 12",
    icon: "history",
    grades: true,
    curriculumTrack: "maharashtra",
    notice: null,
  },
  {
    id: "cbse",
    label: "CBSE",
    short: "CBSE",
    sub: "Classes 9–12",
    dotRgb: "124, 58, 237",
    icon: "computer",
    grades: true,
    curriculumTrack: "cbse",
    notice: null,
  },
  {
    id: "jee_main",
    label: "JEE Main",
    short: "JEE Main",
    sub: "Physics · Chemistry · Mathematics",
    dotRgb: "37, 99, 235",
    icon: "math",
    grades: false,
    curriculumTrack: "jee",
    notice:
      "Coverage: the JEE Main chapters present in our curriculum dataset. Chapter lists have not yet been " +
      "re-verified against the latest NTA notification for this year.",
  },
  {
    id: "jee_advanced",
    label: "JEE Advanced",
    short: "JEE Advanced",
    sub: "Main + Advanced-only units",
    dotRgb: "8, 145, 178",
    icon: "math",
    grades: false,
    curriculumTrack: "jee",
    notice:
      "<b>Coverage:</b> JEE Advanced covers the JEE Main foundation chapters plus Advanced-only units " +
      "(fluid mechanics, thermal physics, solid state, surface chemistry, hydrogen, s-block, " +
      "isolation of metals, environmental chemistry, polymers, chemistry in everyday life). " +
      "It is not the complete Advanced syllabus.",
  },
  {
    id: "neet",
    label: "NEET",
    short: "NEET",
    sub: "Physics · Chemistry · Biology",
    dotRgb: "16, 163, 74",
    icon: "biology",
    grades: false,
    curriculumTrack: "neet",
    notice:
      "<b>Coverage verified.</b> Checked against the official NTA/NMC syllabus for NEET (UG) 2026 " +
      "(published 8 January 2026): 20 Physics units, 20 Chemistry units and 10 Biology units. Chapters are " +
      "served from the CBSE Class 11–12 science syllabus, which is what NEET is examined on, plus 4 " +
      "NEET-specific units the CBSE data does not carry (Experimental Skills; P-Block Elements; " +
      "Purification and Characterisation of Organic Compounds; Principles Related to Practical Chemistry). " +
      "Topics such as Solid State, Surface Chemistry, Polymers and Chemistry in Everyday Life are " +
      "<b>deliberately not offered</b> — they are not in the current NEET syllabus.",
  },
];

const STATUS_META = {
  understood: { label: "Understood", pill: "lh-pill--ok", icon: "" },
  partially_understood: { label: "Partly understood", pill: "lh-pill--warn", icon: "warn" },
  needs_revision: { label: "Needs revision", pill: "lh-pill--bad", icon: "bad" },
};

/**
 * Subject icons + pastel accents, keyed by a loose subject-name match so a new
 * subject added to curriculum-data.js still gets a sensible tile instead of a
 * blank square. `--tile-rgb` drives both the tinted background and the icon
 * colour, so the palette follows the theme automatically.
 */
const SUBJECT_STYLES = [
  { re: /physics/i, rgb: "37, 99, 235", icon: "physics" },
  { re: /chemistry/i, rgb: "217, 119, 6", icon: "chemistry" },
  { re: /biology|life|science\s*&\s*technology/i, rgb: "16, 163, 74", icon: "biology" },
  { re: /math/i, rgb: "124, 58, 237", icon: "math" },
  { re: /informat|computer/i, rgb: "8, 145, 178", icon: "computer" },
  { re: /history/i, rgb: "234, 88, 12", icon: "history" },
  { re: /political|sociolog|econom|account|business/i, rgb: "13, 148, 136", icon: "civic" },
  { re: /geograph|environment/i, rgb: "22, 163, 74", icon: "geography" },
  { re: /english|language|literature/i, rgb: "219, 39, 119", icon: "language" },
  { re: /psycholog|physical education/i, rgb: "190, 24, 93", icon: "mind" },
  { re: /social/i, rgb: "180, 83, 9", icon: "civic" },
];

const UI_ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  dot: '<circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/>',
};
function uiIcon(name, size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI_ICONS[name]}</svg>`;
}

const ICONS = {
  physics: '<path d="M9 3v4M15 3v4"/><path d="M7 7h10l-1 6a4 4 0 0 1-8 0L7 7Z"/><path d="M10 13h4l-.5 3h-3L10 13Z"/>',
  chemistry: '<path d="M10 3v7"/><path d="M10 10 5 19a1 1 0 0 0 .9 1.5h12.2A1 1 0 0 0 19 19l-5-9"/><path d="M8 14h8"/>',
  biology: '<path d="M12 21c0-5 3-8 8-9 0 6-3 9-8 9Z"/><path d="M12 21c0-4-2.5-6.5-7-7.5C5 19 7.5 21 12 21Z"/><path d="M12 21V9"/>',
  math: '<path d="M5 8h14M5 16h14"/><path d="M10 5 8 19M16 5l-2 14"/>',
  computer: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/>',
  geography: '<circle cx="12" cy="10" r="6"/><path d="M12 16v5"/><path d="m8 10 3 2 5-4"/>',
  civic: '<path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M10 21v-6h4v6"/>',
  language: '<path d="M4 5h7v14H4z"/><path d="M14 5h6v14h-6"/><path d="M6 9h3M6 13h3M16 9h2M16 13h2"/>',
  mind: '<path d="M15 20a5 5 0 0 0 5-5 5 5 0 0 0-4-4.9A6 6 0 0 0 5 11a4 4 0 0 0 0 8h2"/><path d="M15 20v-3"/>',
};

function subjectStyle(subject) {
  const s = String(subject || "");
  return SUBJECT_STYLES.find((x) => x.re.test(s)) || { rgb: "100, 116, 139", icon: "mind" };
}

function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.mind}</svg>`;
}


/* ─────────────────────────────────────────────────────────────
   State
   ───────────────────────────────────────────────────────────── */

const state = {
  uid: null,
  trackId: null,
  classNum: null,
  subject: null,
  conceptId: null,
  chapter: null,
  step: "board", // selection step while stage is "browse": board | class | subject | chapter
  search: "",
  stage: "browse", // browse (selection screens) | reading | quiz | review | done
  plan: null, // { pages, quiz, summary, keyTerms, formulas }
  page: 0,
  qIndex: 0,
  answers: [], // chosen option index per quiz question, null = unanswered
  results: [], // server-scored per-question outcomes
  review: null,
  correctCount: 0,
  total: 0,
  verified: false,
  sessionId: null,
  hubDoc: { last: null, topics: {} },
  emitted: new Set(),
  busy: false,
};

const $ = (id) => document.getElementById(id);
const toast = (m) => (window.__learningAlliedToast ? window.__learningAlliedToast(m) : console.log(m));

function track() {
  return HUB_TRACKS.find((t) => t.id === state.trackId) || HUB_TRACKS[0];
}

/* ─────────────────────────────────────────────────────────────
   Curriculum reads (existing engine, no new data)
   ───────────────────────────────────────────────────────────── */

function subjectsFor(trk, classNum) {
  return trk.grades ? getSubjectsForTrack(trk.curriculumTrack, classNum) : getSubjectsForTrack(trk.curriculumTrack);
}

function chaptersFor(trk, subject, classNum) {
  return trk.grades ? getChapters(trk.curriculumTrack, subject, classNum, trk.id) : getChapters(trk.curriculumTrack, subject, null, trk.id);
}

/** Flat chapter list for the whole track, used by search and counts. */
function allChapters(trk, classNum) {
  const out = [];
  for (const s of subjectsFor(trk, classNum)) {
    for (const c of chaptersFor(trk, s, classNum)) out.push({ ...c, subject: s });
  }
  return out;
}

function progressFor(conceptId) {
  return state.hubDoc.topics[conceptId] || null;
}

/* ─────────────────────────────────────────────────────────────
   Progress persistence — users/{uid}/learning/learningHub
   ───────────────────────────────────────────────────────────── */

async function persist(mutate) {
  const ref = doc(db, "users", state.uid, "learning", HUB_DOC_SEGMENT);
  let committed = null;
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists() ? snap.data() : {};
      const next = { ...current };
      mutate(next);
      next.updatedAt = serverTimestamp();
      tx.set(ref, next, { merge: true });
      committed = next; // a transaction body may run more than once; keep the last one
    });
    // Mirror the committed document back into memory so the rail, the progress
    // indicator and Resume-learning all read what was actually written.
    if (committed) state.hubDoc = { last: committed.last || null, topics: committed.topics || {} };
  } catch (e) {
    // Never lose the in-memory state — report honestly and keep the page usable.
    console.error("[learning-hub] progress save failed:", e);
    toast("Progress could not be saved. Your work on this page is safe — try again shortly.");
  }
}

function markTopic(conceptId, patch) {
  state.hubDoc.topics[conceptId] = { ...(state.hubDoc.topics[conceptId] || {}), ...patch, updatedAt: Date.now() };
  renderProgressIndicator();
}

/* ─────────────────────────────────────────────────────────────
   Analytics — existing event pipeline, existing event types only
   ───────────────────────────────────────────────────────────── */

/**
 * Deterministic id per (topic, persisted attempt count, stage).
 * `attempts` is committed to Firestore before any event is emitted, so replaying
 * the same request produces the same eventId and the server dedupes it, while a
 * genuine new attempt produces a new id.
 */
function eventIdFor(stage) {
  const attempts = progressFor(state.conceptId)?.attempts || 0;
  let h = 5381;
  const s = String(state.conceptId || "");
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return `lh_${h.toString(36)}_${attempts}_${stage}`.slice(0, 120);
}

async function record(stage, { type, payload = {}, questionId = null, correct } = {}) {
  const ch = state.chapter;
  const eventId = eventIdFor(stage);
  if (state.emitted.has(eventId)) return; // double-click / re-render guard

  const body = { stage, ...payload };
  if (correct !== undefined) body.correct = correct;

  state.emitted.add(eventId);
  try {
    await emitLearningEvent(db, state.uid, type || "question_answered", {
      eventId,
      conceptId: ch ? ch.conceptId : null,
      subject: ch ? ch.subject : null,
      topic: ch ? ch.name : null,
      source: "study_session", // allowed in both js/learning/schema.js and api/learning-event.js
      sessionId: state.sessionId,
      questionId,
      payload: body,
      // No `confidence`: mastery must never move on a self-reported score.
    });
  } catch (e) {
    state.emitted.delete(eventId);
    console.warn("[learning-hub] event not recorded:", e);
  }
}

/* ─────────────────────────────────────────────────────────────
   API helper
   ───────────────────────────────────────────────────────────── */

/**
 * One place where the authenticated request is built, so a network failure can
 * never surface as a raw "Failed to fetch" in the UI.
 *
 * Endpoint resolution — this is what makes the page work in all three places:
 *
 *   production        api-base.js leaves the path same-origin, so step 1 hits the
 *                     live function. Nothing extra happens.
 *   `vercel dev`      the function IS served on the same origin, so step 1 reaches
 *                     it directly. Asking the production host first would 404 and
 *                     get blocked by CORS, which the browser reports as
 *                     "Failed to fetch" — that was the bug.
 *   static file server (Live Server, no functions)   step 1 cannot connect, so we
 *                     fall back to the deployed origin via apiUrl(), which is what
 *                     api-base.js is for.
 */
/**
 * Say what is actually wrong when the endpoint cannot be reached, instead of
 * implying the student simply has a bad connection.
 */
function unreachableHelp() {
  return isLocalHost()
    ? "This chapter needs the AI service, which is not running on this device. Start it with `vercel dev` and reload, or open the deployed site."
    : "The AI service could not be reached. Check your connection and try again in a moment.";
}

function isLocalHost() {
  try {
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname);
  } catch {
    return false;
  }
}

async function callApi(body) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in. Please sign in and try again.");
  const token = await user.getIdToken();

  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    credentials: "same-origin",
    body: JSON.stringify(body),
  };

  const targets = [...new Set([`/${ENDPOINT.replace(/^\//, "")}`, apiUrl(ENDPOINT)])];

  let unreachableDetail = null;
  let answered = null;

  for (const url of targets) {
    try {
      const res = await fetch(url, init);
      let data = {};
      try {
        data = await res.json();
      } catch {
        /* a non-JSON body (proxy/CDN error page) — handled by the status branch */
      }
      if (res.ok) return data;

      // A real response — 400/401/429/500 — is the server's own answer. Surface it
      // verbatim and never retry it against a different host.
      const err = new Error(data.error || `Request failed (${res.status}). Please try again.`);
      err.status = res.status;
      answered = err;
      // 503 is transient ("try again later") — retry once against the same host
      // before giving up, so a momentary provider hiccup self-heals.
      if (res.status === 503) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const res2 = await fetch(url, init);
          let data2 = {};
          try { data2 = await res2.json(); } catch {}
          if (res2.ok) return data2;
          const err2 = new Error(data2.error || `Request failed (${res2.status}). Please try again.`);
          err2.status = res2.status;
          answered = err2;
        } catch (e) {
          unreachableDetail = e && e.message ? e.message : String(e);
        }
      }
      break;
    } catch (e) {
      unreachableDetail = e && e.message ? e.message : String(e);
    }
  }

  if (answered) throw answered;

  console.error("[learning-hub] endpoint unreachable:", unreachableDetail, "| tried:", targets.join(", "));
  const err = new Error(unreachableHelp());
  err.unreachable = true;
  throw err;
}

/* ─────────────────────────────────────────────────────────────
   Step 0 — which board?
   ───────────────────────────────────────────────────────────── */









/* ─────────────────────────────────────────────────────────────
   Browser rail
   ───────────────────────────────────────────────────────────── */



















/**
 * Locate a chapter anywhere in the hub. `preferTrackId` is a HUB track id; it is
 * searched first because JEE Main and JEE Advanced share one curriculum track,
 * so without it a JEE Advanced learner would always resolve to JEE Main.
 */
function findChapter(conceptId, preferTrackId) {
  const order = [...HUB_TRACKS].sort((a, b) => (b.id === preferTrackId) - (a.id === preferTrackId));
  for (const t of order) {
    const classes = t.grades ? [9, 10, 11, 12] : [null];
    for (const c of classes) {
      for (const s of subjectsFor(t, c)) {
        for (const ch of chaptersFor(t, s, c)) {
          if (ch.conceptId === conceptId) return { ...ch, subject: s, classNum: c, trackId: t.curriculumTrack, hubTrackId: t.id };
        }
      }
    }
  }
  return null;
}



/* ─────────────────────────────────────────────────────────────
   Stage + progress indicator
   ───────────────────────────────────────────────────────────── */



/* ─────────────────────────────────────────────────────────────
   Selection flow — one decision per screen:
   Board → Class (school boards only) → Subject → Chapter → lesson
   ───────────────────────────────────────────────────────────── */

const PICK_TITLES = {
  board: ["Choose your board or exam", "Short lessons on your syllabus, questions as you go, and an explanation built around what you missed."],
  class: ["Choose your class", "We’ll show the chapters for that class."],
  subject: ["Choose a subject", ""],
  chapter: ["Choose a chapter", ""],
};

function stepsFor(trk) {
  return trk && !trk.grades ? ["board", "subject", "chapter"] : ["board", "class", "subject", "chapter"];
}

function goStep(step) {
  state.step = step;
  state.search = "";
  renderPick();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function renderPick() {
  const t = state.trackId ? track() : null;
  const steps = stepsFor(t);
  const idx = Math.max(0, steps.indexOf(state.step));
  const cl = t && t.grades ? state.classNum : null;

  // Completed choices, each one a way back to that step.
  const crumbs = [];
  if (t && idx > 0) crumbs.push(["board", t.short]);
  if (t && t.grades && state.step !== "board" && state.step !== "class") crumbs.push(["class", `Class ${state.classNum}`]);
  if (state.step === "chapter" && state.subject) crumbs.push(["subject", state.subject]);
  $("lhPickCrumbs").innerHTML = crumbs.length
    ? crumbs.map(([st, label]) => `<button class="lh-pick-crumb" type="button" data-goto="${st}">${escapeHtml(label)}</button>`).join('<span class="lh-pick-sep" aria-hidden="true">›</span>')
    : "";
  $("lhPickCrumbs").hidden = !crumbs.length;
  $("lhPickBack").hidden = idx === 0;

  let [title, sub] = PICK_TITLES[state.step];
  if (state.step === "subject") sub = `${t.label}${cl ? ` · Class ${cl}` : ""}`;
  if (state.step === "chapter") sub = `${t.label}${cl ? ` · Class ${cl}` : ""} · ${state.subject}`;
  $("lhPickEyebrow").textContent = `Step ${idx + 1} of ${steps.length}`;
  $("lhPickTitle").textContent = title;
  $("lhPickSub").textContent = sub;
  $("lhPickSub").hidden = !sub;

  const body = $("lhPickBody");
  if (state.step === "board") {
    body.innerHTML = `<div class="lh-board-grid">${HUB_TRACKS.map((x) => {
      const n = x.grades ? [9, 10, 11, 12].reduce((a, c) => a + allChapters(x, c).length, 0) : allChapters(x, null).length;
      return `<button class="lh-board${x.id === state.trackId ? " active" : ""}" type="button" data-board="${escapeHtml(x.id)}" style="--tile-rgb:${x.dotRgb}">
        <span class="lh-board-icon">${iconSvg(x.icon)}</span>
        <span class="lh-board-text"><span class="lh-board-label">${escapeHtml(x.label)}</span><span class="lh-board-sub">${escapeHtml(x.sub)}</span></span>
        <span class="lh-board-count">${n ? `${n} chapters` : "No chapters yet"}</span>
      </button>`;
    }).join("")}</div>`;
  } else if (state.step === "class") {
    body.innerHTML = `<div class="lh-class-grid">${[9, 10, 11, 12].map((c) => {
      const n = allChapters(t, c).length;
      return `<button class="lh-class${c === state.classNum ? " active" : ""}" type="button" data-pclass="${c}" ${n ? "" : "disabled"}>
        <span class="lh-class-num">${c}</span><span class="lh-class-n">${n ? `${n} chapters` : "Not available yet"}</span></button>`;
    }).join("")}</div>`;
  } else if (state.step === "subject") {
    const subs = subjectsFor(t, cl);
    body.innerHTML = noticeHtml(t) + (subs.length
      ? `<div class="lh-subjects">${subs.map((s) => {
          const st = subjectStyle(s);
          const ch = chaptersFor(t, s, cl);
          const done = ch.filter((c) => progressFor(c.conceptId)?.verified).length;
          return `<button class="lh-sub${s === state.subject ? " active" : ""}" type="button" data-subject="${escapeHtml(s)}" style="--tile-rgb:${st.rgb}">
            <span class="lh-sub-ico">${iconSvg(st.icon)}</span>
            <span class="lh-sub-name">${escapeHtml(s)}</span>
            <span class="lh-sub-count">${ch.length} chapters${done ? ` · ${done} passed` : ""}</span>
          </button>`;
        }).join("")}</div>`
      : `<div class="lh-empty">No subjects for this selection in our curriculum dataset yet.</div>`);
  } else {
    body.innerHTML = noticeHtml(t) + continueHtml() + `
      <div class="lh-search-wrap">
        <svg class="lh-search-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="lhSearch" class="lh-search" type="search" autocomplete="off" placeholder="Search all ${escapeHtml(t.short)}${cl ? ` Class ${cl}` : ""} chapters" aria-label="Search chapters" />
        <kbd class="lh-kbd" aria-hidden="true">/</kbd>
        <button id="lhSearchClear" class="lh-search-clear" type="button" data-clear="1" aria-label="Clear search" hidden>&times;</button>
      </div>
      <div class="lh-list-head"><span id="lhTopicHead"></span><span id="lhTopicCount" class="lh-group-count"></span></div>
      <div id="lhTopics" class="lh-chapters" role="group" aria-label="Chapters"></div>`;
    renderChapterList();
  }
}

function noticeHtml(t) {
  return t && t.notice ? `<div class="lh-notice">${t.notice}</div>` : "";
}

/** "Continue" banner from real saved progress. */
function continueHtml() {
  const last = state.hubDoc.last;
  const found = last && last.conceptId ? findChapter(last.conceptId, last.trackId) : null;
  if (!found) return "";
  const p = progressFor(found.conceptId);
  const t = HUB_TRACKS.find((x) => x.id === found.hubTrackId) || track();
  const ctx = [t.short, t.grades ? `Class ${found.classNum}` : null, found.subject].filter(Boolean).join(" · ");
  return `<button class="lh-continue" type="button" data-open="${escapeHtml(found.conceptId)}">
    <span class="lh-continue-body"><span class="lh-continue-k">${p && p.verified ? "Last studied" : "Continue where you left off"}</span>
    <span class="lh-continue-name">${escapeHtml(found.name)}</span><span class="lh-continue-meta">${escapeHtml(ctx)}</span></span>
    <span class="lh-continue-cta">${p && p.verified ? "Review" : "Continue"}${uiIcon("arrow", 15)}</span></button>`;
}

function renderChapterList() {
  const t = track();
  const cl = t.grades ? state.classNum : null;
  const el = $("lhTopics");
  if (!el) return;
  const q = state.search.trim().toLowerCase();
  if (q) {
    // searchChapters matches on `name`, so subject is prefixed for matching only;
    // the real name stays in `_name` for display.
    const flat = allChapters(t, cl).map((c) => ({ ...c, _name: c.name, name: `${c.subject} · ${c.name}` }));
    const hits = searchChapters(flat, q);
    $("lhTopicHead").textContent = "Search results";
    $("lhTopicCount").textContent = `${hits.length}`;
    el.innerHTML = hits.length
      ? hits.map((c) => topicRow(c, null, true)).join("")
      : `<div class="lh-empty"><b>No chapters match “${escapeHtml(state.search.trim())}”.</b><br />Try a shorter word or a subject name.</div>`;
    return;
  }
  const chapters = chaptersFor(t, state.subject, cl);
  const done = chapters.filter((c) => progressFor(c.conceptId)?.verified).length;
  $("lhTopicHead").textContent = "Chapters";
  $("lhTopicCount").textContent = done ? `${done} of ${chapters.length} passed` : `${chapters.length}`;
  el.innerHTML = chapters.length
    ? chapters.map((c, i) => topicRow({ ...c, subject: state.subject }, i + 1, false)).join("")
    : `<div class="lh-empty">No chapters for ${escapeHtml(state.subject)}${cl ? ` in Class ${cl}` : ""} in our curriculum dataset yet. We only list chapters that exist in the data.</div>`;
}

function topicRow(c, index, showSubject) {
  const p = progressFor(c.conceptId);
  const label = c._name || c.name;
  let stateHtml = "";
  if (p && p.verified) stateHtml = `<span class="lh-ch-state done" title="Passed">${uiIcon("check", 13)}</span>`;
  else if (p && p.status && p.status !== "idle") stateHtml = `<span class="lh-ch-state partial" title="In progress">${uiIcon("dot", 13)}</span>`;
  const bits = [];
  if (showSubject && c.subject) bits.push(c.subject);
  if (p && p.attempts) {
    if (p.correctCount != null) bits.push(`${p.correctCount}/${p.total}`);
    bits.push(p.attempts === 1 ? "1 attempt" : `${p.attempts} attempts`);
  } else if (c.difficultyLabel) {
    bits.push(c.difficultyLabel);
  }
  return `<button class="lh-ch" type="button" data-concept="${escapeHtml(c.conceptId)}">
    ${index ? `<span class="lh-ch-num">${index}</span>` : ""}
    <span class="lh-ch-body"><span class="lh-ch-name">${escapeHtml(label)}</span><span class="lh-ch-meta">${escapeHtml(bits.join(" · "))}</span></span>
    ${stateHtml}
    <span class="lh-ch-go" aria-hidden="true">${uiIcon("arrow", 15)}</span>
  </button>`;
}

function setStage(stage) {
  const changed = state.stage !== stage;
  state.stage = stage;
  $("lhPick").hidden = stage !== "browse";
  $("lhApp").hidden = stage === "browse";
  $("lhApp").dataset.stage = stage;
  $("lhReader").hidden = stage !== "reading";
  $("lhQuiz").hidden = stage !== "quiz";
  $("lhReview").hidden = stage !== "review" && stage !== "done";
  $("lhProgress").hidden = stage === "browse";
  renderProgressIndicator();
  if (changed) window.scrollTo({ top: 0, behavior: "auto" });
}

function backToBrowse() {
  state.chapter = null;
  state.conceptId = null;
  state.plan = null;
  state.review = null;
  state.step = "chapter";
  state.search = "";
  setStage("browse");
  renderPick();
}

/** Jump straight to a chapter (Continue banner), restoring its board/class/subject. */
function jumpTo(found) {
  const t = HUB_TRACKS.find((x) => x.id === found.hubTrackId) || track();
  state.trackId = t.id;
  state.classNum = t.grades ? found.classNum : null;
  state.subject = found.subject;
  state.step = "chapter";
  openChapter(found);
}

function onPickClick(e) {
  const b = e.target.closest("[data-goto],[data-board],[data-pclass],[data-subject],[data-concept],[data-open],[data-clear]");
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.goto) {
    goStep(d.goto);
  } else if (d.board) {
    const t = HUB_TRACKS.find((x) => x.id === d.board);
    if (!t) return;
    if (state.trackId !== t.id) state.subject = null;
    state.trackId = t.id;
    if (!t.grades) state.classNum = null;
    else if (!state.classNum || !allChapters(t, state.classNum).length) state.classNum = [9, 10, 11, 12].find((c) => allChapters(t, c).length) || null;
    goStep(t.grades ? "class" : "subject");
  } else if (d.pclass) {
    const c = Number(d.pclass);
    if (c !== state.classNum) state.subject = null;
    state.classNum = c;
    goStep("subject");
  } else if (d.subject) {
    state.subject = d.subject;
    goStep("chapter");
  } else if (d.concept) {
    const t = track();
    const cl = t.grades ? state.classNum : null;
    let found = null;
    for (const s of subjectsFor(t, cl)) {
      const c = chaptersFor(t, s, cl).find((x) => x.conceptId === d.concept);
      if (c) { found = { ...c, subject: s }; break; }
    }
    if (!found) { toast("That chapter is not available in this selection."); return; }
    state.subject = found.subject; // opening from search keeps the learner's place
    openChapter(found);
  } else if (d.open) {
    const found = findChapter(d.open, state.trackId);
    if (!found) { toast("That chapter is no longer in this curriculum version."); return; }
    jumpTo(found);
  } else if (d.clear) {
    const inp = $("lhSearch");
    if (inp) { inp.value = ""; inp.focus(); }
    state.search = "";
    $("lhSearchClear").hidden = true;
    renderChapterList();
  }
}

function onPickInput(e) {
  if (e.target.id !== "lhSearch") return;
  state.search = e.target.value;
  $("lhSearchClear").hidden = !e.target.value;
  renderChapterList();
}

function crumb() {
  const t = track();
  const parts = [t.short];
  if (t.grades) parts.push(`Class ${state.classNum}`);
  if (state.subject) parts.push(state.subject);
  return parts.join(" › ");
}

function renderProgressIndicator() {
  if (state.stage === "browse") return;
  $("lhProgressCrumb").textContent = crumb();
  const stepIdx = { reading: 0, quiz: 1, review: 2, done: 2 }[state.stage] ?? 0;
  document.querySelectorAll("#lhSteps [data-step]").forEach((n) => {
    const i = Number(n.dataset.step);
    n.classList.toggle("active", i === stepIdx);
    n.classList.toggle("done", i < stepIdx);
    if (i === stepIdx) n.setAttribute("aria-current", "step");
    else n.removeAttribute("aria-current");
  });

  const t = track();
  const chapters = state.chapter ? [] : chaptersFor(t, state.subject, t.grades ? state.classNum : null);
  const total = state.chapter ? 1 : chapters.length;
  const done = state.chapter
    ? progressFor(state.chapter.conceptId)?.verified ? 1 : 0
    : chapters.filter((c) => progressFor(c.conceptId)?.verified).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  $("lhProgressTitle").textContent = state.chapter ? state.chapter.name : state.subject || track().label;

  const pill = $("lhProgressPill");
  if (state.chapter) {
    const p = progressFor(state.chapter.conceptId);
    if (p && p.verified) {
      pill.textContent = `${p.correctCount}/${p.total} · passed`;
      pill.className = "lh-pill lh-pill--ok";
    } else if (p && p.correctCount != null) {
      pill.textContent = `${p.correctCount}/${p.total} · ${p.status === "needs_revision" ? "needs revision" : "partly understood"}`;
      pill.className = `lh-pill ${p.status === "needs_revision" ? "lh-pill--bad" : "lh-pill--warn"}`;
    } else {
      pill.textContent = "In progress";
      pill.className = "lh-pill";
    }
  } else {
    pill.textContent = `${done} of ${total} passed`;
    pill.className = "lh-pill lh-pill--accent";
  }

  const fill = $("lhBarFill");
  fill.style.width = `${state.chapter ? (progressFor(state.chapter.conceptId)?.verified ? 100 : stagePct()) : pct}%`;
  fill.classList.toggle("done", Boolean(state.chapter && progressFor(state.chapter.conceptId)?.verified));
}

/** Progress through the current chapter, for the bar while it is in flight. */
function stagePct() {
  const p = state.plan;
  if (!p || !p.pages || !p.pages.length) return 0;
  if (state.stage === "reading") return Math.round(((state.page + 1) / (p.pages.length + 1)) * 100);
  if (state.stage === "quiz") return Math.round((p.pages.length / (p.pages.length + 1)) * 100);
  if (state.stage === "review" || state.stage === "done") {
    const t = progressFor(state.conceptId);
    return t && t.verified ? 100 : 92;
  }
  return 0;
}

/* ─────────────────────────────────────────────────────────────
   Step 1 — READ, paged
   ───────────────────────────────────────────────────────────── */

function topicPayload() {
  const t = track();
  const ch = state.chapter;
  return {
    conceptId: ch.conceptId,
    track: t.id,
    classNum: t.grades ? state.classNum : null,
    subject: ch.subject,
    name: ch.name,
    topic: ch.topic,
    description: ch.description,
    difficultyLabel: ch.difficultyLabel,
    prerequisites: ch.prerequisites,
    scopeNote: `${t.label}${t.grades ? ` Class ${state.classNum}` : ""} — ${ch.subject}`,
  };
}

async function loadPlan() {
  if (state.busy) return;
  setBusy(true);
  $("lhPlanError").hidden = true;
  $("lhPlanLoading").hidden = false;
  $("lhPlanLoadingMsg").textContent = "Preparing this chapter…";
  $("lhPageWrap").hidden = true;

  try {
    const data = await callApi({ action: "plan", ...topicPayload() });
    if (!data || !data.plan || !Array.isArray(data.plan.pages) || !data.plan.pages.length || !Array.isArray(data.plan.quiz) || !data.plan.quiz.length) {
      throw new Error("This chapter's lesson came back incomplete. Please retry.");
    }
    state.plan = data.plan;
    state.page = -1; // open on the intro card, like their lesson opener
    renderPlan();
    setStage("reading");

    markTopic(state.chapter.conceptId, { status: "reading", name: state.chapter.name });
    await persist((d) => {
      d.last = { conceptId: state.chapter.conceptId, trackId: state.trackId, classNum: state.classNum, subject: state.subject, name: state.chapter.name, at: Date.now() };
    });
    await record("chapter_opened", { type: "lesson_started" });
  } catch (e) {
    console.error("[learning-hub] plan failed:", e);
    $("lhPlanLoading").hidden = true;
    $("lhPlanError").hidden = false;
    $("lhPlanErrorMsg").textContent = e.message || "This chapter could not be prepared.";
    setStage("reading");
  } finally {
    setBusy(false);
  }
}

function renderPlan() {
  const p = state.plan;
  if (!p || !p.pages || !p.pages.length) return; // never render against a half-built plan
  const isIntro = state.page < 0;

  $("lhIntro").hidden = !isIntro;
  $("lhPage").hidden = isIntro;

  if (isIntro) {
    const t = track();
    $("lhIntroEyebrow").textContent = [state.subject, t.grades ? `Class ${state.classNum}` : t.short].filter(Boolean).join(" · ");
    $("lhIntroTitle").textContent = state.chapter.name;
    $("lhIntroMeta").textContent =
      `About ${Math.max(2, Math.round((p.pages.length * p.pages.reduce((n, pg) => n + pg.lines.length, 0)) / 190))} min · ` +
      `${p.pages.length} sections · ${p.quiz.length} questions at the end`;
    // "What you'll learn" is built from the real section titles, so it can never
    // promise something the lesson does not actually cover.
    $("lhLearnList").innerHTML = p.pages.map((pg) => `<li>${escapeHtml(pg.title)}</li>`).join("");
    $("lhLearn").hidden = !p.pages.length;
  } else {
    const page = p.pages[Math.min(state.page, p.pages.length - 1)];
    $("lhPageTitle").textContent = page.title;
    $("lhPageCount").textContent = `Section ${state.page + 1} of ${p.pages.length}`;
    $("lhPageLines").innerHTML = page.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("");

    // Reference material, shown once on the last page so reading stays one idea
    // at a time.
    const extra = [];
    const last = state.page === p.pages.length - 1;
    if (last && p.keyTerms && p.keyTerms.length) {
      extra.push(`<h3>Terms to remember</h3><div class="lh-chip-row">${p.keyTerms.map((x) => `<span class="lh-chip">${escapeHtml(x)}</span>`).join("")}</div>`);
    }
    if (last && p.formulas && p.formulas.length) {
      extra.push(`<h3>Formulas &amp; definitions</h3>${p.formulas.map((f) => `<div class="lh-formula">${escapeHtml(f)}</div>`).join("")}`);
    }
    if (last && p.summary) {
      extra.push(`<h3>In short</h3><p>${escapeHtml(p.summary)}</p>`);
    }
    $("lhPageExtra").innerHTML = extra.join("");
  }

  const lastPage = state.page === p.pages.length - 1;
  $("lhNext").textContent = isIntro ? "Start reading" : lastPage ? "Take the questions" : "Next section";
  $("lhPrev").textContent = state.page === 0 ? "Overview" : "Back";
  $("lhPrev").hidden = isIntro;
  if (!isIntro) $("lhPageWrap").scrollIntoView({ block: "nearest" });
  $("lhDots").hidden = isIntro;
  $("lhDots").innerHTML = p.pages
    .map((pg, i) => `<button type="button" class="lh-dot${i === state.page ? " active" : ""}${i < state.page ? " done" : ""}" data-gopage="${i}" aria-label="Section ${i + 1}: ${escapeHtml(pg.title)}"${i === state.page ? ' aria-current="step"' : ""}></button>`)
    .join("");
  $("lhPlanLoading").hidden = true;
  $("lhPageWrap").hidden = false;
}

function onNextPage() {
  const p = state.plan;
  if (!p) return;
  if (state.page < p.pages.length - 1) {
    state.page += 1;
    renderPlan();
    return;
  }
  // Finished reading -> the quiz.
  setStage("quiz");
  startQuiz();
}

/* ─────────────────────────────────────────────────────────────
   Step 2 — QUIZ
   ───────────────────────────────────────────────────────────── */

function startQuiz() {
  const quiz = state.plan.quiz;
  $("lhQuizEyebrow").textContent = [state.subject, state.chapter.name].filter(Boolean).join(" · ");
  state.qIndex = 0;
  state.answers = quiz.map(() => null);
  $("lhQuizMeta").textContent = `${quiz.length} questions · choose one answer each · you can change answers before you submit`;
  renderQuestion();
  record("reading_finished", { type: "lesson_completed" });
}

function renderQuestion() {
  const quiz = state.plan.quiz;
  const q = quiz[state.qIndex];
  const chosen = state.answers[state.qIndex];

  $("lhQuizOf").textContent = `Question ${state.qIndex + 1} of ${quiz.length}`;
  const answered = state.answers.filter((a) => a !== null).length;
  $("lhQuizScoreLive").textContent = answered ? `${answered}/${quiz.length} answered` : "";
  $("lhQuizQ").textContent = q.question;

  $("lhQuizOptions").innerHTML = q.options
    .map(
      (o, i) => `<button class="lh-option${chosen === i ? " selected" : ""}" type="button" role="radio" tabindex="${chosen === i || (chosen === null && i === 0) ? 0 : -1}"
        aria-checked="${chosen === i}" data-option="${i}">
        <span class="lh-option-key">${String.fromCharCode(65 + i)}</span>
        <span class="lh-option-text">${escapeHtml(o)}</span>
      </button>`
    )
    .join("");

  $("lhQuizPrev").disabled = state.qIndex === 0;
  $("lhQuizNext").textContent = state.qIndex === quiz.length - 1 ? "Submit for review" : "Next question";
  $("lhQuizDots").innerHTML = quiz
    .map((_, i) => `<button type="button" class="lh-qdot${i === state.qIndex ? " active" : ""}${state.answers[i] !== null ? " answered" : ""}" data-goq="${i}" aria-label="Question ${i + 1}${state.answers[i] !== null ? ", answered" : ""}"></button>`)
    .join("");
}

async function submitQuiz() {
  if (state.busy) return;
  const quiz = state.plan.quiz;
  const unanswered = state.answers.filter((a) => a === null).length;
  if (unanswered > 0) {
    toast(`${unanswered} question${unanswered === 1 ? "" : "s"} still unanswered. Go back and choose an option.`);
    return;
  }

  setBusy(true);
  $("lhQuizError").hidden = true;
  setStage("review");
  $("lhReviewLoading").hidden = false;
  $("lhReviewBody").hidden = true;
  $("lhScoreCard").hidden = true;
  $("lhReviewDone").hidden = true;
  $("lhReviewTitle").textContent = "Marking your answers";
  $("lhReviewEyebrow").textContent = [state.subject, state.chapter && state.chapter.name].filter(Boolean).join(" · ");

  try {
    const data = await callApi({ action: "review", ...topicPayload(), answers: state.answers });
    state.review = data.review;
    state.correctCount = data.correctCount;
    state.total = data.total;
    // Per-question outcomes scored on the server from the real cached plan.
    state.results = Array.isArray(data.results) ? data.results : [];
    // Verified comes from the server's own scoring of the real answers, never a click.
    state.verified = Boolean(data.verified);

    renderReview();
    await afterReview();
  } catch (e) {
    console.error("[learning-hub] review failed:", e);
    $("lhReviewLoading").hidden = true;
    $("lhReviewError").hidden = false;
    $("lhReviewErrorMsg").textContent = e.message || "The review could not be completed.";
    setStage("quiz");
  } finally {
    setBusy(false);
  }
}

async function afterReview() {
  const r = state.review;
  const attempts = (progressFor(state.chapter.conceptId)?.attempts || 0) + 1;

  markTopic(state.chapter.conceptId, { status: r.understanding_status, attempts, correctCount: state.correctCount, total: state.total });
  await persist((d) => {
    const key = state.chapter.conceptId;
    const prev = (d.topics && d.topics[key]) || {};
    d.topics = {
      ...(d.topics || {}),
      [key]: { ...prev, status: r.understanding_status, attempts, correctCount: state.correctCount, total: state.total, verified: Boolean(state.verified), updatedAt: Date.now() },
    };
    d.last = { conceptId: key, trackId: state.trackId, classNum: state.classNum, subject: state.subject, name: state.chapter.name, at: Date.now() };
  });

  // One graded event per quiz question — this is what actually moves mastery.
  // `correct` comes from the server's own scoring, so a tampered client cannot
  // claim an answer it did not actually give.
  for (let i = 0; i < state.total; i++) {
    const res = state.results[i] || { correct: false };
    await record(`quiz_q${i + 1}`, {
      type: "question_answered",
      questionId: `q${i + 1}`,
      payload: { stage: "quiz_answered", index: i + 1, status: r.understanding_status },
      correct: Boolean(res.correct),
    });
  }

  await record("quiz_completed", { type: "quiz_completed", payload: { correctCount: state.correctCount, total: state.total, verified: Boolean(state.verified) } });
  await record("review_shown", { type: "question_answered", payload: { status: r.understanding_status, correctCount: state.correctCount, total: state.total } });
  if (r.weak_concepts && r.weak_concepts.length) {
    await record("weak_concepts", { type: "misconception_detected", payload: { count: r.weak_concepts.length } });
  }
  await record("topic_reviewed", { type: "topic_reviewed", payload: { verified: Boolean(state.verified), correctCount: state.correctCount, total: state.total } });
  await record("session_completed", { type: "study_session_completed", payload: { verified: Boolean(state.verified), correctCount: state.correctCount, total: state.total } });

  setStage("done");
  renderProgressIndicator();
}

/* ─────────────────────────────────────────────────────────────
   Step 3 — REVIEW rendering
   ───────────────────────────────────────────────────────────── */

function renderReview() {
  const r = state.review;
  const meta = STATUS_META[r.understanding_status] || STATUS_META.partially_understood;

  // Marked-score card, in the spirit of their marked answer.
  const badge = $("lhStatusBadge");
  badge.textContent = meta.label;
  badge.className = `lh-pill ${meta.pill}`;
  $("lhScoreValue").textContent = `${state.correctCount} / ${state.total}`;
  $("lhScoreLabel").textContent = state.verified
    ? "Every question correct — this chapter is yours."
    : `Correct on ${state.correctCount} of ${state.total}.`;
  $("lhScoreIcon").className = `lh-score-icon${meta.icon ? " " + meta.icon : ""}`;
  $("lhScoreCard").hidden = false;
  $("lhReviewEyebrow").textContent = `${track().short} · ${state.subject || ""}`.trim();
  $("lhReviewTitle").textContent = "Your review";

  const parts = [];

  const wrong = r.what_went_wrong || [];
  if (wrong.length) {
    parts.push(`<h3>What you got wrong</h3>`);
    parts.push(
      wrong
        .map(
          (w) => `<div class="lh-wrong">
            <p class="lh-wrong-q">${escapeHtml(w.question)}</p>
            <p class="lh-wrong-a"><b>Correct answer:</b> ${escapeHtml(w.correct)}</p>
            ${w.why ? `<p class="lh-wrong-why">${escapeHtml(w.why)}</p>` : ""}
          </div>`
        )
        .join("")
    );
  }

  if (r.weak_concepts && r.weak_concepts.length) {
    parts.push(`<h3>Concepts to revise</h3><div class="lh-chip-row">${r.weak_concepts.map((x) => `<span class="lh-chip">${escapeHtml(x)}</span>`).join("")}</div>`);
  }
  if (r.verdict) parts.push(`<h3>Where you stand</h3><p>${escapeHtml(r.verdict)}</p>`);
  if (r.final_explanation) {
    parts.push(`<div class="lh-final"><h3>Your final explanation</h3><p>${escapeHtml(r.final_explanation)}</p></div>`);
  }
  if (r.focus_next) parts.push(`<div class="lh-alert" style="border-color:var(--border-strong);background:var(--bg-input)"><p style="margin:0"><b>Next:</b> ${escapeHtml(r.focus_next)}</p></div>`);

  $("lhReviewBody").innerHTML = parts.join("");
  $("lhReviewBody").hidden = false;
  $("lhReviewLoading").hidden = true;
  $("lhReviewError").hidden = true;

  $("lhReviewDone").hidden = false;
  {
    const t = track();
    const list = chaptersFor(t, state.subject, t.grades ? state.classNum : null);
    const idx = list.findIndex((c) => c.conceptId === state.chapter.conceptId);
    const nx = list[idx + 1];
    $("lhNextChapter").hidden = !nx;
    $("lhNextChapter").textContent = nx ? `Next: ${nx.name}` : "Next chapter";
  }
  $("lhReviewDoneMsg").textContent = state.verified
    ? `Passed. “${state.chapter.name}” is recorded as understood and feeds your existing mastery and revision schedule.`
    : `Recorded at ${state.correctCount}/${state.total}. This chapter is not marked as understood yet — re-take the questions or come back after revising the points above.`;
}

/* ─────────────────────────────────────────────────────────────
   Navigation between chapters
   ───────────────────────────────────────────────────────────── */

function openChapter(chapter) {
  state.chapter = { ...chapter };
  state.conceptId = chapter.conceptId;
  state.plan = null;
  state.page = -1;
  state.qIndex = 0;
  state.answers = [];
  state.review = null;
  state.verified = false;
  state.sessionId = `lh_${Date.now().toString(36)}`;
  setStage("reading");
  renderProgressIndicator();
  loadPlan();
}

function nextChapter() {
  const t = track();
  const chapters = chaptersFor(t, state.subject, t.grades ? state.classNum : null);
  const idx = chapters.findIndex((c) => c.conceptId === (state.chapter && state.chapter.conceptId));
  const nextCh = chapters[idx + 1];
  if (!nextCh) {
    toast("That was the last chapter in this subject.");
    backToBrowse();
    return;
  }
  openChapter(nextCh);
}



/* ─────────────────────────────────────────────────────────────
   Loading / busy
   ───────────────────────────────────────────────────────────── */

function setBusy(busy) {
  state.busy = busy;
  ["lhNext", "lhPrev", "lhQuizNext", "lhQuizPrev", "lhPlanRetry", "lhReviewRetry", "lhQuizRetry", "lhRedoQuiz", "lhNextChapter", "lhBackToBrowse"].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = busy;
  });
  if (!busy && state.stage === "reading") renderPlan();
  if (!busy && state.stage === "quiz") $("lhQuizPrev").disabled = state.qIndex === 0;
}

/* ─────────────────────────────────────────────────────────────
   Wiring
   ───────────────────────────────────────────────────────────── */

let wired = false;

function wire() {
  if (wired) return; // onAuthStateChanged can fire more than once
  wired = true;

  $("lhPick").addEventListener("click", onPickClick);
  $("lhPick").addEventListener("input", onPickInput);
  $("lhPickBack").addEventListener("click", () => {
    const steps = stepsFor(state.trackId ? track() : null);
    const i = steps.indexOf(state.step);
    if (i > 0) goStep(steps[i - 1]);
  });
  $("lhBackToExplorer").addEventListener("click", backToBrowse);

  $("lhPrev").addEventListener("click", () => {
    if (state.page >= 0) {
      state.page -= 1;
      renderPlan();
    }
  });
  $("lhDots").addEventListener("click", (e) => {
    const b = e.target.closest("[data-gopage]");
    if (!b) return;
    state.page = Number(b.dataset.gopage);
    renderPlan();
  });
  $("lhNext").addEventListener("click", onNextPage);
  $("lhPlanRetry").addEventListener("click", () => loadPlan());

  $("lhQuizOptions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-option]");
    if (!btn) return;
    state.answers[state.qIndex] = Number(btn.dataset.option);
    renderQuestion();
    const sel = $("lhQuizOptions").querySelector(".selected");
    if (sel) sel.focus({ preventScroll: true });
  });
  $("lhQuizDots").addEventListener("click", (e) => {
    const b = e.target.closest("[data-goq]");
    if (!b) return;
    state.qIndex = Number(b.dataset.goq);
    renderQuestion();
  });
  $("lhQuizOptions").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const opts = [...$("lhQuizOptions").querySelectorAll("[data-option]")];
    const i = opts.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    opts[(i + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length].focus();
  });
  $("lhQuizPrev").addEventListener("click", () => {
    if (state.qIndex > 0) {
      state.qIndex -= 1;
      renderQuestion();
    }
  });
  $("lhQuizNext").addEventListener("click", () => {
    if (state.qIndex < state.plan.quiz.length - 1) {
      state.qIndex += 1;
      renderQuestion();
    } else {
      submitQuiz();
    }
  });
  $("lhQuizRetry").addEventListener("click", () => submitQuiz());
  $("lhReviewRetry").addEventListener("click", () => submitQuiz());

  $("lhRedoQuiz").addEventListener("click", () => {
    startQuiz();
    setStage("quiz");
  });
  $("lhNextChapter").addEventListener("click", nextChapter);

  // Keyboard: "/" focuses search; arrows move between reading sections and
  // questions; A-D (or 1-4) pick an answer. Ignored while typing in a field.
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable);
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const searchEl = $("lhSearch");
    if (e.key === "/" && !typing && state.stage === "browse" && searchEl) {
      e.preventDefault();
      searchEl.focus();
      return;
    }
    if (e.key === "Escape" && searchEl && document.activeElement === searchEl) {
      if (searchEl.value) $("lhSearchClear").click();
      else searchEl.blur();
      return;
    }
    if (typing || state.busy) return;
    if (state.stage === "reading" && state.plan && !$("lhPageWrap").hidden) {
      if (e.key === "ArrowRight") $("lhNext").click();
      else if (e.key === "ArrowLeft" && !$("lhPrev").hidden) $("lhPrev").click();
    } else if (state.stage === "quiz" && state.plan) {
      const q = state.plan.quiz[state.qIndex];
      const k = e.key.toLowerCase();
      const idx = "abcd".indexOf(k) >= 0 && k.length === 1 ? "abcd".indexOf(k) : ["1", "2", "3", "4"].indexOf(k);
      if (idx >= 0 && q && idx < q.options.length) {
        state.answers[state.qIndex] = idx;
        renderQuestion();
      } else if (e.key === "ArrowRight") $("lhQuizNext").click();
      else if (e.key === "ArrowLeft" && state.qIndex > 0) $("lhQuizPrev").click();
    }
  });
  $("lhBackToBrowse").addEventListener("click", backToBrowse);
}

/* ─────────────────────────────────────────────────────────────
   Boot
   ───────────────────────────────────────────────────────────── */

async function loadHubDoc() {
  try {
    const snap = await getDoc(doc(db, "users", state.uid, "learning", HUB_DOC_SEGMENT));
    if (snap.exists()) {
      const d = snap.data();
      state.hubDoc = { last: d.last || null, topics: (d && d.topics) || {} };
    }
  } catch (e) {
    console.warn("[learning-hub] could not read progress:", e);
  }
}

async function boot() {
  await firebaseReady;
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = pageUrl("/login");
      return;
    }
    if (!user.emailVerified) {
      window.location.href = pageUrl("/verify-email");
      return;
    }

    state.uid = user.uid;
    await loadHubDoc();
    wire();

    // A returning learner lands on their chapter list (board, class and subject
    // restored); a new learner starts at the board screen.
    const last = state.hubDoc.last;
    const remembered = last && HUB_TRACKS.find((x) => x.id === last.trackId);
    if (remembered) {
      state.trackId = remembered.id;
      state.classNum = remembered.grades ? last.classNum || null : null;
      const subs = remembered.grades && !state.classNum ? [] : subjectsFor(remembered, state.classNum);
      if (subs.includes(last.subject)) {
        state.subject = last.subject;
        state.step = "chapter";
      } else {
        state.step = subs.length ? "subject" : remembered.grades ? "class" : "board";
      }
    }
    setStage("browse");
    renderPick();

    document.body.classList.remove("auth-loading");
    const av = $("topbarAvatar");
    if (av && user.photoURL) av.src = user.photoURL;
  });

  // Failsafe, same as arena.html, so the splash can never trap the user.
  setTimeout(() => document.body.classList.remove("auth-loading"), 3000);
}

boot();