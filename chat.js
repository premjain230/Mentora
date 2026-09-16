import { escapeHtml } from "./xss.js";
import { auth, db, firebaseReady } from "./firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { preCheckLimit, showLimitModal } from "./limits.js";
import * as Aquila from "./aquila-integration.js";
import { loadMemory, addMemory } from "./modules/memory.js";
import { track } from "./modules/track.js";
import { SYSTEM_PROMPT } from "./js/ai/system-prompt.js";

const API_ENDPOINT  = "/api/groq-proxy";
const SEARCH_ENDPOINT = "/api/search";
const MODEL         = "openai/gpt-oss-120b";
const MAX_HISTORY   = 60;

// Cache for learner snapshot to avoid Firestore read on every message (P4)
let _snapshotCache = null;
let _snapshotCacheAt = 0;
const SNAPSHOT_TTL_MS = 5 * 60 * 1000;

// Helper: infer subject from user message for filtered learning context (P1-8)
function inferSubject(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("physics")) return "physics";
  if (t.includes("chemistry")) return "chemistry";
  if (t.includes("biology") || t.includes("bio ")) return "biology";
  if (t.includes("mathemat") || t.includes(" maths") || t.includes(" algebra") || t.includes(" calculus") || t.includes(" geometry")) return "mathematics";
  if (t.includes("jee")) return "jee";
  if (t.includes("neet")) return "neet";
  if (t.includes("board") || t.includes("cbse") || t.includes("icse") || t.includes("maharashtra")) return "board";
  return null;
}

function shouldSearch(query) {
  const q = String(query || "").toLowerCase().trim();
  if (q.length < 8) return false;
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|help|please|good morning|good night|how are you)[\s!.?]*$/i.test(q)) return false;
  // Stable textbook definitions without current/changing keywords — use curriculum/knowledge, not web
  if (/^(explain|define|what is|meaning of|tell me about) /i.test(q) && !/(current|latest|recent|today|2024|2025|2026|cutoff|result|admission|syllabus|pattern|change|update|news|verify|check)/i.test(q)) {
    if (q.length < 80) return false;
  }
  if (/(current|latest|recent|today|2024|2025|2026|cutoff|result date|admission|last date|syllabus.*change|pattern.*change|verify|is it true|fact check|news|update)/i.test(q)) return true;
  if (q.includes("?") && q.split(/\s+/).length > 6) return true;
  if (q.length > 120) return true;
  return false;
}

function isFakeUnderstanding(text) {
  const t = String(text || "").toLowerCase().trim();
  // Matches "i understood", "got it", "clear", etc. — short utterances that feign understanding
  if (/^(i understood|understood|got it|i got it|clear|makes sense|ok got it|yes i understand|i see|samajh gaya|samajh aaya|clear now)[\s!.]*$/i.test(t)) return true;
  if (t.length < 35 && /(understood|got it|clear now|makes sense now)/i.test(t)) return true;
  return false;
}

