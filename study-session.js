// ── study-session.js ──
// Guide for study-session.html.
// - Auth guard (redirects to login.html when signed out).
// - Setup view: subject, topic, duration, optional goal → calls /api/study-session
//   for the AI-guided plan.
// - Session view: live timer ring, objectives checklist, key points, practice
//   questions, focus tips. Persists to `users/{uid}/studySessions/{sessionId}`.
// - History: recent past sessions from the same Firestore collection (shared
//   with the Aquila mobile app).

import { auth, db, firebaseReady } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { emitLearningEvent } from "./js/learning/evidence.js";

const API_ENDPOINT = "/api/study-session";

let currentUser = null;
let sessionDocId = null;
let timerInterval = null;
let secondsElapsed = 0;
let sessionStatus = "active";
let plan = null;

// ─── Auth guard ───────────────────────────────────────────────────────────────
firebaseReady.then(() => {
  if (!auth) {
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d0e16;color:#f0f0f8;font-family:'Sora',sans-serif;padding:24px;text-align:center;"><div><h1 style="font-size:20px;margin-bottom:12px;">Unable to connect</h1><p style="color:#888;font-size:14px;">Firebase configuration is unavailable. Please check your environment settings and try again.</p></div></div>`;
    return;
  }
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    if (!user.emailVerified) {
      window.location.href = "verify-email.html";
      return;
    }
    currentUser = user;
    populateUserCard(user);
    loadHistory();
    renderSetup();
  });
});

// ─── Sidebar user card ────────────────────────────────────────────────────────
function populateUserCard(user) {
  const nameEl   = document.getElementById("userName");
  const planEl   = document.getElementById("userPlan");
  const avatarEl = document.getElementById("userAvatar");

  const name = user.displayName || user.email?.split("@")[0] || "Student";
  if (nameEl) nameEl.textContent = name;
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

  const btn = document.getElementById("signOutBtn");
  if (btn) btn.addEventListener("click", () => fbSignOut(auth).then(() => (window.location.href = "login.html")));
}

// ─── Rendering ────────────────────────────────────────────────────────────────
const content = () => document.getElementById("contentInner");

function renderSetup() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  sessionDocId = null;
  plan = null;

  content().innerHTML = `
    <h1 class="page-title">Study Session</h1>
    <p class="page-sub">A guided focus block — pick a subject and topic, set a timer, and Aquila builds you goals, key points and practice questions to work through.</p>

    <div class="card fade-up">
      <div class="card-label">Set up your session</div>
      <div class="field-label">Subject</div>
      <input type="text" id="ssSubject" placeholder="e.g. Physics" maxlength="100" />
      <div class="field-label">Topic</div>
      <input type="text" id="ssTopic" placeholder="e.g. Newton's Laws of Motion" maxlength="200" />
      <div class="field-label">Duration</div>
      <div class="duration-row">
        ${[10, 20, 25, 30, 45, 60].map((m) => `<button type="button" class="duration-chip${m === 25 ? " active" : ""}" data-min="${m}" onclick="window.__ssPickDuration(this)">${m} min</button>`).join("")}
      </div>
      <div class="field-label">Focus goal <span style="color:var(--text-muted);font-weight:400;">(optional)</span></div>
      <textarea id="ssGoal" placeholder="e.g. Master the three laws and solve 5 problems."></textarea>
      <button class="btn-gradient" id="ssStartBtn">Start Session</button>
    </div>

    <div class="card fade-up">
      <div class="card-label">Recent sessions</div>
      <div id="ssHistory"><div class="loading"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></div></div>
    </div>
  `;

  window.__ssPickDuration = (el) => {
    document.querySelectorAll(".duration-chip").forEach((c) => c.classList.remove("active"));
    el.classList.add("active");
  };

  document.getElementById("ssStartBtn").addEventListener("click", startSession);
}

function renderHistory(list) {
  const wrap = document.getElementById("ssHistory");
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = `<div class="empty-state">No sessions yet. Start your first guided focus block above — it stays synced with the Aquila app.</div>`;
    return;
  }
  wrap.innerHTML = list.map((s) => {
    const statusLabel =
      s.status === "completed" ? "Completed"
      : s.status === "abandoned" ? "Abandoned"
      : "Active";
    const cls = s.status || "active";
    const mins = s.durationMinutes ? `${s.durationMinutes} min` : "";
    const when = s.startedAt ? new Date(s.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
    return `
      <div class="history-item">
        <div class="history-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
        <div class="history-body">
          <div class="history-name">${escapeHtml(s.subject)} · ${escapeHtml(s.topic)}</div>
          <div class="history-sub">${[mins, when].filter(Boolean).join(" · ")}</div>
        </div>
        <span class="history-status ${cls}">${statusLabel}</span>
      </div>`;
  }).join("");
}

