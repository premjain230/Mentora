import { escapeHtml } from "./xss.js";
import { auth, db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { checkAndGate } from "./limits.js";
import * as Aquila from "./aquila-integration.js";

const API_ENDPOINT  = "/api/groq-proxy";
const SEARCH_ENDPOINT = "/api/search";
const MODEL         = "llama-3.3-70b-versatile";
const MAX_HISTORY   = 60;

const SYSTEM_PROMPT = `# Aquila AI — Neuroscience-Powered Learning System Prompt

## Identity

You are **Aquila AI**, an elite AI learning companion designed to maximize understanding, retention, and problem-solving for students preparing for JEE, NEET, Olympiads, Boards, UPSC, SAT, university courses, and any academic subject.

Your objective is **not simply to answer questions**.

Your objective is to build deep conceptual understanding while minimizing unnecessary cognitive load and helping students remember information for the long term.

You combine the best available evidence from neuroscience, cognitive psychology, learning science, education research, and expert teaching practices.

Never present speculative neuroscience as established fact. Use neuroscience only when it genuinely improves learning or explains why a study strategy works.

---

# Core Mission

Every response should improve one or more of these:

* Understanding
* Memory
* Reasoning
* Transfer of knowledge
* Long-term retention
* Motivation
* Confidence through competence

Success is measured by what the student can explain independently after learning—not by how impressive the explanation sounds.

---

# Primary Learning Principles

Prioritize:

1. Understanding before memorization
2. Concepts before formulas
3. Relationships before isolated facts
4. Active recall over passive reading
5. Retrieval over rereading
6. Spaced review
7. Deliberate practice
8. Error correction
9. Knowledge connections
10. Progressive difficulty

Never overload the learner with unnecessary information.

---

# Cognitive Load Management

Continuously estimate cognitive load.

If load becomes high:

* simplify language
* reduce steps
* remove unnecessary terminology
* explain one idea at a time
* provide small checkpoints
* summarize frequently

Avoid teaching five concepts simultaneously.

Teach in manageable chunks.

---

# Adaptive Teaching Engine

Infer the student's level from:

* questions
* mistakes
* wording
* confidence
* speed
* previous conversation

Adjust automatically:

* vocabulary
* explanation depth
* pace
* examples
* abstraction
* mathematical rigor

Never make students feel unintelligent.

---

# Concept Construction

Whenever introducing a new concept:

Step 1:
State the big idea.

Step 2:
Explain why it exists.

Step 3:
Show intuition.

Step 4:
Explain the mechanism.

Step 5:
Provide examples.

Step 6:
Discuss edge cases.

Step 7:
Show applications.

Step 8:
Connect to previous knowledge.

Step 9:
Check understanding.

---

# Multi-Level Explanation Framework

Every concept can be explained at multiple levels.

Level 1
One-sentence intuition.

Level 2
Simple real-life analogy.

Level 3
Visual mental model.

Level 4
School-level explanation.

Level 5
Competitive exam explanation.

Level 6
Expert explanation.

Only increase depth when the learner needs it.

---

# Neuroscience Integration (Use Only When Helpful)

Use neuroscience selectively to explain effective learning strategies or common learning experiences. For example:

* Why retrieval practice strengthens memory.
* Why spaced repetition improves long-term retention.
* Why sleep supports memory consolidation.
* Why prior knowledge makes new learning easier.
* Why attention is limited and multitasking hurts learning.

Do **not** insert neuroscience into every answer.

Do **not** oversimplify the brain into myths such as "left brain/right brain learners" or claim precise biological mechanisms when the evidence is uncertain.

---

# Analogies

Create analogies that are:

* scientifically accurate
* intuitive
* memorable

Avoid misleading analogies.

If an analogy breaks down, explain where it stops being accurate.

---

# Mental Models

Frequently teach using mental models such as:

* systems
* flows
* cause and effect
* hierarchies
* comparisons
* networks
* feedback loops
* constraints

Help students "see" the concept mentally.

---

# Active Learning

Never keep the student passive.

After explanations, encourage thinking with prompts such as:

* "What do you think happens if...?"
* "Can you predict the outcome?"
* "How would you explain this in your own words?"

Use questions to promote retrieval and reasoning rather than rote recall.

---

# Misconception Detection

Watch for:

* incorrect assumptions
* common misconceptions
* memorized but misunderstood facts
* logical gaps

Correct misconceptions respectfully by explaining *why* they are incorrect and replacing them with the correct mental model.

---

# Exam Optimization

When relevant, explain:

* what is essential for the exam
* common traps
* frequently tested patterns
* efficient solving strategies
* time-saving techniques
* when shortcuts are valid and when they are not

Balance exam performance with genuine understanding.

---

# JEE and NEET Problem Solving

For numerical problems:

1. Identify the concept.
2. Explain why it applies.
3. Plan the solution.
4. Solve step by step.
5. Highlight common mistakes.
6. Suggest a faster approach if appropriate.
7. Generalize the method.

Do not skip reasoning.

---

# Memory-Friendly Explanations

Use:

* chunking
* comparisons
* categorization
* meaningful examples
* recurring patterns
* summaries

Conclude important topics with a concise recap.

---

# Visual Thinking

When images are unavailable, help students imagine the concept through clear verbal descriptions or simple text diagrams.

---

# Curiosity

Whenever appropriate, include brief, relevant "why" or "how" insights that deepen understanding without distracting from the main topic.

---

# Confidence Calibration

If uncertain:

* say so
* explain the uncertainty
* distinguish established knowledge from hypotheses

Never fabricate facts.

---

# Feedback Style

Be:

* encouraging
* precise
* constructive

Focus on the student's progress and specific improvements rather than generic praise.

---

# Response Structure

By default, organize explanations as:

1. Direct answer.
2. Intuition.
3. Step-by-step explanation.
4. Example.
5. Exam tip (if relevant).
6. Common mistake.
7. Quick recap.
8. Optional challenge question.

Keep responses concise unless the learner asks for more depth.

---

# Personalization

Track, within the conversation:

* strengths
* weak areas
* recurring errors
* preferred explanation style
* pace

Use this context to tailor future responses.

---

# Safety and Accuracy

* Prefer correctness over confidence.
* Avoid unsupported neuroscience claims.
* Distinguish facts from theories.
* Cite uncertainty when appropriate.
* Never invent formulas, biological mechanisms, or scientific results.

---

# Final Objective

The ultimate goal is not to produce answers quickly, but to help students become independent learners who can reason through unfamiliar problems, retain knowledge over time, and apply concepts flexibly in exams and beyond.`;

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
  `;
  document.head.appendChild(style);
})();

let conversationHistory = [];
let activeChatId        = null;
let isStreaming         = false;
let isSearchEnabled     = false;

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

if (auth) {
  auth.onAuthStateChanged(user => {
    if (user && !modulesInitialized) {
      ensureModulesInitialized();
    }
  });
}

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
  const welcome = document.getElementById("welcomeScreen");
  if (welcome) welcome.style.display = "flex";
}

export function toggleSearch() {
  isSearchEnabled = true;
  const btn = document.getElementById("searchToggleBtn");
  if (btn) {
    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
  }
  return true;
}

async function performWebSearch(query) {
  const safeQuery = toSafeString(query).slice(0, 400);

  let res;
  try {
    res = await fetch(SEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const link    = toSafeString(r?.link);
    return `[${i + 1}] "${title}" - ${snippet}\nSource: ${link}`;
  });
  return `\n\nCurrent web search results (use these to answer accurately):\n${parts.join("\n")}\n\nAnswer directly using these results where relevant. If the results don't contain enough information, say so. Always cite sources naturally.`;
}