const ICON_THUMBUP = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
const ICON_THUMBDOWN = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`;
const ICON_COPY = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_COPY_CHECK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_SHARE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;

(function injectActionButtonStyles() {
  if (document.getElementById("aquila-action-styles")) return;
  const style = document.createElement("style");
  style.id = "aquila-action-styles";
  style.textContent = `
    .ai-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      flex-wrap: wrap;
    }
    .ai-action-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 11px;
      font-size: 12px;
      font-family: 'Sora', sans-serif;
      font-weight: 400;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
      line-height: 1;
    }
    .ai-action-btn:hover {
      color: var(--text-secondary);
      border-color: var(--border-hover);
      background: rgba(255,255,255,0.04);
    }
    .ai-action-btn.active-good {
      color: var(--accent);
      border-color: rgba(0,212,255,0.4);
      background: rgba(0,212,255,0.08);
    }
    .ai-action-btn.active-bad {
      color: var(--accent3);
      border-color: rgba(255,107,107,0.4);
      background: rgba(255,107,107,0.08);
    }
    .ai-action-btn.active-copy {
      color: var(--accent);
      border-color: rgba(0,212,255,0.4);
      background: rgba(0,212,255,0.08);
    }
    .ai-action-btn.active-share {
      color: var(--accent2);
      border-color: rgba(167,139,250,0.4);
      background: rgba(167,139,250,0.08);
    }
    .ai-action-divider {
      width: 1px;
      height: 16px;
      background: var(--border);
      flex-shrink: 0;
      margin: 0 2px;
    }
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    .search-pulse {
      position: relative;
    }
    .search-pulse::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 11px;
      border: 2px solid var(--accent2);
      opacity: 0;
      animation: pulseRing 1.2s ease-out infinite;
    }
    @keyframes pulseRing {
      0% { opacity: 0.6; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.2); }
    }
    .confidence-bar {
      display: flex;
      gap: 6px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .conf-btn {
      padding: 4px 10px;
      font-size: 11px;
      font-family: 'Sora', sans-serif;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .conf-btn:hover { border-color: var(--border-hover); color: var(--text-secondary); }
    .conf-btn.selected { background: rgba(0,212,255,0.1); border-color: rgba(0,212,255,0.3); color: var(--accent); }
    .recall-prompt {
      margin-top: 12px;
      padding: 12px 16px;
      background: rgba(0,212,255,0.05);
      border: 1px solid rgba(0,212,255,0.15);
      border-radius: 10px;
      font-size: 13px;
      color: var(--accent);
    }
    .retry-btn {
      padding: 6px 14px;
      font-size: 12.5px;
      font-family: 'Sora', sans-serif;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid rgba(0,212,255,0.35);
      background: rgba(0,212,255,0.1);
      color: var(--accent);
      cursor: pointer;
      transition: all 0.15s;
    }
    .retry-btn:hover {
      background: rgba(0,212,255,0.18);
      border-color: rgba(0,212,255,0.5);
    }
  `;
  document.head.appendChild(style);
})();

let conversationHistory = [];
let activeChatId        = null;
let isStreaming         = false;
// Web search is now ALWAYS enabled — no toggle needed. Kept for backwards compat.
let isSearchEnabled     = true;

// Learning state tracking
let learningState = {
  currentConcept: null,
  attemptCount: 0,
  correctCount: 0,
  totalQuestions: 0,
  confidenceHistory: [],
  lastActivity: Date.now()
};

let modulesInitialized = false;
let profileLoadAttempted = false;

/* ---------------------------------------------------------------------- */
/* Small defensive helpers (added for runtime safety; behavior-preserving) */
/* ---------------------------------------------------------------------- */

function toSafeString(v) {
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return "";
  try {
    return String(v);
  } catch {
    return "";
  }
}

function toSafeArray(v) {
  return Array.isArray(v) ? v : [];
}

function safeErrorMessage(err, fallback = "Something went wrong") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err?.message === "string" && err.message) return err.message;
  try {
    return String(err) || fallback;
  } catch {
    return fallback;
  }
}

/* ---------------------------------------------------------------------- */

export async function ensureModulesInitialized() {
  if (modulesInitialized || profileLoadAttempted) return;
  profileLoadAttempted = true;
  const uid = auth?.currentUser?.uid;
  if (uid) {
    try {
      await Aquila.initializeModules?.(uid);
      modulesInitialized = true;
    } catch (e) {
      console.warn("Module init deferred:", safeErrorMessage(e));
    }
  }
}

firebaseReady.then(() => {
  if (!auth) return;
  auth.onAuthStateChanged(user => {
    if (user && !modulesInitialized) {
      ensureModulesInitialized();
    }
    // On every auth, re-check limit so UI stays locked for free users even after new chat / reload (fixes bypass)
    if (user) {
      window.__aquila_uid = user.uid;
      import("./limits.js").then(({ preCheckLimit }) => preCheckLimit(user.uid, "chat").catch(()=>{})).catch(()=>{});
    }
  });
});

export function setActiveChatId(id) { activeChatId = id; }

export function resetChat() {
  activeChatId = null;
  conversationHistory = [];
  learningState = {
    currentConcept: null,
    attemptCount: 0,
    correctCount: 0,
    totalQuestions: 0,
    confidenceHistory: [],
    lastActivity: Date.now()
  };
  const chatArea = document.getElementById("chatArea");
  if (chatArea) chatArea.innerHTML = "";
  renderWelcome(chatArea);
  // Re-apply limit lock after new chat — free users cannot bypass by clicking New Chat
  const uid = auth?.currentUser?.uid || window.__aquila_uid;
  if (uid) {
    import("./limits.js").then(({ preCheckLimit }) => preCheckLimit(uid, "chat").catch(()=>{})).catch(()=>{});
  }
}

export function renderWelcome(container) {
  const chatArea = container || document.getElementById("chatArea");
  if (!chatArea) return;
  // dedup: keep last homeHub if duplicate
  const hubs = document.querySelectorAll("#homeHub");
  hubs.forEach((el,i)=>{ if(i < hubs.length-1) el.remove(); });
  const isChatMode = new URLSearchParams(window.location.search).get("mode") === "chat" || window.location.pathname.endsWith("chat.html");
  if (isChatMode && document.getElementById("welcomeScreen")) return;
  // for homeHub, don't return if it exists — we need to populate the static one with real data
  const firstName = auth?.currentUser?.displayName?.split(" ")[0] || "";
  const greeting  = firstName ? `What are we tackling today, ${firstName}?` : "What are we tackling today?";
  // Consume pending prompt from home search
  const pending = sessionStorage.getItem("aquila_pending_prompt");
  if (pending && isChatMode) {
    sessionStorage.removeItem("aquila_pending_prompt");
    setTimeout(()=> { const inp=document.getElementById("chatInput"); if(inp){ inp.value=pending; inp.dispatchEvent(new Event("input")); sendMessage(); } }, 250);
  }

  if (isChatMode) {
    const el = document.createElement("div");
    el.className = "welcome";
    el.id = "welcomeScreen";
    el.innerHTML = `
    <div class="welcome-icon" style="background:var(--bg-card);border:1px solid var(--border);box-shadow:var(--shadow-sm);">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10a7 7 0 0 1-14 0"/><path d="M12 17a5 5 0 0 0 5-5"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>
    </div>
    <h1 style="font-family:var(--font-display);font-size:28px;font-weight:700;letter-spacing:-0.04em;line-height:1.15;color:var(--text-primary);">${greeting}</h1>
    <p style="font-size:14px;color:var(--text-secondary);max-width:480px;line-height:1.6;font-weight:400;letter-spacing:-0.01em;">Aquila is your intelligent learning companion — ask anything, or start from a suggested path. It remembers your syllabus and adapts to you.</p>
    <div class="suggestion-grid">
      <div class="suggestion-card" tabindex="0" role="button" onclick="runPrompt('Explain a concept I find hard')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();runPrompt('Explain a concept I find hard')}">
        <div class="sug-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg></div>
        <div class="sug-title">Understand a hard topic</div>
        <div class="sug-desc">Break down any concept step by step</div>
      </div>
      <div class="suggestion-card" tabindex="0" role="button" onclick="runPrompt('Quiz me on my current chapter')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();runPrompt('Quiz me on my current chapter')}">
        <div class="sug-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
        <div class="sug-title">Quiz me</div>
        <div class="sug-desc">Test my understanding with questions</div>
      </div>
      <div class="suggestion-card" tabindex="0" role="button" onclick="runPrompt('Help me plan today\\'s study session')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();runPrompt('Help me plan today\\'s study session')}">
        <div class="sug-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg></div>
        <div class="sug-title">Plan my day</div>
        <div class="sug-desc">Get a focused, realistic session plan</div>
      </div>
      <div class="suggestion-card" tabindex="0" role="button" onclick="window.location.href='study-session.html'" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.location.href='study-session.html'}">
        <div class="sug-icon" style="background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);color:var(--green);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
        <div class="sug-title">Start a study session</div>
        <div class="sug-desc">Guided AI focus block with a timer</div>
      </div>
      <div class="suggestion-card" tabindex="0" role="button" onclick="runPrompt('Revise a topic I studied earlier')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();runPrompt('Revise a topic I studied earlier')}">
        <div class="sug-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></div>
        <div class="sug-title">Revise earlier topics</div>
        <div class="sug-desc">Recall &amp; strengthen what I've learned</div>
      </div>
    </div>`;
    chatArea.appendChild(el);
    return;
  }

  // Home hub — use existing static if present (so graphs always visible even before JS), else create
  {
    let graphWrap = document.getElementById("homeHub");
    let isNew = false;
    if(!graphWrap){
      graphWrap = document.createElement("div");
      graphWrap.id = "homeHub";
      graphWrap.style.cssText = "display:grid;gap:12px;width:100%;max-width:720px;";
      isNew = true;
    }
    if(isNew){
      graphWrap.innerHTML = `
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;">
        <div>
          <div style="font-family:var(--font-display);font-size:18px;font-weight:700;letter-spacing:-0.02em;">Today</div>
          <div id="hubSubtitle" style="font-size:12px;color:var(--text-muted);margin-top:2px;">Your personalised progress — real, not demo</div>
        </div>
        <a href="analyze.html" style="font-size:11px;color:var(--accent);text-decoration:none;border:1px solid var(--border);padding:6px 10px;border-radius:999px;background:var(--bg-card);">View analysis →</a>
      </div>
      <div class="cere-grid-3">
        <div class="aq-graph-card" style="cursor:pointer;padding:14px;display:flex;flex-direction:column;align-items:center;gap:8px;" onclick="window.location.href='analyze.html'">
          <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);align-self:flex-start;">Mastery</div>
          <div id="hubMasteryGauge" style="width:112px;height:112px;display:grid;place-items:center;color:var(--text-muted);font-size:12px;">Loading…</div>
          <div id="hubMasteryCaption" style="font-size:11px;color:var(--text-muted);text-align:center;">Analyse →</div>
        </div>
        <div class="aq-graph-card" style="cursor:pointer;padding:14px;" onclick="window.location.href='study-session.html'">
          <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">Volume — study time</div>
          <div id="hubStudyTime" style="font-size:20px;font-weight:700;margin-top:6px;">—</div>
          <div id="hubStudyVolume" style="margin-top:10px;height:64px;"></div>
          <div id="hubStudyCaption" style="font-size:11px;color:var(--text-muted);margin-top:6px;">Start a session →</div>
        </div>
        <div class="aq-graph-card" style="cursor:pointer;padding:14px;" onclick="window.location.href='review.html'">
          <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">Retention</div>
          <div style="font-size:13px;font-weight:600;margin-top:6px;" id="hubSparksTitle">Checking…</div>
          <div id="hubSparksCounts" style="display:flex;gap:10px;font-size:11px;color:var(--text-muted);margin-top:4px;"></div>
          <div id="hubSparksBar" style="margin-top:10px;height:8px;display:flex;gap:2px;border-radius:999px;overflow:hidden;background:var(--bg-elevated);"></div>
          <div id="hubSparksEmpty" style="font-size:11px;color:var(--text-muted);margin-top:8px;display:none;"></div>
        </div>
      </div>
      <div class="aq-graph-card" style="padding:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">Performance — stock trend</span><span id="hubStockTag" style="font-size:10px;background:var(--bg-elevated);padding:2px 6px;border-radius:999px;">Real • 15</span></div>
        <div id="hubStockWrap" style="margin-top:12px;"><canvas id="hubStockCanvas" width="600" height="200" style="width:100%;height:200px;display:block;"></canvas></div>
        <div id="hubStockCaption" style="font-size:10px;color:var(--text-muted);margin-top:6px;"></div>
      </div>
      <div class="aq-graph-card" style="padding:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">Next steps</span><a href="review.html" style="font-size:10px;background:var(--bg-elevated);padding:4px 8px;border-radius:999px;color:var(--text-muted);text-decoration:none;">Review ▾</a></div>
        <div id="hubNextSteps" class="cere-grid" style="margin-top:12px;"></div>
        <div id="hubNextEmpty" style="font-size:12px;color:var(--text-muted);margin-top:8px;display:none;"></div>
      </div>
      <div class="aq-graph-card" style="padding:14px;">
        <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);display:flex;justify-content:space-between;">Holdings — by subject <span style="font-size:10px;background:var(--bg-elevated);padding:2px 6px;border-radius:999px;">Real</span></div>
        <div id="hubSubjectBars" class="aq-bar-list" style="margin-top:12px;"></div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:8px;"><a href="analyze.html" style="color:var(--accent);text-decoration:none;">Full analysis →</a></div>
      </div>
      <div class="aq-graph-card" style="padding:14px;">
        <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">Retention timeline</div>
        <div id="hubRetentionTimeline" style="margin-top:12px;"></div>
        <div id="hubRetentionEmpty" style="font-size:11px;color:var(--text-muted);display:none;">No timeline yet — your reviews appear after first quiz</div>
      </div>
      <div style="display:none;"><div id="hubMasteryGraph"></div><div id="hubRetentionGraph"></div></div>`;
      if(isNew) chatArea.appendChild(graphWrap);
    }
    import("./js/learning/graphs.js").then(({ renderMasteryRadial, renderProgressSparkline, renderSubjectBars, renderScoreTrend, renderRetentionTimeline, renderVolumeBars, renderStockChart }) => {
      try {
        const gaugeEl = document.getElementById("hubMasteryGauge");
        const capEl = document.getElementById("hubMasteryCaption");
        const studyTimeEl = document.getElementById("hubStudyTime");
        const studyVolEl = document.getElementById("hubStudyVolume");
        const studyCap = document.getElementById("hubStudyCaption");
        const stockCanvas = document.getElementById("hubStockCanvas");
        const stockCap = document.getElementById("hubStockCaption");
        const stockTag = document.getElementById("hubStockTag");
        const sparksTitle = document.getElementById("hubSparksTitle");
        const sparksCounts = document.getElementById("hubSparksCounts");
        const sparksBar = document.getElementById("hubSparksBar");
        const sparksEmpty = document.getElementById("hubSparksEmpty");
        const nextEl = document.getElementById("hubNextSteps");
        const nextEmpty = document.getElementById("hubNextEmpty");
        const subtitle = document.getElementById("hubSubtitle");

        // Helper formatters (real, no demo)
        const fmtHM = (secs) => {
          const mins = Math.round((Number(secs)||0)/60);
          const h = Math.floor(mins/60); const m = mins%60;
          if(h===0) return `${m} min`;
          return `${h} hr ${m} min`;
        };
        const toDate = (v) => {
          if(!v) return null;
          try{ if(v.toDate) return v.toDate(); return new Date(v); }catch{ return new Date(v); }
        };

        import("./firebase-config.js").then(async ({ db, auth }) => {
          try {
            const user = auth?.currentUser;
            if (!user || !db) {
              if(gaugeEl) gaugeEl.innerHTML = `<div style="font-size:12px;">Sign in to see mastery</div>`;
              return;
            }
            const { collection, getDocs, query, orderBy, limit, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
            // Mastery — real
            let avg=0, avgEv=0, cnt=0;
            let mastered=0, proficient=0, developing=0, emerging=0;
            try{
              const snap = await getDocs(collection(db, "users", user.uid, "mastery"));
              cnt = snap.size;
              if(cnt>0){
                let sum=0, sumEv=0;
                snap.forEach(d=>{
                  const v=d.data();
                  const s = Number(v.masteryScore)||0; const e=Number(v.evidenceStrength)||0;
                  sum+=s; sumEv+=e;
                  if(s>=0.85) mastered++; else if(s>=0.70) proficient++; else if(s>=0.40) developing++; else if(s>0) emerging++;
                });
                avg = sum/cnt; avgEv = sumEv/cnt;
                if(gaugeEl) gaugeEl.innerHTML = `<div class="aq-radial" style="--p:${Math.round(avg*100)};--c:${avg>=0.75?'var(--accent2)':'var(--accent)'};width:110px;height:110px;"><span style="font-size:18px;">${Math.round(avg*100)}%</span></div><div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);">Evidence ${Math.round(avgEv*100)}%</div><div style="font-size:11px;color:${avgEv<0.35?'var(--amber)':avgEv<0.7?'var(--text-muted)':'var(--green)'};">${avgEv<0.35?'Limited':avgEv<0.7?'Adequate':'Strong'}</div></div>`;
                if(capEl) capEl.textContent = `${cnt} concepts • ${mastered} mastered`;
                if(subtitle) subtitle.textContent = cnt>=3 ? `Based on ${cnt} concepts — personalised` : `Based on ${cnt} concepts — keep learning`;
                // Roadmap real: show mastery breakdown as radials with real counts
                if(roadmapEl){
                  const total = Math.max(1, cnt);
                  const pM = Math.round(mastered/total*100), pP = Math.round(proficient/total*100), pD = Math.round(developing/total*100);
                  roadmapEl.innerHTML = `<div style="display:flex;gap:12px;justify-content:space-around;">
                    <div style="text-align:center;"><div class="aq-radial" style="--p:${pM};--c:#10b981;width:58px;height:58px;"><span style="font-size:11px;">${mastered}</span></div><div style="font-size:10px;color:var(--text-muted);margin-top:4px;">Mastered</div></div>
                    <div style="text-align:center;"><div class="aq-radial" style="--p:${pP};--c:#8b5cf6;width:58px;height:58px;"><span style="font-size:11px;">${proficient}</span></div><div style="font-size:10px;color:var(--text-muted);margin-top:4px;">Proficient</div></div>
                    <div style="text-align:center;"><div class="aq-radial" style="--p:${pD};--c:#eab308;width:58px;height:58px;"><span style="font-size:11px;">${developing}</span></div><div style="font-size:10px;color:var(--text-muted);margin-top:4px;">Developing</div></div>
                  </div>`;
                }
                // Subject bars — real per-subject avg (stock holdings)
                const subjEl = document.getElementById("hubSubjectBars");
                if(subjEl){
                  if(cnt===0){
                    subjEl.innerHTML = `<div style="font-size:11px;color:var(--text-muted);">No subject data yet<br><span style="font-size:10px;">Quiz in any subject to build this graph</span></div>`;
                  } else {
                    const subjMap={};
                    snap.forEach(d=>{
                      const v=d.data(); const subj=(v.subject||"Unknown").trim()||"Unknown";
                      if(!subjMap[subj]) subjMap[subj]={name:subj, sum:0, count:0};
                      subjMap[subj].sum+=Number(v.masteryScore)||0; subjMap[subj].count++;
                    });
                    const subjectStats = Object.values(subjMap).map(s=> ({name:s.name, pct: s.count? (s.sum/s.count)*100:0})).sort((a,b)=>b.pct-a.pct);
                    try{ renderSubjectBars(subjEl, subjectStats); }catch{}
                  }
                }
                // Radar real: skill proxy from mastery states distribution
                if(radarEl){
                  if(cnt===0){
                    radarEl.innerHTML = `<div style="font-size:12px;">No skills yet<br><a href="quiz.html" style="color:var(--accent);text-decoration:none;">Take a quiz →</a></div>`;
                  } else {
                    // simple polygon scaled by mastered/proficient/developing
                    const a = mastered/total, b= proficient/total, c= developing/total;
                    // 3-point radar approximated
                    radarEl.innerHTML = `<svg viewBox="0 0 100 100" style="width:100%;height:90px;"><polygon points="50,12 82,28 82,72 50,88 18,72 18,28" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1"/><polygon points="50,${50-a*30} ${50+b*28},${50-b*16} ${50+c*22},${50+c*14}" fill="rgba(0,212,255,0.14)" stroke="var(--accent)" stroke-width="1.3"/><circle cx="50" cy="50" r="1.5" fill="var(--accent)"/></svg><div style="display:flex;justify-content:space-around;font-size:10px;color:var(--text-muted);margin-top:2px;"><span>Mastered ${mastered}</span><span>Proficient ${proficient}</span><span>Learning ${developing+emerging}</span></div>`;
                  }
                }
              } else {
                if(gaugeEl) gaugeEl.innerHTML = `<div style="text-align:center;"><div style="font-size:13px;font-weight:600;">No mastery yet</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Take a quiz or finish a study session</div><a href="quiz.html" style="display:inline-block;margin-top:8px;font-size:11px;color:var(--accent);text-decoration:none;border:1px solid var(--border);padding:5px 10px;border-radius:999px;">Start quiz →</a></div>`;
                if(capEl) capEl.textContent = "Complete your first assessment";
                if(roadmapEl) roadmapEl.innerHTML = `<div style="font-size:12px;color:var(--text-muted);">No roadmap until first concept tracked.<br><a href="analyze.html" style="color:var(--accent);text-decoration:none;">Go to Analyze →</a></div>`;
                if(roadmapTag) roadmapTag.textContent = "—";
                if(radarEl) radarEl.innerHTML = `<div style="font-size:12px;color:var(--text-muted);">No skills to show<br><span style="font-size:11px;">Your skill map appears after 2–3 sessions</span></div>`;
                const subjEl2 = document.getElementById("hubSubjectBars");
                if(subjEl2) subjEl2.innerHTML = `<div style="font-size:11px;color:var(--text-muted);">No subject data yet<br><span style="font-size:10px;">Quiz in any subject to build this graph</span></div>`;
              }
            }catch(e){ if(gaugeEl) gaugeEl.innerHTML = `<div style="font-size:11px;color:var(--text-muted);">Couldn’t load mastery</div>`; }

            // Volume — stock-like 7d bars (real, not decoration)
            let totalSecs = 0; let dailyMap = new Map(); let dailySecs = [];
            try{
              const sSnap = await getDocs(query(collection(db, "users", user.uid, "studySessions"), orderBy("startedAt","desc"), limit(50)));
              const now = new Date(); const dayKey = (d)=> d.toISOString().slice(0,10);
              sSnap.forEach(d=>{
                const v=d.data();
                let secs = Number(v.timeFocused ?? v.durationMinutes*60 ?? 0);
                if(secs<0) secs=0; if(secs>4*3600) secs=4*3600;
                totalSecs += secs;
                const dt = toDate(v.startedAt) || now;
                const k = dayKey(dt); dailyMap.set(k, (dailyMap.get(k)||0)+secs);
              });
              const days = [];
              for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=dayKey(d); days.push(dailyMap.get(k)||0); }
              dailySecs = days;
              const avgDaily = days.reduce((a,b)=>a+b,0)/7;
              if(studyTimeEl) studyTimeEl.textContent = totalSecs? fmtHM(totalSecs) : "0 min";
              if(studyCap) studyCap.textContent = sSnap.size ? `${sSnap.size} sessions • avg ${fmtHM(avgDaily)}/day` : "No sessions yet";
              if(studyVolEl){
                if(sSnap.size===0){
                  studyVolEl.innerHTML = `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:12px 0;">No volume yet<br><a href="study-session.html" style="color:var(--accent);text-decoration:none;">Start 25 min →</a></div>`;
                } else {
                  try{ renderVolumeBars(studyVolEl, dailySecs); }catch{ /* fallback sparkline */ 
                    const maxD = Math.max(1, ...days); const pts = days.map(v=> v/maxD);
                    try{ renderProgressSparkline(studyVolEl, pts); }catch{}
                  }
                }
              }
            }catch(e){
              if(studyTimeEl) studyTimeEl.textContent = "—";
            }

            // Retention — real due/overdue from reviews
            try{
              const rSnap = await getDocs(collection(db, "users", user.uid, "reviews"));
              let due=0, overdue=0, upcoming=0; const now=Date.now();
              rSnap.forEach(d=>{
                const v=d.data(); const t = v.nextReviewAt ? (v.nextReviewAt.toDate? v.nextReviewAt.toDate().getTime(): new Date(v.nextReviewAt).getTime()) : null;
                if(!t) return;
                if(t<=now) overdue++; else if(t<=now+24*3600*1000) due++; else upcoming++;
              });
              const totalR = rSnap.size;
              if(totalR===0){
                if(sparksTitle) sparksTitle.textContent = "No reviews yet";
                if(sparksCounts) sparksCounts.innerHTML = `<span style="color:var(--text-muted);">Complete a quiz to generate retention schedule</span>`;
                if(sparksBar) sparksBar.innerHTML = `<div style="flex:1;background:rgba(255,255,255,0.08);"></div>`;
                if(sparksEmpty) { sparksEmpty.style.display="block"; sparksEmpty.innerHTML = `<a href="quiz.html" style="color:var(--accent);text-decoration:none;">Take quiz →</a> • <a href="review.html" style="color:var(--text-muted);text-decoration:none;">How reviews work</a>`; }
              } else {
                if(sparksTitle) sparksTitle.textContent = overdue? `${overdue} overdue` : due? `${due} due today` : `${upcoming} scheduled`;
                if(sparksCounts) sparksCounts.innerHTML = `<span>Due <b style="color:var(--text-primary);">${due}</b></span><span>Overdue <b style="color:var(--accent3);">${overdue}</b></span><span>Up <b>${upcoming}</b></span>`;
                if(sparksBar){
                  const tot = Math.max(1, due+overdue+upcoming);
                  sparksBar.innerHTML = `<div style="flex:${due/tot};background:var(--accent);"></div><div style="flex:${overdue/tot};background:var(--accent3);"></div><div style="flex:${upcoming/tot};background:rgba(255,255,255,0.14);"></div>`;
                }
              }
            }catch(e){
              if(sparksTitle) sparksTitle.textContent = "Retention";
            }

            // Retention timeline — real reviews sorted
            try{
              const rtEl = document.getElementById("hubRetentionTimeline");
              const rtEmpty = document.getElementById("hubRetentionEmpty");
              if(rtEl){
                const { collection: col2, getDocs: gd2 } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
                // Reuse rSnap if available else fetch
                let reviews = [];
                try{
                  const rs = await gd2(col2(db, `users/${user.uid}/reviews`));
                  rs.forEach(d=> {
                    const v=d.data();
                    const t = v.nextReviewAt ? (v.nextReviewAt.toDate? v.nextReviewAt.toDate(): new Date(v.nextReviewAt)) : null;
                    reviews.push({ conceptId: v.conceptId||d.id, nextReviewAt: t, reviewState: v.reviewState||"not_ready", subject: v.subject||"" });
                  });
                }catch{}
                if(!reviews.length){
                  rtEl.innerHTML = ""; if(rtEmpty) rtEmpty.style.display="block";
                } else {
                  try{ renderRetentionTimeline(rtEl, reviews.slice(0,5)); }catch{ rtEl.innerHTML = reviews.slice(0,5).map(r=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border-subtle);"><span>${r.conceptId}</span><span style="color:var(--text-muted);">${r.reviewState} • ${r.nextReviewAt? r.nextReviewAt.toLocaleDateString(): ""}</span></div>`).join(""); }
                  if(rtEmpty) rtEmpty.style.display="none";
                }
              }
            }catch{}

            // Stock chart — real quizAttempts last 15 (stock price)
            try{
              const stockCanvas = document.getElementById("hubStockCanvas");
              const stockCap = document.getElementById("hubStockCaption");
              const stockTag = document.getElementById("hubStockTag");
              if(stockCanvas){
                const { collection: col3, getDocs: gd3, query: q3, orderBy: ob3, limit: lim3 } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
                const q = q3(col3(db, `users/${user.uid}/quizAttempts`), ob3("takenAt","desc"), lim3(15));
                const snap = await gd3(q);
                const vals = snap.docs.map(d=>{
                  const v=d.data(); const tot=Number(v.totalQ)||1; const cor=Number(v.correct)||0;
                  return Math.round((cor/tot)*100);
                }).reverse();
                const labels = snap.docs.map(d=>{
                  const v=d.data(); const dt = v.takenAt?.toDate ? v.takenAt.toDate() : (v.takenAt ? new Date(v.takenAt) : null);
                  return dt ? `${dt.getMonth()+1}/${dt.getDate()}` : `#${d.id.slice(0,3)}`;
                }).reverse();
                if(vals.length>=1){
                  try{ renderStockChart(stockCanvas, vals, {labels}); }catch{ try{ renderScoreTrend(stockCanvas, vals); }catch{} }
                  if(stockCap) stockCap.textContent = `${vals.length} quizzes • avg ${Math.round(vals.reduce((a,b)=>a+b,0)/vals.length)}% • hi ${Math.max(...vals)}% • like price action`;
                  if(stockTag) stockTag.textContent = `Real • ${vals.length}`;
                } else {
                  if(stockCap) stockCap.textContent = "No trades yet — take a quiz to seed your chart";
                  try{ renderStockChart(stockCanvas, []); }catch{ try{ renderScoreTrend(stockCanvas, []); }catch{} }
                  if(stockTag) stockTag.textContent = "Real • 0";
                }
              }
            }catch{}
            // Keep old small trend for backwards compat (if still present)
            try{
              const trendCanvas = document.getElementById("hubTrendCanvas");
              const trendCap = document.getElementById("hubTrendCaption");
              if(trendCanvas && !document.getElementById("hubStockCanvas")){
                const { collection: col3b, getDocs: gd3b, query: q3b, orderBy: ob3b, limit: lim3b } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
                const qb = q3b(col3b(db, `users/${user.uid}/quizAttempts`), ob3b("takenAt","desc"), lim3b(15));
                const snapb = await gd3b(qb);
                const valsb = snapb.docs.map(d=>{ const v=d.data(); const tot=Number(v.totalQ)||1; const cor=Number(v.correct)||0; return Math.round((cor/tot)*100); }).reverse();
                if(valsb.length>=1){ try{ renderScoreTrend(trendCanvas, valsb); }catch{} if(trendCap) trendCap.textContent = `${valsb.length} quizzes`; } else { try{ renderScoreTrend(trendCanvas, []); }catch{} }
              }
            }catch{}

            // Next steps — real recommendations via backend
            try{
              const token = await user.getIdToken();
              const res = await fetch("/api/recommendations", { headers:{ "Authorization":`Bearer ${token}` }});
              if(res.ok){
                const data = await res.json();
                const recs = (data.recommendations||[]).slice(0,3);
                if(recs.length===0){
                  if(nextEmpty){ nextEmpty.style.display="block"; nextEmpty.innerHTML = `No recommendations yet — <a href="quiz.html" style="color:var(--accent);text-decoration:none;">practice a topic</a> to get personalised next steps.`; }
                  if(nextEl) nextEl.innerHTML = "";
                } else {
                  if(nextEl) nextEl.innerHTML = recs.map(r=>`<div class="suggestion-card card-interactive" style="padding:12px;cursor:pointer;" onclick="window.location.href='${r.action==='review'?'review.html':r.action==='practice'?'quiz.html':'study-session.html'}'"><div style="font-size:11px;font-weight:600;">${r.subject||""} • ${r.topic||r.conceptId||""}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${r.reason||r.explanation||""}</div><div style="font-size:10px;color:var(--accent);margin-top:6px;">${r.action} →</div></div>`).join("");
                }
              } else {
                if(nextEmpty){ nextEmpty.style.display="block"; nextEmpty.textContent = "Couldn’t load recommendations."; }
              }
            }catch(e){ if(nextEmpty){ nextEmpty.style.display="block"; nextEmpty.textContent = "Recommendations unavailable offline."; } }

            // Syllabus badge in subtitle if exists
            try{
              const sSnap = await getDocs(collection(db, "users", user.uid, "syllabus"));
              if(sSnap.size>0){
                const last = sSnap.docs[0]?.data();
                if(last?.fileName && subtitle) subtitle.textContent = `Syllabus: ${last.fileName} • personalising`;
                const labelEl=document.getElementById("syllabusLabel"); const subEl=document.getElementById("syllabusSub");
                if(labelEl && last?.fileName) labelEl.textContent = last.fileName.slice(0,28);
                if(subEl) subEl.textContent = "Personalising • tap to update";
              }
            }catch{}

          } catch {}
        });
      } catch {}
    }).catch(()=>{});
  }
}

