// ── home.js ──
// Auth guard + view switching for home.html.
// - Redirects to login.html if user is not signed in.
// - Shows the personalized Dashboard by default, chat on ?mode=chat.
// - Tracks daily login (streak + XP), loads recent chats, wires buttons.

import { auth, db } from "./firebase-config.js";
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
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { trackDailyLogin, updateLastSession, loadDueCards, loadMistakes } from "./retention.js";

// ─── Global state ─────────────────────────────────────────────────────────────
export let currentUser = null;

// ─── Auth guard ───────────────────────────────────────────────────────────────
if (!auth) {
  document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d0e16;color:#f0f0f8;font-family:'Sora',sans-serif;padding:24px;text-align:center;"><div><h1 style="font-size:20px;margin-bottom:12px;">Unable to connect</h1><p style="color:#888;font-size:14px;">Firebase configuration is unavailable. Please check your environment settings and try again.</p></div></div>`;
} else {
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
    personalizeWelcome(user);

    // Daily login → streak + daily-login XP
    try {
      await trackDailyLogin(user.uid);
    } catch {}

    await loadRecentChats(user.uid);
    wireNewChatBtn();
    wireSignOutBtn();
    wireNav();
    renderReviewBadge(user.uid);

    // Initialize Aquila learning modules
    import("./chat.js").then(({ ensureModulesInitialized }) => {
      ensureModulesInitialized();
    }).catch(() => {});

    // Daily question popup (non-blocking, shown once per day)
    import("./dailyQuestion.js").then(({ checkDailyQuestion }) => {
      checkDailyQuestion(user);
    }).catch(() => {});

    // Auto-claim referral if user signed up with a referral code
    import("./modules/referral-system.js").then(({ autoClaimReferral }) => {
      autoClaimReferral(user.uid);
    }).catch(() => {});

    // Mount dashboard / enter chat based on URL
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") === "chat" ? "chat" : "today";
    setView(mode);

    if (mode === "today") {
      mountDashboard(user);
    } else {
      const chatId = params.get("chat");
      if (chatId) {
        // Small delay so chat.js is ready
        setTimeout(() => {
          loadChat(chatId, null);
        }, 150);
      }
    }
  });
}

// ─── View switching ───────────────────────────────────────────────────────────
function setView(mode) {
  const isChat = mode === "chat";
  document.body.classList.toggle("mode-chat", isChat);
  const navToday = document.getElementById("navToday");
  const navChat = document.getElementById("navChat");
  if (navToday) navToday.classList.toggle("active", !isChat);
  if (navChat) navChat.classList.toggle("active", isChat);
}

function wireNav() {
  const navToday = document.getElementById("navToday");
  const navChat = document.getElementById("navChat");
  if (navToday) {
    navToday.addEventListener("click", (e) => {
      e.preventDefault();
      setView("today");
      mountDashboard(currentUser);
      window.history.replaceState({}, "", "home.html");
    });
  }
  if (navChat) {
    navChat.addEventListener("click", (e) => {
      e.preventDefault();
      enterChat();
      window.history.replaceState({}, "", "home.html?mode=chat");
    });
  }
}

function enterChat() {
  setView("chat");
  import("./chat.js").then(({ resetChat }) => {
    try { resetChat(); } catch {}
    ensureWelcome();
  }).catch(() => {});
}