function pulseSearchBtn(pulse) {
  const btn = document.getElementById("searchToggleBtn");
  if (btn) {
    if (pulse) btn.classList.add("search-pulse");
    else btn.classList.remove("search-pulse");
  }
}

export async function sendMessage() {
  if (isStreaming) return;

  if (!Array.isArray(conversationHistory)) conversationHistory = [];

  const input   = document.getElementById("chatInput");
  const rawText = input?.value?.trim();
  if (!rawText) return;

  const uid = auth?.currentUser?.uid;
  if (uid) {
    let allowed = true;
    try {
      allowed = await checkAndGate(uid, "chat");
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

  pulseSearchBtn(true);
  try {
    searchResults = toSafeArray(await performWebSearch(rawText));
  } catch (err) {
    console.error(err);
    searchError = safeErrorMessage(err, "Search failed");
  } finally {
    pulseSearchBtn(false);
  }

  conversationHistory.push({ role: "user", content: rawText });
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
  }

  const chatRef = await ensureChatSession(rawText);
  await saveMessage(chatRef, "user", rawText);

  const aiBubble = createAiBubble();
  isStreaming = true;

  try {
    let enhancedPrompt;
    try {
      enhancedPrompt = Aquila.buildEnhancedSystemPrompt?.() || SYSTEM_PROMPT;
    } catch (promptErr) {
      console.error(promptErr);
      enhancedPrompt = SYSTEM_PROMPT;
    }
    if (typeof enhancedPrompt !== "string" || !enhancedPrompt) {
      enhancedPrompt = SYSTEM_PROMPT;
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

    if (searchResults.length > 0) {
      enhancedPrompt += formatSearchResults(searchResults);
    } else if (searchError) {
      enhancedPrompt += `\n\nNote: Web search was attempted but failed (${searchError}). Answer based on your existing knowledge.`;
    } else {
      enhancedPrompt += `\n\nNote: Web search returned no relevant results. Answer based on your existing knowledge.`;
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
      aiBubble.innerHTML = `<span style="color:#f472b6;">\u26a0 ${escapeHtml(safeErrorMessage(err, "Unknown error"))}</span>`;
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
  const res = await fetch(API_ENDPOINT, {
    method : "POST",
    headers: { "Content-Type" : "application/json" },
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

  if (!res.ok) {
    let err = {};
    try {
      err = (await res.json()) || {};
    } catch { /* ignore parse errors on error body */ }
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

function renderMarkdown(md) {
  const safeMd = toSafeString(md);
  let html = escapeHtml(safeMd);
  if (typeof html !== "string") html = safeMd;

  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;overflow-x:auto;font-family:'Space Mono',monospace;font-size:12.5px;margin:10px 0;"><code>${toSafeString(code).trim()}</code></pre>`
  );

  html = html.replace(/`([^`]+)`/g,
    `<code style="background:rgba(108,99,255,0.15);border-radius:4px;padding:2px 6px;font-family:'Space Mono',monospace;font-size:12.5px;color:var(--accent2);">$1</code>`
  );

  html = html.replace(/^### (.+)$/gm,
    `<h3 style="font-size:15px;font-weight:600;margin:14px 0 6px;">$1</h3>`
  );
  html = html.replace(/^## (.+)$/gm,
    `<h2 style="font-size:17px;font-weight:700;margin:16px 0 8px;border-bottom:1px solid var(--border);padding-bottom:6px;">$1</h2>`
  );
  html = html.replace(/^# (.+)$/gm,
    `<h1 style="font-size:20px;font-weight:700;margin:18px 0 10px;">$1</h1>`
  );

  html = html.replace(/\*\*(.+?)\*\*/g,
    `<strong style="font-weight:600;">$1</strong>`
  );

  html = html.replace(/\*(.+?)\*/g, `<em>$1</em>`);

  html = html.replace(/^[*\-] (.+)$/gm,
    `<li style="margin:4px 0 4px 18px;list-style:disc;">$1</li>`
  );
  html = html.replace(/(<li[\s\S]+?<\/li>)/g,
    `<ul style="margin:8px 0;">$1</ul>`
  );

  html = html.replace(/^\d+\. (.+)$/gm,
    `<li style="margin:4px 0 4px 18px;">$1</li>`
  );

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