export function toggleSearch() {
  // No-op now: search is always on. Keep for backwards compat if old HTML calls it.
  isSearchEnabled = true;
  return true;
}

// Build a fresh Authorization header from the current Firebase ID token.
// `getIdToken()` transparently refreshes an expired token, so the backend never
// receives a stale credential — this is the core fix for the "Not authenticated"
// bug on the web.
async function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  const user = auth?.currentUser;
  if (user) {
    try {
      const idToken = await user.getIdToken();
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
    } catch (e) {
      console.error("Failed to obtain Firebase ID token:", e);
    }
  }
  return headers;
}

async function performWebSearch(query) {
  const safeQuery = toSafeString(query).slice(0, 400);

  let res;
  try {
    res = await fetch(SEARCH_ENDPOINT, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ query: safeQuery }),
    });
  } catch (networkErr) {
    console.error(networkErr);
    throw new Error(safeErrorMessage(networkErr, "Network error while searching"));
  }

  if (!res || !res.ok) {
    let err = {};
    try {
      err = (await res?.json()) || {};
    } catch { /* ignore parse errors on error body */ }
    throw new Error(err?.error || `Search failed (${res?.status ?? "unknown"})`);
  }

  let data = {};
  try {
    data = (await res.json()) || {};
  } catch (parseErr) {
    console.error(parseErr);
    data = {};
  }

  return toSafeArray(data?.results);
}

