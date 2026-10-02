// ── home.js ──
// Auth guard for home.html.
// - Redirects to login.html if user is not signed in.
// - Populates sidebar user card with display name / avatar initial.
// - Loads recent chat history from Firestore into the sidebar.
// - Wires up the "New Chat" button to reset state.
// - Exports signOut() for the sign-out button.

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
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import "./modules/track.js";
import { apiFetch, pageUrl, applyCleanUrlLinks } from "./api-base.js";

applyCleanUrlLinks();

// ─── Global state ─────────────────────────────────────────────────────────────
export let currentUser = null;

// ─── Auth guard ───────────────────────────────────────────────────────────────
// Await firebaseReady to avoid race where auth is null at import time (P0-1)
firebaseReady.then(() => {
  if (!auth) {
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d0e16;color:#f0f0f8;font-family:'Sora',sans-serif;padding:24px;text-align:center;"><div><h1 style="font-size:20px;margin-bottom:12px;">Unable to connect</h1><p style="color:#888;font-size:14px;">Firebase configuration is unavailable. Please check your environment settings and try again.</p></div></div>`;
    return;
  }
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = pageUrl("/login");
      return;
    }
    if (!user.emailVerified) {
      window.location.href = pageUrl("/verify-email");
      return;
    }
    currentUser = user;
    // Onboarding gate: if learner profile incomplete, redirect to adaptive onboarding
    try {
      const snap = await getDoc(doc(db, "users", user.uid, "learning", "profile"));
      const onboardingComplete = snap.exists() ? snap.data().onboardingComplete === true : false;
      const hasLegacy = snap.exists() ? !!snap.data().academic : false;
      if (!onboardingComplete && !hasLegacy) {
        // Check legacy users: if they have subjects/goals already, treat as complete to avoid forced replay
        const legacySubjects = snap.exists() ? snap.data().subjects : null;
        if (!legacySubjects || legacySubjects.length === 0) {
          // soft gate — allow home but show banner; hard redirect would annoy returning users
          // For fresh signups, redirect to onboarding.html
          const createdAt = snap.exists() ? snap.data().createdAt : null;
          const isFresh = !snap.exists() || (createdAt && (Date.now() - (createdAt.toDate ? createdAt.toDate().getTime() : Date.now()) < 5*60*1000));
          if (isFresh) { window.location.href = pageUrl("/onboarding"); return; }
        }
      }
    } catch {}
    // Mode: chat.html or ?mode=chat = normal chat, else big nav hub with cool graphs
    const isChatMode = new URLSearchParams(window.location.search).get("mode") === "chat" || window.location.pathname.endsWith("chat") || window.location.pathname.endsWith("chat.html");
    const inputArea = document.querySelector(".input-area");
    const modelSel = document.querySelector(".model-selector");
    const modelLabel = modelSel?.querySelector(".model-label") || modelSel;
    if (modelLabel) modelLabel.textContent = isChatMode ? "Learning Allied" : "Learning Allied — Today";
    if (inputArea) inputArea.style.display = isChatMode ? "" : "none";
    document.body.classList.remove("auth-loading");
    document.body.classList.add("auth-ready");
    populateUserCard(user);
    // Render home hub graphs (real, not fake) — ensure welcome/hub shows even before chat
    import("./chat.js").then(({ renderWelcome }) => {
      try{ renderWelcome(); }catch(e){ console.warn("renderWelcome failed", e); }
    }).catch(()=>{});
    wireNewChatBtn();
    wireSignOutBtn();
    // If navigated from chat-history.html, auto-open that chat (supports both keys)
    const openId = sessionStorage.getItem("learning-allied-open-chat") || sessionStorage.getItem("aquila_open_chat");
    if(openId){
      try{ sessionStorage.removeItem("learning-allied-open-chat"); sessionStorage.removeItem("aquila_open_chat"); }catch(e){}
      setTimeout(()=> loadChat(openId, null), 300);
    }

    // Initialize Learning Allied learning modules
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
  });
});

// ─── Sidebar user card + topbar greeting ────────────────────────────────────────
function populateUserCard(user) {
  const nameEl   = document.getElementById("userName")   || document.querySelector(".user-name");
  const planEl   = document.getElementById("userPlan")   || document.querySelector(".user-plan");
  const avatarEl = document.getElementById("userAvatar") || document.querySelector(".avatar");
  const greetEl  = document.getElementById("greetingName");
  const topAv    = document.getElementById("topbarAvatar");

  const name = user.displayName || user.email?.split("@")[0] || "Student";
  const first = (user.displayName || name).split(" ")[0];
  if (nameEl) nameEl.textContent = name;
  if (greetEl) greetEl.textContent = first;

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
  if (topAv) {
    if (user.photoURL) topAv.src = user.photoURL;
    topAv.alt = name;
  }
  // Topbar search → send to chat
  const topSearch = document.getElementById("topbarSearch");
  if (topSearch && !topSearch.dataset.wired) {
    topSearch.dataset.wired = "1";
    topSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = topSearch.value.trim();
        if (!q) return;
        const isChat = window.location.pathname.endsWith("chat") || window.location.pathname.endsWith("chat.html") || new URLSearchParams(window.location.search).get("mode")==="chat";
        if (isChat) { const inp=document.getElementById("chatInput"); if(inp){ inp.value=q; inp.dispatchEvent(new Event("input")); import("./chat.js").then(m=>m.sendMessage()); } }
        else { try{ sessionStorage.setItem("learning-allied-pending-prompt", q); sessionStorage.setItem("aquila_pending_prompt", q);}catch(e){} window.location.href = pageUrl("/chat"); }
      }
    });
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

// ─── Load a specific chat session into the chat area ──────────────────────────
async function loadChat(chatId, itemEl) {
  if (!currentUser) return;

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

    msgsSnap.forEach((d) => {
      const msg = d.data();
      if (msg.role === "user" || msg.role === "assistant") {
        renderMessage(msg.role, msg.content);
      }
    });

    chatArea.scrollTop = chatArea.scrollHeight;

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
    const isChatMode = new URLSearchParams(window.location.search).get("mode") === "chat" || window.location.pathname.endsWith("chat") || window.location.pathname.endsWith("chat.html");
    if (!isChatMode) {
      window.location.href = pageUrl("/chat");
      return;
    }
    const { resetChat } = await import("./chat.js");
    resetChat();
    document.querySelectorAll(".chat-history-item").forEach((el) => el.removeAttribute("active"));
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
  window.location.href = pageUrl("/login");
}

// Expose globally for any inline onclick fallbacks
window.mentora_signOut = window.learningAllied_signOut = window.learning_allied_signOut = signOut;
