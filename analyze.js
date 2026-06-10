// analyze.js — Mentora AI · Quiz Analytics Logic
// Depends on: firebase-config.js (exports `auth` and `db`)

import { auth, db } from "./firebase-config.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─── Auth Setup ──────────────────────────────────────────────────── */
const authInstance = auth || getAuth();
let currentUser = null;

onAuthStateChanged(authInstance, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;

  const name = user.displayName || user.email?.split("@")[0] || "Guest";
  document.getElementById("userName").textContent = name;

  const av = document.getElementById("userAvatar");
  if (user.photoURL) {
    av.innerHTML = `<img src="${esc(user.photoURL)}" alt="${esc(name)}" />`;
  } else {
    av.textContent = name.charAt(0).toUpperCase();
  }

  loadAnalytics(user.uid);
});

document.getElementById("signOutBtn").onclick = async () => {
  await signOut(authInstance);
  window.location.href = "login.html";
};

/* ─── Firestore Schema (expected) ────────────────────────────────────
 *
 *  users/{uid}/quizAttempts/{attemptId}
 *  {
 *    subject:    string,       // e.g. "Physics"
 *    topic:      string,       // e.g. "Kinematics"
 *    title:      string,       // e.g. "Kinematics Practice #3"
 *    totalQ:     number,       // total questions
 *    correct:    number,       // correct answers
 *    incorrect:  number,       // incorrect answers
 *    skipped:    number,       // skipped (optional)
 *    score:      number,       // raw score (marks)
 *    maxScore:   number,       // max possible marks
 *    takenAt:    Timestamp,    // when the quiz was taken
 *  }
 * ──────────────────────────────────────────────────────────────────── */

async function loadAnalytics(uid) {
  show("stateLoading");
  try {
    // Fetch all attempts (up to 500; add pagination for larger datasets)
    const q = query(
      collection(db, "users", uid, "quizAttempts"),
      orderBy("takenAt", "desc"),
      limit(500)
    );
    const snap = await getDocs(q);

    if (snap.empty) { show("stateEmpty"); return; }

    const attempts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const stats = computeStats(attempts);
    renderDashboard(stats, attempts);
    show("dashboard");
  } catch (err) {
    console.error("Analytics error:", err);
    document.getElementById("errorMsg").textContent = err.message;
    show("stateError");
  }
}

/* ─── computeStats ───────────────────────────────────────────────────
 *  Pure function — takes raw attempts array, returns a stats object.
 * ──────────────────────────────────────────────────────────────────── */
function computeStats(attempts) {
  const total = attempts.length;
  const pcts  = attempts.map(a => safePct(a.correct, a.totalQ));

  const avgScore   = avg(pcts);
  const highScore  = Math.max(...pcts);
  const lowScore   = Math.min(...pcts);
  const totalQ     = sum(attempts, "totalQ");
  const totalRight = sum(attempts, "correct");
  const totalWrong = sum(attempts, "incorrect");
  const accuracy   = safePct(totalRight, totalQ);

  // Subject-level aggregation
  const subjectMap   = groupBy(attempts, "subject");
  const subjectStats = Object.entries(subjectMap).map(([name, list]) => ({
    name,
    attempts: list.length,
    correct:  sum(list, "correct"),
    total:    sum(list, "totalQ"),
    pct:      safePct(sum(list, "correct"), sum(list, "totalQ")),
  })).sort((a, b) => b.pct - a.pct);

  const bestSubject    = subjectStats[0]?.name    || "—";
  const weakestSubject = subjectStats.at(-1)?.name || "—";

  // Topic-level aggregation
  const topicMap   = groupBy(attempts, "topic");
  const topicStats = Object.entries(topicMap).map(([name, list]) => ({
    name,
    attempts: list.length,
    correct:  sum(list, "correct"),
    total:    sum(list, "totalQ"),
    pct:      safePct(sum(list, "correct"), sum(list, "totalQ")),
  })).sort((a, b) => b.pct - a.pct);

  // Strong ≥ 75%, Weak < 50%
  const strongTopics = topicStats.filter(t => t.pct >= 75);
  const weakTopics   = topicStats.filter(t => t.pct <  50).reverse();

  // Trend data: last 20 attempts, oldest → newest
  const trendData = [...attempts]
    .slice(0, 20).reverse()
    .map(a => ({ pct: safePct(a.correct, a.totalQ), label: fmt(a.takenAt) }));

  // Weekly & monthly ranges
  const now   = new Date();
  const week  = new Date(now); week.setDate(now.getDate() - 7);
  const month = new Date(now); month.setMonth(now.getMonth() - 1);

  const thisWeek  = attempts.filter(a => toDate(a.takenAt) >= week);
  const thisMonth = attempts.filter(a => toDate(a.takenAt) >= month);

  const weeklyAvg  = avg(thisWeek.map(a  => safePct(a.correct, a.totalQ)));
  const monthlyAvg = avg(thisMonth.map(a => safePct(a.correct, a.totalQ)));

  // Trend delta: last 5 vs previous 5
  const recent5 = pcts.slice(0, 5);
  const prev5   = pcts.slice(5, 10);
  const delta   = prev5.length ? avg(recent5) - avg(prev5) : null;

  return {
    total, avgScore, highScore, lowScore, totalQ, totalRight, totalWrong,
    accuracy, bestSubject, weakestSubject,
    subjectStats, topicStats, strongTopics, weakTopics,
    trendData,
    weekly:  { count: thisWeek.length,  avg: weeklyAvg  },
    monthly: { count: thisMonth.length, avg: monthlyAvg },
    delta,
    recent: attempts.slice(0, 15),
  };
}