function formatSearchResults(results) {
  const list = toSafeArray(results);
  if (list.length === 0) return "";
  const parts = list.map((r, i) => {
    const title   = toSafeString(r?.title);
    const snippet = toSafeString(r?.snippet);
    const link    = toSafeString(r?.link || r?.url);
    return `[${i + 1}] "${title}" — ${snippet}\nSource: ${link}`;
  });
  return `\n\n=== CURRENT WEB SEARCH RESULTS (always use for accuracy — cite as [1], [2], etc.) ===\n${parts.join("\n")}\n\nInstructions: Use these results to ground your answer. Prefer them over internal knowledge for facts/dates/syllabus/formulas. Cite naturally. If results are insufficient, say so and fall back to internal knowledge with a disclaimer. Make the answer MORE effective to learn: connect to the student's onboarding profile, add a micro mental-model, and end with an active-recall check.`;
}

function pulseSearchBtn(pulse) {
  // Now pulses the send button / input box instead of the removed search toggle
  const sendBtn = document.getElementById("sendBtn");
  const inputBox = document.querySelector(".input-box");
  const targets = [sendBtn, inputBox].filter(Boolean);
  targets.forEach(el => {
    if (pulse) el.classList.add("search-pulse");
    else el.classList.remove("search-pulse");
  });
}

