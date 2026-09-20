/**
 * Sidebar Component — DRY for 7 pages (home, chat, analyze, planner, study-session, profile, subscription)
 * Injects the Aquila sidebar HTML + handles overlay, toggle, and active nav highlighting.
 * Usage: <div id="sidebarMount"></div> + <script type="module"> import { mountSidebar } from "./js/components/sidebar.js"; mountSidebar(); </script>
 * Clean URLs: hrefs use /home, /arena etc. (vercel cleanUrls:true serves *.html without extension)
 */

export function mountSidebar({ activeHref } = {}) {
  const mount = document.getElementById("sidebarMount");
  if (!mount) return;

  const rawCurrent = activeHref || location.pathname.split("/").pop() || "home";
  const current = rawCurrent.replace(/\.html.*$/, "").replace(/^\//, "") || "home";
  const isActive = (href) => {
    const clean = href.replace(/\.html.*$/, "").replace(/^\//, "").split("?")[0].split("#")[0];
    return clean === current || (current === "" && clean === "home");
  };

  mount.innerHTML = `
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="logo-area">
        <a href="/" class="logo">
          <img src="logo.svg" alt="Aquila AI" class="logo-img">
          <span class="logo-text">Aquila AI</span>
        </a>
        <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <button class="new-chat-btn" id="newChatBtn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Chat
      </button>
      <nav class="nav-section" id="navSection">
        <div class="nav-label">Main</div>
        <a href="/home" class="nav-item ${isActive("home") ? "active" : ""}">
          <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>
          Home
          <span class="nav-badge" style="background:rgba(0,212,255,0.15);color:var(--accent)" id="reviewBadge"></span>
        </a>
        <a href="/chat" class="nav-item ${isActive("chat") ? "active" : ""}">
          <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
          Chat
        </a>
        <a href="/analyze" class="nav-item ${isActive("analyze") ? "active" : ""}">
          <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg></span>
          Analyze
        </a>
        <a href="/study-session" class="nav-item ${isActive("study-session") ? "active" : ""}">
          <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></span>
          Study Session
          <span class="nav-badge green">New</span>
        </a>
        <a href="/planner" class="nav-item ${isActive("planner") ? "active" : ""}">
          <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg></span>
          Study Planner
        </a>
        <a href="/arena" class="nav-item ${isActive("arena") ? "active" : ""}" aria-label="Arena — Conquer your syllabus">
          <span class="nav-icon" style="color:#0ea5e9"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 8a2 2 0 1 0 0 0"/></svg></span>
          Arena
          <span class="nav-badge" style="background:rgba(14,165,233,0.16);color:#38bdf8">⚔</span>
        </a>
        <div class="nav-label">Community</div>
        <div class="nav-group">
          <div class="nav-group-toggle nav-item" onclick="window.toggleNavGroup && window.toggleNavGroup(this)">
            <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>
            Community
            <span class="nav-group-chevron">▼</span>
          </div>
          <div class="nav-group-children open">
            <a href="/beyond-marks" class="nav-item nav-group-item">Beyond Marks <span class="nav-badge purple">New</span></a>
            <a href="/student-invoice" class="nav-item nav-group-item">Community Board</a>
          </div>
        </div>
        <div class="nav-label">Account</div>
        <a href="/referral" class="nav-item ${isActive("referral") ? "active" : ""}">
          <span class="nav-icon" style="color:var(--green)">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </span>
          Refer & Earn
        </a>
        <a href="/subscription" class="upgrade-nav-btn ${isActive("subscription") ? "active" : ""}">
          <span class="nav-icon" style="color:var(--accent2)"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>
          Subscription
        </a>
        <a href="/profile" class="nav-item ${isActive("profile") ? "active" : ""}">
          <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
          Profile
        </a>
        <a href="/settings" class="nav-item ${isActive("settings") ? "active" : ""}">
          <span class="nav-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
          Settings
        </a>
      </nav>
      <div style="padding:8px 10px 0;">
        <div id="syllabusCard" style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;min-height:52px;">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(16,185,129,0.14);display:grid;place-items:center;flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:11px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="syllabusLabel">Upload syllabus</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.55);" id="syllabusSub">JPG, PNG, PDF — personalises plan</div>
          </div>
          <input type="file" id="syllabusFile" accept=".jpg,.jpeg,.png,.pdf" hidden />
          <button id="syllabusUploadBtn" style="background:#10b981;color:#fff;border:none;border-radius:999px;padding:6px 12px;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0;">Upload</button>
        </div>
        <div id="syllabusProgress" style="display:none;margin-top:6px;font-size:10px;color:var(--text-muted);"></div>
      </div>
      <div style="padding:8px 10px;">
        <div style="background:linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;min-height:52px;position:relative;overflow:hidden;">
          <div style="position:absolute;inset:0;background:radial-gradient(200px 80px at 85% 100%, rgba(37,99,235,0.18), transparent 60%);pointer-events:none;"></div>
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(37,99,235,0.15);display:grid;place-items:center;flex-shrink:0;position:relative;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="1.7"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg></div>
          <div style="flex:1;min-width:0;position:relative;">
            <div style="font-size:11px;font-weight:700;color:#fff;">AIConsole</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.55);">Study assistant</div>
          </div>
          <button onclick="window.location.href='/chat'" style="background:#2563eb;color:#fff;border:none;border-radius:999px;padding:6px 12px;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0;position:relative;">Ask</button>
        </div>
      </div>
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
    </aside>
  `;

  // Wire up sidebar interactions (shared across all pages)
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("sidebarClose");
  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    if (overlay) overlay.classList.add("open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  if (menuBtn) menuBtn.addEventListener("click", openSidebar);
  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
  if (overlay) overlay.addEventListener("click", closeSidebar);
  document.querySelectorAll('.nav-item:not(.nav-group-toggle)').forEach(el => {
    el.addEventListener("click", () => { if (window.innerWidth <= 880) closeSidebar(); });
  });
  // Expose for inline onclick
  window.toggleNavGroup = function(el) {
    el.classList.toggle("open");
    const children = el.nextElementSibling;
    if (children) children.classList.toggle("open");
  };
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
}