const WELCOME_HTML = `
  <div class="welcome" id="welcomeScreen">
    <div class="welcome-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    </div>
    <h1 id="welcomeTitle">Welcome back!</h1>
    <p id="welcomeSub">Ask Aquila anything — or pick a suggestion to start a focused study session.</p>
    <div class="suggestion-grid">
      <div class="suggestion-card" onclick="fillPrompt('Explain Chemical Bonding like I am 12')">
        <div class="sug-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
        <div class="sug-title">Explain a concept</div>
        <div class="sug-desc">Chemical Bonding, Kinematics & more</div>
      </div>
      <div class="suggestion-card" onclick="fillPrompt('Create a 7-day revision plan for my exam')">
        <div class="sug-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
        <div class="sug-title">Plan my study</div>
        <div class="sug-desc">Get a personalized revision plan</div>
      </div>
      <div class="suggestion-card" onclick="fillPrompt('Quiz me on Thermodynamics, 10 questions')">
        <div class="sug-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <div class="sug-title">Practice questions</div>
        <div class="sug-desc">Test yourself on any topic</div>
      </div>
      <div class="suggestion-card" onclick="fillPrompt('Help me with the Physics problem I got wrong yesterday')">
        <div class="sug-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="sug-title">Review mistakes</div>
        <div class="sug-desc">Turn wrong answers into learning</div>
      </div>
    </div>
  </div>`;

function ensureWelcome() {
  const chatArea = document.getElementById("chatArea");
  if (!chatArea) return;
  if (document.getElementById("welcomeScreen")) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = WELCOME_HTML.trim();
  chatArea.insertBefore(wrap.firstElementChild, chatArea.firstChild);
  if (currentUser) personalizeWelcome(currentUser);
}

function mountDashboard(user) {
  import("./dashboard.js").then(({ mountDashboard: m }) => {
    m(user.uid, user, { onResumeChat: resumeChat });
  }).catch(() => {});
}

function resumeChat(chatId) {
  if (!chatId) {
    enterChat();
    return;
  }
  setView("chat");
  window.history.replaceState({}, "", `home.html?mode=chat&chat=${encodeURIComponent(chatId)}`);
  import("./chat.js").then(() => {
    loadChat(chatId, null);
  }).catch(() => {});
}

// ─── Sidebar user card ────────────────────────────────────────────────────────
function populateUserCard(user) {
  const nameEl   = document.getElementById("userName")   || document.querySelector(".user-name");
  const planEl   = document.getElementById("userPlan")   || document.querySelector(".user-plan");
  const avatarEl = document.getElementById("userAvatar") || document.querySelector(".avatar");

  const name = user.displayName || user.email?.split("@")[0] || "Student";
  if (nameEl) nameEl.textContent = name;

  if (avatarEl) {
    if (user.photoURL) {
      const img = document.createElement("img");
      img.src = user.photoURL;
      img.alt = name;
      img.style.cssText = "width:100%;height:100%;border-radius:50%;object-fit:cover;";
      avatarEl.textContent = "";
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = name.charAt(0).toUpperCase();
    }
  }

  // Fetch plan from Firestore; create user doc if missing
  getDoc(doc(db, "users", user.uid)).then((snap) => {
    if (!snap.exists()) {
      setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        exam: "",
        createdAt: serverTimestamp(),
        plan: "free",
      }).catch(() => {});
    }
    if (planEl) {
      const plan = snap.exists() ? (snap.data().plan || "free") : "free";
      planEl.textContent = plan === "pro" ? "Pro Plan ✨" : "Free Plan";
    }
  }).catch(() => {});
}