export async function sendMessage() {
  if (isStreaming) return;

  if (!Array.isArray(conversationHistory)) conversationHistory = [];

  const input   = document.getElementById("chatInput");
  const rawText = input?.value?.trim();
  if (!rawText) return;

  const uid = auth?.currentUser?.uid;
  if (!conversationHistory?.length && uid) {
    track("ai_chat_started", { topic: rawText.slice(0, 100) });
  }
  if (uid) {
    let allowed = true;
    try {
      allowed = await preCheckLimit(uid, "chat");
    } catch (gateErr) {
      console.error(gateErr);
      console.error(gateErr?.stack);
    }
    if (!allowed) return;
  }

  input.value = "";
  input.style.height = "auto";

  clearWelcome();
  renderMessage("user", rawText);

  let searchResults = [];
  let searchError = null;
  let searchSkipped = false;
  const needsSearch = shouldSearch(rawText);
  if (needsSearch) {
    pulseSearchBtn(true);
    try {
      searchResults = toSafeArray(await performWebSearch(rawText));
    } catch (err) {
      console.error(err);
      searchError = safeErrorMessage(err, "Search failed");
    } finally {
      pulseSearchBtn(false);
    }
  } else {
    searchSkipped = true;
  }

  conversationHistory.push({ role: "user", content: rawText });
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
  }

  const chatRef = await ensureChatSession(rawText);
  await saveMessage(chatRef, "user", rawText);

  await runAiReply(chatRef, rawText, searchResults, searchError, searchSkipped);
}