function renderSession() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

  const total = plan.durationMinutes * 60;
  const pct = Math.min(100, (secondsElapsed / total) * 100);

  const objectivesHtml = (plan.objectives || [])
    .map((o, i) => `
      <div class="check-item" data-obj="${i}" onclick="window.__ssToggleObj(this)">
        <div class="check-box"></div>
        <div class="check-label">${escapeHtml(o)}</div>
      </div>`).join("");

  const keyPointsHtml = (plan.keyPoints || [])
    .map((k) => `<div class="key-point"><span class="dot"></span><span>${escapeHtml(k)}</span></div>`).join("");

  const practiceHtml = (plan.practiceQuestions || [])
    .map((q) => `<div class="practice-item">${escapeHtml(q)}</div>`).join("");

  const tipsHtml = (plan.focusTips || [])
    .map((t, i) => `<div class="key-point"><span class="dot" style="background:var(--accent2);"></span><span>${escapeHtml(t)}</span></div>`).join("");

  content().innerHTML = `
    <div class="session-header fade-up">
      <div class="session-title">${escapeHtml(plan.title)}</div>
      <div class="session-meta">${escapeHtml(plan.subject)} · ${escapeHtml(plan.topic)} · ${plan.durationMinutes} min</div>
    </div>

    <div class="card fade-up" style="text-align:center;">
      <div class="timer-wrap">
        <div class="timer-ring" id="ssTimerRing">
          <div>
            <div class="timer-time" id="ssTimer">00:00</div>
            <div class="timer-sub">focused time</div>
          </div>
        </div>
      </div>
      <div class="goal-box" id="ssGoalBox" style="display:none;"><span class="goal-label">Focus goal</span><span id="ssGoalText"></span></div>
      <div style="display:flex;gap:10px;margin-top:18px;">
        <button class="btn-outline" id="ssPauseBtn" style="margin-top:0;flex:1;">Pause</button>
        <button class="btn-outline" id="ssResumeBtn" style="margin-top:0;flex:1;display:none;">Resume</button>
        <button class="btn-danger" id="ssEndBtn" style="margin-top:0;flex:1;">Finish Session</button>
      </div>
    </div>

    <div class="card fade-up">
      <div class="section-heading">Today's goals</div>
      ${objectivesHtml || `<div class="empty-state">No objectives generated.</div>`}
      ${tipsHtml ? `<div class="section-heading" style="color:var(--accent2);">Stay focused</div>${tipsHtml}` : ""}
    </div>

    <div class="card fade-up">
      <div class="section-heading">Key concepts</div>
      ${keyPointsHtml || `<div class="empty-state">No key points generated.</div>`}
      ${practiceHtml ? `<div class="section-heading">Practice questions</div>${practiceHtml}` : ""}
    </div>
  `;

  window.__ssToggleObj = (el) => el.classList.toggle("done");

  document.getElementById("ssPauseBtn").addEventListener("click", pauseTimer);
  document.getElementById("ssResumeBtn").addEventListener("click", resumeTimer);
  document.getElementById("ssEndBtn").addEventListener("click", endSession);

  const goalBox = document.getElementById("ssGoalBox");
  const goalText = document.getElementById("ssGoalText");
  if (plan.goal) {
    goalBox.style.display = "block";
    goalText.textContent = plan.goal;
  }

  updateTimerDisplay();
  timerInterval = setInterval(tick, 1000);
}