function personalizeWelcome(user) {
  const title = document.getElementById("welcomeTitle");
  const sub = document.getElementById("welcomeSub");
  if (!title) return;
  const name = (user.displayName || user.email?.split("@")[0] || "student").split(" ")[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  title.textContent = `${greet}, ${name}!`;
  if (sub) sub.textContent = "What do you want to master today? Ask Aquila anything or pick a suggestion below.";
}

// ─── Review badge (due reviews + unresolved mistakes) ─────────────────────────
async function renderReviewBadge(uid) {
  try {
    const [due, mistakes] = await Promise.all([
      loadDueCards(uid).catch(() => []),
      loadMistakes(uid, 100).catch(() => []),
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
  } catch {}
}

// ─── Load recent chat sessions into sidebar ───────────────────────────────────
export async function loadRecentChats(uid) {
  const navSection = document.getElementById("navSection") || document.querySelector(".nav-section");
  if (!navSection) return;

  // Remove any previous recent section so re-renders stay clean
  const existing = navSection.querySelector(".recent-section");
  if (existing) existing.remove();

  try {
    const q = query(
      collection(db, "users", uid, "chats"),
      orderBy("updatedAt", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const section = document.createElement("div");
    section.className = "recent-section";

    const label = document.createElement("div");
    label.className = "nav-label";
    label.textContent = "Recent";
    section.appendChild(label);

    snap.forEach((docSnap) => {
      const data   = docSnap.data();
      const title  = data.title || "Untitled Chat";
      const chatId = docSnap.id;

      const item = document.createElement("div");
      item.className = "nav-item chat-history-item";
      item.dataset.chatId = chatId;
      item.title = title;
      item.textContent = title;
      item.addEventListener("click", () => {
        resumeChat(chatId);
      });
      section.appendChild(item);
    });

    // Insert before the Account nav-label
    const accountLabel = [...navSection.querySelectorAll(".nav-label")]
      .find((el) => el.textContent.trim() === "Account");
    navSection.insertBefore(section, accountLabel || null);

  } catch (e) {
    console.warn("Could not load recent chats:", e);
  }
}

// ─── Load a specific chat session into the chat area ──────────────────────────
export async function loadChat(chatId, itemEl) {
  if (!currentUser) return;

  setView("chat");

  // Highlight active item
  document.querySelectorAll(".chat-history-item").forEach((el) => el.classList.remove("active"));
  if (itemEl) itemEl.classList.add("active");

  const { renderMessage, clearWelcome, setActiveChatId } = await import("./chat.js");

  // Clear UI and show loading dots
  const chatArea = document.getElementById("chatArea");
  const welcome  = document.getElementById("welcomeScreen");
  if (welcome) welcome.remove();
  chatArea.innerHTML = `
    <div class="chat-loading">
      <span class="chat-loading-dot"></span>
      <span class="chat-loading-dot"></span>
      <span class="chat-loading-dot"></span>
    </div>`;

  try {
    const msgsSnap = await getDocs(
      query(
        collection(db, "users", currentUser.uid, "chats", chatId, "messages"),
        orderBy("ts", "asc")
      )
    );

    chatArea.innerHTML = "";

    let title = "";
    try {
      const chatDoc = await getDoc(doc(db, "users", currentUser.uid, "chats", chatId));
      if (chatDoc.exists()) title = chatDoc.data().title || "";
    } catch {}

    msgsSnap.forEach((d) => {
      const msg = d.data();
      if (msg.role === "user" || msg.role === "assistant") {
        renderMessage(msg.role, msg.content);
      }
    });

    chatArea.scrollTop = chatArea.scrollHeight;

    // Remember where the user left off
    if (title) {
      updateLastSession(currentUser.uid, {
        type: "chat",
        title,
        chatId,
      }).catch(() => {});
    }
  } catch (e) {
    chatArea.innerHTML = `<div class="chat-loading" style="color:#ff6b6b;">Failed to load chat.</div>`;
    console.error(e);
  }

  setActiveChatId(chatId);

  // Close sidebar on mobile
  if (window.innerWidth <= 880) {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebarOverlay")?.classList.remove("open");
  }
}

// ─── Wire up New Chat button ──────────────────────────────────────────────────
function wireNewChatBtn() {
  const btn = document.getElementById("newChatBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    enterChat();
    document.querySelectorAll(".chat-history-item").forEach((el) => el.classList.remove("active"));
  });
}

// ─── Wire up Sign Out button ──────────────────────────────────────────────────
function wireSignOutBtn() {
  const btn = document.getElementById("signOutBtn");
  if (!btn) return;
  btn.addEventListener("click", () => signOut());
}

// ─── Sign out ─────────────────────────────────────────────────────────────────
export async function signOut() {
  await fbSignOut(auth);
  window.location.href = "login.html";
}

// Expose globally for any inline onclick fallbacks
window.mentora_signOut = signOut;
window.__resumeChat = (chatId) => resumeChat(chatId);