/* ─── renderDashboard ────────────────────────────────────────────────
 *  Populates all DOM sections from the computed stats object.
 * ──────────────────────────────────────────────────────────────────── */
function renderDashboard(s) {
  const deltaStr   = s.delta === null ? null
    : (s.delta >= 0 ? `▲ +${s.delta.toFixed(1)}%` : `▼ ${s.delta.toFixed(1)}%`);
  const deltaClass = s.delta === null ? "neutral" : (s.delta >= 0 ? "up" : "down");

  // Overview cards
  const overviewCards = [
    { icon:"📝", value: s.total,                    label:"Quizzes Taken",      color:"var(--accent)",  delta: deltaStr, dClass: deltaClass },
    { icon:"📈", value: s.avgScore.toFixed(1) + "%", label:"Average Score",     color:"var(--accent2)", delta: deltaStr, dClass: deltaClass },
    { icon:"🏆", value: s.highScore + "%",           label:"Highest Score",     color:"var(--accent4)" },
    { icon:"📉", value: s.lowScore + "%",            label:"Lowest Score",      color:"var(--accent3)" },
    { icon:"✅", value: s.totalRight,               label:"Correct Answers",   color:"var(--accent2)" },
    { icon:"❌", value: s.totalWrong,               label:"Incorrect Answers", color:"var(--accent3)" },
    { icon:"⭐", value: s.bestSubject,              label:"Best Subject",      color:"var(--accent4)" },
    { icon:"⚡", value: s.weakestSubject,           label:"Needs Work",        color:"var(--accent3)" },
  ];
  document.getElementById("overviewGrid").innerHTML =
    overviewCards.map(c => statCard(c)).join("");

  // Donut chart
  const circ   = 2 * Math.PI * 15.9;
  const offset = circ - (s.accuracy / 100) * circ;
  const fg     = document.getElementById("donutFg");
  fg.setAttribute("stroke-dasharray",  `${circ} ${circ}`);
  fg.setAttribute("stroke-dashoffset", circ);
  requestAnimationFrame(() => {
    fg.style.transition = "stroke-dashoffset 1s ease";
    fg.setAttribute("stroke-dashoffset", offset);
  });
  document.getElementById("donutPct").textContent = s.accuracy + "%";
  document.getElementById("donutLegend").innerHTML = `
    <div class="legend-item"><span class="legend-dot" style="background:var(--accent2)"></span>Correct — ${s.totalRight}</div>
    <div class="legend-item"><span class="legend-dot" style="background:var(--accent3)"></span>Incorrect — ${s.totalWrong}</div>
    <div class="legend-item"><span class="legend-dot" style="background:var(--text-muted)"></span>Total Qs — ${s.totalQ}</div>
  `;

  // Trend sparkline
  if (s.trendData.length >= 3) {
    const canvas = document.getElementById("trendCanvas");
    document.getElementById("trendEmpty").style.display = "none";
    canvas.style.display = "block";
    drawSparkline(canvas, s.trendData.map(d => d.pct));
  }

  // Subject & Topic bars
  document.getElementById("subjectBars").innerHTML =
    s.subjectStats.slice(0, 8).map(sub => barItem(sub.name, sub.pct, pickColor(sub.pct))).join("");
  document.getElementById("topicBars").innerHTML =
    s.topicStats.slice(0, 8).map(t   => barItem(t.name,   t.pct,   pickColor(t.pct))).join("");

  // Strength / Weakness pills
  const strongEl = document.getElementById("strongPills");
  const weakEl   = document.getElementById("weakPills");
  strongEl.innerHTML = s.strongTopics.length
    ? s.strongTopics.slice(0, 12).map(t =>
        `<span class="pill strong">✓ ${esc(t.name)} <span class="pct">${t.pct}%</span></span>`).join("")
    : `<span style="color:var(--text-muted);font-size:13px;">No strong topics yet — keep practising!</span>`;
  weakEl.innerHTML = s.weakTopics.length
    ? s.weakTopics.slice(0, 12).map(t =>
        `<span class="pill weak">⚠ ${esc(t.name)} <span class="pct">${t.pct}%</span></span>`).join("")
    : `<span style="color:var(--text-muted);font-size:13px;">No weak topics — great work! 🎉</span>`;

  // Period stats
  document.getElementById("periodGrid").innerHTML = [
    { icon:"📅", value: s.weekly.count,                label:"Quizzes This Week",   color:"var(--accent)"  },
    { icon:"📊", value: s.weekly.avg.toFixed(1) + "%", label:"Weekly Avg Score",    color:"var(--accent2)" },
    { icon:"🗓️", value: s.monthly.count,               label:"Quizzes This Month",  color:"var(--accent)"  },
    { icon:"📊", value: s.monthly.avg.toFixed(1) + "%",label:"Monthly Avg Score",   color:"var(--accent2)" },
  ].map(c => statCard(c)).join("");

  // Achievements
  document.getElementById("achGrid").innerHTML = buildAchievements(s).map(a => `
    <div class="ach-card ${a.earned ? "earned" : "locked"}">
      <span class="ach-emoji">${a.emoji}</span>
      <div class="ach-title">${esc(a.title)}</div>
      <div class="ach-desc">${esc(a.desc)}</div>
    </div>`).join("");

  // Recent history table
  document.getElementById("historyBody").innerHTML = s.recent.map(a => {
    const pct  = safePct(a.correct, a.totalQ);
    const cls  = pct >= 75 ? "hi" : pct >= 50 ? "mid" : "lo";
    const date = fmt(a.takenAt);
    return `<tr>
      <td>${esc(a.title || a.topic || "—")}</td>
      <td>${esc(a.subject || "—")}</td>
      <td><span class="score-badge ${cls}">${a.correct}/${a.totalQ}</span></td>
      <td><span class="score-badge ${cls}">${pct}%</span></td>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${date}</td>
    </tr>`;
  }).join("");
}

