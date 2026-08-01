/**
 * dashboard.js — renders the personalized Aquila AI home dashboard.
 * Mounted inside home.html#dashArea by home.js.
 */

import {
  loadDashboardData,
  buildGreeting,
  ACHIEVEMENTS,
  computeLevel,
} from "./retention.js";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function relTime(v) {
  const ts = v && v.toDate ? v.toDate().getTime() : v && typeof v === "object" && v.seconds ? v.seconds * 1000 : null;
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function skeleton() {
  return `
    <header class="dash-hero">
      <div>
        <div class="sk sk-h" style="width:220px;height:26px;"></div>
        <div class="sk" style="width:160px;height:14px;margin-top:10px;"></div>
      </div>
      <div class="dash-pills">
        <div class="sk" style="width:90px;height:34px;border-radius:20px;"></div>
        <div class="sk" style="width:110px;height:34px;border-radius:20px;"></div>
      </div>
    </header>
    <div class="sk" style="width:70%;height:15px;margin:18px 0 6px;"></div>
    <div class="dash-grid">
      <div class="d-card"><div class="sk" style="width:120px;height:16px;margin-bottom:16px;"></div>
        ${Array.from({ length: 3 }).map(() => `<div class="sk" style="width:100%;height:46px;margin-bottom:10px;"></div>`).join("")}
      </div>
      <div class="d-card"><div class="sk" style="width:120px;height:16px;margin-bottom:16px;"></div>
        <div class="sk" style="width:100%;height:64px;margin-bottom:10px;"></div>
        <div class="sk" style="width:80%;height:18px;"></div>
      </div>
    </div>
  `;
}

function missionAction(m) {
  const map = {
    quiz_correct: { href: "quiz.html", label: "Take quiz" },
    review: { href: "review.html", label: "Start review" },
    mistake_review: { href: "review.html", label: "Open notebook" },
    practice_topic: { href: "quiz.html", label: "Practice" },
    daily_question: { href: null, label: "On this page" },
    chat: { href: "home.html?mode=chat", label: "Ask" },
  };
  const a = map[m.type] || { href: null, label: "Start" };
  if (m.type === "practice_topic" && m.topic) {
    a.href = `quiz.html?subject=&topic=${encodeURIComponent(m.topic)}`;
  }
  return a;
}

function renderMissions(missions) {
  if (!missions || !missions.list || missions.list.length === 0) {
    return `<div class="d-empty">Aquila is preparing your missions for today — check back in a moment.</div>`;
  }
  return missions.list.map((m) => {
    const done = !!(missions.completed && missions.completed[m.id]);
    const prog = Math.min(m.target, Number((missions.progress && missions.progress[m.id]) || 0));
    const pct = m.target ? Math.round((prog / m.target) * 100) : 0;
    const action = missionAction(m);
    return `
      <div class="mission ${done ? "done" : ""}">
        <div class="mission-check">${done ? "✓" : ""}</div>
        <div class="mission-body">
          <div class="mission-top">
            <span class="mission-label">${esc(m.label)}</span>
            <span class="mission-xp">+${m.xp} XP</span>
          </div>
          <div class="mission-track"><div class="mission-fill" style="width:${pct}%"></div></div>
          <div class="mission-bottom">
            <span class="mission-count">${prog}/${m.target}</span>
            ${done ? `<span class="mission-done-label">Done</span>`
                  : action.href ? `<a class="mission-cta" href="${esc(action.href)}">${esc(action.label)}</a>` : ""}
          </div>
        </div>
      </div>`;
  }).join("");
}

function renderContinue(last, onResumeChat) {
  if (!last) {
    return `
      <div class="d-empty">
        Start your first study session and Aquila will remember everything you learn.
      </div>
      <a class="btn-primary dash-cta" href="home.html?mode=chat">Start learning</a>`;
  }

  let icon, title, sub, href = null;
  switch (last.type) {
    case "chat":
      icon = "💬";
      title = last.title || "Your last conversation";
      sub = "Pick up exactly where you left off.";
      break;
    case "quiz":
      icon = "📝";
      title = last.title || "Quiz";
      sub = `${esc(last.subject || "Study")}${last.topic ? ` · ${esc(last.topic)}` : ""}`;
      if (last.topic) href = `quiz.html?topic=${encodeURIComponent(last.topic)}`;
      else href = "quiz.html";
      break;
    case "planner":
      icon = "🗓️";
      title = "Study Planner";
      sub = "Today's plan is ready.";
      href = "planner.html";
      break;
    case "review":
      icon = "📓";
      title = "Daily Review";
      sub = "Keep your memory sharp.";
      href = "review.html";
      break;
    default:
      icon = "🎯";
      title = "Keep going";
      sub = "One small session is enough.";
      href = "home.html?mode=chat";
  }

  return `
    <div class="continue-card">
      <div class="continue-icon">${icon}</div>
      <div class="continue-info">
        <div class="continue-title">${esc(title)}</div>
        <div class="continue-sub">${sub}</div>
      </div>
      ${last.type === "chat" && last.chatId
        ? `<button class="continue-btn" onclick="window.__resumeChat('${esc(String(last.chatId))}')">Resume</button>`
        : href ? `<a class="continue-btn" href="${esc(href)}">Continue</a>` : ""}
    </div>`;
}

function renderWeak(weakTopics, weakConcepts) {
  const topics = weakTopics.length ? weakTopics : weakConcepts.map((c) => ({ name: c.name, pct: c.pct }));
  if (topics.length === 0) {
    return `<div class="d-empty">No weak topics right now — great work! 🎉</div>`;
  }
  return topics.slice(0, 4).map((t) => `
    <a class="weak-chip" href="quiz.html?topic=${encodeURIComponent(t.name)}">
      <span class="weak-dot"></span>
      <span class="weak-name">${esc(t.name)}</span>
      <span class="weak-pct">${Math.round(t.pct)}%</span>
    </a>`).join("");
}

function renderReview(dueCount, unresolvedMistakes) {
  if (dueCount === 0 && unresolvedMistakes === 0) {
    return `
      <div class="d-empty">Nothing due today. You're ahead of the curve — come back tomorrow.</div>
      <a class="btn-secondary dash-cta" href="review.html">Open notebook</a>`;
  }
  const parts = [];
  if (dueCount > 0) parts.push(`${dueCount} concept${dueCount > 1 ? "s" : ""} due`);
  if (unresolvedMistakes > 0) parts.push(`${unresolvedMistakes} mistake${unresolvedMistakes > 1 ? "s" : ""} to revisit`);
  return `
    <div class="d-empty">${parts.join(" · ")} — five minutes now saves an hour before the exam.</div>
    <a class="btn-primary dash-cta" href="review.html">Start review</a>`;
}

function renderProgress(data) {
  const level = data.levelInfo || computeLevel(0);
  const xpPct = level.xpForNext ? Math.min(100, Math.round((level.levelXp / level.xpForNext) * 100)) : 0;
  const lastAch = (data.achievements || []).length
    ? ACHIEVEMENTS.filter((a) => (data.achievements || []).includes(a.id)).pop()
    : null;

  const stats = [
    { icon: "🔥", v: data.streak, l: "Day streak" },
    { icon: "⚡", v: `${data.todayXp} XP`, l: "Today" },
    { icon: "📝", v: data.questionsToday, l: "Qs today" },
    { icon: "🔁", v: data.reviewsToday, l: "Reviews" },
    { icon: "🎯", v: data.accuracy7d !== null ? `${data.accuracy7d}%` : "—", l: "7-day accuracy" },
    { icon: "🏆", v: `${data.achievements?.length || 0}`, l: "Badges" },
  ].map((s) => `<div class="pstat"><span class="pstat-icon">${s.icon}</span><div class="pstat-v">${esc(s.v)}</div><div class="pstat-l">${esc(s.l)}</div></div>`).join("");

  return `
    <div class="progress-top">
      <div class="level-badge">
        <span class="level-icon">🎓</span>
        <div>
          <div class="level-num">Level ${level.level}</div>
          <div class="level-bar"><div class="level-fill" style="width:${xpPct}%"></div></div>
        </div>
        <span class="level-xp">${level.levelXp}/${level.xpForNext} XP</span>
      </div>
      ${lastAch ? `<div class="ach-last"><span>${lastAch.icon}</span><div><div class="ach-last-title">${esc(lastAch.title)}</div><div class="ach-last-desc">${esc(lastAch.desc)}</div></div></div>` : ""}
    </div>
    <div class="pstats">${stats}</div>`;
}

function renderRecent(chats, onResumeChat) {
  if (!chats || chats.length === 0) {
    return `<div class="d-empty">No conversations yet — say hi to Aquila and start your first study session.</div>`;
  }
  return `<div class="recent-list">${chats.map((c) => `
    <div class="recent-item" onclick="window.__resumeChat('${esc(String(c.id))}')">
      <span class="recent-icon">💬</span>
      <span class="recent-title">${esc(c.title || "Untitled chat")}</span>
      <span class="recent-time">${relTime(c.updatedAt)}</span>
    </div>`).join("")}</div>`;
}

export function mountDashboard(uid, user, opts = {}) {
  const root = document.getElementById("dashArea");
  if (!root) return;
  const onResumeChat = opts.onResumeChat || ((chatId) => { window.location.href = `home.html?mode=chat&chat=${encodeURIComponent(chatId)}`; });

  window.__resumeChat = (chatId) => {
    if (chatId && typeof onResumeChat === "function") {
      onResumeChat(chatId);
    } else {
      window.location.href = `home.html?mode=chat&chat=${encodeURIComponent(chatId || "")}`;
    }
  };

  root.innerHTML = skeleton();

  loadDashboardData(uid)
    .then((data) => {
      if (!data) {
        root.innerHTML = `<div class="d-error">Could not load your dashboard. <a href="home.html">Reload</a></div>`;
        return;
      }
      render(data, user, onResumeChat);
    })
    .catch((err) => {
      console.error("Dashboard error:", err);
      root.innerHTML = `<div class="d-error">Something went wrong loading your dashboard. <a href="home.html">Reload</a></div>`;
    });
}

function render(data, user, onResumeChat) {
  const root = document.getElementById("dashArea");
  const greet = buildGreeting(user, data);

  root.innerHTML = `
    <header class="dash-hero">
      <div class="dash-hero-copy">
        <div class="dash-hello">Welcome back</div>
        <h1 class="dash-greet">${esc(greet.title)}</h1>
        <p class="dash-sub">${esc(greet.sub)}</p>
      </div>
      <div class="dash-pills">
        <div class="pill streak-pill" title="Daily learning streak">
          <span class="pill-ico">🔥</span><span class="pill-num">${data.streak}</span> day streak
        </div>
        <div class="pill level-pill" title="XP">
          <span class="pill-ico">🎓</span><span class="pill-num">${data.levelInfo.level}</span> Level
        </div>
      </div>
    </header>

    <p class="dash-mentor">${esc(greet.line)}</p>

    <div class="dash-grid">
      <section class="d-card">
        <div class="d-card-head"><h2>Today's Mission</h2><span class="d-card-xp">+${(data.missions && data.missions.list || []).reduce((s, m) => s + (m.xp || 0), 0)} XP available</span></div>
        <div class="missions">${renderMissions(data.missions)}</div>
      </section>

      <section class="d-card">
        <div class="d-card-head"><h2>Continue Learning</h2></div>
        <div class="continue">${renderContinue(data.lastSession, onResumeChat)}</div>
      </section>
    </div>

    <div class="dash-grid">
      <section class="d-card">
        <div class="d-card-head"><h2>Needs Practice</h2><a class="d-card-link" href="analyze.html">Analyze</a></div>
        <div class="weak-grid">${renderWeak(data.weakTopics, data.weakConcepts)}</div>
      </section>

      <section class="d-card">
        <div class="d-card-head"><h2>Daily Review</h2></div>
        ${renderReview(data.dueCount, data.unresolvedMistakes)}
      </section>
    </div>

    <section class="d-card">
      <div class="d-card-head"><h2>Progress</h2></div>
      ${renderProgress(data)}
    </section>

    <section class="d-card">
      <div class="d-card-head"><h2>Recent</h2><a class="d-card-link" href="home.html?mode=chat">New chat</a></div>
      ${renderRecent(data.chats, onResumeChat)}
    </section>

    <div class="dash-actions">
      <a class="qa" href="home.html?mode=chat"><span class="qa-ico">💬</span>Chat</a>
      <a class="qa" href="quiz.html"><span class="qa-ico">📝</span>Quiz</a>
      <a class="qa" href="review.html"><span class="qa-ico">📓</span>Review</a>
      <a class="qa" href="planner.html"><span class="qa-ico">🗓️</span>Planner</a>
      <a class="qa" href="analyze.html"><span class="qa-ico">📊</span>Analyze</a>
      <a class="qa" href="beyond-marks.html"><span class="qa-ico">🌱</span>Beyond Marks</a>
    </div>
  `;
}