// Streaming + post-processing for a single assistant reply. Extracted so a
// failed reply can be retried without re-running search or re-saving the user
// message.
async function runAiReply(chatRef, rawText, searchResults, searchError, searchSkipped = false) {
  const aiBubble = createAiBubble();
  isStreaming = true;

  try {
    // Always start from base SYSTEM_PROMPT, then append personalized memory + live state (fixes bug where || would drop base prompt)
    let enhancedPrompt = SYSTEM_PROMPT;
    try {
      const aquilaCtx = Aquila.buildEnhancedSystemPrompt?.();
      if (aquilaCtx && typeof aquilaCtx === "string" && aquilaCtx.trim()) enhancedPrompt += aquilaCtx;
    } catch (promptErr) {
      console.error(promptErr);
    }

    let profile = {};
    try {
      profile = Aquila.getStudentProfile?.() ?? {};
    } catch (profileErr) {
      console.error(profileErr);
      profile = {};
    }

    let session = {};
    try {
      session = Aquila.getCurrentSession?.() ?? {};
    } catch (sessionErr) {
      console.error(sessionErr);
      session = {};
    }

    enhancedPrompt += `\n\nLEARNING STATE:
- Current concept: ${learningState?.currentConcept || "none"}
- Attempts so far: ${learningState?.attemptCount ?? 0}
- Correct: ${learningState?.correctCount ?? 0}/${learningState?.totalQuestions ?? 0}
- Time since last activity: ${Math.round((Date.now() - (learningState?.lastActivity ?? Date.now())) / 1000)}s`;

    if (profile && profile.conceptMastery && typeof profile.conceptMastery === "object") {
      const weakEntries = Object.entries(profile.conceptMastery)
        .sort(([, a], [, b]) => (Number(a) || 0) - (Number(b) || 0))
        .slice(0, 3);
      if (weakEntries.length > 0) {
        enhancedPrompt += `\n\nAREAS NEEDING ATTENTION:\n${weakEntries.map(([id, mastery], i) => `${i + 1}. ${toSafeString(id)} (${Math.round((Number(mastery) || 0) * 100)}% mastery)`).join('\n')}`;
      }
    }

    // Long-term memory (shared with the mobile app) — the most recent entries
    // are injected so Aquila remembers the student across conversations.
    try {
      const memories = await loadMemory(auth?.currentUser?.uid);
      if (Array.isArray(memories) && memories.length > 0) {
        enhancedPrompt += `\n\nMEMORY (long-term facts the student asked you to remember):\n` +
          memories.slice(0, 8).map((m, i) => `${i + 1}. ${toSafeString(m.text)}`).join('\n');
      }
    } catch (memErr) {
      console.error(memErr);
    }

    enhancedPrompt += '\n\nEVIDENCE NOTE: Accuracy is observed correctness; mastery is estimated and evidenceStrength indicates reliability. Low evidence (<0.35) is provisional, not proven.';

    // Rich learning context (ai-context.js) — filtered to current subject (P1-8, cached 5m P4)
    let ctx = null;
    try {
      const { buildLearningContext, contextToPromptSection } = await import("./js/learning/ai-context.js");
      let snapshot = Aquila.getStudentProfile ? Aquila.getStudentProfile() : null;
      // Use cache if fresh
      const now = Date.now();
      if (_snapshotCache && (now - _snapshotCacheAt) < SNAPSHOT_TTL_MS) {
        snapshot = _snapshotCache;
      } else {
        try {
          const { loadLearningProfile } = await import("./js/learning/learning-profile.js");
          if (auth?.currentUser?.uid && db) {
            const prof = await loadLearningProfile(db, auth.currentUser.uid);
            if (prof) {
              snapshot = { ...snapshot, ...prof, masteryMap: prof.conceptMastery || prof.masteryMap, subjectStates: prof.subjectStates || snapshot?.subjectStates };
              _snapshotCache = snapshot;
              _snapshotCacheAt = now;
            }
          }
        } catch {}
      }
      const inferred = inferSubject(rawText);
      ctx = buildLearningContext({ snapshot, currentSubject: inferred, tokenBudget: 600 });
      const section = contextToPromptSection(ctx);
      if (section) enhancedPrompt += "\n\n" + section;
    } catch (e) { console.warn("learning context skipped", e?.message); }

    // Retrieval-first: if reviews due, prioritize recall before direct answer (P3)
    try {
      const due = ctx?.reviewState?.due || ctx?.reviewState?.overdue || 0;
      if (due > 0) {
        enhancedPrompt += `\n\nRETRIEVAL-FIRST: ${due} review(s) due (spaced repetition). If the student's question overlaps a due concept, ask a 1-sentence recall question BEFORE giving the full answer, then give the answer. This leverages retrieval practice.`;
      }
    } catch {}

    // Fake-understanding detection (P1-10): if student says they got it, verify with tiny retrieval
    if (isFakeUnderstanding(rawText)) {
      enhancedPrompt += `\n\nFAKE-UNDERSTANDING PROTOCOL: Student just said "${toSafeString(rawText)}" — do NOT assume mastery. Verify with ONE tiny retrieval/application question (1 sentence, requires explain/apply, not yes/no). If they answer wrong, do NOT say "Wrong." Instead: 1) name the misconception gently, 2) explain why it happened, 3) repair with a simpler example, 4) retry with a slightly different question.`;
    }

    // ── Intelligent web-search injection (P1-9: only when needed) ──
    if (toSafeArray(searchResults).length > 0) {
      enhancedPrompt += formatSearchResults(searchResults);
    } else if (searchError) {
      enhancedPrompt += `\n\n=== WEB SEARCH ATTEMPTED BUT FAILED (${toSafeString(searchError)}) ===\nAnswer from internal knowledge ONLY. Explicitly state: "Web verification failed — this answer is from internal knowledge, please cross-check for exams." Then be extra cautious: flag any uncertainty, avoid fabricating details, and suggest how to verify. Still make it pedagogically effective.`;
    } else if (searchSkipped) {
      enhancedPrompt += `\n\n=== WEB SEARCH NOT NEEDED for this turn ===\nThis is a stable concept or casual message where web verification is not required. Answer from trusted knowledge/curriculum. Do not invent citations. Keep the learning structure (direct answer → intuition → steps → recap → challenge) and tailor to the learner.`;
    } else {
      enhancedPrompt += `\n\n=== WEB SEARCH RETURNED NO RELEVANT RESULTS ===\nNo external sources found for this query. Answer from internal knowledge with a disclaimer: "No web sources found — answering from internal knowledge." Cite uncertainty where relevant. Keep the learning structure (direct answer → intuition → steps → recap → challenge).`;
    }

    // Final guardrail: force effective learning even with or without search
    if (searchSkipped) {
      enhancedPrompt += `\n\nREMINDER: Web verification was NOT needed for this turn (stable concept/casual). Deliver a concise, mistake-free, learning-optimized answer from trusted knowledge: 1) Direct answer → intuition → steps → example, 2) Tailor to ${toSafeString(profile?.examType || "general")} / ${toSafeString((profile?.subjects||[]).join(", ") || "all subjects")}, 3) End with one active-recall question. Keep it short unless learner asks for depth.`;
    } else {
      enhancedPrompt += `\n\nREMINDER: You have already been web-verified (or attempted) for this turn. Now deliver a MISTAKE-FREE, learning-optimized answer: 1) Lead with the verified direct answer (with citations if you used search results), 2) Give intuition/mental model, 3) Tailor examples to the student's onboarding profile (${toSafeString(profile?.examType || "general")} / ${toSafeString((profile?.subjects||[]).join(", ") || "all subjects")}), 4) Call out the common exam trap for their level, 5) End with one active-recall question. If you are not fully sure, say so rather than guessing.`;
    }

    // Token budgeting (P4): trim oldest history if prompt would exceed Groq 120k char limit
    const MAX_PROMPT_CHARS = 90000;
    let totalChars = enhancedPrompt.length + toSafeArray(conversationHistory).reduce((s, m) => s + String(m.content || "").length, 0);
    while (totalChars > MAX_PROMPT_CHARS && conversationHistory.length > 2) {
      conversationHistory.shift();
      totalChars = enhancedPrompt.length + toSafeArray(conversationHistory).reduce((s, m) => s + String(m.content || "").length, 0);
    }

    const replyText = toSafeString(await streamGroqResponse(aiBubble, enhancedPrompt));

    // Update learning state
    learningState.totalQuestions = (learningState.totalQuestions ?? 0) + 1;
    learningState.lastActivity = Date.now();

    // Record interaction via student model (non-blocking)
    try {
      Aquila.recordInteraction?.(
        learningState.currentConcept,
        null,
        replyText.length * 10,
        null
      );
    } catch (recordErr) {
      console.error(recordErr);
    }

    const actions = createActionButtons(replyText);
    if (aiBubble) aiBubble.appendChild(actions);

    // Stuck detection — offer Learning Loop (derived, not persisted, Decision 5) — now uses real misconceptions & capped counts (P1-10)
    try {
      const { calculateStuckScore, shouldOfferLoop } = await import("./js/learning/learning-loop.js");
      const misconceptions = (profile?.commonMisconceptions || profile?.activeMisconceptions || profile?.misconceptions || []);
      const recentIncorrect = Math.max(0, (learningState.totalQuestions || 0) - (learningState.correctCount || 0));
      const effectiveIncorrect = learningState.correctCount ? recentIncorrect : Math.min(2, learningState.totalQuestions || 0);
      const score = calculateStuckScore({ recentIncorrectCount: effectiveIncorrect, misconceptions, explicitStruggle: /don't understand|confused|stuck|hard|difficult/i.test(rawText) ? 1 : 0, hintCount: 0, recentEvents: [] });
      if (shouldOfferLoop(score, 0)) {
        const loopDiv = document.createElement("div");
        loopDiv.style.cssText = "margin-top:12px;padding:14px;border:1px solid rgba(167,139,250,0.25);border-radius:12px;background:rgba(167,139,250,0.08);";
        loopDiv.innerHTML = `<div style="font-weight:600;margin-bottom:6px;">🔄 Let's try a different way</div><div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">It looks like this explanation isn't clicking. I'll find exactly where the problem is.</div><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn-outline" style="flex:1;">Explain differently</button><button class="btn-outline" style="flex:1;">Try an example</button><button class="btn-outline" style="flex:1;">Practice together</button><button class="btn-ghost" style="flex:1;">Skip for now</button></div>`;
        loopDiv.querySelectorAll("button").forEach(b=> b.addEventListener("click", ()=> { loopDiv.remove(); window.__aquilaToast("Loop: "+b.textContent+" — coming soon"); }));
        if (aiBubble) aiBubble.appendChild(loopDiv);
      }
    } catch {}

    // Add confidence rating UI
    const confBar = createConfidenceBar();
    if (aiBubble) aiBubble.appendChild(confBar);

    conversationHistory.push({ role: "assistant", content: replyText });
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
    }
    await saveMessage(chatRef, "assistant", replyText);

    if (conversationHistory.length === 2) {
      const title = rawText.slice(0, 60) + (rawText.length > 60 ? "\u2026" : "");
      await updateChatTitle(chatRef, title);
      updateSidebarTitle(activeChatId, title);
    }
  } catch (err) {
    console.error(err);
    console.error(err?.stack);
    if (aiBubble) {
      const friendly = safeErrorMessage(err, "Something went wrong while connecting to Aquila.");
      aiBubble.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;">
          <span style="color:#ff6b6b;font-size:14px;line-height:1.6;">\u26a0 ${escapeHtml(friendly)}</span>
          <button type="button" class="retry-btn">Retry</button>
        </div>`;
      const retryBtn = aiBubble.querySelector(".retry-btn");
      if (retryBtn) {
        retryBtn.addEventListener("click", async () => {
          // Re-run the AI reply in a fresh bubble.
          await runAiReply(chatRef, rawText, searchResults, searchError, searchSkipped);
        });
      }
    }
  } finally {
    isStreaming = false;
  }
}

function createActionButtons(rawText) {
  const safeText = toSafeString(rawText);

  const wrap = document.createElement("div");
  wrap.className = "ai-actions";

  const likeBtn = document.createElement("button");
  likeBtn.className = "ai-action-btn";
  likeBtn.title = "Good response";
  likeBtn.innerHTML = `${ICON_THUMBUP}<span>Good</span>`;
  likeBtn.addEventListener("click", () => {
    const isActive = likeBtn.classList.toggle("active-good");
    dislikeBtn.classList.remove("active-bad");
    const likeSpan = likeBtn.querySelector("span");
    const dislikeSpan = dislikeBtn.querySelector("span");
    if (likeSpan) likeSpan.textContent = isActive ? "Liked!" : "Good";
    if (dislikeSpan) dislikeSpan.textContent = "Bad";
  });

  const dislikeBtn = document.createElement("button");
  dislikeBtn.className = "ai-action-btn";
  dislikeBtn.title = "Bad response";
  dislikeBtn.innerHTML = `${ICON_THUMBDOWN}<span>Bad</span>`;
  dislikeBtn.addEventListener("click", () => {
    const isActive = dislikeBtn.classList.toggle("active-bad");
    likeBtn.classList.remove("active-good");
    const dislikeSpan = dislikeBtn.querySelector("span");
    const likeSpan = likeBtn.querySelector("span");
    if (dislikeSpan) dislikeSpan.textContent = isActive ? "Noted!" : "Bad";
    if (likeSpan) likeSpan.textContent = "Good";
  });

  const divider = document.createElement("div");
  divider.className = "ai-action-divider";

  const rememberBtn = document.createElement("button");
  rememberBtn.className = "ai-action-btn";
  rememberBtn.title = "Save this answer to your long-term AI memory";
  rememberBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg><span>Remember</span>`;
  rememberBtn.addEventListener("click", async () => {
    const user = auth?.currentUser;
    if (!user) return;
    const ok = await addMemory(user.uid, safeText);
    rememberBtn.classList.add(ok ? "active-good" : "active-bad");
    const span = rememberBtn.querySelector("span");
    if (span) span.textContent = ok ? "Remembered!" : "Failed";
    rememberBtn.disabled = true;
    setTimeout(() => {
      rememberBtn.disabled = false;
      rememberBtn.classList.remove("active-good", "active-bad");
      if (span) span.textContent = "Remember";
    }, 2200);
  });

  const copyBtn = document.createElement("button");
  copyBtn.className = "ai-action-btn";
  copyBtn.title = "Copy response";
  copyBtn.innerHTML = `${ICON_COPY}<span>Copy</span>`;
  copyBtn.addEventListener("click", () => {
    try {
      navigator.clipboard?.writeText?.(safeText)?.catch(() => {});
    } catch { /* clipboard unavailable */ }
    copyBtn.classList.add("active-copy");
    copyBtn.innerHTML = `${ICON_COPY_CHECK}<span>Copied!</span>`;
    setTimeout(() => {
      copyBtn.classList.remove("active-copy");
      copyBtn.innerHTML = `${ICON_COPY}<span>Copy</span>`;
    }, 2200);
  });

  const shareBtn = document.createElement("button");
  shareBtn.className = "ai-action-btn";
  shareBtn.title = "Share response";
  shareBtn.innerHTML = `${ICON_SHARE}<span>Share</span>`;
  shareBtn.addEventListener("click", () => {
    const sharePayload = {
      title: "Aquila AI",
      text: `Here's what Aquila AI said:\n\n${safeText}`,
    };
    try {
      if (navigator.share) {
        navigator.share(sharePayload).catch(() => {});
      } else if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(sharePayload.text).catch(() => {});
        shareBtn.classList.add("active-share");
        const span = shareBtn.querySelector("span");
        if (span) span.textContent = "Link copied!";
        setTimeout(() => {
          shareBtn.classList.remove("active-share");
          const s = shareBtn.querySelector("span");
          if (s) s.textContent = "Share";
        }, 2200);
      }
    } catch { /* share/clipboard unavailable */ }
  });

  wrap.appendChild(likeBtn);
  wrap.appendChild(dislikeBtn);
  wrap.appendChild(divider);
  wrap.appendChild(rememberBtn);
  wrap.appendChild(copyBtn);
  wrap.appendChild(shareBtn);
  return wrap;
}

function createConfidenceBar() {
  const wrap = document.createElement("div");
  wrap.className = "confidence-bar";

  const label = document.createElement("span");
  label.style.cssText = "font-size:11px;color:var(--text-muted);margin-right:4px;";
  label.textContent = "How confident? ";
  wrap.appendChild(label);

  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.className = "conf-btn";
    btn.textContent = i;
    btn.title = i === 1 ? "Guessed" : i === 5 ? "Absolutely sure" : "";
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".conf-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      if (!Array.isArray(learningState.confidenceHistory)) {
        learningState.confidenceHistory = [];
      }
      learningState.confidenceHistory.push(i);
      // Fix stuck detector: update correctCount based on confidence (P1-10)
      if (i >= 4) learningState.correctCount = (learningState.correctCount || 0) + 1;
      // Emit as evidence so mastery sees it (P1-10)
      try {
        import("./js/learning/evidence.js").then(({ emitLearningEvent }) => {
          const uid = auth?.currentUser?.uid;
          if (uid && db) emitLearningEvent(db, uid, "question_answered", { conceptId: learningState.currentConcept || "general", confidence: i, correct: i >= 4 }).catch(()=>{});
        }).catch(()=>{});
      } catch {}

      // Auto-send confidence as a message to track it
      const confMsg = `[Confidence: ${i}/5]`;
      if (!Array.isArray(conversationHistory)) conversationHistory = [];
      conversationHistory.push({ role: "user", content: confMsg });

      // Show feedback
      btn.parentElement?.insertAdjacentHTML('afterend',
        `<span style="font-size:11px;color:var(--accent);margin-left:8px;">Tracked</span>`
      );
    });
    wrap.appendChild(btn);
  }

  return wrap;
}