/* ─── buildAchievements ──────────────────────────────────────────────
 *  Returns achievement objects with earned/locked status.
 * ──────────────────────────────────────────────────────────────────── */
function buildAchievements(s) {
  return [
    { emoji:"🚀", title:"First Launch",   desc:"Took your first quiz",              earned: s.total >= 1 },
    { emoji:"🔟", title:"10 Quizzes",     desc:"Completed 10 quiz attempts",        earned: s.total >= 10 },
    { emoji:"💯", title:"Perfect Score",  desc:"Scored 100% on a quiz",             earned: s.highScore === 100 },
    { emoji:"🔥", title:"On Fire",        desc:"Averaged ≥80% across all quizzes",  earned: s.avgScore >= 80 },
    { emoji:"🌟", title:"Star Performer", desc:"Have ≥3 strong topics",             earned: s.strongTopics.length >= 3 },
    { emoji:"📚", title:"Subject Master", desc:"Attempted ≥3 different subjects",   earned: s.subjectStats.length >= 3 },
    { emoji:"🗓️", title:"Weekly Warrior", desc:"Took 5+ quizzes in a week",         earned: s.weekly.count >= 5 },
    { emoji:"📈", title:"Upward Trend",   desc:"Recent scores improving",           earned: s.delta !== null && s.delta > 5 },
  ];
}

