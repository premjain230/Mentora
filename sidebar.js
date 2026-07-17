import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const NAV_ITEMS = [
  { id: "home",        label: "Chat",        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', href: "home.html" },
  { id: "planner",     label: "Planner",     icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', href: "planner.html" },
  { id: "analyze",     label: "Analyze",     icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', href: "analyze.html" },
  { id: "quiz",        label: "Quiz",        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.5 9.5 23 10.5 17.5 15.5 18.5 23 12 19.5 5.5 23 6.5 15.5 1 10.5 8.5 9.5"/></svg>', href: "quiz.html" },
  { id: "profile",     label: "Profile",     icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', href: "profile.html" },
  { id: "settings",    label: "Settings",    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', href: "settings.html" },
  { id: "subscription", label: "Subscription", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', href: "subscription.html" },
];

const ICON_CLOSE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
const ICON_PLUS = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
const ICON_STAR = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.5 9.5 23 10.5 17.5 15.5 18.5 23 12 19.5 5.5 23 6.5 15.5 1 10.5 8.5 9.5"/></svg>';

export function renderSidebar(activePage) {
  const navHtml = NAV_ITEMS.map(item => {
    const isActive = item.id === activePage;
    const activeClass = isActive ? " active" : "";
    return `<a class="nav-item${activeClass}" href="${item.href}">
      <span class="nav-icon">${item.icon}</span>${item.label}
    </a>`;
  }).join("");

  return `
<div class="sidebar-overlay" id="sidebarOverlay"></div>
<aside class="sidebar" id="sidebar">
  <div class="logo-area">
    <a href="index.html" class="logo">
      <img src="logo.png" alt="Mentora" class="logo-img">
    </a>
    <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">${ICON_CLOSE}</button>
  </div>

  <a href="home.html" class="new-chat-btn">${ICON_PLUS} New Chat</a>

  <div class="nav-section">
    <div class="nav-label">Main</div>
    ${navHtml}
    <div class="nav-label" style="margin-top:16px">Account</div>
    <a class="upgrade-nav-btn${activePage === "subscription" ? " active" : ""}" href="subscription.html">
      <span class="nav-icon">${ICON_STAR}</span>Upgrade
    </a>
  </div>

  <div class="sidebar-bottom">
    <div class="user-card">
      <div class="avatar" id="sidebarAvatar">M</div>
      <div class="user-info">
        <div class="user-name" id="sidebarName">Loading...</div>
        <div class="user-plan" id="sidebarPlan">Free</div>
      </div>
    </div>
    <button class="signout-btn" id="sidebarSignOut">Sign Out</button>
  </div>
</aside>`;
}

export function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const closeBtn = document.getElementById("sidebarClose");

  function openSidebar() {
    sidebar?.classList.add("open");
    overlay?.classList.add("open");
  }

  function closeSidebar() {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("open");
  }

  document.querySelectorAll(".menu-btn").forEach(btn => btn.addEventListener("click", openSidebar));
  closeBtn?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSidebar(); });

  document.getElementById("sidebarSignOut")?.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (e) {
      console.error("Sign out failed", e);
    }
  });

  onAuthStateChanged(auth, async (user) => {
    const nameEl = document.getElementById("sidebarName");
    const avatarEl = document.getElementById("sidebarAvatar");
    const planEl = document.getElementById("sidebarPlan");

    if (user) {
      nameEl.textContent = user.displayName || user.email?.split("@")[0] || "Student";
      avatarEl.textContent = (user.displayName || user.email || "M")[0].toUpperCase();
      if (user.photoURL) {
        avatarEl.innerHTML = `<img src="${user.photoURL}" alt="">`;
      }
      try {
        const subDoc = await getDoc(doc(db, "users", user.uid, "billing", "subscription"));
        if (subDoc.exists() && subDoc.data().plan === "pro") {
          planEl.textContent = "Pro";
          planEl.style.color = "var(--violet)";
        }
      } catch (e) {
        // silent
      }
    } else {
      nameEl.textContent = "Guest";
      avatarEl.textContent = "G";
      planEl.textContent = "Free";
    }
  });
}