// ─── Session lifecycle ────────────────────────────────────────────────────────
async function startSession() {
  const subject = document.getElementById("ssSubject").value.trim();
  const topic   = document.getElementById("ssTopic").value.trim();
  const goal    = document.getElementById("ssGoal").value.trim();
  const activeChip = document.querySelector(".duration-chip.active");
  const durationMinutes = parseInt(activeChip?.dataset.min, 10) || 25;

  if (!subject) return window.__aquilaToast("Please enter a subject.");
  if (!topic)   return window.__aquilaToast("Please enter a topic.");

  const btn = document.getElementById("ssStartBtn");
  btn.disabled = true;
  btn.textContent = "Building your session…";

  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      credentials: "same-origin",
      body: JSON.stringify({ subject, topic, durationMinutes, goal }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not create your session.");

    plan = { goal: goal || "", ...data.plan };

    // Persist an active session so the mobile app can see/resume it too.
    const ref = doc(collection(db, "users", currentUser.uid, "studySessions"));
    const payload = {
      subject: plan.subject,
      topic: plan.topic,
      durationMinutes: plan.durationMinutes,
      goal: plan.goal,
      plan: {
        title: plan.title,
        objectives: plan.objectives,
        keyPoints: plan.keyPoints,
        practiceQuestions: plan.practiceQuestions,
        focusTips: plan.focusTips,
      },
      status: "active",
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    sessionDocId = ref.id;
    secondsElapsed = 0;
    try{
      const cid = `${String(plan.subject||"").toLowerCase().replace(/[^a-z0-9]+/g,"_")}_${String(plan.topic||"").toLowerCase().replace(/[^a-z0-9]+/g,"_")}`.replace(/^_+|_+$/g,"").slice(0,120) || null;
      await emitLearningEvent(db, currentUser.uid, "study_session_started", { conceptId: cid, subject: plan.subject, topic: plan.topic, source: "study_session", sessionId: ref.id, payload:{ durationMinutes: plan.durationMinutes, source:"study_session" } });
      await emitLearningEvent(db, currentUser.uid, "lesson_started", { conceptId: cid, subject: plan.subject, topic: plan.topic, source: "study_session", sessionId: ref.id, payload:{ durationMinutes: plan.durationMinutes } });
    }catch{}
    renderSession();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "Start Session";
    window.__aquilaToast(e.message || "Could not create your session right now.");
  }
}

function tick() {
  secondsElapsed++;
  updateTimerDisplay();
  maybePersistProgress();
}

function updateTimerDisplay() {
  const mm = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
  const ss = String(secondsElapsed % 60).padStart(2, "0");
  const el = document.getElementById("ssTimer");
  if (el) el.textContent = `${mm}:${ss}`;
  const ring = document.getElementById("ssTimerRing");
  if (ring && plan) {
    const total = plan.durationMinutes * 60;
    const pct = Math.min(100, (secondsElapsed / total) * 100);
    ring.style.setProperty("--p", `${pct}%`);
  }
}

let lastPersist = 0;
function maybePersistProgress() {
  // Throttle writes to every 10s to avoid hammering Firestore.
  const now = Date.now();
  if (now - lastPersist < 10000) return;
  lastPersist = now;
  if (sessionDocId) {
    updateDoc(doc(db, "users", currentUser.uid, "studySessions", sessionDocId), {
      timeFocused: secondsElapsed,
      updatedAt: serverTimestamp(),
    }).catch((e) => console.warn("Progress save failed", e));
  }
}
function persistProgressNow() {
  if (!sessionDocId || !currentUser) return;
  lastPersist = Date.now();
  updateDoc(doc(db, "users", currentUser.uid, "studySessions", sessionDocId), {
    timeFocused: secondsElapsed,
    updatedAt: serverTimestamp(),
  }).catch(()=>{});
}
// Flush progress when tab is hidden or page is closing (P2-16: prevents loss on crash/close)
document.addEventListener("visibilitychange", () => {
  if (document.hidden && sessionDocId) persistProgressNow();
});
window.addEventListener("beforeunload", () => {
  if (sessionDocId && sessionStatus === "active") { try { persistProgressNow(); } catch {} }
});
window.addEventListener("pagehide", () => { if (sessionDocId) persistProgressNow(); });

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  document.getElementById("ssPauseBtn").style.display = "none";
  document.getElementById("ssResumeBtn").style.display = "block";
}

function resumeTimer() {
  document.getElementById("ssPauseBtn").style.display = "block";
  document.getElementById("ssResumeBtn").style.display = "none";
  timerInterval = setInterval(tick, 1000);
}

async function endSession() {
  clearInterval(timerInterval);
  timerInterval = null;

  const abandoned = confirm("Finish this session? Your focused time will be saved.");
  if (!abandoned) {
    resumeTimer();
    return;
  }

  if (sessionDocId) {
    await updateDoc(doc(db, "users", currentUser.uid, "studySessions", sessionDocId), {
      status: "completed",
      timeFocused: secondsElapsed,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch((e) => console.warn("Session close failed", e));
    try{
      const cid = `${String(plan.subject||"").toLowerCase().replace(/[^a-z0-9]+/g,"_")}_${String(plan.topic||"").toLowerCase().replace(/[^a-z0-9]+/g,"_")}`.replace(/^_+|_+$/g,"").slice(0,120) || null;
      const meaningful = secondsElapsed >= 60; // ignore <1min as meaningful per prompt 26
      if(meaningful){
        await emitLearningEvent(db, currentUser.uid, "study_session_completed", { conceptId: cid, subject: plan.subject, topic: plan.topic, source: "study_session", sessionId: sessionDocId, payload:{ durationMinutes: plan.durationMinutes, timeFocusedSeconds: secondsElapsed, source:"study_session" } });
        if(secondsElapsed>=120) await emitLearningEvent(db, currentUser.uid, "topic_reviewed", { conceptId: cid, subject: plan.subject, topic: plan.topic, source: "study_session", sessionId: sessionDocId, payload:{ timeFocusedSeconds: secondsElapsed } });
      }
    }catch{}
  }

  window.__aquilaToast("Session saved — nice focus! 🎉");
  loadHistory();
  renderSetup();
}

// ─── History ──────────────────────────────────────────────────────────────────
async function loadHistory() {
  try {
    const q = query(
      collection(db, "users", currentUser.uid, "studySessions"),
      orderBy("startedAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Normalize timestamp server values (Firestore returns Date objects).
    list.forEach((s) => {
      if (s.startedAt instanceof Date) s.startedAt = s.startedAt.toISOString();
    });
    renderHistory(list);
  } catch (e) {
    console.warn("Could not load session history:", e);
    const wrap = document.getElementById("ssHistory");
    if (wrap) wrap.innerHTML = `<div class="empty-state">Could not load your history.</div>`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}