/* ─── drawSparkline ──────────────────────────────────────────────────
 *  Draws a Canvas-based score trend line chart.
 * ──────────────────────────────────────────────────────────────────── */
function drawSparkline(canvas, values) {
  const dpr    = window.devicePixelRatio || 1;
  const W      = canvas.parentElement.clientWidth;
  const H      = 130;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx    = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const pad    = { top: 12, right: 16, bottom: 28, left: 36 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;
  const n      = values.length;

  const minV   = Math.max(0,   Math.min(...values) - 10);
  const maxV   = Math.min(100, Math.max(...values) + 10);
  const xScale = i => pad.left + (i / (n - 1)) * chartW;
  const yScale = v => pad.top  + chartH - ((v - minV) / (maxV - minV)) * chartH;

  // Grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth   = 1;
  [0, 25, 50, 75, 100].forEach(pct => {
    const y = yScale(pct);
    if (y >= pad.top && y <= pad.top + chartH) {
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font      = "10px 'Space Mono', monospace";
      ctx.fillText(pct + "%", 0, y + 4);
    }
  });

  // Gradient fill under line
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  grad.addColorStop(0, "rgba(108,99,255,0.25)");
  grad.addColorStop(1, "rgba(108,99,255,0)");
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = xScale(i), y = yScale(v);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(xScale(n - 1), pad.top + chartH);
  ctx.lineTo(xScale(0),     pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Main line
  ctx.beginPath();
  ctx.strokeStyle = "#6c63ff";
  ctx.lineWidth   = 2;
  ctx.lineJoin    = "round";
  ctx.lineCap     = "round";
  values.forEach((v, i) => {
    const x = xScale(i), y = yScale(v);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Data point dots
  values.forEach((v, i) => {
    const x = xScale(i), y = yScale(v);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle   = "#6c63ff";
    ctx.fill();
    ctx.strokeStyle = "#0a0b0f";
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  });
}

/* ─── DOM Builder Helpers ────────────────────────────────────────────*/
function statCard({ icon, value, label, color, delta, dClass }) {
  return `<div class="stat-card" style="--card-accent:${color || "var(--accent)"}">
    <div class="stat-icon">${icon}</div>
    <div class="stat-value">${esc(String(value))}</div>
    <div class="stat-label">${esc(label)}</div>
    ${delta ? `<div class="stat-delta ${dClass || "neutral"}">${esc(delta)}</div>` : ""}
  </div>`;
}

function barItem(name, pct, color) {
  return `<div class="bar-item">
    <div class="bar-meta">
      <span class="bar-name">${esc(name)}</span>
      <span class="bar-pct">${pct}%</span>
    </div>
    <div class="bar-track">
      <div class="bar-fill" style="width:${pct}%;--bar-color:${color}"></div>
    </div>
  </div>`;
}

/* ─── Utility Functions ──────────────────────────────────────────────*/

/** Switch visible state screen */
function show(id) {
  ["stateLoading", "stateEmpty", "stateError", "dashboard"].forEach(s => {
    const el = document.getElementById(s);
    el.style.display = s === id ? (id === "dashboard" ? "block" : "flex") : "none";
  });
}

/** Group array of objects by a string key */
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || "Unknown";
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

/** Sum a numeric field across an array */
function sum(arr, field) {
  return arr.reduce((s, x) => s + (Number(x[field]) || 0), 0);
}

/** Average of a number array, rounded to 1 decimal */
function avg(arr) {
  return arr.length
    ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10
    : 0;
}

/** Safe integer percentage — avoids division by zero */
function safePct(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

/** Color based on percentage threshold */
function pickColor(pct) {
  if (pct >= 75) return "var(--accent2)";
  if (pct >= 50) return "var(--accent4)";
  return "var(--accent3)";
}

/** Format a Firestore Timestamp or JS Date to readable string */
function fmt(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

/** Convert Firestore Timestamp or Date-like to JS Date */
function toDate(ts) {
  if (!ts) return new Date(0);
  return ts.toDate ? ts.toDate() : new Date(ts);
}

/** HTML-escape a value to prevent XSS */
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