async function streamGroqResponse(bubble, systemPrompt) {
  let res = await fetch(API_ENDPOINT, {
    method : "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      model    : MODEL,
      messages : [
        { role: "system", content: systemPrompt },
        ...toSafeArray(conversationHistory),
      ],
      max_tokens : 2048,
      temperature: 0.65,
      stream     : true,
    }),
  });

  // If the backend reports an unauthenticated/expired session, force a token
  // refresh and retry exactly once before surfacing an error.
  if (res.status === 401) {
    const user = auth?.currentUser;
    if (user) {
      try {
        await user.getIdToken(true);
        res = await fetch(API_ENDPOINT, {
          method : "POST",
          headers: await authHeaders(),
          body: JSON.stringify({
            model    : MODEL,
            messages : [
              { role: "system", content: systemPrompt },
              ...toSafeArray(conversationHistory),
            ],
            max_tokens : 2048,
            temperature: 0.65,
            stream     : true,
          }),
        });
      } catch (e) {
        console.error("Token refresh failed:", e);
      }
    }
  }

  // IMPORTANT: never read the body on a successful response — the SSE stream
  // is consumed by the reader below. Only < 200 responses carry a JSON body.

  if (res.status === 429 || res.status === 401 || !res.ok) {
    let err = {};
    try {
      err = (await res.json()) || {};
    } catch { /* ignore parse errors on error body */ }

    if (res.status === 429 || err?.error?.code === "limit_reached") {
      let info = {};
      try { info = err?.error || {}; } catch { /* ignore */ }
      const uid = auth?.currentUser?.uid || window.__aquila_uid || "";
      showLimitModal({ type: "chat", plan: info.plan, used: info.used, limit: info.limit, uid });
      throw new Error("Daily chat limit reached.");
    }

    if (res.status === 401) {
      throw new Error("Your session expired. Please sign in again.");
    }

    throw new Error(err?.error?.message || `Groq API error ${res.status}`);
  }

  if (!res.body || typeof res.body.getReader !== "function") {
    throw new Error("No response stream received from the API");
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText  = "";
  let buffer    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const stripped = toSafeString(line).replace(/^data: /, "").trim();
      if (!stripped || stripped === "[DONE]") continue;
      try {
        const json  = JSON.parse(stripped);
        const delta = json?.choices?.[0]?.delta?.content || "";
        if (delta) {
          fullText += delta;
          if (bubble) {
            bubble.innerHTML = renderMarkdown(fullText) + cursorHtml();
          }
          smoothScrollToBottom();
        }
      } catch { /* ignore parse errors on partial chunks */ }
    }
  }

  if (bubble) {
    bubble.innerHTML = renderMarkdown(fullText);
  }
  smoothScrollToBottom();
  return fullText;
}

export function renderMessage(role, content) {
  const chatArea = document.getElementById("chatArea");
  if (!chatArea) return;

  const safeContent = toSafeString(content);

  if (role === "user") {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;justify-content:flex-end;padding:6px 20px;";
    wrap.innerHTML = `
      <div style="
        background:#1e2130;
        border:1px solid rgba(255,255,255,0.08);
        border-radius:14px 14px 4px 14px;
        padding:12px 16px;
        max-width:72%;
        font-size:14px;
        line-height:1.65;
        color:#f0f0f8;
        word-break:break-word;
      ">${escapeHtml(safeContent)}</div>`;
    chatArea.appendChild(wrap);
  } else {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:12px;padding:6px 20px;align-items:flex-start;";
    const bubble = document.createElement("div");
    bubble.className = "ai-bubble";
    bubble.style.cssText = "flex:1;font-size:14px;line-height:1.75;word-break:break-word;";
    bubble.innerHTML = renderMarkdown(safeContent);
    bubble.appendChild(createActionButtons(safeContent));
    bubble.appendChild(createConfidenceBar());
    wrap.innerHTML = `
      <div style="
        width:30px;height:30px;flex-shrink:0;
        background:linear-gradient(135deg,#6c63ff,#00d4aa);
        border-radius:8px;display:flex;align-items:center;
        justify-content:center;font-size:14px;margin-top:2px;
      ">\u{1F4DD}</div>`;
    wrap.appendChild(bubble);
    chatArea.appendChild(wrap);
  }
  smoothScrollToBottom();
}

