// ── sidebar.js ──
// Shared app navigation sidebar (same as home.html).
// - Replaces an existing .sidebar on a page (old markup stays in place for
//   existing inline scripts; this module runs after them and swaps it out).
// - Injects a fresh sidebar on pages that have none.
// - Highlights the active item, fills the user card, wires mobile menu,
//   renders the Review badge and recent chats.

(function () {
  "use strict";

  // Pages already using the new sidebar (e.g. home.html) are left untouched.
  if (document.getElementById("navToday") && document.getElementById("reviewBadge")) return;

  const page = (location.pathname.split("/").pop() || "home.html").replace(/\?.*$/, "");

  const ACTIVE = {
    "home.html": "home.html",
    "analyze.html": "analyze.html",
    "planner.html": "planner.html",
    "review.html": "review.html",
    "beyond-marks.html": "beyond-marks.html",
    "student-invoice.html": "student-invoice.html",
    "referral.html": "referral.html",
    "subscription.html": "subscription.html",
    "profile.html": "profile.html",
    "settings.html": "settings.html",
  };
  const activeHref = ACTIVE[page] || null;

  const isActive = (href) => (href === activeHref ? " active" : "");

  /* ── Shared CSS (matches home.html palette) ─────────────────────── */
  const CSS = `
:root {
  --bg-base: #0a0b0f;
  --bg-sidebar: #0f1117;
  --bg-card: #1a1d27;
  --bg-input: #1e2130;
  --accent: #00d4ff;
  --accent2: #a78bfa;
  --accent3: #ff6b6b;
  --accent4: #f59e0b;
  --border: rgba(255,255,255,0.07);
  --border-hover: rgba(0,212,255,0.4);
  --text-primary: #f0f0f8;
  --text-secondary: #8b8fa8;
  --text-muted: #4a4d62;
  --font-main: 'Sora', sans-serif;
  --font-mono: 'Space Mono', monospace;
  --sidebar-w: 248px;
  --green: #00d4aa;
}
.light-mode {
  --bg-base: #f4f5f9;
  --bg-sidebar: #ecedf2;
  --bg-card: #ffffff;
  --bg-input: #f0f1f5;
  --border: rgba(0,0,0,0.08);
  --text-primary: #16162a;
  --text-secondary: #5a5d72;
  --text-muted: #9ea0b4;
}

#sidebar, #sidebarOverlay {
  font-family: var(--font-main);
}

.sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 30;
  transition: margin-left 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s, background 0.35s ease;
  box-shadow: 4px 0 24px rgba(0,0,0,0.2);
  height: 100vh;
}
.sidebar * { box-sizing: border-box; }
.logo-area { padding: 20px 18px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
.logo-icon { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.logo-icon svg { width: 100%; height: 100%; }
.logo-text { font-size: 17px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.3px; }
.logo-text span { color: var(--accent); }
.logo-img { height: 34px; width: auto; display: block; }
.sidebar-close {
  display: none;
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.03);
  color: var(--text-secondary);
  align-items: center; justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.new-chat-btn {
  margin: 16px 14px 8px;
  background: rgba(0,212,255,0.1);
  border: 1px solid rgba(0,212,255,0.25);
  color: var(--accent);
  font-family: var(--font-main);
  font-size: 13px; font-weight: 500;
  padding: 10px 14px; border-radius: 10px;
  cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  transition: all 0.2s;
  width: calc(100% - 28px);
  text-decoration: none;
}
.new-chat-btn:hover { background: rgba(0,212,255,0.18); border-color: rgba(0,212,255,0.5); }
.new-chat-btn svg { flex-shrink: 0; }
.nav-section { padding: 6px 10px; flex: 1; overflow-y: auto; }
.nav-section::-webkit-scrollbar { width: 4px; }
.nav-section::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.nav-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.4px; color: var(--text-muted); padding: 14px 8px 6px; }
.nav-item {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 12px; border-radius: 10px;
  cursor: pointer; font-size: 13.5px;
  color: var(--text-secondary);
  transition: all 0.18s;
  margin-bottom: 2px;
  border: 1px solid transparent;
  user-select: none;
  text-decoration: none;
}
.nav-item:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); border-color: rgba(255,255,255,0.06); transform: translateX(2px); }
.nav-item.active { background: rgba(0,212,255,0.08); color: var(--text-primary); border-color: rgba(0,212,255,0.2); box-shadow: inset 2px 0 0 var(--accent); }
.nav-item.active .nav-icon { color: var(--accent); }
.nav-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--text-secondary); transition: color 0.2s; }
.nav-item:hover .nav-icon { color: var(--text-primary); }
.nav-badge { margin-left: auto; background: var(--accent3); color: white; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 20px; font-family: var(--font-mono); }
.nav-badge.green { background: var(--accent2); color: #16122b; }
.nav-badge.purple { background: var(--accent2); color: #0a0b0f; }
.nav-group-children { overflow: hidden; max-height: 0; transition: max-height 0.3s ease; }
.nav-group-children.open { max-height: 220px; }
.nav-group-toggle { cursor: pointer; }
.nav-group-chevron { margin-left: auto; transition: transform 0.3s; font-size: 10px; color: var(--text-muted); }
.nav-group-toggle.open .nav-group-chevron { transform: rotate(180deg); }
.nav-group-item { padding-left: 36px !important; }
.upgrade-nav-btn {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 12px; border-radius: 10px;
  cursor: pointer; font-size: 13.5px; font-weight: 600;
  color: var(--accent2);
  background: rgba(167,139,250,0.08);
  border: 1px solid rgba(167,139,250,0.2);
  margin-bottom: 2px; text-decoration: none;
  transition: all 0.18s;
}
.upgrade-nav-btn:hover { background: rgba(167,139,250,0.14); border-color: rgba(167,139,250,0.4); }
.nav-item.chat-history-item {
  font-size: 12.5px;
  color: var(--text-muted);
  padding: 8px 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.nav-item.chat-history-item:hover { color: var(--text-secondary); background: rgba(255,255,255,0.03); }
.nav-item.chat-history-item.active { color: var(--text-primary); background: rgba(0,212,255,0.08); border-color: rgba(0,212,255,0.2); }
.sidebar-bottom { padding: 12px 10px; border-top: 1px solid var(--border); }
.user-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; }
.signout-btn { width: calc(100% - 20px); margin: 0 10px 8px; padding: 9px 14px; background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.2); color: var(--accent3); font-family: var(--font-main); font-size: 12px; font-weight: 500; border-radius: 8px; cursor: pointer; transition: all 0.18s; }
.signout-btn:hover { background: rgba(255,107,107,0.15); }
.avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #00d4ff, #a78bfa); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; overflow: hidden; color: #06121a; }
.avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-plan { font-size: 11px; color: var(--accent); font-weight: 500; }

.sidebar-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(2px);
  z-index: 25;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.28s, visibility 0.28s;
  pointer-events: none;
}
.sidebar-overlay.open { opacity: 1; visibility: visible; pointer-events: all; }

/* Pages with no flex shell: sidebar is pinned, content is offset */
body.app-no-shell { padding-left: var(--sidebar-w); overflow-x: hidden; }
body.app-no-shell::before { content: ""; }
body.app-no-shell .sidebar { position: fixed; top: 0; left: 0; bottom: 0; margin-left: 0; }
.app-menu-btn {
  display: none;
  position: fixed; top: 12px; left: 12px; z-index: 40;
  width: 40px; height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,0.25);
}
.app-menu-btn:hover { color: var(--text-primary); border-color: var(--border-hover); }

.scroll-progress {
  position: fixed; top: 0; left: 0; height: 2px; z-index: 999;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  width: 0%; transition: width 0.1s linear;
}
.ambient-orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(80px); opacity: 0.2; }
.orb-1 { width: 400px; height: 400px; background: var(--accent); top: -12%; left: -6%; animation: orbFloat1 20s ease-in-out infinite; }
.orb-2 { width: 350px; height: 350px; background: var(--accent2); bottom: -8%; right: -4%; animation: orbFloat2 25s ease-in-out infinite; }
@keyframes orbFloat1 { 0%,100%{transform:translate(0,0);} 33%{transform:translate(30px,-20px);} 66%{transform:translate(-15px,30px);} }
@keyframes orbFloat2 { 0%,100%{transform:translate(0,0);} 33%{transform:translate(-20px,15px);} 66%{transform:translate(40px,-30px);} }

.sidebar a:focus-visible, .sidebar button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .sidebar *, .sidebar-overlay, .ambient-orb { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}

@media (max-width: 880px) {
  body.app-no-shell { padding-left: 0; }
  .sidebar, body.app-no-shell .sidebar { position: fixed; top: 0; left: 0; bottom: 0; margin-left: calc(-1 * var(--sidebar-w)); box-shadow: none; }
  .sidebar.open { margin-left: 0; box-shadow: 24px 0 60px rgba(0,0,0,0.45); }
  .sidebar-close { display: flex; }
  .sidebar-overlay.open { opacity: 1; visibility: visible; pointer-events: all; }
  .app-menu-btn { display: flex; }
  .sidebar.open ~ .app-menu-btn { display: none; }
  .logo-img { height: 30px; }
}`;

  /* ── Sidebar markup (mirrors home.html) ─────────────────────────── */
  const navHtml = `
    <div class="nav-label">Main</div>
    <a href="home.html" class="nav-item${isActive("home.html")}" id="navToday">
      <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>
      Today
    </a>
    <a href="home.html?mode=chat" class="nav-item${page === "home.html" && location.search.includes("mode=chat") ? " active" : ""}" id="navChat">
      <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
      Chat
    </a>
    <a href="analyze.html" class="nav-item${isActive("analyze.html")}">
      <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg></span>
      Analyze
    </a>
    <a href="planner.html" class="nav-item${isActive("planner.html")}">
      <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg></span>
      Study Planner
    </a>
    <a href="review.html" class="nav-item${isActive("review.html")}" id="navReview">
      <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span>
      Review &amp; Mistakes
      <span class="nav-badge green" id="reviewBadge" style="display:none"></span>
    </a>
    <div class="nav-label">Community</div>
    <div class="nav-group">
      <div class="nav-group-toggle nav-item" onclick="window.toggleNavGroup && toggleNavGroup(this)">
        <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>
        Community
        <span class="nav-group-chevron">&#9660;</span>
      </div>
      <div class="nav-group-children open">
        <a href="beyond-marks.html" class="nav-item nav-group-item${isActive("beyond-marks.html")}">
          Beyond Marks
          <span class="nav-badge purple">New</span>
        </a>
        <a href="student-invoice.html" class="nav-item nav-group-item${isActive("student-invoice.html")}">
          Community Board
        </a>
      </div>
    </div>
    <div class="nav-label">Account</div>
    <a href="referral.html" class="nav-item${isActive("referral.html")}">
      <span class="nav-icon" style="color:var(--green)">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </span>
      Refer &amp; Earn
    </a>
    <a href="subscription.html" class="upgrade-nav-btn${isActive("subscription.html")}">
      <span class="nav-icon" style="color:var(--accent2)">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      </span>
      Subscription
    </a>
    <a href="profile.html" class="nav-item${isActive("profile.html")}">
      <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
      Profile
    </a>
    <a href="settings.html" class="nav-item${isActive("settings.html")}">
      <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
      Settings
    </a>`;

  const sidebarHtml = `
  <aside class="sidebar" id="sidebar">
    <div class="logo-area">
      <a href="index.html" class="logo">
        <img src="logo.png" alt="Aquila AI" class="logo-img">
        <span class="logo-text">Aquila <span>AI</span></span>
      </a>
      <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <a href="home.html?mode=chat" class="new-chat-btn" id="newChatBtn">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      New Chat
    </a>
    <nav class="nav-section" id="navSection">
      ${navHtml}
    </nav>
    <div class="sidebar-bottom">
      <button class="signout-btn" id="signOutBtn">Sign out</button>
      <div class="user-card">
        <div class="avatar" id="userAvatar">G</div>
        <div class="user-info">
          <div class="user-name" id="userName">Guest</div>
          <div class="user-plan" id="userPlan">Free Plan</div>
        </div>
      </div>
    </div>
  </aside>`;

  /* ── Inject CSS ─────────────────────────────────────────────────── */
  const style = document.createElement("style");
  style.setAttribute("data-sidebar", "shared");
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  /* ── Inject/replace sidebar ─────────────────────────────────────── */
  const existingSidebar = document.getElementById("sidebar") || document.querySelector(".sidebar");
  const existingOverlay = document.getElementById("sidebarOverlay");

  let overlayEl = existingOverlay;

  if (existingSidebar) {
    const wrap = document.createElement("div");
    wrap.innerHTML = sidebarHtml;
    const newAside = wrap.querySelector(".sidebar");
    existingSidebar.replaceWith(newAside);
    if (!overlayEl) {
      overlayEl = document.createElement("div");
      overlayEl.id = "sidebarOverlay";
      overlayEl.className = "sidebar-overlay";
      document.body.insertAdjacentElement("afterbegin", overlayEl);
    }
  } else {
    document.body.classList.add("app-no-shell");
    const menuBtn = document.createElement("button");
    menuBtn.id = "appMenuBtn";
    menuBtn.className = "app-menu-btn";
    menuBtn.setAttribute("aria-label", "Open menu");
    menuBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';

    if (!overlayEl) {
      overlayEl = document.createElement("div");
      overlayEl.id = "sidebarOverlay";
      overlayEl.className = "sidebar-overlay";
      document.body.insertAdjacentElement("afterbegin", overlayEl);
    }

    const orbs = '<div class="ambient-orb orb-1" aria-hidden="true"></div><div class="ambient-orb orb-2" aria-hidden="true"></div>';
    document.body.insertAdjacentHTML("afterbegin", orbs);

    const wrap = document.createElement("div");
    wrap.innerHTML = sidebarHtml;
    document.body.insertAdjacentElement("afterbegin", wrap.querySelector(".sidebar"));

    document.body.appendChild(menuBtn);

    // Scroll progress bar (for pages without their own)
    if (!document.querySelector(".scroll-progress")) {
      const bar = document.createElement("div");
      bar.className = "scroll-progress";
      document.body.prepend(bar);
      window.addEventListener("scroll", () => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = h > 0 ? (window.scrollY / h) * 100 + "%" : "0%";
      }, { passive: true });
    }
  }

  /* ── Wire mobile menu ───────────────────────────────────────────── */
  const sidebarEl = document.getElementById("sidebar");
  const menuBtnEl = document.getElementById("menuBtn") || document.getElementById("appMenuBtn");
  const closeBtnEl = document.getElementById("sidebarClose");
  const navSectionEl = document.getElementById("navSection");

  function openSidebar() {
    if (sidebarEl) sidebarEl.classList.add("open");
    if (overlayEl) overlayEl.classList.add("open");
  }
  function closeSidebar() {
    if (sidebarEl) sidebarEl.classList.remove("open");
    if (overlayEl) overlayEl.classList.remove("open");
  }

  function toggleSidebar() {
    if (sidebarEl && sidebarEl.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  if (menuBtnEl) menuBtnEl.addEventListener("click", toggleSidebar);
  if (closeBtnEl) closeBtnEl.addEventListener("click", closeSidebar);
  if (overlayEl) overlayEl.addEventListener("click", closeSidebar);
  if (navSectionEl) {
    navSectionEl.addEventListener("click", (e) => {
      const item = e.target.closest(".nav-item");
      if (item && !item.classList.contains("nav-group-toggle") && window.innerWidth <= 880) closeSidebar();
    });
  }

  window.toggleNavGroup = function (el) {
    el.classList.toggle("open");
    const children = el.nextElementSibling;
    if (children) children.classList.toggle("open");
  };

  /* ── User card + badge + recent chats (Firebase) ────────────────── */
  import("./firebase-config.js")
    .then(async ({ auth, db }) => {
      if (!auth) return;
      const [{ onAuthStateChanged, signOut }, fs, retention] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"),
        import("./retention.js").catch(() => null),
      ]);

      onAuthStateChanged(auth, async (user) => {
        if (!user) return;

        const nameEl = document.getElementById("userName");
        const planEl = document.getElementById("userPlan");
        const avatarEl = document.getElementById("userAvatar");
        const name = user.displayName || (user.email ? user.email.split("@")[0] : "Student");

        if (nameEl) nameEl.textContent = name;
        if (avatarEl) {
          if (user.photoURL) {
            const img = document.createElement("img");
            img.src = user.photoURL;
            img.alt = name;
            avatarEl.textContent = "";
            avatarEl.appendChild(img);
          } else {
            avatarEl.textContent = name.charAt(0).toUpperCase();
          }
        }

        try {
          const snap = await fs.getDoc(fs.doc(db, "users", user.uid));
          const plan = snap.exists() ? (snap.data().plan || "free") : "free";
          if (planEl) planEl.textContent = plan === "pro" ? "Pro Plan ✨" : "Free Plan";
        } catch {}

        // Review badge
        if (retention && document.getElementById("reviewBadge")) {
          const [due, mistakes] = await Promise.all([
            retention.loadDueCards(user.uid).catch(() => []),
            retention.loadMistakes(user.uid, 100).catch(() => []),
          ]);
          const count = due.length + mistakes.filter((m) => !m.resolved).length;
          const badge = document.getElementById("reviewBadge");
          if (badge) {
            if (count > 0) {
              badge.textContent = count > 9 ? "9+" : String(count);
              badge.style.display = "";
            } else {
              badge.style.display = "none";
            }
          }
        }

        // Recent chats (mirror home.js)
        if (navSectionEl) {
          try {
            const q = fs.query(
              fs.collection(db, "users", user.uid, "chats"),
              fs.orderBy("updatedAt", "desc"),
              fs.limit(8)
            );
            const snap = await fs.getDocs(q);
            if (!snap.empty && !navSectionEl.querySelector(".recent-section")) {
              const section = document.createElement("div");
              section.className = "recent-section";
              const label = document.createElement("div");
              label.className = "nav-label";
              label.textContent = "Recent";
              section.appendChild(label);
              snap.forEach((docSnap) => {
                const title = (docSnap.data().title || "Untitled Chat").toString();
                const item = document.createElement("div");
                item.className = "nav-item chat-history-item";
                item.textContent = title;
                item.title = title;
                item.addEventListener("click", () => {
                  window.location.href = "home.html?mode=chat&chat=" + encodeURIComponent(docSnap.id);
                });
                section.appendChild(item);
              });
              const accountLabel = [...navSectionEl.querySelectorAll(".nav-label")]
                .find((el) => el.textContent.trim() === "Account");
              navSectionEl.insertBefore(section, accountLabel || null);
            }
          } catch {}
        }

        // Sign out
        const signOutBtn = document.getElementById("signOutBtn");
        if (signOutBtn) {
          signOutBtn.addEventListener("click", async () => {
            try {
              await signOut(auth);
              window.location.href = "login.html";
            } catch {}
          });
        }
      });
    })
    .catch(() => {});
})();