function createAiBubble() {
  const chatArea = document.getElementById("chatArea");
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:12px;padding:6px 20px;align-items:flex-start;";
  const bubble = document.createElement("div");
  bubble.className = "ai-bubble";
  bubble.style.cssText = "flex:1;font-size:14px;line-height:1.75;word-break:break-word;";
  bubble.innerHTML = typingIndicator();
  wrap.innerHTML = `
    <div style="
      width:30px;height:30px;flex-shrink:0;
      background:linear-gradient(135deg,#6c63ff,#00d4aa);
      border-radius:8px;display:flex;align-items:center;
      justify-content:center;font-size:14px;margin-top:2px;
    ">\u{1F4DD}</div>`;
  wrap.appendChild(bubble);
  if (chatArea) chatArea.appendChild(wrap);
  smoothScrollToBottom();
  return bubble;
}

export function clearWelcome() {
  const welcome = document.getElementById("welcomeScreen");
  if (welcome) welcome.remove();
}

function smoothScrollToBottom() {
  const ca = document.getElementById("chatArea");
  if (ca) {
    ca.scrollTo({
      top: ca.scrollHeight,
      behavior: "smooth",
    });
  }
}

function normalizeMath(text) {
  let s = String(text);
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "√$1");
  s = s.replace(/\\sqrt\s*([0-9a-zA-Z]+)/g, "√$1");
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");
  s = s.replace(/\\times/g, "×");
  s = s.replace(/\\div/g, "÷");
  s = s.replace(/\\pi/g, "π");
  s = s.replace(/\\neq/g, "≠");
  s = s.replace(/\\leq/g, "≤");
  s = s.replace(/\\geq/g, "≥");
  s = s.replace(/\\to/g, "→");
  s = s.replace(/\\pm/g, "±");
  s = s.replace(/\\infty/g, "∞");
  s = s.replace(/\^\{2\}/g, "²");
  s = s.replace(/\^\{3\}/g, "³");
  // Remove $ math delimiters but keep inner content (we show Unicode, not LaTeX)
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  s = s.replace(/\$([^$]+)\$/g, "$1");
  return s;
}

function renderMarkdown(md) {
  const safeMd = normalizeMath(toSafeString(md));
  let html = escapeHtml(safeMd);
  if (typeof html !== "string") html = safeMd;

  // Fenced code blocks (language-agnostic).
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;overflow-x:auto;font-family:'Space Mono',monospace;font-size:12.5px;margin:10px 0;"><code>${toSafeString(code).trim()}</code></pre>`
  );

  // Inline code.
  html = html.replace(/`([^`]+)`/g,
    `<code style="background:rgba(108,99,255,0.15);border-radius:4px;padding:2px 6px;font-family:'Space Mono',monospace;font-size:12.5px;color:var(--accent2);">$1</code>`
  );

  // Markdown links -> safe anchors.
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    `<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline;">$1</a>`
  );
  // Bare URLs -> autolinks.
  html = html.replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g,
    `<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline;">$1</a>`
  );

  // Headings.
  html = html.replace(/^### (.+)$/gm,
    `<h3 style="font-size:15px;font-weight:600;margin:14px 0 6px;">$1</h3>`
  );
  html = html.replace(/^## (.+)$/gm,
    `<h2 style="font-size:17px;font-weight:700;margin:16px 0 8px;border-bottom:1px solid var(--border);padding-bottom:6px;">$1</h2>`
  );
  html = html.replace(/^# (.+)$/gm,
    `<h1 style="font-size:20px;font-weight:700;margin:18px 0 10px;">$1</h1>`
  );

  // Bold & italic.
  html = html.replace(/\*\*(.+?)\*\*/g,
    `<strong style="font-weight:600;">$1</strong>`
  );
  html = html.replace(/\*(.+?)\*/g, `<em>$1</em>`);

  // Blockquotes: wrap consecutive `&gt; ` lines in a styled block.
  html = html.replace(/((?:^|(?<=\n))&gt; [^\n]+(?:\n&gt; [^\n]+)*)/g,
    `<blockquote style="border-left:3px solid var(--accent2);padding:4px 14px;margin:10px 0;color:var(--text-secondary);background:rgba(167,139,250,0.06);border-radius:6px;">$1</blockquote>`
  ).replace(/&gt; /g, "");

  // Unordered lists: group consecutive items into one <ul>.
  html = html.replace(/((?:^|(?<=\n))(?:[*\-] [^\n]+)(?:\n[*\-] [^\n]+)*)/g,
    (m) => `<ul style="margin:8px 0;padding-left:20px;">${m.split("\n").map(l => `<li style="margin:4px 0;list-style:disc;">${l.replace(/^[*\-] /, "")}</li>`).join("")}</ul>`
  );

  // Ordered lists.
  html = html.replace(/((?:^|(?<=\n))(?:[0-9]+\. [^\n]+)(?:\n[0-9]+\. [^\n]+)*)/g,
    (m) => `<ol style="margin:8px 0;padding-left:20px;">${m.split("\n").map(l => `<li style="margin:4px 0;">${l.replace(/^[0-9]+\. /, "")}</li>`).join("")}</ol>`
  );

  // Markdown tables.
  html = html.replace(/((?:^|(?<=\n))\|.*\|(?:\n\|.*\|)*)/g, (block) => {
    const lines = block.split("\n").filter(l => l.trim().length > 0);
    const body = lines.filter(l => !/^\|[\s\-:|]+\|$/.test(l.trim()));
    if (body.length === 0) return block;
    const rows = body.map((l, i) => {
      const cells = l.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      const tag = i === 0 ? "th" : "td";
      return `<tr>${cells.map(c => `<${tag} style="padding:8px 12px;border:1px solid var(--border);text-align:left;">${c}</${tag}>`).join("")}</tr>`;
    }).join("");
    return `<div style="overflow-x:auto;margin:10px 0;"><table style="border-collapse:collapse;width:100%;font-size:13px;"><tbody>${rows}</tbody></table></div>`;
  });

  // Horizontal rule.
  html = html.replace(/^---$/gm,
    `<hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">`
  );

  html = html.replace(/\n/g, "<br>");

  return html;
}

function typingIndicator() {
  return `<span style="display:inline-flex;gap:4px;align-items:center;height:22px;">
    ${[0, 200, 400].map(d =>
      `<span style="
        width:6px;height:6px;border-radius:50%;background:#6c63ff;
        animation:aquilaDot 1.2s ease-in-out ${d}ms infinite;
        display:inline-block;
      "></span>`
    ).join("")}
  </span>
  <style>
    @keyframes aquilaDot {
      0%,80%,100%{transform:translateY(0);opacity:.4}
      40%{transform:translateY(-6px);opacity:1}
    }
  </style>`;
}

function cursorHtml() {
  return `<span style="
    display:inline-block;width:2px;height:15px;background:#6c63ff;
    border-radius:2px;margin-left:2px;vertical-align:middle;
    animation:blink .7s step-end infinite;
  "></span>`;
}

async function ensureChatSession(firstMessage) {
  const user = auth?.currentUser;
  if (!user) return null;

  if (activeChatId) {
    try {
      return doc(db, "users", user.uid, "chats", activeChatId);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  const safeMessage = toSafeString(firstMessage);
  const title = safeMessage.slice(0, 60) + (safeMessage.length > 60 ? "\u2026" : "");

  try {
    const chatRef = await addDoc(
      collection(db, "users", user.uid, "chats"),
      {
        title,
        createdAt : serverTimestamp(),
        updatedAt : serverTimestamp(),
        messageCount: 0,
      }
    );
    activeChatId = chatRef.id;
    return chatRef;
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function saveMessage(chatRef, role, content) {
  if (!chatRef) return;
  const safeContent = toSafeString(content).slice(0, 32000);
  if (!safeContent) return;
  try {
    await addDoc(collection(chatRef, "messages"), {
      role,
      content: safeContent,
      ts: serverTimestamp(),
    });
    await setDoc(chatRef, { updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.error(e);
  }
}

async function updateChatTitle(chatRef, title) {
  if (!chatRef) return;
  try {
    await setDoc(chatRef, { title: toSafeString(title) }, { merge: true });
  } catch (e) {
    console.error(e);
  }
}

function updateSidebarTitle(chatId, title) {
  if (!chatId) return;
  const el = document.querySelector(`[data-chat-id="${chatId}"]`);
  if (!el) return;
  const titleEl = el.querySelector(".chat-title") || el.childNodes[1];
  if (titleEl) titleEl.textContent = toSafeString(title);
}

window.sendMessage   = sendMessage;
window.clearWelcome  = clearWelcome;
window.toggleSearch  = toggleSearch;

// Render the welcome/onboarding screen on initial load if the chat area is empty.
(function initWelcome() {
  const chatArea = document.getElementById("chatArea");
  if (chatArea && !chatArea.querySelector(".message-row")) {
    renderWelcome(chatArea);
  }
  // Personalize the greeting once the signed-in user's name is available.
  auth?.onAuthStateChanged((user) => {
    const name = user?.displayName?.split(" ")[0];
    if (!name) return;
    const h1 = document.querySelector("#welcomeScreen h1");
    if (h1 && !h1.dataset.personalized) {
      h1.textContent = `What are we tackling today, ${name}?`;
      h1.dataset.personalized = "1";
    }
  });
}());
